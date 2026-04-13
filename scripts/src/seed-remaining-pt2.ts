/**
 * Seed remaining: Rich Redmond multitrack, Joey Waronker multitrack, Curt Rock V2 multitrack,
 * Marcus Finnie V2, One Man Tribe, plus any missing small folders.
 * APPENDS to existing data.
 */
import pg from "pg";
const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const CDN = "groovelab-loops-cdn.b-cdn.net";

function slug(s: string): string { return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function extractSection(name: string): { type: string; num: number | null } {
  for (const sec of ["verse","chorus","intro","outro","bridge","fill","break","ending","end","groove","bell","ride",
    "hat","halftime","doubletime","prechorus","interlude","stripped","countoff","pedal","walkdown","xstick","toms","crash","snare","loosehat","tighthat","kick"]) {
    if (name.toLowerCase().startsWith(sec)) { const m = name.match(/\s(\d+)$/); return { type: sec, num: m ? +m[1] : null }; }
  }
  for (const sec of ["chorus","verse","intro","outro","bridge","fill","ending","break"]) {
    if (name.toLowerCase().includes(sec)) { const m = name.match(/\s(\d+)$/); return { type: sec, num: m ? +m[1] : null }; }
  }
  const m = name.match(/\s(\d+)$/);
  return { type: "full_loop", num: m ? +m[1] : null };
}
function extractBpm(name: string, def?: number): number | null {
  const m = name.match(/(\d{2,3})\s*bpm/i); if (m) return +m[1]; return def || null;
}
function shouldSkip(g: string): boolean {
  const l = g.toLowerCase().trim();
  return /one\s*shots?|samples|multitrack_loops|stereo_?loops|battery.*kit|kit\s*samples/i.test(l) ||
    l.startsWith("_percussion") || l.startsWith("_x") || l.startsWith("_stereo") || /^percussion$/i.test(l) || /^kick$/i.test(l);
}

interface F { folder: string; artist: string; instrument: string; genre: string; bpm?: number; key?: string; isMultitrack?: boolean; grooves: string[]; }

async function insertFolder(f: F) {
  const valid = f.grooves.filter(g => !shouldSkip(g));
  let ins = 0;
  for (const g of valid) {
    const bpm = extractBpm(g, f.bpm);
    const sec = extractSection(g);
    const wavUrl = `https://${CDN}/${slug(f.artist)}/${slug(f.folder)}/${slug(g)}.wav`;
    try {
      await pool.query(
        `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre, bpm, key_signature, time_signature, feel, section_type, section_number, is_multitrack, wav_url, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [g, f.artist, f.folder, g, f.instrument, f.genre, bpm, f.key||null, "4/4", null, sec.type, sec.num, f.isMultitrack||false, wavUrl, []]
      );
      ins++;
    } catch(e: any) { console.error(`  ERR: ${g} — ${e.message}`); }
  }
  console.log(`  ${f.folder}: ${ins}/${valid.length}`);
  return ins;
}

// Helper to generate Rich Redmond style grooves
function rrGrooves(prefix: string, counts: Record<string, number>): string[] {
  const result: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    for (let i = 1; i <= count; i++) result.push(`${prefix} ${type} ${i}`);
  }
  return result;
}

async function main() {
  let total = 0;

  // ── Rich Redmond V1 Multitrack (482 loops) ──
  const rrGrooveList: string[] = [
    "Backbeat 1","Backbeat 2",
    ...rrGrooves("Bell", { "1":1,"2":1,"3":1,"4":1 }),
    ...rrGrooves("Bell Crash", { "1":1,"2":1,"3":1,"4":1,"5":1 }),
    ...rrGrooves("Bell Fill", { "1":1,"2":1,"3":1 }),
    "Bell OffBeat 1","Bell OffBeat 2","Bell OffBeat Crash 1","Bell OffBeat Fill 1",
    "Breakdown 1a","Breakdown 1b","Breakdown 2a","Breakdown 2b","Breakdown 3","Breakdown 4","Breakdown Fill 1",
    "Bridge 1a","Bridge 1b","Bridge 3","Bridge Fill 1",
    "Building Fill 1","Building Fill 2","Building Fill 3",
    "Chorus 1a","Chorus 1b","Chorus 2","Chorus 3",
    "Chorus Crash 1a","Chorus Crash 1b","Chorus Crash 2a","Chorus Crash 2b","Chorus Crash 3a","Chorus Crash 3b","Chorus Crash 4",
    "Chorus Fill 1a","Chorus Fill 1b","Chorus Fill 2",
    "Crash 1a","Crash 1b","Crash 2a","Crash 2b","Crash 3a","Crash 3b","Crash 4",
    "Crash Fill 1","Crash QuarterSnares 1","Crash QuarterSnares 2","Crash QuarterSnares 3","Crash Stop 1","Crash and Roll",
    "DoubleTime 1","DoubleTime 2","DoubleTime Crash 1","DoubleTime Fill 1","DoubleTime Ride 1","DoubleTime Ride 2","DoubleTime Tom 1","DoubleTime Tom 2",
    "End","End Flam",
    "Fill 1a","Fill 1b","Fill 1c","Fill 1d","Fill 2a","Fill 2b","Fill 2c","Fill 3a","Fill 3b",
    "Fill Building 1","Fill Stop 1","Fill Stop 2",
    "Four On The Floor 1","Four On The Floor 2","Four On The Floor 3",
    "FourOnFloor 1","FourOnFloor 2","FourOnFloor Fill 1","FourOnFloor Fill 2",
    "GrooveA 1","GrooveA 2","GrooveB 1","GrooveB 2","GrooveB 3","GrooveB 4",
    "GrooveC 1","GrooveC 2","GrooveC 3","GrooveC Fill 1",
    "GrooveD 1","GrooveD 2","GrooveD 3","GrooveE 1","GrooveE 2","GrooveF 1","GrooveF 2",
    "Halftime 1","Halftime 2","Halftime 3","Halftime 4","Halftime 5","Halftime 6","Halftime 7",
    "Halftime Crash 1a","Halftime Crash 1b","Halftime Crash 2","Halftime Fill 1",
    "Hat Break 1","Hat Break 2","Hat Break 3",
    "Heavy Crash 1","Heavy Crash 2","Heavy Crash Fill 1",
    "HeavyCrash 1","HeavyCrash 2","HeavyCrash 3","HeavyCrash 4","HeavyCrash 5","HeavyCrash Fill 1",
    "Hits 1","Hits 2","Hits 3","Hits 4","Hits 5",
    "Intro 1a","Intro 1b","Intro 1c","Intro 2a","Intro 2b","Intro Crash 1",
    "Intro Fill 1a","Intro Fill 1b","Intro Fill 2a","Intro Fill 2b",
    "Intro Pickup 1a","Intro Pickup 1b","Intro Pickup 2a","Intro Pickup 2b","Intro Pickup 3","Intro Pickup 4",
    "JustSnare 1","JustSnare 2",
  ];
  // LooseHat variants (massive section)
  for (let i=1;i<=8;i++) rrGrooveList.push(`LooseHat ${i}a`,`LooseHat ${i}b`);
  rrGrooveList.push("LooseHat Building");
  for (let i=1;i<=5;i++) rrGrooveList.push(`LooseHat Crash ${i}a`,`LooseHat Crash ${i}b`);
  rrGrooveList.push("LooseHat Crash Fill 1a","LooseHat Crash Fill 1b","LooseHat Crash Fill 2");
  for (let i=1;i<=5;i++) rrGrooveList.push(`LooseHat Fill ${i}a`,`LooseHat Fill ${i}b`);
  rrGrooveList.push("LooseHatB 1","LooseHatB Crash 1","LooseHatB Fill 1");
  // Outro
  rrGrooveList.push("Outro 1a","Outro 1b","Outro 1c","Outro 1d","Outro 2a","Outro 2b","Outro 2c","Outro Fill","Outro Fill 1");
  // PreChorus
  rrGrooveList.push("PreChorus 1a","PreChorus 1b","PreChorus 2a","PreChorus 2b","PreChorus 3a","PreChorus 3b","PreChorus Fill 1");
  // Quarter Kick
  for (let i=1;i<=4;i++) rrGrooveList.push(`Quarter Kick ${i}`);
  rrGrooveList.push("Quarter Kick Crash 1","Quarter Kick Fill 1","Quarter Kick Snare 4 1","Quarter Kick Tom 1","Quarter Kicks 1","Quarter Kicks 2");
  // Ride
  for (let i=1;i<=8;i++) rrGrooveList.push(`Ride ${i}`);
  for (let i=1;i<=7;i++) rrGrooveList.push(`Ride Crash ${i}`);
  for (let i=1;i<=7;i++) rrGrooveList.push(`Ride Fill ${i}`);
  rrGrooveList.push("Ride Quarter Kicks 1","Ride Roll");
  rrGrooveList.push("Rim Crash 1","Rim Crash Fill 1");
  rrGrooveList.push("Snare 2 Combo 4 1","Snare 2 Combo 4 2","Snare 2 Combo 4 3","Snare 2 Combo 4 Crash 1","Snare 2 Tom 4 1","Snare 2 Tom 4 2","Snare Flam");
  rrGrooveList.push("Snare Groove A 1","Snare Groove A Crash 1");
  for (let i=1;i<=6;i++) rrGrooveList.push(`Snare Groove B ${i}`);
  rrGrooveList.push("Snare Groove B Crash 1","Snare Groove B Crash 2","Snare Groove B Fill 1","Snare Groove B Fill 2","Snare Groove B Fill 3");
  rrGrooveList.push("SnareAndToms 1","SnareAndToms 2","SnareAndTomsB 1","SnareAndTomsB 2","SnareAndTomsB Fill 1");
  rrGrooveList.push("SnareGroove 1a","SnareGroove 1b","SnareGroove 2","SnareGroove Fill 1");
  rrGrooveList.push("Tom Groove 1","Tom Groove 2","Tom Groove Crash 1","Tom Groove Fill 1");
  rrGrooveList.push("TomGroove 1","TomGroove 2","TomGroove Crash 1","TomGroove Fill 1");
  rrGrooveList.push("Toms 1a","Toms 1b","Toms Crash 1a","Toms Crash 1b","Toms Stop 1");
  // Verse (massive)
  for (let i=1;i<=11;i++) rrGrooveList.push(`Verse ${i}`);
  for (let i=1;i<=5;i++) rrGrooveList.push(`Verse ${i}b`);
  rrGrooveList.push("Verse B 1","Verse B 2","Verse B Crash 1","Verse B Crash 2");
  rrGrooveList.push("Verse Building 1","Verse Building 2","Verse Building 3");
  for (let i=1;i<=4;i++) rrGrooveList.push(`Verse Crash ${i}`);
  rrGrooveList.push("Verse Crash Fill 1");
  for (let i=1;i<=10;i++) rrGrooveList.push(`Verse Fill ${i}`);
  rrGrooveList.push("VerseB 1a","VerseB 1b","VerseB 2a","VerseB 2b","VerseC Crash 1");
  // XStick
  for (let i=1;i<=7;i++) rrGrooveList.push(`XStick ${i}`);
  rrGrooveList.push("XStick BackBeat 1","XStick BackBeat 2","XStick BackBeat Fill 1");
  for (let i=1;i<=2;i++) rrGrooveList.push(`XStick Fill ${i}`);
  rrGrooveList.push("XStick Kick2and4 1","XStick Kick2and4 2","XStick Kick2and4 Fill 1","XStick Snare 1","XStick Snare 2","XStick4 1","XStick4 2");

  total += await insertFolder({ folder: "RichRedmondV1_MultitrackEdition_WAV", artist: "Rich Redmond", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: rrGrooveList });

  // ── Joey Waronker V2 Multitrack (256 loops) ──
  const jwGrooves: string[] = [
    "8ths 1","8ths 2","8ths Fill 1","Aux Kit 107bpm","Crash","Crash BB 1","Crash BB 2","Crash BB 3",
    "Ending 1","Ending 2","Ending 3","Fibes Kit Perc 123bpm","Fibes Kit Perc 85bpm",
  ];
  for (let i=1;i<=9;i++) jwGrooves.push(`Fill ${i}`);
  jwGrooves.push("Flipped 1a","Flipped 1b","Flipped 2","Flipped 3","Flipped Crash 1","Flipped Crash 2","Flipped Crash 3");
  for (let i=1;i<=7;i++) jwGrooves.push(`FourOnFloor ${i}`);
  jwGrooves.push("FourOnFloor 16s 1","FourOnFloor 16s 2","FourOnFloor 16s 3","FourOnFloor 16s 4","FourOnFloor OffBeats 1","FourOnFloor OffBeats 2");
  // Groove A-G
  for (let i=1;i<=6;i++) jwGrooves.push(`Groove A ${i}`);
  for (let i=1;i<=4;i++) jwGrooves.push(`Groove A Fill ${i}`);
  for (let i=1;i<=3;i++) jwGrooves.push(`Groove B ${i}`);
  for (let i=1;i<=4;i++) jwGrooves.push(`Groove B Fill ${i}`);
  for (let i=1;i<=4;i++) jwGrooves.push(`Groove C ${i}`);
  jwGrooves.push("Groove C Crash 1","Groove C Fill 1");
  for (let i=1;i<=7;i++) jwGrooves.push(`Groove Crash ${i}`);
  for (let i=1;i<=3;i++) jwGrooves.push(`Groove D ${i}`);
  jwGrooves.push("Groove D Crash 1","Groove D Fill 1");
  for (let i=1;i<=4;i++) jwGrooves.push(`Groove E ${i}`);
  jwGrooves.push("Groove E Fill 1","Groove E Fill 2","Groove F 1");
  for (let i=1;i<=5;i++) jwGrooves.push(`Groove Fill ${i}`);
  jwGrooves.push("Groove G 1","GrooveFill 1","GrooveFill 2","GrooveFill 3","Hit 1");
  // Intros
  for (let i=1;i<=5;i++) jwGrooves.push(`Intro ${i}`);
  for (let i=1;i<=5;i++) jwGrooves.push(`Intro B ${i}`);
  for (let i=1;i<=5;i++) jwGrooves.push(`Intro C ${i}`);
  jwGrooves.push("Intro C Fill 1","Intro C Fill 2");
  jwGrooves.push("KickAndSnare 1","KickAndSnare 2","KickAndSnare 3","KickAndSnare 4","LP Kit Percussion 79bpm");
  for (let i=1;i<=4;i++) jwGrooves.push(`Low Tom Groove ${i}`);
  for (let i=1;i<=3;i++) jwGrooves.push(`Perc Groove ${i}`);
  for (let i=1;i<=6;i++) jwGrooves.push(`Perc Groove Crash ${i}`);
  jwGrooves.push("Perc Groove Fill 1");
  for (let i=1;i<=4;i++) jwGrooves.push(`Ride ${i}`);
  jwGrooves.push("Ride Crash 1","Ride Crash 2");
  for (let i=1;i<=3;i++) jwGrooves.push(`Ride Fill ${i}`);
  jwGrooves.push("Shuffle-ish 1","Shuffle-ish 2","Shuffle-ish 3","Shuffle-ish Crash 1","Shuffle-ish Fill 1","Stack Groove 1","Tom Fill 1");
  // Tom Grooves
  for (let i=1;i<=5;i++) jwGrooves.push(`Tom Groove ${i}`);
  for (let i=1;i<=5;i++) jwGrooves.push(`Tom Groove 16s ${i}`);
  for (let i=1;i<=5;i++) jwGrooves.push(`Tom Groove A ${i}`);
  jwGrooves.push("Tom Groove B 1","Tom Groove B 2","Tom Groove C 1","Tom Groove C 2","Tom Groove C 3","Tom Groove C 4");
  for (let i=1;i<=4;i++) jwGrooves.push(`Tom Groove Crash ${i}`);
  jwGrooves.push("Tom Groove Fill 1");
  for (let i=1;i<=4;i++) jwGrooves.push(`Tom with Snare ${i}`);
  for (let i=1;i<=4;i++) jwGrooves.push(`Tom with Snare 16s ${i}`);
  jwGrooves.push("Tom with Snare Fill 1","Toms 1","Toms 2","Toms 3");
  for (let i=1;i<=4;i++) jwGrooves.push(`XStick ${i}`);
  jwGrooves.push("XStick B 1","XStick Crash 1","XStick Crash 2","XStick Fill 1","XStick Fill 2");

  total += await insertFolder({ folder: "JoeyWaronkerV2_MultitrackDrums", artist: "Joey Waronker", instrument: "drums", genre: "Indie Rock", isMultitrack: true, grooves: jwGrooves });

  // ── Curt Rock V2 Multitrack (369 loops) ──
  const curtGrooves: string[] = [
    "16Bar 1","16Bar Solo 1",
  ];
  for (let i=1;i<=6;i++) curtGrooves.push(`16ths ${i}`);
  curtGrooves.push("16ths Crash 1");
  for (let i=1;i<=3;i++) curtGrooves.push(`16ths Fill ${i}`);
  curtGrooves.push("16ths Stop 1","4 Bar 1","4Bar 1","4Bar Fill 1","4Bar Fill 2","4Bar Stop 1","6Bar 1","8 Bar 1","8 Bar 2","8 Bar 3","8Bar 1");
  // A through G sections
  for (let i=1;i<=9;i++) curtGrooves.push(`A ${i}`);
  for (let i=1;i<=7;i++) curtGrooves.push(`A Crash ${i}`);
  for (let i=1;i<=3;i++) curtGrooves.push(`A Fill ${i}`);
  curtGrooves.push("A Stop 1a","A Stop 1b");
  for (let i=1;i<=4;i++) curtGrooves.push(`B ${i}`);
  curtGrooves.push("B Crash 1a","B Crash 1b");
  for (let i=1;i<=4;i++) curtGrooves.push(`B Fill ${i}`);
  curtGrooves.push("Bell 1a","Bell 1b","Bell 1c","Bell 2a","Bell 2b","Bell Fill 1");
  curtGrooves.push("Break 1","Break 2","Break B 1","Break B 2","Break C 1","Break C 2");
  curtGrooves.push("C 1a","C 1b","C Crash 1","C Crash 2","C Fill 1","C Stop 1","Crash","Crash 1","Cymbal Roll","Cymbals 1","Cymbals 2","Cymbals 3");
  curtGrooves.push("D 1a","D 1b","D 2","D 3","D Crash 1","D Crash 2","D Fill 1","D Stop 1");
  curtGrooves.push("E 1","E 2","E Crash 1","E Fill 1","End Fill 1","End Fill 2","Ending","F 1","F 2");
  for (let i=1;i<=6;i++) curtGrooves.push(`Fill ${i}`);
  curtGrooves.push("Fill Into Groove","Fill Stop 1","Fill to Bell 1","FillStop 1","Flam","G 1","G 2","G Fill 1");
  curtGrooves.push("Hat 1","Hat 2");
  for (let i=1;i<=4;i++) curtGrooves.push(`Hat 8ths ${i}`);
  curtGrooves.push("Hat 8ths B 1","Hat 8ths B 2","Hat 8ths Fill 1","Hat Solo 1","Hat Solo 2","Hat to Ride 1");
  curtGrooves.push("HatBreak 1a","HatBreak 1b","HatBreak 2a","HatBreak 2b","HatBreak Crash 1","HatBreak Stop 1");
  curtGrooves.push("HatLoose 1","HatLoose 2","HatLoose Crash 1","HatLoose Crash 2","HatLoose Crash 3","HatLoose Fill 1");
  for (let i=1;i<=4;i++) curtGrooves.push(`Intro ${i}`);
  curtGrooves.push("Intro A 1","Intro A 2","Intro B 1","Intro B 2","Intro Crash 1","Intro Fill 1a","Intro Fill 1b","Intro Stop 1");
  // Jangles
  curtGrooves.push("Jangles A 1","Jangles A 2","Jangles B 1","Jangles B 2","Jangles B Fill 1","Jangles B Fill 2","Jangles C 1","Jangles C 2","Jangles D 1","Jangles D Fill 1");
  curtGrooves.push("KickBreak 1","KickBreak 2","KickBreak Fill 1","KickCrash 1","KickHat 1a","KickHat 1b","KickSnare 1","KickSnare 2","KickSnare 3");
  curtGrooves.push("Marchy 1","Marchy 2","Marchy 3","Marchy Fill 1","NoHat 1","NoHat 2","NoHat 3","NoHat Fill 1","NoKick 1","NoKick 2");
  curtGrooves.push("Pickup Fill 1","PickupFill 1");
  // Ride
  for (let i=1;i<=3;i++) curtGrooves.push(`Ride ${i}a`,`Ride ${i}b`,`Ride ${i}c`);
  for (let i=1;i<=5;i++) curtGrooves.push(`Ride Crash ${i}`);
  for (let i=1;i<=5;i++) curtGrooves.push(`Ride Fill ${i}`);
  curtGrooves.push("Ride Stop 1a","Ride Stop 1b","Ride Stop 2","Ride to Bell 1","Ride to Hat 1","RollFill 1","Snare Flam","SnareRide");
  // Stack
  for (let i=1;i<=3;i++) curtGrooves.push(`Stack ${i}`);
  curtGrooves.push("Stack A 1","Stack A 2","Stack A 3","Stack A 4","Stack A Crash 1","Stack A Fill 1");
  curtGrooves.push("Stack Break 1","Stack Break 2","Stack Break Stop 1");
  curtGrooves.push("Stack Crash 1","Stack Crash 2","Stack Fill 1a","Stack Fill 1b","Tom Hits 1");
  // Toms
  for (let i=1;i<=4;i++) curtGrooves.push(`Toms ${i}`);
  curtGrooves.push("Toms A 1a","Toms A 1b","Toms A 2a","Toms A 2b","Toms A 3","Toms A Fill 1");
  curtGrooves.push("Toms B 1a","Toms B 1b","Toms B 2a","Toms B 2b","Toms B 3","Toms B Stop 1");
  curtGrooves.push("Toms Crash 1a","Toms Crash 1b","Toms Fill 1a","Toms Fill 1b","Toms to Hat 1","XStick Solo 1","XStick Solo 2");

  total += await insertFolder({ folder: "CurtRockV2_MultitrackEdition_WAV", artist: "Curt Bisquera", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: curtGrooves });

  // ── Marcus Finnie V2 Pt1 (87 loops) ──
  const mfV2p1: string[] = [];
  mfV2p1.push("Bell 1a","Bell 1b","Bell 2a","Bell 2b","Bell 3","Bell 4","Bell 5","Bell Crash 1a","Bell Crash 1b","Bell Crash 2","Bell Fill 1a","Bell Fill 1b","Bell Fill 2a","Bell Fill 2b");
  mfV2p1.push("Breakthrough 120bpm","Crash Hits 1");
  mfV2p1.push("DoubleTime 1","DoubleTime 2","DoubleTime 3","DoubleTime 4","DoubleTime 16ths 1","DoubleTime 16ths 2","DoubleTime 16ths 2b","DoubleTime 16ths 4OF 1","DoubleTime 16ths 4OF 2","DoubleTime 16ths 4OF 3","DoubleTime 16ths Fill 1");
  mfV2p1.push("Fill 1a","Fill 1b","Fill 2","Funk Fusion 140bpm");
  mfV2p1.push("Halftime 1","Halftime 2","Halftime 3","Halftime Fill 1","Hit Maker 100bpm");
  mfV2p1.push("Intro 1a","Intro 1b","Intro 2a","Intro 2b","Intro 3","Intro Fill 1");
  mfV2p1.push("Outro 1a","Outro 1b","Outro 2a","Outro 2b","Outro 3a","Outro 3b","Outro End","Outro Full");
  mfV2p1.push("Verse 1a","Verse 1b","Verse 1c","Verse 2a","Verse 2b");
  mfV2p1.push("Verse A 1","Verse B 1a","Verse B 1b","Verse B 1c","Verse B 2a","Verse B 2b","Verse B 3","Verse B Crash 1a","Verse B Crash 1b","Verse B Fill 1a","Verse B Fill 1b","Verse B Fill 1c","Verse B Stop 1");
  mfV2p1.push("Verse C 1","Verse C 2","Verse C Crash 1","Verse C Fill 1","Verse Crash 1a","Verse Crash 1b","Verse Fill 1","Verse Stop 1");
  mfV2p1.push("XStick 1","XStick 2","XStick 3","XStick Crash 1","XStick Fill 1","XStick Fill 2");
  total += await insertFolder({ folder: "MarcusFinnieSessionDrumsV2_Pt1_WAV", artist: "Marcus Finnie", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: mfV2p1 });

  // ── Marcus Finnie V2 Pt2 (56 loops) ──
  const mfV2p2: string[] = [
    "8 Bar Phrase","Bell 1","Bell 2","Bell Crash 1","Bell Fill 1","Count In","Crash","Crash Hits and Fill",
    "Fill 1","Fill 2","Intro 1a","Intro 1b","Intro 2","Intro Crash 1","Intro Fill 1a","Intro Fill 1b",
    "Outro","Pocket Protector 180bpm",
    "Ride 1a","Ride 1b","Ride 2","Ride 3","Ride 4","Ride 8Bar 1","Ride Crash 1a","Ride Crash 1b","Ride Crash 2","Ride Fill 1",
    "Shuffle 100bpm","Stop 1","Straight Up 200bpm",
    "Verse 1a","Verse 1b","Verse 1c","Verse 2a","Verse 2b",
    "Verse B 1a","Verse B 1b","Verse B 1c","Verse B 2a","Verse B 2b","Verse B 2c","Verse B 3",
    "Verse B Crash 1a","Verse B Crash 1b","Verse B Fill 1a","Verse B Fill 1b","Verse B Fill 2",
    "Verse Crash 1a","Verse Crash 1b","Verse Fill 1a","Verse Fill 1b",
  ];
  total += await insertFolder({ folder: "MarcusFinnieSessionDrumsV2_Pt2_WAV", artist: "Marcus Finnie", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: mfV2p2 });

  // ── Marcus Finnie V2 Pt3 (52 loops) ──
  const mfV2p3: string[] = [
    "16ths 1","16ths 2","16ths 3","16ths Crash 1","16ths Crash 2","16ths Fill 1","16ths Fill 2",
    "Bell 1","Bell 2","Bell Crash 1","Bell Crash 2","Bell Fill 1","Crash",
    "Fill 1a","Fill 1b","Fill 2a","Fill 2b","Fill 3",
    "Ride 1","Ride 2","Ride Fill 1",
    "Swunky 160bpm","Take A Ride 80bpm","The Warm Up 60bpm",
    "Verse 1a","Verse 1b","Verse 2a","Verse 2b","Verse 2c","Verse 3","Verse 4","Verse 4 Bar","Verse 5",
    "Verse A 1","Verse A 2","Verse A 3","Verse A Crash 1","Verse A Crash 2","Verse A Fill 1",
    "Verse B 1","Verse B 2","Verse B Crash 1","Verse C 1","Verse C 2",
    "Verse Crash 1","Verse Fill 1","Verse Fill 2",
  ];
  total += await insertFolder({ folder: "MarcusFinnieSessionDrumsV2_Pt3_WAV", artist: "Marcus Finnie", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: mfV2p3 });

  // ── One Man Tribe Vol1 TapeDrums (180 loops) ──
  const omtV1: string[] = [];
  for (let beat=1;beat<=10;beat++) {
    const bpms = [70,80,90,100,108,125,135,140,150,168];
    for (let v=1;v<=9;v++) omtV1.push(`Beat ${beat} ${bpms[beat-1]}bpm v${v}`);
  }
  // 90 drums multitracks
  for (let beat=1;beat<=10;beat++) {
    for (let v=1;v<=9;v++) omtV1.push(`Drums Multitracks Beat${beat} v${v}`);
  }
  total += await insertFolder({ folder: "OneManTribeVol1_TapeDrums_WAV", artist: "One Man Tribe", instrument: "drums", genre: "World", isMultitrack: true, grooves: omtV1 });

  // ── One Man Tribe Vol2 CreativePercussion (66 loops) ──
  const omtV2: string[] = [
    "Full Ensemble Beats","100 bpm A","100 bpm B","120 bpm A","120 bpm B",
    "Ambience 1","Ambience 2","Ambience 3","Ambience 4","Ambience 5","Ambience 6","Ambience 7","Ambience 8","Ambience 9",
    "Cheek Slap 1","Cheek Slap 2","Chest Hit 1","Chest Hit 2","Claps 1","Claps 2","Claps 3",
    "Darbuka Style","Doun Bass 1","Doun Bass 2","Doun Drums 1","Doun Drums 2",
    "Fills 1","Fills 2","Fills 3","Full Beats 1","Full Beats 2","Full Percussion Beats","Lite Beats",
    "Loops 1","Loops 2","Loops 3","Loops 4","Loops 5","Loops 6","Loops 7","Loops 8","Loops 9","Loops 10",
    "Low Drums","Massive Beats",
    "Percussion 1","Percussion 2","Percussion 3","Percussion 4","Percussion 5","Percussion 6","Percussion 7","Percussion 8","Percussion 9","Percussion 10","Percussion 11","Percussion 12",
    "Shakers 1","Shakers 2","Shakers 3","Shakers and Metals","Stomp 1","Stomp 2","Vocals 1","Vocals 2",
  ];
  total += await insertFolder({ folder: "OneManTribeVol2_CreativePercussion_WAV", artist: "One Man Tribe", instrument: "percussion", genre: "World", grooves: omtV2 });

  // ── One Man Tribe Vol3 CosmicPercussion (100 loops) ──
  const omtV3: string[] = [
    "ANTARES","ARCTURUS","Alfaia Bass","Alfaia Kick","BELLATRIX",
    "Beat1 Drums MultiTracks","Bells","Bongo","CANOPUS","Caxixi","Claps","Claves","Cowbell",
    "DENEB","DENEBOLA",
  ];
  for (let i=1;i<=10;i++) omtV3.push(`Drums MultiTracks ${i}`);
  omtV3.push("Dry 1","Dry 2","Dry 3","FULU","FX","Full Beats 1","Full Beats 2","Full Rhythms","HiHat","Indian Drums","KALAUSI");
  for (let i=1;i<=12;i++) omtV3.push(`Loops ${i}`);
  omtV3.push("MAGO","MATAR","Metallic");
  for (let i=1;i<=16;i++) omtV3.push(`One Shots ${i}`);
  omtV3.push("POLLUX","Percussion 1","Percussion 2","RIGEL","SIRIUS","SOLARIS","SPICA");
  for (let i=1;i<=10;i++) omtV3.push(`Shake Hat Beat ${i}`);
  omtV3.push("Shake Hat","Shaker","Shakers 1","Shakers 2","Snare","TITAWIN","Tambourim","Tambourine","Thiol","VEGA","WEZEN","Wet 1","Wet 2","Woodblock","Wooden","ZANIAH","ZIBAL");

  total += await insertFolder({ folder: "OneManTribeVol3_CosmicPercussion_WAV", artist: "One Man Tribe", instrument: "percussion", genre: "World", grooves: omtV3 });

  // ── Missing Ryan Gruss volumes (individual vol2-8 that were in the bundle but not added separately) ──
  for (const [vol, grooves] of [
    ["RyanGruss_HybridDrumsVol2_MIDI_WAV", ["80s Delays 85bpm","Big Linear 111bpm","Dry Aggression 71bpm","Fast Funk 122bpm","On The Floor 90bpm","Organic Mallets 95bpm"]],
    ["RyanGruss_HybridDrumsVol2_WAV_MIDI", ["Big Linear 111bpm","Dry Aggression 71bpm","Fast Funk 122bpm","On The Floor 90bpm","Organic Mallets 95bpm"]],
    ["RyanGruss_HybridDrumsVol3_MIDI_WAV", ["Big Three 110bpm","Grainy Day 83bpm","Seven Eight 90bpm","Slow Snow 63bpm","Sprockets 136bpm","Turnaround 91bpm"]],
    ["RyanGruss_HybridDrumsVol4_MIDI_WAV", ["Boo Bighters 160bpm","Five Four Fun 119bpm","Pretty Purdie 80bpm","Rock Shuffle 167bpm","Roll And Rock 133bpm","Soul Ballad 69bpm"]],
    ["RyanGruss_HybridDrumsVol5_MIDI_WAV", ["80s Shuffle 105bpm","90s Alt Rock 115bpm","Cinematic Ballad 72bpm","Latin Lounge 105bpm","On The One 129bpm","Rock This Way 95bpm"]],
    ["RyanGruss_HybridDrumsVol6_MIDI_WAV", ["Blooze In Three 183bpm","Fusion Funk 117bpm","Lucky Sevens 77bpm","Punked 142bpm","Rosie 80bpm","Soul Stomp 100bpm"]],
    ["RyanGruss_HybridDrumsVol7_MIDI_WAV", ["Afro Cuban 210bpm","Indie Rock 110bpm","Retro Rock Ballad 135bpm","Slow Chicago Blues 160bpm","Thick Blues 170bpm","Vintage Blues 200bpm"]],
    ["RyanGruss_HybridDrumsVol8_MIDI_WAV", ["After Hours 180bpm","Cinematic Mallets 175bpm","Fast Folk 205bpm","Fusion Three 120bpm","Moon Light 140bpm","Robot Waltz 197bpm"]],
    ["RyanGruss_HybridDrumsVol1_MIDI_WAV", ["Hip Hop 82bpm","In Three 180bpm","Indie 93bpm","Slow Funk 79bpm","Soul 110bpm","Vintage Pop 100bpm"]],
  ] as [string, string[]][]) {
    total += await insertFolder({ folder: vol, artist: "Ryan Gruss", instrument: "drums", genre: "Rock", grooves });
  }

  console.log(`\nPart 2 total inserted: ${total}`);
  const count = await pool.query("SELECT COUNT(*)::int as c FROM audio_loops");
  console.log(`Database now has ${count.rows[0].c} audio loops`);

  // Summary
  const artists = await pool.query("SELECT artist, COUNT(*)::int as c FROM audio_loops GROUP BY artist ORDER BY c DESC");
  console.log("\nArtist breakdown:");
  for (const r of artists.rows) console.log(`  ${r.artist}: ${r.c}`);

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
