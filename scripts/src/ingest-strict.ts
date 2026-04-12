import pg from "pg";
import https from "https";

const DATABASE_URL = process.env.DATABASE_URL!;
const API_KEY = process.env.YOUTUBE_API_KEY!;
if (!DATABASE_URL || !API_KEY) { console.error("Set DATABASE_URL and YOUTUBE_API_KEY"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ── Strict title filter ──
// MUST have BPM number in title OR be from a known loop channel
const MUST_HAVE = /(\d{2,3}\s*bpm|drum\s*loop|drum\s*track|backing\s*track|play[\s-]*along|jam\s*track|drumless|click\s*track)/i;
const MUST_NOT = /tutorial|lesson|review|how\s*to|beginner|exercise|workout|fastest|solo|cover|reaction|unboxing|interview|comparison|challenge|setup|gear|live\s*concert|drum\s*cam|vlog/i;
const BPM_REGEX = /(\d{2,3})\s*bpm/i;

function extractBpm(text: string): number | null {
  const m = text.match(BPM_REGEX);
  if (m) { const b = parseInt(m[1]); if (b >= 30 && b <= 300) return b; }
  return null;
}

function extractTimeSig(text: string): string | null {
  const m = text.match(/(\d+)\/(\d+)/);
  if (m && ['2/2','2/4','3/4','4/4','5/4','5/8','6/8','7/4','7/8','9/8','11/8','12/8','15/8'].includes(`${m[1]}/${m[2]}`)) return `${m[1]}/${m[2]}`;
  if (/waltz/i.test(text)) return '3/4';
  if (/shuffle|12\/8/i.test(text)) return '12/8';
  return null;
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||'0')*3600)+(parseInt(m[2]||'0')*60)+parseInt(m[3]||'0');
}

const GENRE_MAP: Record<string,string[]> = {
  Jazz:['jazz','swing','bebop'],Blues:['blues','12 bar'],Funk:['funk','funky'],
  'Neo-Soul':['neo soul','neo-soul'],'R&B':['r&b','rnb'],Gospel:['gospel'],
  Rock:['rock'],Pop:['pop'],Latin:['latin','salsa'],'Bossa Nova':['bossa nova','bossa'],
  Afrobeat:['afrobeat','afro beat'],Reggae:['reggae','dub'],'Hip-Hop':['hip hop','hip-hop','trap'],
  Country:['country'],Metal:['metal'],
};

function detectGenres(t: string): string[] {
  const tl = t.toLowerCase();
  return Object.entries(GENRE_MAP).filter(([,kw])=>kw.some(k=>tl.includes(k))).map(([g])=>g);
}

const FEEL_MAP: Record<string,string[]> = {
  Straight:['straight','rock','pop'],Swing:['swing','swung','jazz'],
  Shuffle:['shuffle'],'Half-Time':['half time','half-time'],
  Syncopated:['syncopated','funk'],
};

function detectFeels(t: string): string[] {
  const tl = t.toLowerCase();
  const f = Object.entries(FEEL_MAP).filter(([,kw])=>kw.some(k=>tl.includes(k))).map(([f])=>f);
  return f.length > 0 ? f : ['Straight'];
}

function qualityScore(views: number, likes: number, emb: boolean, dur: number, subs: number): number {
  return Math.min(1,(Math.log10(views+1)/6)*0.3+(Math.log10(likes+1)/5)*0.2+(emb?0.2:0)+(Math.min(dur,1800)/1800)*0.15+(Math.log10(subs+1)/7)*0.15);
}

function ytGet(ep: string, params: Record<string,string>): Promise<any> {
  return new Promise((resolve,reject)=>{
    const qs = new URLSearchParams({...params,key:API_KEY}).toString();
    https.get(`https://www.googleapis.com/youtube/v3/${ep}?${qs}`,(res)=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch{reject(new Error('parse'))}});
    }).on('error',reject);
  });
}

// ── Queries designed to find ACTUAL loops with BPM ──
const QUERIES = [
  // Drum loops by BPM ranges
  'drum loop 60 BPM', 'drum loop 70 BPM', 'drum loop 80 BPM',
  'drum loop 90 BPM', 'drum loop 100 BPM', 'drum loop 110 BPM',
  'drum loop 120 BPM', 'drum loop 130 BPM', 'drum loop 140 BPM',
  'drum loop 150 BPM', 'drum loop 160 BPM',
  // Genre-specific with BPM
  'jazz drum loop BPM', 'blues drum loop BPM', 'funk drum loop BPM',
  'rock drum loop BPM', 'neo soul drum loop BPM',
  'bossa nova drum loop BPM', 'reggae drum loop BPM',
  'afrobeat drum loop BPM', 'gospel drum loop BPM',
  'shuffle drum loop BPM', 'swing drum loop BPM',
  // Odd meters
  'drum loop 3/4 BPM', 'drum loop 6/8 BPM', 'drum loop 5/4 BPM',
  'drum loop 7/8 BPM', 'drum loop 12/8 BPM',
  // Backing tracks with BPM
  'jazz backing track BPM', 'blues backing track BPM',
  'funk backing track BPM', 'drumless backing track BPM',
  // Long loops (Jim Dooley style)
  'extended drum loop 20 minutes', 'long drum loop practice',
];

const taxCache: Record<string, Record<string, number>> = {};

async function loadTax() {
  const ts = await pool.query('SELECT id, display_name FROM time_signatures');
  taxCache.ts = {}; ts.rows.forEach((r:any)=>{taxCache.ts[r.display_name]=r.id});
  const g = await pool.query('SELECT id, name FROM genres');
  taxCache.g = {}; g.rows.forEach((r:any)=>{taxCache.g[r.name]=r.id});
  const f = await pool.query('SELECT id, name FROM feels');
  taxCache.f = {}; f.rows.forEach((r:any)=>{taxCache.f[r.name]=r.id});
  const ct = await pool.query('SELECT id, name FROM content_types');
  taxCache.ct = {}; ct.rows.forEach((r:any)=>{taxCache.ct[r.name]=r.id});
}

async function main() {
  await loadTax();
  let inserted = 0, skipped = 0, apiCalls = 0, quota = 0;
  const seenIds = new Set<string>();

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const q = QUERIES[qi];
    console.log(`\n[${qi+1}/${QUERIES.length}] "${q}"`);

    const sr = await ytGet('search', { part:'snippet', q, type:'video', maxResults:'20', videoDuration:'medium', order:'relevance' });
    apiCalls++; quota += 100;
    if (!sr.items?.length) { console.log('  No results'); continue; }

    const ids = sr.items.map((i:any)=>i.id.videoId).filter(Boolean).filter((id:string)=>!seenIds.has(id));
    if (!ids.length) continue;
    ids.forEach((id:string)=>seenIds.add(id));

    const vr = await ytGet('videos', { part:'snippet,contentDetails,statistics,status', id:ids.join(',') });
    apiCalls++; quota += 1;
    if (!vr.items) continue;

    let qi_ins = 0, qi_skip = 0;

    for (const v of vr.items) {
      const title = v.snippet.title;
      const desc = v.snippet.description || '';
      const full = title + ' ' + desc;

      // Strict filter: must match pattern AND not match reject
      if (MUST_NOT.test(title)) { qi_skip++; continue; }
      if (!MUST_HAVE.test(title)) { qi_skip++; continue; }

      const dur = parseDuration(v.contentDetails.duration);
      if (dur < 60 || dur > 2400) { qi_skip++; continue; } // 1 min to 40 min

      const bpm = extractBpm(full);
      const timeSig = extractTimeSig(full);
      const genres = detectGenres(full);
      const feels = detectFeels(full);
      const views = parseInt(v.statistics.viewCount||'0');
      const likes = parseInt(v.statistics.likeCount||'0');
      const emb = v.status.embeddable ?? false;
      const chId = v.snippet.channelId;
      const chName = v.snippet.channelTitle;
      const tags = (v.snippet.tags||[]).slice(0,10);

      let contentType = 'Drum Loop';
      const tl = title.toLowerCase();
      if (tl.includes('backing track')||tl.includes('jam track')) contentType = 'Backing Track';
      if (tl.includes('play along')||tl.includes('play-along')) contentType = 'Play-Along';
      if (tl.includes('drumless')) contentType = 'Backing Track';
      if (tl.includes('click track')) contentType = 'Drum Loop';

      // Creator
      let creatorId: string | null = null;
      if (chId) {
        const ex = await pool.query('SELECT id FROM creators WHERE youtube_channel_id=$1',[chId]);
        if (ex.rows.length > 0) { creatorId = ex.rows[0].id as string; }
        else {
          let subs = 0;
          try {
            const ch = await ytGet('channels',{part:'statistics',id:chId});
            apiCalls++; quota += 1;
            if (ch.items?.[0]) subs = parseInt(ch.items[0].statistics.subscriberCount||'0');
          } catch {}
          const cr = await pool.query('INSERT INTO creators (channel_name,youtube_channel_id,subscriber_count,quality_score) VALUES ($1,$2,$3,$4) ON CONFLICT (youtube_channel_id) DO NOTHING RETURNING id',[chName,chId,subs,0.5]);
          if (cr.rows.length>0) creatorId=cr.rows[0].id as string;
          else { const re=await pool.query('SELECT id FROM creators WHERE youtube_channel_id=$1',[chId]); if(re.rows.length>0) creatorId=re.rows[0].id as string; }
        }
      }

      const existing = await pool.query('SELECT id FROM loops WHERE youtube_video_id=$1',[v.id]);
      if (existing.rows.length>0) { qi_skip++; continue; }

      const subsRow = creatorId ? (await pool.query('SELECT subscriber_count FROM creators WHERE id=$1',[creatorId])).rows[0] : null;
      const subs: number = subsRow?.subscriber_count ? Number(subsRow.subscriber_count) : 0;
      const qs = qualityScore(views,likes,emb,dur,subs);

      const lr = await pool.query(
        `INSERT INTO loops (title,source_type,youtube_video_id,youtube_embed_url,creator_id,bpm,duration_seconds,view_count,like_count,is_embeddable,is_active,is_featured,quality_score,description,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,$14) RETURNING id`,
        [title,'youtube',v.id,`https://www.youtube.com/embed/${v.id}`,creatorId,bpm,dur,views,likes,emb,qs>0.6,qs.toFixed(2),(desc||'').substring(0,500),tags]
      );

      if (lr.rows.length > 0) {
        const loopId = lr.rows[0].id;
        // Taxonomy
        const tsId = timeSig && taxCache.ts[timeSig] ? taxCache.ts[timeSig] : taxCache.ts['4/4'];
        if (tsId) await pool.query('INSERT INTO loop_time_signatures (loop_id,time_signature_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[loopId,tsId]).catch(()=>{});
        for (const g of genres) { if(taxCache.g[g]) await pool.query('INSERT INTO loop_genres (loop_id,genre_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[loopId,taxCache.g[g]]).catch(()=>{}); }
        for (const f of feels) { if(taxCache.f[f]) await pool.query('INSERT INTO loop_feels (loop_id,feel_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[loopId,taxCache.f[f]]).catch(()=>{}); }
        if (taxCache.ct[contentType]) await pool.query('INSERT INTO loop_content_types (loop_id,content_type_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[loopId,taxCache.ct[contentType]]).catch(()=>{});
        qi_ins++;
      }
    }
    inserted += qi_ins; skipped += qi_skip;
    console.log(`  Inserted: ${qi_ins}, Skipped: ${qi_skip} (quota: ${quota})`);
  }

  // Set featured
  await pool.query('UPDATE loops SET is_featured=true WHERE id IN (SELECT id FROM loops WHERE is_active=true AND bpm IS NOT NULL ORDER BY quality_score DESC LIMIT 16)');

  console.log(`\n${'='.repeat(50)}\nINGEST COMPLETE\n  Inserted: ${inserted}\n  Skipped: ${skipped}\n  API calls: ${apiCalls}\n  Quota: ${quota}/10000\n${'='.repeat(50)}`);
  await pool.end();
}

main().catch(e=>{console.error('FATAL:',e);pool.end();process.exit(1)});
