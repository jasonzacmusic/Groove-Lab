import pg from "pg";
import https from "https";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL!;
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD!;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'groovelab-loops';
const BUNNY_CDN_HOST = process.env.BUNNY_CDN_HOST || 'groovelab-loops-cdn.b-cdn.net';
const BUNNY_STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'sg';

const pool = new pg.Pool({ connectionString: DATABASE_URL });

interface StemDef {
  name: string;
  filename: string;
  type: string;
}

interface LoopEntry {
  artist: string;
  collection: string;
  groove_name: string;
  section_type: string;
  section_number?: number;
  bpm?: number;
  genre: string;
  sub_genre?: string;
  feel?: string;
  time_signature?: string;
  key_signature?: string;
  instrument_category: string;
  is_multitrack?: boolean;
  has_kick?: boolean;
  has_snare?: boolean;
  has_hihat?: boolean;
  has_toms?: boolean;
  has_cymbals?: boolean;
  has_percussion?: boolean;
  intensity?: string;
  stems?: StemDef[];
  local_path: string;
  tags?: string[];
}

interface Catalog {
  loops: LoopEntry[];
}

// Upload file to Bunny Storage
async function uploadToBunny(localPath: string, remotePath: string): Promise<string> {
  const data = fs.readFileSync(localPath);
  const url = `https://${BUNNY_STORAGE_REGION}.storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${remotePath}`;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_STORAGE_PASSWORD,
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(`https://${BUNNY_CDN_HOST}/${remotePath}`);
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Get file size and duration estimate
function getFileInfo(filePath: string): { size: number; estimatedDuration: number } {
  const stats = fs.statSync(filePath);
  // Rough estimate: 44100 * 2 (16-bit) * 2 (stereo) = 176400 bytes per second
  const estimatedDuration = stats.size / 176400;
  return { size: stats.size, estimatedDuration };
}

async function main() {
  const catalogPath = process.argv[2];
  if (!catalogPath) {
    console.error('Usage: tsx ingest-audio-loops.ts <catalog.json>');
    process.exit(1);
  }

  if (!DATABASE_URL) { console.error('Set DATABASE_URL'); process.exit(1); }

  const catalog: Catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  console.log(`Loaded catalog with ${catalog.loops.length} loops`);

  let inserted = 0;
  let skipped = 0;
  let uploadErrors = 0;

  for (let i = 0; i < catalog.loops.length; i++) {
    const loop = catalog.loops[i];
    const title = `${loop.groove_name} ${loop.section_type || ''} ${loop.section_number || ''}`.trim();

    console.log(`\n[${i + 1}/${catalog.loops.length}] ${title} (${loop.artist})`);

    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM audio_loops WHERE groove_name = $1 AND artist = $2 AND section_type = $3',
      [loop.groove_name, loop.artist, loop.section_type || null]
    );

    if (existing.rows.length > 0) {
      console.log('  SKIP (exists)');
      skipped++;
      continue;
    }

    // Find the main WAV file
    const localDir = loop.local_path;
    let mainWavPath = '';
    let wavUrl = '';
    let previewUrl: string | null = null;

    if (fs.existsSync(localDir)) {
      // Find the first WAV file in the directory
      const files = fs.readdirSync(localDir).filter(f => f.endsWith('.wav'));
      if (files.length > 0) {
        mainWavPath = path.join(localDir, files[0]);

        // Upload to Bunny
        const remotePath = `${loop.artist}/${loop.collection || 'default'}/${files[0]}`.replace(/\s+/g, '_');
        try {
          wavUrl = await uploadToBunny(mainWavPath, remotePath);
          console.log(`  Uploaded: ${remotePath}`);
        } catch (e: any) {
          console.log(`  Upload failed: ${e.message}`);
          uploadErrors++;
          continue;
        }
      }
    }

    // If no local file, use a placeholder URL
    if (!wavUrl) {
      wavUrl = `https://${BUNNY_CDN_HOST}/placeholder/${loop.artist}/${loop.groove_name}.wav`.replace(/\s+/g, '_');
      console.log('  No local file — using placeholder URL');
    }

    // Get file info
    let fileSize = 0;
    let estimatedDuration = 0;
    if (mainWavPath && fs.existsSync(mainWavPath)) {
      const info = getFileInfo(mainWavPath);
      fileSize = info.size;
      estimatedDuration = info.estimatedDuration;
    }

    // Insert into database
    try {
      await pool.query(
        `INSERT INTO audio_loops (
          title, artist, collection, groove_name, instrument_category, genre, sub_genre,
          bpm, key_signature, time_signature, feel, intensity,
          section_type, section_number,
          has_kick, has_snare, has_hihat, has_toms, has_cymbals, has_percussion,
          is_multitrack, stems, wav_url, preview_url, duration_seconds, file_size_bytes,
          tags
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [
          title, loop.artist, loop.collection || null, loop.groove_name,
          loop.instrument_category, loop.genre, loop.sub_genre || null,
          loop.bpm || null, loop.key_signature || null, loop.time_signature || '4/4',
          loop.feel || null, loop.intensity || null,
          loop.section_type || null, loop.section_number || null,
          loop.has_kick || false, loop.has_snare || false, loop.has_hihat || false,
          loop.has_toms || false, loop.has_cymbals || false, loop.has_percussion || false,
          loop.is_multitrack || false, JSON.stringify(loop.stems || []),
          wavUrl, previewUrl, estimatedDuration || null, fileSize || null,
          loop.tags || [],
        ]
      );
      inserted++;
      console.log('  Inserted into DB');
    } catch (e: any) {
      console.log(`  DB error: ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`INGEST COMPLETE`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${uploadErrors}`);
  console.log(`${'='.repeat(50)}`);

  await pool.end();
}

main().catch(e => { console.error('FATAL:', e); pool.end(); process.exit(1); });
