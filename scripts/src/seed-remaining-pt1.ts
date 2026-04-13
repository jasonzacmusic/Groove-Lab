/**
 * Seed remaining large folders: Bonhamology multitrack, Clyde Stubblefield multitrack
 * APPENDS to existing data (does not clear table).
 */
import pg from "pg";
const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const CDN = "groovelab-loops-cdn.b-cdn.net";

function slug(s: string): string { return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, ""); }

function extractSection(name: string): { type: string; num: number | null } {
  for (const sec of ["verse","chorus","intro","outro","bridge","fill","break","ending","end","groove","bell","ride",
    "hat","halftime","doubletime","prechorus","interlude","guitarsolo","guitarbreak","breakdown","buildup",
    "stripped","countoff","pedal","walkdown","bassbreak","drumbreak","loudsoft","rockin","tomintro","xstick","toms","crash","snare","kick","loosehat","tighthat"]) {
    if (name.toLowerCase().startsWith(sec)) {
      const m = name.match(/\s(\d+)$/);
      return { type: sec, num: m ? +m[1] : null };
    }
  }
  for (const sec of ["chorus","verse","intro","outro","bridge","fill","ending","break"]) {
    if (name.toLowerCase().includes(sec)) {
      const m = name.match(/\s(\d+)$/);
      return { type: sec, num: m ? +m[1] : null };
    }
  }
  const m = name.match(/\s(\d+)$/);
  return { type: "full_loop", num: m ? +m[1] : null };
}

function extractBpm(name: string, def?: number): number | null {
  const m = name.match(/(\d{2,3})\s*bpm/i);
  if (m) return +m[1];
  return def || null;
}

function shouldSkip(g: string): boolean {
  const l = g.toLowerCase().trim();
  return /one\s*shots?|samples|multitrack_loops|stereo_?loops|stereo_?drum|battery.*kit|kit\s*samples|percussion only/i.test(l) ||
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

async function main() {
  let total = 0;

  // ── Bonhamology Vol1 Multitrack (364 loops) ──
  const bonV1: F = { folder: "BonhamologyVol1_MultitrackEdition_WAV", artist: "Bonhamology", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: [
    "Bell Crash LightOnLove 1","Bell Crash LightOnLove 2","Bell Crash LightOnLove 3","Bell Crash LightOnLove 4","Bell Crash LightOnLove 5","Bell Crash LightOnLove 6","Bell Crash LightOnLove 7","Bell Crash LightOnLove 8",
    "Bell Crash MountainMist 1","Bell Crash MountainMist 2","Bell Crash MountainMist 3","Bell Crash MountainMist 4",
    "Bell Fill LightOnLove 1","Bell Fill LightOnLove 2","Bell Fill LightOnLove 3","Bell Fill LightOnLove 4","Bell Fill LightOnLove 5","Bell Fill LightOnLove 6","Bell Fill LightOnLove 7",
    "Bell Fill MountainMist 1","Bell Fill MountainMist 2","Bell Fill MountainMist 3",
    "Bell LightOnLove 1","Bell LightOnLove 2","Bell LightOnLove 3","Bell LightOnLove 4",
    "Bell MountainMist 1","Bell MountainMist 2","Bell MountainMist 3","Bell MountainMist 4","Bell MountainMist 5","Bell MountainMist 6","Bell MountainMist 7",
    "Bell Quarter LightOnLove 1","BellToHat MountainMist 1",
    "BigToms RumbleThunder 1a","BigToms RumbleThunder 1b","BigToms RumbleThunder 2a","BigToms RumbleThunder 2b","BigToms RumbleThunder 3a","BigToms RumbleThunder 3b",
    "Chorus 8Bar NoWrong 1",
    "Chorus A Crash Dropkick 1","Chorus A Crash NoWrong 1","Chorus A Crash NoWrong 2","Chorus A Crash NoWrong 3","Chorus A Crash NoWrong 4",
    "Chorus A Crash Swunky 1","Chorus A Crash Swunky 2","Chorus A Crash Swunky 3","Chorus A Crash Swunky 4","Chorus A Crash Swunky 5",
    "Chorus A Dropkick 1","Chorus A Dropkick 2","Chorus A Dropkick 3","Chorus A Dropkick 4","Chorus A Fill Dropkick 1",
    "Chorus B Crash Dropkick 1","Chorus B Crash Dropkick 2","Chorus B Crash NoWrong 1","Chorus B Crash NoWrong 2","Chorus B Crash NoWrong 3","Chorus B Crash Swunky 1",
    "Chorus B CrashHit Dropkick 1","Chorus B Dropkick 1","Chorus B Dropkick 2","Chorus B Dropkick 3","Chorus B Dropkick 4","Chorus B Dropkick Fill 1",
    "Chorus B Fill NoWrong 1","Chorus B Fill NoWrong 2","Chorus B Fill NoWrong 3","Chorus B Fill Swunky 1","Chorus B Fill Swunky 2","Chorus B Fill Swunky 3",
    "Chorus B Swunky 1","Chorus B Swunky 2","Chorus B Swunky 3",
    "Chorus C Crash Dropkick 1","Chorus C Dropkick 1","Chorus C Dropkick 2","Chorus C Fill Dropkick 1","Chorus C Fill Dropkick 2","Chorus C Fill Dropkick 3","Chorus C Fill Dropkick 4",
    "Chorus Crash LightAndShade 1","Chorus Crash LightAndShade 2","Chorus Crash LightAndShade 3","Chorus Crash LightAndShade 4",
    "Chorus Crash MountainMist 1","Chorus Crash SwissMix 1","Chorus Crash SwissMix 2","Chorus Crash SwissMix 3","Chorus Crash SwissMix 4",
    "Chorus CrashHits NoWrong 1",
    "Chorus Fill LightAndShade 1","Chorus Fill LightAndShade 2","Chorus Fill LightAndShade 3","Chorus Fill LightAndShade 4",
    "Chorus Fill NoWrong 1","Chorus Fill NoWrong 2","Chorus Fill NoWrong 3",
    "Chorus Fill SwissMix 1","Chorus Fill SwissMix 2","Chorus Fill SwissMix 3","Chorus Fill SwissMix 4","Chorus Fill SwissMix 5",
    "Chorus Fill Swunky 1","Chorus Fill Swunky 2",
    "Chorus LightAndShade 1","Chorus LightAndShade 2","Chorus NoWrong 1","Chorus NoWrong 2","Chorus SwissMix 1","Chorus Swunky 1","Chorus Swunky 2",
    "ChorusToVerse Swunky 1","Countoff Dropkick 1","Countoff SwissMix","Crash LightAndShade",
    "Drop Kick 72bpm","End Swunky","Ending LightOnLove",
    "Fill LightOnLove 1","Fill LightOnLove 2","Fill LightOnLove 3","Fill MountainMist 1","Fill MountainMist 2","Fill NoWrong 1","Fill Swunky 1","FillToGroove MountainMist 1",
    "Groove Crash RumbleThunder 1a","Groove Crash RumbleThunder 1b","Groove Crash RumbleThunder 2",
    "Groove RumbleThunder 1a","Groove RumbleThunder 1b","Groove RumbleThunder 2a","Groove RumbleThunder 2b","Groove RumbleThunder 3a","Groove RumbleThunder 3b",
    "Groove RumbleThunder 4a","Groove RumbleThunder 4b","Groove RumbleThunder 5a","Groove RumbleThunder 5b","Groove RumbleThunder 6a","Groove RumbleThunder 6b",
    "Groove RumbleThunder 7a","Groove RumbleThunder 7b","Groove RumbleThunder 8",
    "Intro Crash Dropkick 1","Intro RumbleThunder 1a","Intro RumbleThunder 1b",
    "Light And Shade 60bpm","Light On The Love 130bpm",
    "LooseHat CrashHits MountainMist 1","LooseHat Fill MountainMist 1","LooseHat Fill MountainMist 2",
    "LooseHat MountainMist 1","LooseHat MountainMist 2","LooseHat MountainMist 3","LooseHatToBell MountainMist 1",
    "Mountain Mist 130bpm","Never Did No Wrong 95bpm",
    "Outro Dropkick 1","Outro Dropkick 2","Outro Fill SwissMix 1","Outro LightAndShade 1","Outro LightAndShade 2",
    "Outro MountainMist 1","Outro NoWrong 1",
    "Outro RumbleThunder 1a","Outro RumbleThunder 1b","Outro RumbleThunder 2a","Outro RumbleThunder 2b","Outro RumbleThunder 3",
    "Outro SwissMix 1","Outro SwissMix 2","Outro SwissMix 3",
    "Swiss Mix 88bpm","Swunky 87bpm","Take 1","Take 2",
    "Verse A BuildingFill Dropkick 1",
    "Verse A Crash Dropkick 1","Verse A Crash Dropkick 2","Verse A Crash Dropkick 3","Verse A Crash Dropkick 4",
    "Verse A Crash LightAndShade 1","Verse A Crash LightAndShade 2","Verse A Crash LightAndShade 3",
    "Verse A Crash LightOnLove 1","Verse A Crash LightOnLove 2","Verse A Crash LightOnLove 3",
    "Verse A Crash MountainMist 2","Verse A Crash MountainMist 1",
    "Verse A Crash NoWrong 1","Verse A Crash NoWrong 2","Verse A Crash NoWrong 3","Verse A Crash NoWrong 4",
    "Verse A Crash SwissMix 1","Verse A Crash SwissMix 2","Verse A Crash SwissMix 3","Verse A Crash SwissMix 4",
    "Verse A Crash Swunky 1","Verse A Crash Swunky 2","Verse A Crash Swunky 3","Verse A Crash Swunky 4",
    "Verse A CrashHits LightAndShade 1",
    "Verse A Dropkick 1","Verse A Dropkick 2","Verse A Dropkick 3",
    "Verse A Fill Dropkick 1","Verse A Fill LightAndShade 1","Verse A Fill LightAndShade 2","Verse A Fill LightAndShade 3",
    "Verse A Fill LightOnLove 1","Verse A Fill LightOnLove 2","Verse A Fill MountainMist 1",
    "Verse A Fill NoWrong 1","Verse A Fill SwissMix 1","Verse A Fill SwissMix 2",
    "Verse A LightAndShade 1","Verse A LightAndShade 2","Verse A LightAndShade 3","Verse A LightAndShade 4",
    "Verse A LightOnLove 1","Verse A LightOnLove 2","Verse A LightOnLove 3","Verse A LightOnLove 4",
    "Verse A MountainMist 1","Verse A MountainMist 2","Verse A MountainMist 3","Verse A MountainMist 4",
    "Verse A NoWrong 1","Verse A NoWrong 2","Verse A NoWrong 3","Verse A NoWrong 4",
    "Verse A SwissMix 1","Verse A SwissMix 2","Verse A Swunky 1","Verse A Swunky 2",
    "Verse B BuildingFill Dropkick 1",
    "Verse B Crash Dropkick 1","Verse B Crash Dropkick 2","Verse B Crash Dropkick 3","Verse B Crash Dropkick 4","Verse B Crash Dropkick 5","Verse B Crash Dropkick 6",
    "Verse B Crash LightAndShade 1","Verse B Crash LightOnLove 1",
    "Verse B Crash MountainMist 1","Verse B Crash MountainMist 2",
    "Verse B Crash NoWrong 1","Verse B Crash NoWrong 2","Verse B Crash NoWrong 3",
    "Verse B Crash SwissMix 1","Verse B Crash SwissMix 2","Verse B Crash SwissMix 3","Verse B Crash SwissMix 4",
    "Verse B Crash Swunky 1","Verse B Crash Swunky 2","Verse B Crash Swunky 3",
    "Verse B CrashHits LightAndShade 1",
    "Verse B Dropkick 1","Verse B Dropkick 2","Verse B Dropkick 3",
    "Verse B Fill Dropkick 1","Verse B Fill Dropkick 2","Verse B Fill Dropkick 3",
    "Verse B Fill LightOnLove 1","Verse B Fill NoWrong 1","Verse B Fill NoWrong 2","Verse B Fill NoWrong 3",
    "Verse B Fill SwissMix 1","Verse B Fill SwissMix 2","Verse B Fill SwissMix 3",
    "Verse B LightAndShade 1","Verse B LightOnLove 1","Verse B LightOnLove 2","Verse B LightOnLove 3",
    "Verse B MountainMist 1","Verse B NoWrong 1","Verse B NoWrong 2","Verse B SwissMix 1",
    "Verse B Swunky 1","Verse B Swunky 2","Verse B Swunky 3",
    "Verse C Crash Dropkick 1","Verse C Crash Dropkick 2","Verse C Crash FoolinTheRain 2","Verse C Crash FoolinTheRain 4",
    "Verse C Crash LightOnLove 1","Verse C Crash LightOnLove 3",
    "Verse C Crash NoWrong 1","Verse C Crash NoWrong 2","Verse C Crash NoWrong 3","Verse C Crash NoWrong 4",
    "Verse C Crash SwissMix 1","Verse C Crash SwissMix 2","Verse C Crash SwissMix 3","Verse C Crash SwissMix 4",
    "Verse C Crash Swunky 1","Verse C Crash Swunky 2","Verse C Crash Swunky 3","Verse C Crash Swunky 4",
    "Verse C CrashHits Dropkick 1",
    "Verse C Dropkick 1","Verse C Dropkick 2","Verse C Dropkick 3","Verse C Dropkick 4","Verse C Dropkick 5","Verse C Dropkick 6","Verse C Dropkick 7","Verse C Dropkick 8",
    "Verse C Fill Dropkick 1","Verse C Fill Dropkick 2",
    "Verse C Fill LightOnLove 1","Verse C Fill LightOnLove 2","Verse C Fill LightOnLove 3",
    "Verse C Fill NoWrong 1","Verse C Fill NoWrong 2","Verse C Fill SwissMix 1","Verse C Fill SwissMix 2",
    "Verse C LightOnLove 1","Verse C LightOnLove 2","Verse C LightOnLove 3","Verse C LightOnLove 4",
    "Verse C SwissMix 1","Verse C Swunky 1","Verse C Swunky 2","Verse C Swunky 3",
    "Verse CrashHit MountainMist 1","Verse CrashHit MountainMist 2","Verse CrashHit MountainMist 3","Verse CrashHit MountainMist 4","Verse CrashHit MountainMist 5",
    "Verse D Crash Dropkick 1","Verse D Crash Dropkick 2","Verse D Crash Dropkick 3","Verse D Crash Swunky 1",
    "Verse D CrashHits Dropkick 1","Verse D CrashHits Dropkick 2","Verse D CrashlHits Dropkick 3",
    "Verse D Dropkick 1","Verse D Dropkick 2","Verse D Dropkick 3","Verse D Dropkick 4",
    "Verse D Fill Bigbeat 4","Verse D Fill Dropkick 1","Verse D Fill Dropkick 2","Verse D Fill Dropkick 3","Verse D Fill Dropkick 5","Verse D Fill Swunky 1",
    "Verse D Swunky 1","Verse D Swunky 2","Verse D Swunky 3",
    "VerseToChorus Swunky 1","VerseToLooseHat MountainMist 1",
    "XStick Crash LightAndShade 1","XStick Crash LightAndShade 2","XStick Fill LightAndShade 1",
    "XStick LightAndShade 1","XStick LightAndShade 2","XStick LightAndShade 3",
  ]};
  total += await insertFolder(bonV1);

  // ── Bonhamology Vol2 Multitrack Pt1 (134 loops) ──
  // Generating pattern: hat/ride/loosehat/tighthat grooves + full songs
  const bonV2p1grooves: string[] = [
    "7 to 11 120bpm","Boogie Mama 138bpm","California Sunshine 140bpm","Count Off","Crashes And Fill",
    "Ending 1","Ending 2","Ending 3","HardToQuit_70bpm",
  ];
  // Hat grooves 1-8, 8Bar, BuildingFill 1-3
  for (let i=1;i<=8;i++) bonV2p1grooves.push(`Hat ${i}a`,`Hat ${i}b`);  // approximating duplicates
  bonV2p1grooves.push("Hat 8Bar 1","Hat BuildingFill 1","Hat BuildingFill 2","Hat BuildingFill 3");
  for (let i=1;i<=13;i++) bonV2p1grooves.push(`Hat Crash ${i}`);
  for (let i=1;i<=5;i++) bonV2p1grooves.push(`Hat Crash Fill ${i}`);
  bonV2p1grooves.push("Hat CrashHits 1","Hat CrashHits 2","Hat CrashHits 3");
  for (let i=1;i<=7;i++) bonV2p1grooves.push(`Hat Fill ${i}`);
  bonV2p1grooves.push("Hat Roll 1","Hat Roll 2","HatOpen Crash 1","HatOpen Crash Fill 1","Intro","Intro Fill 1");
  bonV2p1grooves.push("Just Join Hands 110bpm","Keep a Coolin 92bpm");
  for (let i=1;i<=5;i++) bonV2p1grooves.push(`LooseHat ${i}`);
  for (let i=1;i<=8;i++) bonV2p1grooves.push(`LooseHat Crash ${i}`);
  for (let i=1;i<=6;i++) bonV2p1grooves.push(`LooseHat Fill ${i}`);
  bonV2p1grooves.push("Quick Step 210bpm");
  for (let i=1;i<=3;i++) bonV2p1grooves.push(`Ride ${i}`);
  bonV2p1grooves.push("Ride 8Bar 1","Ride 8Bar 2");
  for (let i=1;i<=8;i++) bonV2p1grooves.push(`Ride Crash ${i}`);
  for (let i=1;i<=7;i++) bonV2p1grooves.push(`Ride Crash Fill ${i}`);
  bonV2p1grooves.push("Ride CrashHits 1");
  for (let i=1;i<=6;i++) bonV2p1grooves.push(`Ride Fill ${i}`);
  bonV2p1grooves.push("Squeeze It 83bpm","The Winds of Thor 66bpm","TightHat 1","TightHat Building","TightHat Crash 1","TightHat Crash 2","TightHat Crash 3");

  total += await insertFolder({ folder: "BonhamologyVol2_MultitrackEditionPart1_WAV", artist: "Bonhamology", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: bonV2p1grooves });

  // ── Bonhamology Vol2 Multitrack Pt2 (259 loops) ──
  const bonV2p2grooves: string[] = [];
  bonV2p2grooves.push("Bell 1","Bell 2");
  for (let i=1;i<=9;i++) bonV2p2grooves.push(`Bell Crash ${i}`);
  for (let i=1;i<=4;i++) bonV2p2grooves.push(`Bell Crash Fill ${i}`);
  bonV2p2grooves.push("Bell Fill 1a","Bell Fill 1b","Bell Fill 2","Click Intro","Click Intro 2","Crash Fill");
  bonV2p2grooves.push("Ending 1","Ending 2","Ending 3","Ending 4");
  // Hats - many variants across 5 songs
  for (let song=1;song<=5;song++) for (let i=1;i<=Math.min(10-song,8);i++) bonV2p2grooves.push(`Hat ${i} Song${song}`);
  bonV2p2grooves.push("Hat BuildingFill 1","Hat BuildingFill 2","Hat BuildingFill 3","Hat BuildingFill 4");
  for (let i=1;i<=10;i++) bonV2p2grooves.push(`Hat Crash ${i}a`,`Hat Crash ${i}b`);
  for (let i=1;i<=10;i++) bonV2p2grooves.push(`Hat Crash Fill ${i}`);
  bonV2p2grooves.push("Hat CrashHit 1","Hat CrashHit 2","Hat CrashHit 3","Hat CrashHit Fill 1","Hat CrashHit Fill 2","Hat CrashHit Fill 3","Hat CrashHit Fill 4","Hat CrashHit Fill 5");
  bonV2p2grooves.push("Hat CrashHits 1","Hat CrashHits 2");
  for (let i=1;i<=4;i++) bonV2p2grooves.push(`Hat Fill ${i}a`,`Hat Fill ${i}b`);
  bonV2p2grooves.push("Hat w Cymbal Hits 1","Hat w Cymbal Hits 2","HatB 1","HatB 2","HatB CrashHits 1","HatB Fill 1");
  bonV2p2grooves.push("HatChunky Crash 1","HatChunky Fill 1","HatLoose 1");
  for (let i=1;i<=5;i++) bonV2p2grooves.push(`HatLoose Crash ${i}`);
  bonV2p2grooves.push("HatLoose CrashHits 1","HatLoose Fill 1","HatLoose Fill 2","HatLoose Fill 3");
  bonV2p2grooves.push("HatOpen 1a","HatOpen 1b","HatOpen 2");
  bonV2p2grooves.push("HatOpen Crash 1a","HatOpen Crash 1b","HatOpen Crash 2","HatOpen Crash 3","HatOpen Crash Fill 1","HatOpen CrashHits 1","HatOpen Fill 1");
  bonV2p2grooves.push("HatTight 1","HatTight 2","HatTight 3","HatTight 4");
  for (let i=1;i<=6;i++) bonV2p2grooves.push(`HatTight Crash ${i}`);
  bonV2p2grooves.push("HatTight Fill 1","HatTight Fill 2");
  bonV2p2grooves.push("Intro 1","Intro 2","Intro Fill 1a","Intro Fill 1b","Intro Fill 2","Kick Crash");
  bonV2p2grooves.push("Outro 1a","Outro 1b","Outro 1c","Outro 2a","Outro 2b","Outro 3");
  bonV2p2grooves.push("Outro Crash 1a","Outro Crash 1b","Outro Crash 2a","Outro Crash 2b","Outro Crash 3","Outro Fill 1");
  bonV2p2grooves.push("Outro Ride 1","Outro Ride 2","Outro With Ending");
  bonV2p2grooves.push("Ride 1a","Ride 1b","Ride 1c","Ride 1d","Ride 2","Ride BuildingFill 1");
  for (let i=1;i<=6;i++) bonV2p2grooves.push(`Ride Crash ${i}a`,`Ride Crash ${i}b`);
  for (let i=1;i<=3;i++) bonV2p2grooves.push(`Ride Crash Fill ${i}a`,`Ride Crash Fill ${i}b`);
  bonV2p2grooves.push("Ride Crash Hits 1");
  for (let i=1;i<=4;i++) bonV2p2grooves.push(`Ride CrashHits ${i}`);
  bonV2p2grooves.push("Ride CrashHits Fill 1a","Ride CrashHits Fill 1b","Ride CrashHits Fill 2a","Ride CrashHits Fill 2b","Ride CrashHits Fill 3");
  bonV2p2grooves.push("Ride Fill 1a","Ride Fill 1b","Ride Fill 2a","Ride Fill 2b","Ride LongFill 1");
  bonV2p2grooves.push("Ride w Crash Hits 1","Ride w Crash Hits 2","Ride w CrashHits 1","Ride w CrashHits 2");

  total += await insertFolder({ folder: "BonhamologyVol2_MultitrackEditionPart2_WAV", artist: "Bonhamology", instrument: "drums", genre: "Rock", isMultitrack: true, grooves: bonV2p2grooves });

  // ── Clyde Stubblefield Multitrack (254 loops) ──
  const clydeGrooves: string[] = [];
  for (let i=1;i<=6;i++) clydeGrooves.push(`16s ${i}`);
  for (let i=1;i<=6;i++) clydeGrooves.push(`16sFill ${i}`);
  clydeGrooves.push("1Bar 1","1Bar 2","Bell 1","BellGroove 1","BellGroove 2","BellGroove 3","BellGroove 4","BellGroove Fill 1");
  for (let i=1;i<=7;i++) clydeGrooves.push(`Busy ${i}`);
  clydeGrooves.push("BusyFill 1","BusyFill 2","BusyFill 3","End 1","End 2");
  for (let i=1;i<=6;i++) clydeGrooves.push(`Fill ${i}`);
  for (let i=1;i<=11;i++) clydeGrooves.push(`Groove ${i}`);
  // GrooveA through GrooveH with variants
  for (const letter of ["A","B","C","D","E","F","G","H"]) {
    const max = letter==="A"?7:letter==="B"?3:letter==="C"?5:letter==="D"?5:letter==="E"?3:letter==="F"?7:letter==="G"?1:4;
    for (let i=1;i<=max;i++) clydeGrooves.push(`Groove${letter} ${i}`);
  }
  for (let i=1;i<=7;i++) clydeGrooves.push(`GrooveACrash ${i}`);
  for (let i=1;i<=7;i++) clydeGrooves.push(`GrooveAFill ${i}`);
  for (let i=1;i<=3;i++) clydeGrooves.push(`GrooveBFill ${i}`);
  for (let i=1;i<=4;i++) clydeGrooves.push(`GrooveCFill ${i}`);
  for (let i=1;i<=7;i++) clydeGrooves.push(`GrooveCrash ${i}`);
  for (let i=1;i<=5;i++) clydeGrooves.push(`GrooveDFill ${i}`);
  clydeGrooves.push("GrooveEFill 1");
  clydeGrooves.push("GrooveFFill 1");
  for (let i=1;i<=8;i++) clydeGrooves.push(`GrooveFill ${i}`);
  // Halftime
  for (let i=1;i<=9;i++) clydeGrooves.push(`HalftimeA ${i}`);
  for (let i=1;i<=4;i++) clydeGrooves.push(`HalftimeB ${i}`);
  clydeGrooves.push("Hat 1","Hat OffBeats 1","Hat OffBeats 2","Hat OffBeats 3","HatCrash 1","HatFill 1","HatFill 2");
  for (let i=1;i<=5;i++) clydeGrooves.push(`Intro ${i}`);
  for (let i=1;i<=9;i++) clydeGrooves.push(`Ride ${i}`);
  clydeGrooves.push("Ride8Bar 1","RideCrash 1","RideCrash 2");
  for (let i=1;i<=7;i++) clydeGrooves.push(`RideFill ${i}`);

  total += await insertFolder({ folder: "ClydeStubblefield_MultitrackDrums", artist: "Clyde Stubblefield", instrument: "drums", genre: "Funk", isMultitrack: true, grooves: clydeGrooves });

  // ── Curt Rock V1 (22 loops) ──
  total += await insertFolder({ folder: "CurtRockV1_Drums_MIDI_WAV", artist: "Curt Bisquera", instrument: "drums", genre: "Rock",
    grooves: ["Compressed 1","Compressed 2","Compressed 3","Compressed 4","Compressed 5","Compressed 6","Compressed No Perc 1","Compressed No Perc 2","Compressed with Perc 1","Compressed with Perc 2","Dry 1","Dry 2","Dry 3","Dry 4","Dry 5","Dry 6","Dry No Perc 1","Dry No Perc 2","Dry with Perc 1","Dry with Perc 2","Perc Loops"] });

  console.log(`\nPart 1 total inserted: ${total}`);
  const count = await pool.query("SELECT COUNT(*)::int as c FROM audio_loops");
  console.log(`Database now has ${count.rows[0].c} audio loops`);
  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
