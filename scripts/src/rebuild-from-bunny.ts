/**
 * Rebuild audio_loops from the REAL Bunny CDN file tree.
 * Reads bunny-wavs.txt, parses every WAV path, extracts metadata, inserts into DB.
 *
 * Path patterns:
 *   TopProduct/Song/LoopFolder/file.wav           (multitrack products)
 *   TopProduct/Song/file.wav                       (stereo products)
 *   DRUMS/SubProduct/Loops/Song/file.wav           (drums mega-folder)
 *   PERCUSSION/SubProduct/Loops/Song/file.wav      (percussion mega-folder)
 *
 * Usage: cd scripts && npx tsx src/rebuild-from-bunny.ts
 */
import pg from "pg";
import fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
const CDN = "groovelab-cdn.b-cdn.net";

// ── Artist mapping from product folder name ─────────────────────────────
const ARTIST_MAP: Record<string, string> = {
  "90sHipHop_EMajor_91bpm": "Yurt Rock",
  "AdamLevyV1_BaritoneGuitar_WAV": "Adam Levy",
  "AntonioSanchezV1_WAV": "Antonio Sanchez",
  "AntonioSanchezV2_WAV": "Antonio Sanchez",
  "BeatsByDaruJones_MIDI_WAV": "Daru Jones",
  "BenSatterleeVol1_Drums_WAV": "Ben Satterlee",
  "BlairSintaV1_Drums_WAV": "Blair Sinta",
  "BlairSintaV2_Drums_WAV": "Blair Sinta",
  "BluesDrumsVol1_MIDI_WAV": "Yurt Rock",
  "BluesGroove_BMajor_177bpm": "Yurt Rock",
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
  "BrushDrumsV1_WAV": "Yurt Rock", "BrushDrumsV2_WAV": "Yurt Rock", "BrushDrumsV3_WAV": "Yurt Rock",
  "BrushDrumsV4_WAV": "Yurt Rock", "BrushDrumsV5_WAV": "Yurt Rock",
  "CharieHunterCarterMcLeanV1_DrumsBassGuitar_WAV": "Charlie Hunter & Carter McLean",
  "CharlieHunter_KickSnareBariGuitar_WAV": "Charlie Hunter",
  "CharlieHunter_PattonInPercussion_WAV": "Charlie Hunter",
  "CharlieHunterBobbyPrevite_LogicMultitracksPt1": "Charlie Hunter & Bobby Previte",
  "CharlieHunterBobbyPrevite_LogicMultitracksPt2": "Charlie Hunter & Bobby Previte",
  "CharlieHunterBobbyPrevite_StereoLoops": "Charlie Hunter & Bobby Previte",
  "ChrisKimmererV1_Drums_WAV": "Chris Kimmerer",
  "Cinematic DrumsV1_WAV": "Yurt Rock", "Cinematic DrumsV2_WAV": "Yurt Rock", "Cinematic DrumsV3_WAV": "Yurt Rock",
  "ClydeStubblefield_MultitrackDrums": "Clyde Stubblefield",
  "ClydeStublefield_Drums": "Clyde Stubblefield",
  "CompleteTakesV1_MIDI_WAV": "Yurt Rock", "CompleteTakesV2_MIDI_WAV": "Yurt Rock", "CompleteTakesV3_MIDI_WAV": "Yurt Rock",
  "CurtRockV1_Drums_MIDI_WAV": "Curt Bisquera",
  "CurtRockV2_MultitrackEdition_WAV": "Curt Bisquera",
  "CurtRockV2_StereoEdition_WAV": "Curt Bisquera",
  "DamonGrantV1_Percussion_WAV": "Damon Grant",
  "DiscoTimes_Dmin_108bpm": "Yurt Rock",
  "DougWambleV1_ResonatorGuitar_WAV": "Doug Wamble",
  "DrumsOfTheWorld_WAV": "Yurt Rock", "DrumsOfTheWorldV2_WAV": "Yurt Rock",
  "DryDrumsV1_WAV": "Yurt Rock", "DryDrumsV2_WAV": "Yurt Rock", "DryDrumsV3_WAV": "Yurt Rock",
  "DryDrumsV4_WAV": "Yurt Rock", "DryDrumsV5_WAV": "Yurt Rock",
  "DylanWissing_BIGDRUMSV1_Copper": "Dylan Wissing",
  "DylanWissing_CincinnatiFunkDrumsV1": "Dylan Wissing",
  "DylanWissing_DONUTDRUMSV2_VinylMix": "Dylan Wissing",
  "EricHarlandV1_Drums_WAV": "Eric Harland", "EricHarlandV2_Drums_WAV": "Eric Harland",
  "FunkDrumsVol1_WAV": "Yurt Rock", "FunkDrumsVol2_WAV": "Yurt Rock",
  "GeorgeSluppickV1_Drums_WAV": "George Sluppick",
  "GregHerseyV1_Perc_WAV": "Greg Hersey",
  "HeavyDropD_Eb_124bpm": "Marcus Finnie",
  "HighwayRock_D_85bpm": "Yurt Rock",
  "IndieRockDrumsVol1_WAV": "Yurt Rock", "IndieRockDrumsVol2_WAV": "Yurt Rock",
  "IndieRockDrumsVol3_WAV": "Yurt Rock", "IndieRockDrumsVol4_WAV": "Yurt Rock",
  "IndieRockDrumsVol5_WAV": "Yurt Rock", "IndieRockDrumsVol6_WAV": "Yurt Rock",
  "JoeyWaronkerV1_Drums_WAV": "Joey Waronker",
  "JoeyWaronkerV2_MultitrackDrums": "Joey Waronker",
  "MarcusFinnieSessionDrumsV1_Pt1_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV1_Pt2_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV1_Pt3_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV2_Pt1_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV2_Pt2_WAV": "Marcus Finnie",
  "MarcusFinnieSessionDrumsV2_Pt3_WAV": "Marcus Finnie",
  "MikeClarkV1_Drums_MIDI_WAV": "Mike Clark", "MikeClarkV2_Drums_MIDI_WAV": "Mike Clark",
  "Multitracks_AcousticFolk_BackbeatBrush_83bpm": "Yurt Rock",
  "Multitracks_AcousticFolk_BluesBrushes_180bpm": "Yurt Rock",
  "Multitracks_DryDrums_Mulholland_85bpm": "Yurt Rock",
  "Multitracks_DryDrums_Topanga_110bpm": "Yurt Rock",
  "Multitracks_IndieRockDrums_FrontPocket_122bpm": "Yurt Rock",
  "Multitracks_IndieRockDrums_VintagePunch_89bpm": "Yurt Rock",
  "Multitracks_RockAndRoll_Downtown_80bpm": "Yurt Rock",
  "Multitracks_RockAndRoll_InTheVan_105bpm": "Yurt Rock",
  "Multitracks_Songwriter_Brushes_77bpm": "Yurt Rock",
  "Multitracks_Songwriter_StraightUp_91bpm": "Yurt Rock",
  "Multitracks_StudioDrums_StudioA_95bpm": "Yurt Rock",
  "Multitracks_StudioDrums_StudioB_115bpm": "Yurt Rock",
  "NateSmith_PocketChangeV2_WAV": "Nate Smith",
  "OddMeterDrums_Vol1_WAV": "Yurt Rock", "OddMeterDrums_Vol2_WAV": "Yurt Rock", "OddMeterDrums_Vol3_WAV": "Yurt Rock",
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
};

// ── Clean product folder name into a readable artist/product name ────────
function cleanProductName(folderName: string): string {
  return folderName
    .replace(/_WAV_MIDI$/i, "")
    .replace(/_MIDI_WAV$/i, "")
    .replace(/_WAV_ALP$/i, "")
    .replace(/_WAV$/i, "")
    .replace(/_MIDI$/i, "")
    .replace(/_/g, " ")
    .trim();
}

// ── Instrument detection from product name and file content ─────────────
function detectInstrument(productName: string, fileName: string): string {
  const pn = productName.toLowerCase();
  const fn = fileName.toLowerCase();
  if (/bass|_bass_/i.test(fn) && !/kick/i.test(fn)) return "bass";
  if (/guitar|_gtr_|baritoneguitar|resonatorguitar/i.test(pn) || /_gtr_/i.test(fn)) return "guitar";
  if (/saxophone/i.test(pn)) return "guitar"; // sax → guitar category for now
  if (/percussion|perc_|_perc/i.test(pn)) return "percussion";
  if (/moog|electronic/i.test(pn)) return "electronic";
  if (/bass_wav/i.test(pn)) return "bass";
  return "drums";
}

// ── Genre detection ─────────────────────────────────────────────────────
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

// ── BPM extraction ──────────────────────────────────────────────────────
function extractBpm(text: string): number | null {
  const m = text.match(/(\d{2,3})\s*bpm/i);
  if (m) return parseInt(m[1]);
  // BFM pattern
  const bfm = text.match(/^BFM\s+(\d{2,3})\s/);
  if (bfm) return parseInt(bfm[1]);
  return null;
}

// ── Section type from file/folder name ──────────────────────────────────
function extractSectionType(name: string): string {
  const l = name.toLowerCase();
  if (/^(verse|vrs)/i.test(l)) return "verse";
  if (/^(chorus|chrs)/i.test(l)) return "chorus";
  if (/^intro/i.test(l)) return "intro";
  if (/^outro/i.test(l)) return "outro";
  if (/^bridge/i.test(l)) return "bridge";
  if (/^fill/i.test(l)) return "fill";
  if (/^break/i.test(l)) return "break";
  if (/^end/i.test(l)) return "ending";
  if (/^ride/i.test(l)) return "ride";
  if (/^hat/i.test(l)) return "hat";
  if (/^bell/i.test(l)) return "bell";
  if (/^groove/i.test(l)) return "groove";
  if (/^halftime/i.test(l)) return "halftime";
  if (/^xstick/i.test(l)) return "xstick";
  if (/^tom/i.test(l)) return "toms";
  if (/^crash/i.test(l)) return "crash";
  if (/^snare/i.test(l)) return "snare";
  if (/^kick/i.test(l)) return "kick";
  if (/^loosehat/i.test(l)) return "loosehat";
  if (/^tighthat/i.test(l)) return "tighthat";
  if (/^stripped/i.test(l)) return "stripped";
  if (/^prechorus/i.test(l)) return "prechorus";
  if (/^doubletime/i.test(l)) return "doubletime";
  return "full_loop";
}

// ── Key extraction ──────────────────────────────────────────────────────
function extractKey(text: string): string | null {
  const m = text.match(/\b([A-G][b#]?)\s*(major|minor|min|maj)?\b/i);
  if (m) return m[1];
  return null;
}

// ── Parse a single WAV path into a database record ──────────────────────
interface LoopRecord {
  title: string;
  artist: string;
  collection: string;      // the "song" or groove set folder
  product: string;          // the top-level product folder
  grooveName: string;
  instrumentCategory: string;
  genre: string;
  bpm: number | null;
  keySignature: string | null;
  sectionType: string;
  wavUrl: string;
  fileSize: number;
  isMultitrack: boolean;
}

function parsePath(line: string): LoopRecord | null {
  const [fullPath, sizeStr] = line.split("|");
  if (!fullPath || !fullPath.toLowerCase().endsWith(".wav")) return null;
  const size = parseInt(sizeStr) || 0;

  const parts = fullPath.split("/");
  const fileName = parts[parts.length - 1];

  // Skip non-audio files
  if (/\.mid$/i.test(fileName)) return null;

  // Determine product folder (normalize DRUMS/X and PERCUSSION/X)
  let product: string;
  let remainingParts: string[];

  if (parts[0] === "DRUMS" || parts[0] === "PERCUSSION") {
    product = parts[1];
    remainingParts = parts.slice(2);
  } else {
    product = parts[0];
    remainingParts = parts.slice(1);
  }

  if (!product) return null;

  // Artist = clean product folder name. Use ARTIST_MAP for known artists, otherwise derive from folder name.
  const artist = ARTIST_MAP[product] || cleanProductName(product);

  // Collection = the "song" level folder (second level after product)
  // For paths like Product/SongFolder/file.wav → collection = SongFolder
  // For paths like Product/Loops/SongFolder/file.wav → collection = SongFolder
  // For paths like Product/SongFolder/GrooveFolder/file.wav → collection = SongFolder
  let collection = product; // default to product if no sub-folder

  if (remainingParts.length >= 2) {
    // Skip known intermediate/organizational folders to find the actual song/groove set folder
    let songIdx = 0;
    while (songIdx < remainingParts.length - 1) {
      if (/^(loops|stereo loops|multitrack loops|multitrack_loops|stereo_loops|clean loops|vibe loops|audio loops|multitrack|stereo|dry|compressed|mixed|perc loops|drum kit loops|drum kit samples|percussion loops|percussion samples|samples)$/i.test(remainingParts[songIdx])
          || /^multitrack\s/i.test(remainingParts[songIdx])) {
        songIdx++;
      } else {
        break;
      }
    }
    if (songIdx < remainingParts.length - 1) {
      collection = remainingParts[songIdx];
    }
  } else if (remainingParts.length === 1) {
    // Just product/file.wav — collection is the product itself
    collection = product;
  }

  // Build title from filename (remove extension)
  const title = fileName.replace(/\.wav$/i, "");

  // Build CDN URL
  const encodedPath = fullPath.split("/").map(s => encodeURIComponent(s)).join("/");
  const wavUrl = `https://${CDN}/${encodedPath}`;

  const instrument = detectInstrument(product, fileName);
  const genre = detectGenre(product, collection, fileName);
  const bpm = extractBpm(collection) || extractBpm(product) || extractBpm(title);
  const key = extractKey(product) || extractKey(collection);
  const sectionType = extractSectionType(title) || extractSectionType(collection);
  const isMultitrack = /multitrack|_mt_/i.test(product) || /multitrack/i.test(fullPath);

  return {
    title,
    artist,
    collection,
    product,
    grooveName: title,
    instrumentCategory: instrument,
    genre,
    bpm,
    keySignature: key,
    sectionType,
    wavUrl,
    fileSize: size,
    isMultitrack,
  };
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const wavList = fs.readFileSync("/home/runner/workspace/scripts/bunny-wavs.txt", "utf-8");
  const lines = wavList.trim().split("\n").filter(l => l.trim());

  console.log(`Parsing ${lines.length} WAV files...`);

  const records: LoopRecord[] = [];
  let skipped = 0;

  for (const line of lines) {
    const rec = parsePath(line);
    if (rec) {
      records.push(rec);
    } else {
      skipped++;
    }
  }

  console.log(`Parsed: ${records.length} records (${skipped} skipped)`);

  // Summary
  const artists = new Set(records.map(r => r.artist));
  const products = new Set(records.map(r => r.product));
  const collections = new Set(records.map(r => r.collection));
  const genres = new Set(records.map(r => r.genre));
  const instruments = new Set(records.map(r => r.instrumentCategory));

  console.log(`Artists: ${artists.size}`);
  console.log(`Products: ${products.size}`);
  console.log(`Collections (songs): ${collections.size}`);
  console.log(`Genres: ${[...genres].join(", ")}`);
  console.log(`Instruments: ${[...instruments].join(", ")}`);
  console.log(`With BPM: ${records.filter(r => r.bpm).length}`);

  // Nuke old data and rebuild
  console.log("\nClearing audio_loops table...");
  await pool.query("DELETE FROM audio_loops");

  console.log(`Inserting ${records.length} records...`);

  let inserted = 0;
  let errors = 0;

  // Batch insert for speed
  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const r = batch[j];
      const o = j * 14;
      placeholders.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8},$${o+9},$${o+10},$${o+11},$${o+12},$${o+13},$${o+14})`);
      values.push(r.title, r.artist, r.collection, r.grooveName, r.instrumentCategory, r.genre,
        r.bpm, r.keySignature, r.sectionType, r.isMultitrack, r.wavUrl, r.fileSize, "4/4", []);
    }

    try {
      await pool.query(
        `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre,
          bpm, key_signature, section_type, is_multitrack, wav_url, file_size_bytes, time_signature, tags)
         VALUES ${placeholders.join(",")}`,
        values
      );
      inserted += batch.length;
    } catch (e: any) {
      // Fallback to individual inserts
      for (const r of batch) {
        try {
          await pool.query(
            `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre,
              bpm, key_signature, section_type, is_multitrack, wav_url, file_size_bytes, time_signature, tags)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [r.title, r.artist, r.collection, r.grooveName, r.instrumentCategory, r.genre,
              r.bpm, r.keySignature, r.sectionType, r.isMultitrack, r.wavUrl, r.fileSize, "4/4", []]
          );
          inserted++;
        } catch (e2: any) {
          errors++;
          if (errors <= 5) console.error(`  ERR: ${r.title} — ${e2.message}`);
        }
      }
    }

    if ((i + BATCH) % 5000 === 0) {
      console.log(`  Progress: ${Math.min(i + BATCH, records.length)}/${records.length}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`REBUILD COMPLETE`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
  console.log(`${"=".repeat(60)}`);

  // Final stats
  const stats = await pool.query(`
    SELECT
      COUNT(*)::int as total,
      COUNT(DISTINCT artist)::int as artists,
      COUNT(DISTINCT collection)::int as collections,
      COUNT(DISTINCT genre)::int as genres,
      COUNT(DISTINCT instrument_category)::int as instruments
    FROM audio_loops
  `);
  console.log(`\nDB Stats: ${JSON.stringify(stats.rows[0])}`);

  const byInstrument = await pool.query(`SELECT instrument_category, COUNT(*)::int as c FROM audio_loops GROUP BY instrument_category ORDER BY c DESC`);
  console.log("\nBy instrument:");
  for (const r of byInstrument.rows) console.log(`  ${r.instrument_category}: ${r.c}`);

  const byGenre = await pool.query(`SELECT genre, COUNT(*)::int as c FROM audio_loops GROUP BY genre ORDER BY c DESC LIMIT 15`);
  console.log("\nBy genre:");
  for (const r of byGenre.rows) console.log(`  ${r.genre}: ${r.c}`);

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
