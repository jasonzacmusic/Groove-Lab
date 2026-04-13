/**
 * Parse the Yurt Rock SSD folder catalog and insert all loops into the audio_loops table.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/src/parse-catalog.ts
 *
 * This script parses folder/groove naming conventions to extract:
 *   artist, collection, genre, BPM, key, section_type, section_number,
 *   instrument_category, feel, time_signature
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL });

const BUNNY_CDN_HOST = "groovelab-loops-cdn.b-cdn.net";

function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ── Folder → Artist / Instrument / Genre mapping ──────────────────────────

interface FolderMeta {
  artist: string;
  instrument: string;
  genre: string;
  subGenre?: string;
  feel?: string;
  timeSig?: string;
  bpm?: number;
  key?: string;
  isMultitrack: boolean;
  collectionName: string; // cleaned-up display name
}

// Known artist mappings from folder prefixes
const ARTIST_MAP: Record<string, { artist: string; instrument: string; defaultGenre: string }> = {
  "AdamLevyV1": { artist: "Adam Levy", instrument: "guitar", defaultGenre: "Jazz" },
  "AntonioSanchezV1": { artist: "Antonio Sanchez", instrument: "drums", defaultGenre: "Jazz" },
  "AntonioSanchezV2": { artist: "Antonio Sanchez", instrument: "drums", defaultGenre: "Jazz" },
  "BeatsByDaruJones": { artist: "Daru Jones", instrument: "drums", defaultGenre: "Hip Hop" },
  "BenSatterleeVol1": { artist: "Ben Satterlee", instrument: "drums", defaultGenre: "Pop" },
  "BlairSintaV1": { artist: "Blair Sinta", instrument: "drums", defaultGenre: "Rock" },
  "BlairSintaV2": { artist: "Blair Sinta", instrument: "drums", defaultGenre: "Rock" },
  "BobReynoldsV1": { artist: "Bob Reynolds", instrument: "guitar", defaultGenre: "Jazz" },
  "BonhamologyVol1_MultitrackEdition": { artist: "Bonhamology", instrument: "drums", defaultGenre: "Rock" },
  "BonhamologyVol1_StereoEdition": { artist: "Bonhamology", instrument: "drums", defaultGenre: "Rock" },
  "BonhamologyVol2_MultitrackEditionPart1": { artist: "Bonhamology", instrument: "drums", defaultGenre: "Rock" },
  "BonhamologyVol2_MultitrackEditionPart2": { artist: "Bonhamology", instrument: "drums", defaultGenre: "Rock" },
  "BonhamologyVol2_StereoEdition": { artist: "Bonhamology", instrument: "drums", defaultGenre: "Rock" },
  "BrianFrasierMooreV1_Drums_MultitrackPt2": { artist: "Brian Frasier-Moore", instrument: "drums", defaultGenre: "Pop" },
  "BrianFrasierMooreV1_Drums_MultitrackPt3": { artist: "Brian Frasier-Moore", instrument: "drums", defaultGenre: "Pop" },
  "BrianFrasierMooreV1_Drums_Stereo": { artist: "Brian Frasier-Moore", instrument: "drums", defaultGenre: "Pop" },
  "BrianFrasierMooreV2_Drums_MultitrackPt1": { artist: "Brian Frasier-Moore", instrument: "drums", defaultGenre: "Pop" },
  "BrianFrasierMooreV2_Drums_MultitrackPt2": { artist: "Brian Frasier-Moore", instrument: "drums", defaultGenre: "Pop" },
  "BrianFrasierMooreV2_Drums_MultitrackPt3": { artist: "Brian Frasier-Moore", instrument: "drums", defaultGenre: "Pop" },
  "BrushDrumsV1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "BrushDrumsV2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Folk" },
  "BrushDrumsV3": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "BrushDrumsV4": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Blues" },
  "BrushDrumsV5": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "CharieHunterCarterMcLeanV1": { artist: "Charlie Hunter & Carter McLean", instrument: "guitar", defaultGenre: "Jazz" },
  "CharlieHunter_KickSnareBariGuitar": { artist: "Charlie Hunter", instrument: "guitar", defaultGenre: "Blues" },
  "CharlieHunter_PattonInPercussion": { artist: "Charlie Hunter", instrument: "percussion", defaultGenre: "World" },
  "CharlieHunterBobbyPrevite_LogicMultitracksPt1": { artist: "Charlie Hunter & Bobby Previte", instrument: "guitar", defaultGenre: "Blues" },
  "CharlieHunterBobbyPrevite_LogicMultitracksPt2": { artist: "Charlie Hunter & Bobby Previte", instrument: "guitar", defaultGenre: "Blues" },
  "CharlieHunterBobbyPrevite_StereoLoops": { artist: "Charlie Hunter & Bobby Previte", instrument: "guitar", defaultGenre: "Blues" },
  "ChrisKimmererV1": { artist: "Chris Kimmerer", instrument: "drums", defaultGenre: "Rock" },
  "ClydeStubblefield_MultitrackDrums": { artist: "Clyde Stubblefield", instrument: "drums", defaultGenre: "Funk" },
  "ClydeStublefield_Drums": { artist: "Clyde Stubblefield", instrument: "drums", defaultGenre: "Funk" },
  "CurtRockV1": { artist: "Curt Bisquera", instrument: "drums", defaultGenre: "Rock" },
  "CurtRockV2_MultitrackEdition": { artist: "Curt Bisquera", instrument: "drums", defaultGenre: "Rock" },
  "CurtRockV2_StereoEdition": { artist: "Curt Bisquera", instrument: "drums", defaultGenre: "Rock" },
  "DamonGrantV1": { artist: "Damon Grant", instrument: "percussion", defaultGenre: "World" },
  "DougWambleV1": { artist: "Doug Wamble", instrument: "guitar", defaultGenre: "Blues" },
  "DrumsOfTheWorld": { artist: "Yurt Rock", instrument: "percussion", defaultGenre: "World" },
  "DrumsOfTheWorldV2": { artist: "Yurt Rock", instrument: "percussion", defaultGenre: "World" },
  "DryDrumsV1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "DryDrumsV2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "DryDrumsV3": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "DryDrumsV4": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "DryDrumsV5": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "DylanWissing_BIGDRUMSV1_Copper": { artist: "Dylan Wissing", instrument: "drums", defaultGenre: "Hip Hop" },
  "DylanWissing_CincinnatiFunkDrumsV1": { artist: "Dylan Wissing", instrument: "drums", defaultGenre: "Funk" },
  "DylanWissing_DONUTDRUMSV2_VinylMix": { artist: "Dylan Wissing", instrument: "drums", defaultGenre: "Hip Hop" },
  "EricHarlandV1": { artist: "Eric Harland", instrument: "drums", defaultGenre: "Jazz" },
  "EricHarlandV2": { artist: "Eric Harland", instrument: "drums", defaultGenre: "Jazz" },
  "FunkDrumsVol1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Funk" },
  "FunkDrumsVol2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Funk" },
  "GeorgeSluppickV1": { artist: "George Sluppick", instrument: "drums", defaultGenre: "Funk" },
  "GregHerseyV1": { artist: "Greg Hersey", instrument: "percussion", defaultGenre: "Pop" },
  "IndieRockDrumsVol1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "IndieRockDrumsVol2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "IndieRockDrumsVol3": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "IndieRockDrumsVol4": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "IndieRockDrumsVol5": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "IndieRockDrumsVol6": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Indie Rock" },
  "JoeyWaronkerV1": { artist: "Joey Waronker", instrument: "drums", defaultGenre: "Indie Rock" },
  "JoeyWaronkerV2_MultitrackDrums": { artist: "Joey Waronker", instrument: "drums", defaultGenre: "Indie Rock" },
  "MarcusFinnieSessionDrumsV1_Pt1": { artist: "Marcus Finnie", instrument: "drums", defaultGenre: "Rock" },
  "MarcusFinnieSessionDrumsV1_Pt2": { artist: "Marcus Finnie", instrument: "drums", defaultGenre: "Rock" },
  "MarcusFinnieSessionDrumsV1_Pt3": { artist: "Marcus Finnie", instrument: "drums", defaultGenre: "Rock" },
  "MarcusFinnieSessionDrumsV2_Pt1": { artist: "Marcus Finnie", instrument: "drums", defaultGenre: "Rock" },
  "MarcusFinnieSessionDrumsV2_Pt2": { artist: "Marcus Finnie", instrument: "drums", defaultGenre: "Rock" },
  "MarcusFinnieSessionDrumsV2_Pt3": { artist: "Marcus Finnie", instrument: "drums", defaultGenre: "Rock" },
  "MikeClarkV1": { artist: "Mike Clark", instrument: "drums", defaultGenre: "Funk" },
  "MikeClarkV2": { artist: "Mike Clark", instrument: "drums", defaultGenre: "Funk" },
  "NateSmith_PocketChangeV2": { artist: "Nate Smith", instrument: "drums", defaultGenre: "Funk" },
  "OddMeterDrums_Vol1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Jazz" },
  "OddMeterDrums_Vol2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Jazz" },
  "OddMeterDrums_Vol3": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Jazz" },
  "OneManTribeVol1_TapeDrums": { artist: "One Man Tribe", instrument: "drums", defaultGenre: "World" },
  "OneManTribeVol2_CreativePercussion": { artist: "One Man Tribe", instrument: "percussion", defaultGenre: "World" },
  "OneManTribeVol3_CosmicPercussion": { artist: "One Man Tribe", instrument: "percussion", defaultGenre: "World" },
  "ReubenRogersV1": { artist: "Reuben Rogers", instrument: "bass", defaultGenre: "Reggae" },
  "RichRedmondV1_MultitrackEdition": { artist: "Rich Redmond", instrument: "drums", defaultGenre: "Rock" },
  "RichRedmondV1_StereoEdition": { artist: "Rich Redmond", instrument: "drums", defaultGenre: "Rock" },
  "RichRedmondV2_StereoEdition": { artist: "Rich Redmond", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsBundle": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol1_MIDI": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol1_WAV": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol2_MIDI": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol2_WAV": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol3": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol4": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol5": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol6": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol7": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_HybridDrumsVol8": { artist: "Ryan Gruss", instrument: "drums", defaultGenre: "Rock" },
  "RyanGruss_ManVsMoogV1": { artist: "Ryan Gruss", instrument: "electronic", defaultGenre: "Electronic" },
  "RyanGruss_ManVsMoogV2": { artist: "Ryan Gruss", instrument: "electronic", defaultGenre: "Electronic" },
  "RyanGruss_ManVsMoogV3": { artist: "Ryan Gruss", instrument: "electronic", defaultGenre: "Electronic" },
  "RyanGruss_ManVsMoogV4": { artist: "Ryan Gruss", instrument: "electronic", defaultGenre: "Electronic" },
  "SeanHurleyV1": { artist: "Sean Hurley", instrument: "bass", defaultGenre: "Pop" },
  "ShawnZornV1": { artist: "Shawn Zorn", instrument: "drums", defaultGenre: "Funk" },
  "ToddSuchermanV2": { artist: "Todd Sucherman", instrument: "drums", defaultGenre: "Rock" },
  "CompleteTakesV1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "CompleteTakesV2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "CompleteTakesV3": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Rock" },
  "Cinematic DrumsV1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Cinematic" },
  "Cinematic DrumsV2": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Cinematic" },
  "Cinematic DrumsV3": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Cinematic" },
  "BluesDrumsVol1": { artist: "Yurt Rock", instrument: "drums", defaultGenre: "Blues" },
};

// Genre-collection folders (no specific artist, genre is in the folder name)
const GENRE_FOLDERS: Record<string, { genre: string; key?: string; bpm?: number; artist: string }> = {
  "90sHipHop_EMajor_91bpm": { genre: "Hip Hop", key: "E", bpm: 91, artist: "Yurt Rock" },
  "BluesGroove_BMajor_177bpm": { genre: "Blues", key: "B", bpm: 177, artist: "Yurt Rock" },
  "DiscoTimes_Dmin_108bpm": { genre: "Funk", key: "D", bpm: 108, artist: "Yurt Rock" },
  "HeavyDropD_Eb_124bpm": { genre: "Rock", key: "Eb", bpm: 124, artist: "Marcus Finnie" },
  "HighwayRock_D_85bpm": { genre: "Rock", key: "D", bpm: 85, artist: "Yurt Rock" },
  "PowerFunk_C#_97bpm": { genre: "Funk", key: "C#", bpm: 97, artist: "Marcus Finnie" },
  "RetroSoul_C_127bpm": { genre: "Soul", key: "C", bpm: 127, artist: "Marcus Finnie" },
  "Rockofthe70s_C#_81bpm": { genre: "Rock", key: "C#", bpm: 81, artist: "Marcus Finnie" },
  "Smooth80s_AbtoA_82bpm": { genre: "Pop", key: "Ab", bpm: 82, artist: "Marcus Finnie" },
};

// Multitrack folders
const MULTITRACK_FOLDERS: Record<string, { artist: string; instrument: string; genre: string; bpm?: number }> = {
  "Multitracks_AcousticFolk_BackbeatBrush_83bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Folk", bpm: 83 },
  "Multitracks_AcousticFolk_BluesBrushes_180bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Folk", bpm: 180 },
  "Multitracks_DryDrums_Mulholland_85bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 85 },
  "Multitracks_DryDrums_Topanga_110bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 110 },
  "Multitracks_IndieRockDrums_FrontPocket_122bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock", bpm: 122 },
  "Multitracks_IndieRockDrums_VintagePunch_89bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock", bpm: 89 },
  "Multitracks_RockAndRoll_Downtown_80bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 80 },
  "Multitracks_RockAndRoll_InTheVan_105bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 105 },
  "Multitracks_Songwriter_Brushes_77bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Folk", bpm: 77 },
  "Multitracks_Songwriter_StraightUp_91bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Pop", bpm: 91 },
  "Multitracks_StudioDrums_StudioA_95bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Pop", bpm: 95 },
  "Multitracks_StudioDrums_StudioB_115bpm": { artist: "Yurt Rock", instrument: "drums", genre: "Pop", bpm: 115 },
};

function parseFolderMeta(folderName: string): FolderMeta {
  // Check genre folders first
  if (GENRE_FOLDERS[folderName]) {
    const g = GENRE_FOLDERS[folderName];
    return {
      artist: g.artist,
      instrument: "drums",
      genre: g.genre,
      bpm: g.bpm,
      key: g.key,
      isMultitrack: false,
      collectionName: folderName.replace(/_/g, " ").replace(/\d+bpm/i, "").trim(),
    };
  }

  // Check multitrack folders
  if (MULTITRACK_FOLDERS[folderName]) {
    const m = MULTITRACK_FOLDERS[folderName];
    const displayName = folderName.replace(/^Multitracks_/, "").replace(/_/g, " ").replace(/\d+bpm/i, "").trim();
    return {
      artist: m.artist,
      instrument: m.instrument,
      genre: m.genre,
      bpm: m.bpm,
      isMultitrack: true,
      collectionName: displayName,
    };
  }

  // Try artist map - try longest prefix match
  let bestMatch = "";
  let bestMeta: { artist: string; instrument: string; defaultGenre: string } | null = null;
  for (const [prefix, meta] of Object.entries(ARTIST_MAP)) {
    if (folderName.startsWith(prefix) && prefix.length > bestMatch.length) {
      bestMatch = prefix;
      bestMeta = meta;
    }
  }

  if (bestMeta) {
    const isMultitrack = /[Mm]ultitrack/i.test(folderName);
    const collectionName = folderName
      .replace(/_WAV$/i, "").replace(/_MIDI$/i, "").replace(/_WAV_MIDI$/i, "")
      .replace(/_MIDI_WAV$/i, "").replace(/_ALP$/i, "").replace(/_WAV_ALP$/i, "")
      .replace(/_/g, " ").trim();
    return {
      artist: bestMeta.artist,
      instrument: bestMeta.instrument,
      genre: bestMeta.defaultGenre,
      isMultitrack,
      collectionName,
    };
  }

  // Fallback
  return {
    artist: "Yurt Rock",
    instrument: "drums",
    genre: "Rock",
    isMultitrack: false,
    collectionName: folderName.replace(/_/g, " "),
  };
}

// ── Extract BPM from groove name ──────────────────────────────────────────

function extractBpm(name: string): number | null {
  // Match patterns like "91bpm", "120 bpm", "120bpm"
  const m = name.match(/(\d{2,3})\s*bpm/i);
  if (m) return parseInt(m[1]);
  // BFM format: "BFM 100 Swing Pop Verse 1" — second token is BPM
  const bfm = name.match(/^BFM\s+(\d{2,3})\s/);
  if (bfm) return parseInt(bfm[1]);
  return null;
}

// ── Extract section type and number from groove name ──────────────────────

const SECTION_TYPES = [
  "intro", "verse", "chorus", "bridge", "outro", "fill", "break",
  "ending", "end", "build", "buildup", "breakdown",
  "prechorus", "pre-chorus", "interlude", "guitarsolo", "guitarbreak",
  "halftime", "doubletime",
  "stripped", "countoff", "count off", "pickup",
  "8bar", "4bar", "16bar", "2bar", "1bar",
  "groove", "ride", "bell", "hat", "loosehat", "tighthat",
  "xstick", "toms", "crash", "snare", "kick",
  "bassbreak", "drumbreak", "pedal", "walkdown",
  "loudsoft", "loudsoftstop", "rockin", "tomintro",
];

interface SectionInfo {
  sectionType: string;
  sectionNumber: number | null;
  grooveVariant: string; // e.g., "A", "B", "Crash", etc.
}

function extractSection(name: string): SectionInfo {
  const lower = name.toLowerCase().trim();

  // Try to match known section type at the start or prominent position
  // BFM format: "BFM 100 Swing Pop Verse 1"
  const bfmMatch = name.match(/^BFM\s+\d+\s+.*?\b(Verse|Chorus|Break|Stripped|Intro|Outro|Bridge|Fill)\b\s*(?:Fill\s*)?(\d+)?$/i);
  if (bfmMatch) {
    let secType = bfmMatch[1].toLowerCase();
    // "Verse Fill" → "fill"
    if (/fill$/i.test(name) && secType !== "fill") secType = "fill";
    return { sectionType: secType, sectionNumber: bfmMatch[2] ? parseInt(bfmMatch[2]) : null, grooveVariant: "" };
  }

  // Standard patterns: "Verse A Crash LightOnLove 1", "Chorus Fill SwissMix 2"
  for (const sec of ["verse", "chorus", "intro", "outro", "bridge", "fill", "break", "ending",
    "groove", "bell", "ride", "hat", "halftime", "doubletime", "prechorus",
    "interlude", "guitarsolo", "guitarbreak", "breakdown", "buildup", "build",
    "stripped", "countoff", "pedal", "walkdown", "bassbreak", "drumbreak",
    "loudsoft", "loudsoftstop", "rockin", "tomintro", "xstick", "toms",
    "crash", "snare", "kick"]) {
    // Check if name starts with this section type (common pattern)
    const regex = new RegExp(`^${sec}\\b`, "i");
    if (regex.test(lower)) {
      // Extract trailing number
      const numMatch = name.match(/\s(\d+)$/);
      const num = numMatch ? parseInt(numMatch[1]) : null;

      // Extract variant (A, B, C, D) if present
      const varMatch = name.match(new RegExp(`^${sec}\\s+([A-F])\\b`, "i"));
      const variant = varMatch ? varMatch[1] : "";

      return { sectionType: sec, sectionNumber: num, grooveVariant: variant };
    }
  }

  // Check if section type appears anywhere in the name
  for (const sec of ["chorus", "verse", "intro", "outro", "bridge", "fill", "ending", "break"]) {
    if (lower.includes(sec)) {
      const numMatch = name.match(/\s(\d+)$/);
      return { sectionType: sec, sectionNumber: numMatch ? parseInt(numMatch[1]) : null, grooveVariant: "" };
    }
  }

  // Default: treat as full_loop
  const numMatch = name.match(/\s(\d+)$/);
  return { sectionType: "full_loop", sectionNumber: numMatch ? parseInt(numMatch[1]) : null, grooveVariant: "" };
}

// ── Extract genre hints from groove name ──────────────────────────────────

function detectGenre(name: string, folderGenre: string): string {
  const lower = name.toLowerCase();
  if (/hip\s*hop/i.test(lower)) return "Hip Hop";
  if (/funk/i.test(lower)) return "Funk";
  if (/blues/i.test(lower)) return "Blues";
  if (/jazz/i.test(lower)) return "Jazz";
  if (/rock/i.test(lower)) return "Rock";
  if (/pop/i.test(lower)) return "Pop";
  if (/r&?n&?b|rnb/i.test(lower)) return "R&B";
  if (/soul/i.test(lower)) return "Soul";
  if (/latin|cuban|samba|bossa/i.test(lower)) return "Latin";
  if (/reggae|dub/i.test(lower)) return "Reggae";
  if (/indie/i.test(lower)) return "Indie Rock";
  if (/motown/i.test(lower)) return "Soul";
  if (/shuffle/i.test(lower) && folderGenre === "Rock") return "Blues";
  if (/disco/i.test(lower)) return "Funk";
  if (/afro|african/i.test(lower)) return "World";
  if (/cinematic/i.test(lower)) return "Cinematic";
  if (/electronic/i.test(lower)) return "Electronic";
  if (/folk/i.test(lower)) return "Folk";
  if (/dance/i.test(lower)) return "Pop";
  if (/waltz|three/i.test(lower)) return folderGenre;
  return folderGenre;
}

function detectFeel(name: string): string | null {
  const lower = name.toLowerCase();
  if (/shuffle/i.test(lower)) return "shuffle";
  if (/swing|swung|swunk/i.test(lower)) return "swing";
  if (/straight/i.test(lower)) return "straight";
  if (/laid.?back/i.test(lower)) return "laid_back";
  if (/triplet/i.test(lower)) return "shuffle";
  return null;
}

function detectTimeSig(name: string): string {
  const lower = name.toLowerCase();
  if (/\b3[:/]4\b|three\s*four|waltz/i.test(lower)) return "3/4";
  if (/\b6[:/]8\b|six\s*eight/i.test(lower)) return "6/8";
  if (/\b5[:/]4\b|five\s*four/i.test(lower)) return "5/4";
  if (/\b7[:/]8\b|seven\s*eight/i.test(lower)) return "7/8";
  if (/\b7[:/]4\b|seven\s*four/i.test(lower)) return "7/8";
  if (/\b9[:/]8\b|nine\s*eight/i.test(lower)) return "odd";
  if (/\b12[:/]8\b|twelve.?eight/i.test(lower)) return "12/8";
  if (/\b13[:/]8\b|thirteen/i.test(lower)) return "odd";
  if (/\b15[:/]8\b|fifteen/i.test(lower)) return "odd";
  if (/\b17[:/]8\b|seventeen/i.test(lower)) return "odd";
  return "4/4";
}

function extractKey(name: string): string | null {
  // Match key patterns at start: "A_105bpm", "Bb_83bpm", "C#_160bpm"
  const keyMatch = name.match(/^([A-G][b#]?)[\s_]/);
  if (keyMatch) return keyMatch[1];
  // Match "in C", "Key Of A"
  const keyOf = name.match(/(?:Key\s+[Oo]f|in)\s+([A-G][b#]?)/);
  if (keyOf) return keyOf[1];
  // Match key in middle: "F_172bpm", embedded patterns
  const embedded = name.match(/\b([A-G][b#]?)\s+\d+bpm/);
  if (embedded) return embedded[1];
  return null;
}

// ── Skip non-audio entries ────────────────────────────────────────────────

function shouldSkip(grooveName: string): boolean {
  const lower = grooveName.toLowerCase();
  return (
    /one\s*shots?/i.test(lower) ||
    /samples/i.test(lower) ||
    /multitrack_loops/i.test(lower) ||
    /stereo_?loops/i.test(lower) ||
    /stereo_?drum/i.test(lower) ||
    /battery.*kit/i.test(lower) ||
    /kit\s*samples/i.test(lower) ||
    /percussion only/i.test(lower) ||
    /perc loops/i.test(lower) ||
    lower.startsWith("_percussion") ||
    lower.startsWith("_x") ||
    lower.startsWith("_stereo") ||
    /^percussion$/i.test(lower.trim()) ||
    /midifileurl/i.test(lower)
  );
}

// ── Parse the catalog text ────────────────────────────────────────────────

interface LoopRecord {
  title: string;
  artist: string;
  collection: string;
  grooveName: string;
  instrumentCategory: string;
  genre: string;
  subGenre: string | null;
  bpm: number | null;
  keySignature: string | null;
  timeSignature: string;
  feel: string | null;
  intensity: string | null;
  sectionType: string;
  sectionNumber: number | null;
  isMultitrack: boolean;
  wavUrl: string;
  tags: string[];
}

function parseCatalog(text: string): LoopRecord[] {
  const records: LoopRecord[] = [];
  const lines = text.split("\n");

  let currentFolder = "";
  let folderMeta: FolderMeta | null = null;

  for (const line of lines) {
    const folderMatch = line.match(/^FOLDER:\s+(\S+)\s+\[(\d+)\s+loops?\]/);
    if (folderMatch) {
      currentFolder = folderMatch[1];
      folderMeta = parseFolderMeta(currentFolder);
      continue;
    }

    // Groove entry (indented with 2 spaces)
    const grooveMatch = line.match(/^\s{2}(.+)$/);
    if (grooveMatch && folderMeta) {
      const grooveName = grooveMatch[1].trim();
      if (!grooveName || shouldSkip(grooveName)) continue;

      const bpm = extractBpm(grooveName) || folderMeta.bpm || null;
      const section = extractSection(grooveName);
      const genre = detectGenre(grooveName, folderMeta.genre);
      const feel = detectFeel(grooveName) || folderMeta.feel || null;
      const timeSig = detectTimeSig(grooveName);
      const key = extractKey(grooveName) || folderMeta.key || null;

      // Build a clean groove name for display
      const title = `${grooveName}`.trim();

      // Build CDN URL placeholder
      const artistSlug = slug(folderMeta.artist);
      const collectionSlug = slug(currentFolder);
      const grooveSlug = slug(grooveName);
      const wavUrl = `https://${BUNNY_CDN_HOST}/${artistSlug}/${collectionSlug}/${grooveSlug}.wav`;

      // Build tags from various metadata
      const tags: string[] = [];
      if (folderMeta.isMultitrack) tags.push("multitrack");
      if (section.grooveVariant) tags.push(`variant:${section.grooveVariant}`);
      if (currentFolder.includes("Brush") || grooveName.toLowerCase().includes("brush")) tags.push("brushes");
      if (grooveName.toLowerCase().includes("crash")) tags.push("crash");
      if (grooveName.toLowerCase().includes("ride")) tags.push("ride");

      records.push({
        title,
        artist: folderMeta.artist,
        collection: currentFolder,
        grooveName: grooveName,
        instrumentCategory: folderMeta.instrument,
        genre,
        subGenre: null,
        bpm,
        keySignature: key,
        timeSignature: timeSig,
        feel,
        intensity: null,
        sectionType: section.sectionType,
        sectionNumber: section.sectionNumber,
        isMultitrack: folderMeta.isMultitrack,
        wavUrl,
        tags,
      });
    }
  }

  return records;
}

// ── Insert into database ──────────────────────────────────────────────────

async function insertRecords(records: LoopRecord[]) {
  console.log(`Inserting ${records.length} records...`);

  // Clear existing data first
  await pool.query("DELETE FROM audio_loops");
  console.log("Cleared existing audio_loops data");

  let inserted = 0;
  let errors = 0;

  // Insert in batches of 50
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const r = batch[j];
      const offset = j * 17;
      placeholders.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},$${offset + 10},$${offset + 11},$${offset + 12},$${offset + 13},$${offset + 14},$${offset + 15},$${offset + 16},$${offset + 17})`);
      values.push(
        r.title,
        r.artist,
        r.collection,
        r.grooveName,
        r.instrumentCategory,
        r.genre,
        r.bpm,
        r.keySignature,
        r.timeSignature,
        r.feel,
        r.sectionType,
        r.sectionNumber,
        r.isMultitrack,
        r.wavUrl,
        r.tags,
        r.subGenre,
        r.intensity,
      );
    }

    try {
      await pool.query(
        `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre, bpm, key_signature, time_signature, feel, section_type, section_number, is_multitrack, wav_url, tags, sub_genre, intensity) VALUES ${placeholders.join(",")}`,
        values
      );
      inserted += batch.length;
    } catch (e: any) {
      console.error(`Batch error at ${i}: ${e.message}`);
      // Fall back to individual inserts
      for (const r of batch) {
        try {
          await pool.query(
            `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre, bpm, key_signature, time_signature, feel, section_type, section_number, is_multitrack, wav_url, tags, sub_genre, intensity) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [r.title, r.artist, r.collection, r.grooveName, r.instrumentCategory, r.genre, r.bpm, r.keySignature, r.timeSignature, r.feel, r.sectionType, r.sectionNumber, r.isMultitrack, r.wavUrl, r.tags, r.subGenre, r.intensity]
          );
          inserted++;
        } catch (e2: any) {
          errors++;
          if (errors <= 5) console.error(`  Record error: ${r.title} — ${e2.message}`);
        }
      }
    }

    if ((i + 50) % 500 === 0 || i + 50 >= records.length) {
      console.log(`  Progress: ${Math.min(i + 50, records.length)}/${records.length} (${inserted} inserted, ${errors} errors)`);
    }
  }

  return { inserted, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Read the catalog from stdin or inline
  const catalogPath = process.argv[2];
  let catalogText: string;

  if (catalogPath) {
    const fs = await import("fs");
    catalogText = fs.readFileSync(catalogPath, "utf-8");
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    catalogText = Buffer.concat(chunks).toString("utf-8");
  }

  console.log("Parsing catalog...");
  const records = parseCatalog(catalogText);

  // Summary
  const artists = new Set(records.map(r => r.artist));
  const collections = new Set(records.map(r => r.collection));
  const genres = new Set(records.map(r => r.genre));
  console.log(`\nParsed ${records.length} loops:`);
  console.log(`  Artists: ${artists.size} (${[...artists].join(", ")})`);
  console.log(`  Collections: ${collections.size}`);
  console.log(`  Genres: ${[...genres].join(", ")}`);
  console.log(`  With BPM: ${records.filter(r => r.bpm).length}`);
  console.log(`  With Key: ${records.filter(r => r.keySignature).length}`);
  console.log(`  Section types: ${[...new Set(records.map(r => r.sectionType))].join(", ")}`);

  // Insert
  const { inserted, errors } = await insertRecords(records);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`CATALOG INGEST COMPLETE`);
  console.log(`  Total parsed: ${records.length}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
  console.log(`${"=".repeat(50)}`);

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
