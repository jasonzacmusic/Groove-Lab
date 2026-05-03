/**
 * Rebuild audio_loops from the REAL Bunny CDN file tree.
 * Reads bunny-wavs.txt, parses every WAV path, groups multitrack stems,
 * and inserts properly structured records into DB.
 *
 * Bunny folder hierarchy:
 *   ProductFolder/                              ← Artist pack (e.g., BonhamologyVol1_MultitrackEdition_WAV)
 *     Stereo Loops/                             ← skip (organizational)
 *       SongFolder/                             ← COLLECTION (the "song" or groove set)
 *         VerseA1_SongName_130bpm.wav           ← one stereo loop = one DB row
 *     Multitrack Loops/                         ← skip (organizational)
 *       SongFolder/                             ← COLLECTION (same song)
 *         Verse A SongName 1/                   ← SECTION folder
 *           Verse_KICK_SongName_1.wav           ← stem (grouped into one DB row)
 *           Verse_SNR_SongName_1.wav            ← stem
 *
 * Each SECTION (stereo file or multitrack folder) becomes ONE database row.
 * Multitrack stems are stored as a JSONB array in the stems column.
 *
 * Usage: cd scripts && npx tsx src/rebuild-from-bunny.ts
 */
import pg from "pg";
import fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 } as any);
const CDN = "groovelab-cdn.b-cdn.net";

// ── Artist mapping from product folder name ─────────────────────────────
const ARTIST_MAP: Record<string, string> = {
  "AdamLevyV1_BaritoneGuitar_WAV": "Adam Levy",
  "AntonioSanchezV1_WAV": "Antonio Sanchez",
  "AntonioSanchezV2_WAV": "Antonio Sanchez",
  "BeatsByDaruJones_MIDI_WAV": "Daru Jones",
  "BenSatterleeVol1_Drums_WAV": "Ben Satterlee",
  "BlairSintaV1_Drums_WAV": "Blair Sinta",
  "BlairSintaV2_Drums_WAV": "Blair Sinta",
  "BobReynoldsV1_Saxophone_WAV": "Bob Reynolds",
  "BonhamologyVol1_MultitrackEdition_WAV": "Bonhamology",
  "BonhamologyVol1_StereoEdition_WAV": "Bonhamology",
  "BonhamologyVol2_MultitrackEditionPart1_WAV": "Bonhamology",
  "BonhamologyVol2_MultitrackEditionPart2_WAV": "Bonhamology",
  "BonhamologyVol2_StereoEdition_WAV": "Bonhamology",
  "BrianFrasierMooreV1_Drums_MultitrackPt2": "Brian Frasier-Moore",
  "BrianFrasierMooreV1_Drums_MultitrackPt3": "Brian Frasier-Moore",
  "BrianFrasierMooreV1_Drums_Stereo": "Brian Frasier-Moore",
  "BrianFrasierMooreV2_Drums_MultitrackPt1": "Brian Frasier-Moore",
  "BrianFrasierMooreV2_Drums_MultitrackPt2": "Brian Frasier-Moore",
  "BrianFrasierMooreV2_Drums_MultitrackPt3": "Brian Frasier-Moore",
  "CharieHunterCarterMcLeanV1_DrumsBassGuitar_WAV": "Charlie Hunter & Carter McLean",
  "CharlieHunter_KickSnareBariGuitar_WAV": "Charlie Hunter",
  "CharlieHunter_PattonInPercussion_WAV": "Charlie Hunter",
  "CharlieHunterBobbyPrevite_LogicMultitracksPt1": "Charlie Hunter & Bobby Previte",
  "CharlieHunterBobbyPrevite_LogicMultitracksPt2": "Charlie Hunter & Bobby Previte",
  "CharlieHunterBobbyPrevite_StereoLoops": "Charlie Hunter & Bobby Previte",
  "ChrisKimmererV1_Drums_WAV": "Chris Kimmerer",
  "ClydeStubblefield_MultitrackDrums": "Clyde Stubblefield",
  "ClydeStublefield_Drums": "Clyde Stubblefield",
  "CurtRockV1_Drums_MIDI_WAV": "Curt Bisquera",
  "CurtRockV2_MultitrackEdition_WAV": "Curt Bisquera",
  "CurtRockV2_StereoEdition_WAV": "Curt Bisquera",
  "DamonGrantV1_Percussion_WAV": "Damon Grant",
  "DougWambleV1_ResonatorGuitar_WAV": "Doug Wamble",
  "DylanWissing_BIGDRUMSV1_Copper": "Dylan Wissing",
  "DylanWissing_CincinnatiFunkDrumsV1": "Dylan Wissing",
  "DylanWissing_DONUTDRUMSV2_VinylMix": "Dylan Wissing",
  "EricHarlandV1_Drums_WAV": "Eric Harland", "EricHarlandV2_Drums_WAV": "Eric Harland",
  "GeorgeSluppickV1_Drums_WAV": "George Sluppick",
  "GregHerseyV1_Perc_WAV": "Greg Hersey",
  "HeavyDropD_Eb_124bpm": "Marcus Finnie",
  "JoeyWaronkerV1_Drums_WAV": "Joey Waronker",
  "JoeyWaronkerV2_MultitrackDrums": "Joey Waronker",
  "MarcusFinnieSessionDrumsV1_Pt1_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV1_Pt2_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV1_Pt3_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV2_Pt1_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV2_Pt2_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV2_Pt3_WAV": "Marcus Finnie",
  "MikeClarkV1_Drums_MIDI_WAV": "Mike Clark", "MikeClarkV2_Drums_MIDI_WAV": "Mike Clark",
  "NateSmith_PocketChangeV2_WAV": "Nate Smith",
  "OneManTribeVol1_TapeDrums_WAV": "One Man Tribe",
  "OneManTribeVol2_CreativePercussion_WAV": "One Man Tribe",
  "OneManTribeVol3_CosmicPercussion_WAV": "One Man Tribe",
  "PowerFunk_C#_97bpm": "Marcus Finnie",
  "RetroSoul_C_127bpm": "Marcus Finnie",
  "ReubenRogersV1_AcousticBass_WAV": "Reuben Rogers",
  "RichRedmondV1_MultitrackEdition_WAV": "Rich Redmond",
  "RichRedmondV1_StereoEdition_WAV": "Rich Redmond",
  "RichRedmondV2_StereoEdition_WAV": "Rich Redmond",
  "Rockofthe70s_C#_81bpm": "Marcus Finnie",
  "RyanGruss_HybridDrumsBundle_MIDI_WAV": "Ryan Gruss",
  "RyanGruss_HybridDrumsVol1_MIDI_WAV": "Ryan Gruss", "RyanGruss_HybridDrumsVol1_WAV_MIDI": "Ryan Gruss",
  "RyanGruss_HybridDrumsVol2_MIDI_WAV": "Ryan Gruss", "RyanGruss_HybridDrumsVol2_WAV_MIDI": "Ryan Gruss",
  "RyanGruss_HybridDrumsVol3_MIDI_WAV": "Ryan Gruss", "RyanGruss_HybridDrumsVol4_MIDI_WAV": "Ryan Gruss",
  "RyanGruss_HybridDrumsVol5_MIDI_WAV": "Ryan Gruss", "RyanGruss_HybridDrumsVol6_MIDI_WAV": "Ryan Gruss",
  "RyanGruss_HybridDrumsVol7_MIDI_WAV": "Ryan Gruss", "RyanGruss_HybridDrumsVol8_MIDI_WAV": "Ryan Gruss",
  "RyanGruss_ManVsMoogV1_WAV_ALP": "Ryan Gruss", "RyanGruss_ManVsMoogV2_WAV_ALP": "Ryan Gruss",
  "RyanGruss_ManVsMoogV3_WAV_ALP": "Ryan Gruss", "RyanGruss_ManVsMoogV4_WAV_ALP": "Ryan Gruss",
  "SeanHurleyV1_Bass_WAV": "Sean Hurley",
  "ShawnZornV1_Drums_WAV": "Shawn Zorn",
  "Smooth80s_AbtoA_82bpm": "Marcus Finnie",
  "ToddSuchermanV2_WAV": "Todd Sucherman",
  "90sHipHop_EMajor_91bpm": "Marcus Finnie",
  "BluesGroove_BMajor_177bpm": "Marcus Finnie",
  "DiscoTimes_Dmin_108bpm": "Marcus Finnie",
  "HighwayRock_D_85bpm": "Marcus Finnie",
  "CompleteTakesV1_MIDI_WAV": "Complete Takes",
  "CompleteTakesV2_MIDI_WAV": "Complete Takes",
  "CompleteTakesV3_MIDI_WAV": "Complete Takes",
  "BluesDrumsVol1_MIDI_WAV": "The Loop Loft",
  "BrushDrumsV1_WAV": "The Loop Loft",
  "BrushDrumsV2_WAV": "The Loop Loft",
  "BrushDrumsV3_WAV": "The Loop Loft",
  "BrushDrumsV4_WAV": "The Loop Loft",
  "BrushDrumsV5_WAV": "The Loop Loft",
  "Cinematic DrumsV1_WAV": "The Loop Loft",
  "Cinematic DrumsV2_WAV": "The Loop Loft",
  "Cinematic DrumsV3_WAV": "The Loop Loft",
  "DrumsOfTheWorld_WAV": "The Loop Loft",
  "DrumsOfTheWorldV2_WAV": "The Loop Loft",
  "DryDrumsV1_WAV": "The Loop Loft",
  "DryDrumsV2_WAV": "The Loop Loft",
  "DryDrumsV3_WAV": "The Loop Loft",
  "DryDrumsV4_WAV": "The Loop Loft",
  "DryDrumsV5_WAV": "The Loop Loft",
  "FunkDrumsVol1_WAV": "The Loop Loft",
  "FunkDrumsVol2_WAV": "The Loop Loft",
  "IndieRockDrumsVol1_WAV": "The Loop Loft",
  "IndieRockDrumsVol2_WAV": "The Loop Loft",
  "IndieRockDrumsVol3_WAV": "The Loop Loft",
  "IndieRockDrumsVol4_WAV": "The Loop Loft",
  "IndieRockDrumsVol5_WAV": "The Loop Loft",
  "IndieRockDrumsVol6_WAV": "The Loop Loft",
  "OddMeterDrums_Vol1_WAV": "The Loop Loft",
  "OddMeterDrums_Vol2_WAV": "The Loop Loft",
  "OddMeterDrums_Vol3_WAV": "The Loop Loft",
  "Multitracks_AcousticFolk_BackbeatBrush_83bpm": "The Loop Loft",
  "Multitracks_AcousticFolk_BluesBrushes_180bpm": "The Loop Loft",
  "Multitracks_DryDrums_Mulholland_85bpm": "The Loop Loft",
  "Multitracks_DryDrums_Topanga_110bpm": "The Loop Loft",
  "Multitracks_IndieRockDrums_FrontPocket_122bpm": "The Loop Loft",
  "Multitracks_IndieRockDrums_VintagePunch_89bpm": "The Loop Loft",
  "Multitracks_RockAndRoll_Downtown_80bpm": "The Loop Loft",
  "Multitracks_RockAndRoll_InTheVan_105bpm": "The Loop Loft",
  "Multitracks_Songwriter_Brushes_77bpm": "The Loop Loft",
  "Multitracks_Songwriter_StraightUp_91bpm": "The Loop Loft",
  "Multitracks_StudioDrums_StudioA_95bpm": "The Loop Loft",
  "Multitracks_StudioDrums_StudioB_115bpm": "The Loop Loft",
};

// ── Organizational folders to skip when finding the song folder ──────────
const SKIP_FOLDERS = /^(loops|stereo\s*loops|multitrack\s*loops|multitrack_loops|stereo_loops|clean\s*loops|vibe\s*loops|audio\s*loops|daw\s*audio\s*loops|loops\s*folder|multitrack|stereo|dry|compressed|mixed|perc\s*loops|drum\s*kit\s*loops|drum\s*kit\s*samples|percussion\s*loops|percussion\s*samples|samples)$/i;

// ── Helpers ──────────────────────────────────────────────────────────────
function cleanProductName(folderName: string): string {
  return folderName
    .replace(/_WAV_MIDI$/i, "").replace(/_MIDI_WAV$/i, "").replace(/_WAV_ALP$/i, "")
    .replace(/_WAV$/i, "").replace(/_MIDI$/i, "").replace(/_/g, " ").trim();
}

function detectInstrument(productName: string, fileName: string): string {
  const pn = productName.toLowerCase();
  const fn = fileName.toLowerCase();
  if (/bass|_bass_/i.test(fn) && !/kick/i.test(fn)) return "bass";
  if (/guitar|_gtr_|baritoneguitar|resonatorguitar/i.test(pn) || /_gtr_/i.test(fn)) return "guitar";
  if (/saxophone/i.test(pn)) return "guitar";
  if (/percussion|perc_|_perc/i.test(pn)) return "percussion";
  if (/moog|electronic/i.test(pn)) return "electronic";
  if (/bass_wav/i.test(pn)) return "bass";
  return "drums";
}

function detectGenre(productName: string, songName: string, fileName: string): string {
  const all = `${productName} ${songName} ${fileName}`.toLowerCase();
  if (/hip\s*hop/i.test(all)) return "Hip Hop";
  if (/funk/i.test(all) && !/punk/i.test(all)) return "Funk";
  if (/blues/i.test(all)) return "Blues";
  if (/jazz/i.test(all)) return "Jazz";
  if (/motown|soul/i.test(all)) return "Soul";
  if (/r&?n&?b|rnb/i.test(all)) return "R&B";
  if (/latin|cuban|samba|bossa|afro/i.test(all)) return "Latin";
  if (/reggae|dub|calypso|soca|caribbean/i.test(all)) return "Reggae";
  if (/indie/i.test(all)) return "Indie Rock";
  if (/folk|acoustic|songwriter/i.test(all)) return "Folk";
  if (/cinematic/i.test(all)) return "Cinematic";
  if (/electronic|moog/i.test(all)) return "Electronic";
  if (/world|tribal|percussion|african|egyptian|india|tahitian|celtic|polka|merengue/i.test(all)) return "World";
  if (/pop|dance/i.test(all)) return "Pop";
  if (/disco/i.test(all)) return "Funk";
  if (/shuffle/i.test(all)) return "Blues";
  if (/rock|bonham|zepp/i.test(all)) return "Rock";
  return "Rock";
}

function extractBpm(text: string): number | null {
  const m = text.match(/(\d{2,3})\s*bpm/i);
  return m ? parseInt(m[1]) : null;
}

function extractKey(text: string): string | null {
  const m = text.match(/\b([A-G][b#]?)\s*(major|minor|min|maj)?\b/i);
  return m ? m[1] : null;
}

function extractSectionType(name: string): string {
  const l = name.toLowerCase();
  if (/^(verse|vrs)/i.test(l)) return "verse";
  if (/^(chorus|chrs)/i.test(l)) return "chorus";
  if (/^intro/i.test(l)) return "intro";
  if (/^outro/i.test(l)) return "outro";
  if (/^bridge/i.test(l)) return "bridge";
  if (/^(fill|fll)/i.test(l)) return "fill";
  if (/^break/i.test(l)) return "break";
  if (/^end/i.test(l)) return "ending";
  if (/^8bar/i.test(l)) return "8bar";
  if (/^ride/i.test(l)) return "ride";
  if (/^(hat|hihat)/i.test(l)) return "hat";
  if (/^bell/i.test(l)) return "bell";
  if (/^groove/i.test(l)) return "groove";
  if (/^halftime/i.test(l)) return "halftime";
  if (/^xstick/i.test(l)) return "xstick";
  if (/^tom/i.test(l)) return "toms";
  if (/^crash/i.test(l)) return "crash";
  if (/^(snare|snr)/i.test(l)) return "snare";
  if (/^kick/i.test(l)) return "kick";
  if (/^loosehat/i.test(l)) return "loosehat";
  if (/^tighthat/i.test(l)) return "tighthat";
  if (/^stripped/i.test(l)) return "stripped";
  if (/^prechorus/i.test(l)) return "prechorus";
  if (/^doubletime/i.test(l)) return "doubletime";
  return "full_loop";
}

function extractSectionNumber(name: string): number | null {
  // Match trailing number: "Verse A LightOnLove 1" → 1, "Chorus 90s HipHop 91bpm 3" → 3
  const m = name.match(/\s(\d+)$/);
  return m ? parseInt(m[1]) : null;
}

// ── Parse folder hierarchy ──────────────────────────────────────────────
interface ParsedPath {
  product: string;    // top-level artist pack
  artist: string;     // cleaned artist name
  collection: string; // the SONG folder
  sectionFolder: string | null; // multitrack section folder (null for stereo)
  fileName: string;   // the .wav filename
  fullPath: string;   // original path
  fileSize: number;
  isMultitrack: boolean;
}

function parsePath(line: string): ParsedPath | null {
  const [fullPath, sizeStr] = line.split("|");
  if (!fullPath || !fullPath.toLowerCase().endsWith(".wav")) return null;

  const parts = fullPath.split("/");
  const fileName = parts[parts.length - 1];

  // Skip MIDI files
  if (/\.mid$/i.test(fileName)) return null;

  // Skip top-level "bonus" full-arrangement files that begin with underscore
  // (e.g. "_Multitrack_Mulholland_FullArrangement_85bpm.wav")
  if (/^_/.test(fileName)) return null;

  // Determine product folder
  let product: string;
  let remainingParts: string[];
  if (parts[0] === "DRUMS" || parts[0] === "PERCUSSION") {
    product = parts[1] || parts[0];
    remainingParts = parts.slice(2);
  } else {
    product = parts[0];
    remainingParts = parts.slice(1);
  }
  if (!product) return null;

  const artist = ARTIST_MAP[product] || cleanProductName(product);

  // Skip organizational folders to find the SONG folder
  // Path after product: [OrgFolder?, SongFolder, SectionFolder?, file.wav]
  const pathAfterProduct = remainingParts;
  let idx = 0;
  while (idx < pathAfterProduct.length - 1 && SKIP_FOLDERS.test(pathAfterProduct[idx])) {
    idx++;
  }

  let collection: string;
  let sectionFolder: string | null = null;
  let isMultitrack = /multitrack/i.test(fullPath);

  const remaining = pathAfterProduct.length - idx; // how many parts left (including filename)

  // Special case: Multitracks_* packs are a single song with section subfolders
  // containing stems. Structure: Multitracks_X_85bpm/Bridge1/01_Kick_Bridge1.wav
  // Treat the whole pack as the song and the subfolder as a multitrack section.
  const isMultitracksPack = /^Multitracks_/i.test(product);

  if (isMultitracksPack && remaining === 2) {
    collection = cleanProductName(product);
    sectionFolder = pathAfterProduct[idx];
    isMultitrack = true;
  } else if (remaining >= 3) {
    // Product/.../SongFolder/SectionFolder/file.wav (multitrack with section subfolder)
    collection = pathAfterProduct[idx];
    sectionFolder = pathAfterProduct[idx + 1];
  } else if (remaining === 2) {
    // Product/.../SongFolder/file.wav (stereo loop, or flat multitrack)
    collection = pathAfterProduct[idx];
    sectionFolder = null;
  } else {
    // Product/file.wav (no song folder) — skip these stragglers, they're not part
    // of any song and would create ghost 1-loop "collections" named after the product.
    return null;
  }

  return {
    product, artist, collection, sectionFolder, fileName, fullPath,
    fileSize: parseInt(sizeStr) || 0,
    isMultitrack,
  };
}

// ── Main ────────────────────────────────────────────────────────────────
interface LoopRow {
  title: string;
  artist: string;
  collection: string;
  grooveName: string;
  instrumentCategory: string;
  genre: string;
  bpm: number | null;
  keySignature: string | null;
  sectionType: string;
  sectionNumber: number | null;
  isMultitrack: boolean;
  wavUrl: string; // primary playback URL (stereo file, or first stem)
  stems: { name: string; filename: string; cdn_url: string }[];
  fileSize: number;
}

async function main() {
  const wavList = fs.readFileSync("/home/runner/workspace/scripts/bunny-wavs.txt", "utf-8");
  const lines = wavList.trim().split("\n").filter(l => l.trim());
  console.log(`Parsing ${lines.length} WAV files...`);

  // Step 1: Parse all paths
  const parsed: ParsedPath[] = [];
  for (const line of lines) {
    const p = parsePath(line);
    if (p) parsed.push(p);
  }
  console.log(`Parsed ${parsed.length} WAV paths`);

  // Step 2: Group into loop records
  // Key: for stereo files, each file = one loop
  // For multitrack section folders, all stems in the same folder = one loop
  const loopMap = new Map<string, { parsed: ParsedPath[]; primary: ParsedPath }>();

  for (const p of parsed) {
    let key: string;
    if (p.sectionFolder) {
      // Multitrack: group by product/collection/sectionFolder
      key = `${p.product}|${p.collection}|${p.sectionFolder}`;
    } else {
      // Stereo: each file is its own loop
      key = `${p.product}|${p.collection}|${p.fileName}`;
    }

    if (!loopMap.has(key)) {
      loopMap.set(key, { parsed: [], primary: p });
    }
    loopMap.get(key)!.parsed.push(p);
  }

  console.log(`Grouped into ${loopMap.size} unique loops`);

  // Step 3: Build loop rows
  const rows: LoopRow[] = [];

  for (const [, group] of loopMap) {
    const first = group.primary;
    const isMulti = group.parsed.length > 1;

    // The "name" of this loop:
    // - For stereo: filename without extension
    // - For multitrack: the section folder name
    const loopName = first.sectionFolder || first.fileName.replace(/\.wav$/i, "");

    const sectionType = extractSectionType(loopName);
    const sectionNumber = extractSectionNumber(loopName);
    const bpm = extractBpm(first.collection) || extractBpm(first.product) || extractBpm(loopName);
    const key = extractKey(first.product) || extractKey(first.collection);
    const genre = detectGenre(first.product, first.collection, loopName);
    const instrument = detectInstrument(first.product, loopName);

    // For multitrack, pick the primary playback file (prefer OHS, ROOM, or first file)
    let primaryFile = first;
    if (isMulti) {
      const ohs = group.parsed.find(p => /ohs|overhead|room\b/i.test(p.fileName));
      const stereoMix = group.parsed.find(p => /mix|stereo|full/i.test(p.fileName));
      primaryFile = stereoMix || ohs || first;
    }

    const encodedPrimary = primaryFile.fullPath.split("/").map(s => encodeURIComponent(s)).join("/");
    const primaryUrl = `https://${CDN}/${encodedPrimary}`;

    // Build stems array for multitrack
    const stems = isMulti ? group.parsed.map(p => {
      const stemName = p.fileName.replace(/\.wav$/i, "")
        .replace(/_/g, " ").replace(/\s+\d+$/, "").trim();
      const encodedPath = p.fullPath.split("/").map(s => encodeURIComponent(s)).join("/");
      return {
        name: stemName,
        filename: p.fileName,
        cdn_url: `https://${CDN}/${encodedPath}`,
      };
    }) : [];

    rows.push({
      title: loopName,
      artist: first.artist,
      collection: first.collection,
      grooveName: loopName,
      instrumentCategory: instrument,
      genre,
      bpm,
      keySignature: key,
      sectionType,
      sectionNumber,
      isMultitrack: isMulti,
      wavUrl: primaryUrl,
      stems,
      fileSize: group.parsed.reduce((sum, p) => sum + p.fileSize, 0),
    });
  }

  console.log(`Built ${rows.length} loop rows`);

  // Stats
  const artists = new Set(rows.map(r => r.artist));
  const collections = new Set(rows.map(r => `${r.artist}::${r.collection}`));
  const genres = new Set(rows.map(r => r.genre));
  console.log(`\nArtists: ${artists.size}`);
  console.log(`Collections (songs): ${collections.size}`);
  console.log(`Genres: ${[...genres].join(", ")}`);
  console.log(`Multitrack loops: ${rows.filter(r => r.isMultitrack).length}`);
  console.log(`Stereo loops: ${rows.filter(r => !r.isMultitrack).length}`);

  // Step 4: Wipe and rebuild
  console.log("\nClearing audio_loops table...");
  await pool.query("DELETE FROM audio_loops");

  console.log(`Inserting ${rows.length} records...`);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      await pool.query(
        `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre,
          bpm, key_signature, section_type, section_number, is_multitrack, wav_url, stems,
          file_size_bytes, time_signature, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [r.title, r.artist, r.collection, r.grooveName, r.instrumentCategory, r.genre,
          r.bpm, r.keySignature, r.sectionType, r.sectionNumber, r.isMultitrack, r.wavUrl,
          JSON.stringify(r.stems), r.fileSize, "4/4", []]
      );
      inserted++;
    } catch (e: any) {
      errors++;
      if (errors <= 10) console.error(`  ERR: ${r.title} (${r.collection}) — ${e.message}`);
    }

    if ((i + 1) % 1000 === 0) {
      console.log(`  Progress: ${i + 1}/${rows.length} (${errors} errors)`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`REBUILD COMPLETE`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
  console.log(`${"=".repeat(60)}`);

  // Final stats from DB
  const stats = await pool.query(`
    SELECT COUNT(*)::int as total,
           COUNT(DISTINCT artist)::int as artists,
           COUNT(DISTINCT collection)::int as collections,
           COUNT(DISTINCT genre)::int as genres
    FROM audio_loops
  `);
  console.log(`\nDB: ${JSON.stringify(stats.rows[0])}`);

  const topCollections = await pool.query(`
    SELECT artist, collection, COUNT(*)::int as sections
    FROM audio_loops GROUP BY artist, collection ORDER BY sections DESC LIMIT 20
  `);
  console.log("\nTop collections (songs with most sections):");
  for (const r of topCollections.rows) {
    console.log(`  ${r.artist} — ${r.collection}: ${r.sections} sections`);
  }

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
