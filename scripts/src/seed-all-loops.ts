/**
 * Seed the complete Yurt Rock SSD catalog (5,472 loops) into audio_loops.
 * Encodes all 127 folders with their grooves in a compact format.
 *
 * Usage: cd scripts && npx tsx src/seed-all-loops.ts
 */
import pg from "pg";
const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const CDN = "groovelab-loops-cdn.b-cdn.net";

// ── Types ─────────────────────────────────────────────────────────────────
interface FolderDef {
  folder: string;
  artist: string;
  instrument: string;
  genre: string;
  bpm?: number;
  key?: string;
  isMultitrack?: boolean;
  grooves: string[];
}

// ── Slug helper ───────────────────────────────────────────────────────────
function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ── Section extraction ────────────────────────────────────────────────────
function extractSection(name: string): { type: string; num: number | null } {
  // BFM format
  const bfm = name.match(/^BFM\s+\d+\s+.*?\b(Verse|Chorus|Break|Stripped|Intro|Outro|Bridge)\b\s*(?:Fill\s*)?(\d+)?$/i);
  if (bfm) {
    let t = bfm[1].toLowerCase();
    if (/fill$/i.test(name) && t !== "fill") t = "fill";
    return { type: t, num: bfm[2] ? +bfm[2] : null };
  }
  // Check name starts with known section
  for (const sec of ["verse","chorus","intro","outro","bridge","fill","break","ending","end","groove","bell","ride",
    "hat","halftime","doubletime","prechorus","interlude","guitarsolo","guitarbreak","breakdown","buildup",
    "stripped","countoff","pedal","walkdown","bassbreak","drumbreak","loudsoft","rockin","tomintro","xstick","toms","crash","snare","kick","loosehat","tighthat"]) {
    if (name.toLowerCase().startsWith(sec)) {
      const m = name.match(/\s(\d+)$/);
      return { type: sec, num: m ? +m[1] : null };
    }
  }
  // Check contains
  for (const sec of ["chorus","verse","intro","outro","bridge","fill","ending","break"]) {
    if (name.toLowerCase().includes(sec)) {
      const m = name.match(/\s(\d+)$/);
      return { type: sec, num: m ? +m[1] : null };
    }
  }
  const m = name.match(/\s(\d+)$/);
  return { type: "full_loop", num: m ? +m[1] : null };
}

function extractBpm(name: string, folderBpm?: number): number | null {
  const m = name.match(/(\d{2,3})\s*bpm/i);
  if (m) return +m[1];
  const bfm = name.match(/^BFM\s+(\d{2,3})\s/);
  if (bfm) return +bfm[1];
  return folderBpm || null;
}

function detectGenre(name: string, def: string): string {
  const l = name.toLowerCase();
  if (/hip\s*hop/i.test(l)) return "Hip Hop";
  if (/funk/i.test(l)) return "Funk";
  if (/blues/i.test(l)) return "Blues";
  if (/jazz/i.test(l)) return "Jazz";
  if (/rock/i.test(l)) return "Rock";
  if (/pop/i.test(l)) return "Pop";
  if (/r&?n&?b|rnb/i.test(l)) return "R&B";
  if (/soul/i.test(l)) return "Soul";
  if (/latin|cuban|samba|bossa/i.test(l)) return "Latin";
  if (/reggae/i.test(l)) return "Reggae";
  if (/motown/i.test(l)) return "Soul";
  if (/disco/i.test(l)) return "Funk";
  if (/shuffle/i.test(l) && def === "Rock") return "Blues";
  if (/indie/i.test(l)) return "Indie Rock";
  if (/dance/i.test(l)) return "Pop";
  if (/afro|african/i.test(l)) return "World";
  if (/folk/i.test(l)) return "Folk";
  if (/cinematic/i.test(l)) return "Cinematic";
  return def;
}

function detectFeel(name: string): string | null {
  const l = name.toLowerCase();
  if (/shuffle/i.test(l)) return "shuffle";
  if (/swing|swung|swunk/i.test(l)) return "swing";
  if (/straight/i.test(l)) return "straight";
  if (/laid.?back/i.test(l)) return "laid_back";
  if (/triplet/i.test(l)) return "shuffle";
  return null;
}

function detectTimeSig(name: string): string {
  const l = name.toLowerCase();
  if (/\b3[:/]4\b|three\s*four|waltz/i.test(l)) return "3/4";
  if (/\b6[:/]8\b|six\s*eight/i.test(l)) return "6/8";
  if (/\b5[:/]4\b|five\s*four/i.test(l)) return "5/4";
  if (/\b7[:/]8\b|seven\s*eight|7[:/]4/i.test(l)) return "7/8";
  if (/\b12[:/]8\b/i.test(l)) return "12/8";
  if (/\b9[:/]8\b|\b13[:/]8\b|\b15[:/]8\b|\b17[:/]8\b/i.test(l)) return "odd";
  return "4/4";
}

function shouldSkip(g: string): boolean {
  const l = g.toLowerCase().trim();
  return /one\s*shots?|samples|multitrack_loops|stereo_?loops|stereo_?drum|battery.*kit|kit\s*samples|percussion only|midifileurl/i.test(l) ||
    l.startsWith("_percussion") || l.startsWith("_x") || l.startsWith("_stereo") ||
    /^percussion$/i.test(l) || /^kick$/i.test(l);
}

// ── Generate BFM grooves ─────────────────────────────────────────────────
function bfm(bpm: number, style: string, sections: Record<string, number>, extras?: string[]): string[] {
  const result: string[] = [];
  for (const [sec, count] of Object.entries(sections)) {
    for (let i = 1; i <= count; i++) result.push(`BFM ${bpm} ${style} ${sec} ${i}`);
  }
  if (extras) result.push(...extras.map(e => `BFM ${bpm} ${style} ${e}`));
  return result;
}

// ── ALL FOLDERS ───────────────────────────────────────────────────────────

const FOLDERS: FolderDef[] = [
  // ── Genre collections ──
  { folder: "90sHipHop_EMajor_91bpm", artist: "Yurt Rock", instrument: "drums", genre: "Hip Hop", bpm: 91, key: "E",
    grooves: ["8Bar 90s HipHop 91bpm 1","Chorus 90s HipHop 91bpm 1","Chorus 90s HipHop 91bpm 2","Chorus 90s HipHop 91bpm 3","Chorus 90s HipHop 91bpm 4","Chorus 90s HipHop 91bpm 5","Chorus 90s HipHop 91bpm 6","Verse 90s HipHop 91bpm 1","Verse 90s HipHop 91bpm 2","Verse 90s HipHop 91bpm 3","VerseStop 90s HipHop 91bpm 1","VerseStop 90s HipHop 91bpm 2","VerseStop 90s HipHop 91bpm 3"] },
  { folder: "BluesGroove_BMajor_177bpm", artist: "Yurt Rock", instrument: "drums", genre: "Blues", bpm: 177, key: "B",
    grooves: ["Chorus BluesGroove 177bpm 1","Chorus BluesGroove 177bpm 2","IntroChorus BluesGroove 177bpm 1","IntroStopTime BluesGroove 177bpm 1","IntroStopTime BluesGroove 177bpm 2","OutroChorus BluesGroove 177bpm"] },
  { folder: "DiscoTimes_Dmin_108bpm", artist: "Yurt Rock", instrument: "drums", genre: "Funk", bpm: 108, key: "D",
    grooves: ["BassBreak Disco Times 108bpm 1","BassBreak Disco Times 108bpm 2","Chorus Disco Times 108bpm 1","Chorus Disco Times 108bpm 2","Chorus Disco Times 108bpm 3","Chorus Disco Times 108bpm 4","End Disco Times 108bpm","Intro Disco Times 108bpm 1","Intro Disco Times 108bpm 2","Outro Disco Times 108bpm 1","Outro Disco Times 108bpm 2","Verse Disco Times 108bpm 1","Verse Disco Times 108bpm 2"] },
  { folder: "HeavyDropD_Eb_124bpm", artist: "Marcus Finnie", instrument: "drums", genre: "Rock", bpm: 124, key: "Eb",
    grooves: ["Ending Drums Metallic 124bpm","GuitarSolo Drums Metallic 124bpm 1","GuitarSolo Drums Metallic 124bpm 2","Intro Drums Metallic 124bpm 1","Intro Drums Metallic 124bpm 2","LoudSoft Drums Metallic 124bpm 1","LoudSoft Drums Metallic 124bpm 2","LoudSoft Drums Metallic 124bpm 3","LoudSoft Drums Metallic 124bpm 4","LoudSoft Drums Metallic 124bpm 5","LoudSoft Drums Metallic 124bpm 6","LoudSoftStop Drums Metallic 124bpm 1","LoudSoftStop Drums Metallic 124bpm 2","Rockin Drums Metallic 124bpm 1","Rockin Drums Metallic 124bpm 2","Rockin Drums Metallic 124bpm 3","TomIntro Drums Metallic 124bpm 1","TomIntroAndRock Drums Metallic 124bpm 1","Verse Drums Metallic 124bpm 1","Verse Drums Metallic 124bpm 2","Verse Drums Metallic 124bpm 3"] },
  { folder: "HighwayRock_D_85bpm", artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 85, key: "D",
    grooves: ["Chorus Highway Rock 85bpm 1","Chorus Highway Rock 85bpm 2","Chorus Highway Rock 85bpm 3","Chorus Highway Rock 85bpm 4","DrumFill Highway Rock 85bpm 1","GuitarSolo Highway Rock 85bpm 1","Intro Highway Rock 85bpm 1","Intro Highway Rock 85bpm 2","Outro Highway Rock 85bpm 1","Outro Highway Rock 85bpm 2"] },
  { folder: "PowerFunk_C#_97bpm", artist: "Marcus Finnie", instrument: "drums", genre: "Funk", bpm: 97, key: "C#",
    grooves: ["Bridge Tower 97bpm 1","Ending Tower 97bpm","Groove Tower 97bpm 1","GrooveAndBridge Tower 97bpm 1","GuitarBreak Tower 97bpm 1","GuitarBreak Tower 97bpm 2","GuitarBreak Tower 97bpm 3","GuitarBreak Tower 97bpm 4","GuitarBreak Tower 97bpm 5","GuitarBreak Tower 97bpm 6","GuitarBreak Tower 97bpm 7","GuitarBreakAndBridge Tower 97bpm 1","Intro Tower 97bpm 1","Intro Tower 97bpm 2","Pedal Tower 97bpm 1","Pedal Tower 97bpm 2","PedalAndBridge Tower 97bpm 1"] },
  { folder: "RetroSoul_C_127bpm", artist: "Marcus Finnie", instrument: "drums", genre: "Soul", bpm: 127, key: "C",
    grooves: ["Bridge Motown 127bpm 1","Bridge Motown 127bpm 2","BridgeAndWalkdown Motown 127bpm 1","BridgeAndWalkdown Motown 127bpm 2","DrumBreak Motown 127bpm 1","EndHit Motown 127bpm","Groove Motown 127bpm 1","Groove Motown 127bpm 2","Groove Motown 127bpm 3","Groove Motown 127bpm 4","Groove Motown 127bpm 5","GrooveAndWalkdown Motown 127bpm 1","Intro Motown 127bpm 1","IntroBreak Motown 127bpm 1","Outro Motown 127bpm 1","Outro Motown 127bpm 2","PedalAndWalkdown Motown 127bpm 1","Walkdown Motown 127bpm 1","Walkdown Motown 127bpm 2"] },
  { folder: "Rockofthe70s_C#_81bpm", artist: "Marcus Finnie", instrument: "drums", genre: "Rock", bpm: 81, key: "C#",
    grooves: ["Chorus Zepp 81bpm 1","Chorus Zepp 81bpm 2","Chorus Zepp 81bpm 3","Chorus Zepp 81bpm 4","Ending Zepp 81bpm","GuitarSolo Zepp 81bpm 1","GuitarSolo Zepp 81bpm 2","GuitarSolo Zepp 81bpm 3","GuitarSolo Zepp 81bpm 4","Interlude Zepp 81bpm 1","Interlude Zepp 81bpm 2","Intro Zepp 81bpm 1","Intro Zepp 81bpm 2","Intro Zepp 81bpm 3","Verse Zepp 81bpm 1","Verse Zepp 81bpm 2","Verse Zepp 81bpm 3","Verse Zepp 81bpm 4"] },
  { folder: "Smooth80s_AbtoA_82bpm", artist: "Marcus Finnie", instrument: "drums", genre: "Pop", bpm: 82, key: "Ab",
    grooves: ["A Toto 82bpm 1","A Toto 82bpm 2","A Toto 82bpm 3","Bridge Toto 82bpm 1","Bridge Toto 82bpm 2","BuildUp Toto 82bpm 1","C Bb Toto 82bpm 1","Chorus Toto 82bpm 1","Chorus Toto 82bpm 2","ChorusAndEnd Toto 82bpm","F Db Ab Toto 82bpm 1","F Db Ab Toto 82bpm 2","F Db Ab Toto 82bpm 3","F Db Ab Toto 82bpm 4","F# D A Toto 82bpm 1","F# D A Toto 82bpm 2","Groove Toto 82bpm 1","Groove Toto 82bpm 2","Groove Toto 82bpm 3","Groove Toto 82bpm 4","GrooveFill Toto 82bpm 1","Intro Toto 82bpm 1"] },

  // ── Adam Levy ──
  { folder: "AdamLevyV1_BaritoneGuitar_WAV", artist: "Adam Levy", instrument: "guitar", genre: "Jazz",
    grooves: ["A_105bpm","Bb_83bpm","C_175bpm","D_92bpm","E_76bpm","G_112bpm","InThreeC_160bpm","Key Of A","Key Of C","Key Of G","Key of D","Key of E","Long","Palm Mute"] },

  // ── Antonio Sanchez ──
  { folder: "AntonioSanchezV1_WAV", artist: "Antonio Sanchez", instrument: "drums", genre: "Jazz",
    grooves: ["Afrocuban 2:3 Rumba Clave 120bpm","Afrocuban 2:3 clave 5:4 125bpm","Afrocuban 3:2 Rumba Clave 120bpm","Afrocuban 6:8 140bpm","Deep Snare","Double Time Hats","Dry Ride","Funk HipHop 160bpm","Fusion Grooves 160bpm","Jazz Waltz 200bpm","Laidback HipHop Funk 180bpm"] },
  { folder: "AntonioSanchezV2_WAV", artist: "Antonio Sanchez", instrument: "drums", genre: "Jazz",
    grooves: ["Swing 12 Bar Blues 200bpm","Swing AABA Changes 240bpm","The Way Up Groove 160bpm","Varied Afrocuban 2-3 Clave Feels 120bpm","Varied Double Time Feel Straight 8ths 165bpm","Varied Grooves in 7:4 260bpm"] },

  // ── Daru Jones ──
  { folder: "BeatsByDaruJones_MIDI_WAV", artist: "Daru Jones", instrument: "drums", genre: "Hip Hop",
    grooves: ["Clean Loops 1","Clean Loops 2","Clean Loops 3","Clean Loops 4","Clean Loops 5","Clean Loops 6","Vibe Loops 1","Vibe Loops 2","Vibe Loops 3","Vibe Loops 4","Vibe Loops 5","Vibe Loops 6"] },

  // ── Ben Satterlee ──
  { folder: "BenSatterleeVol1_Drums_WAV", artist: "Ben Satterlee", instrument: "drums", genre: "Pop",
    grooves: ["CajonKit_78bpm","GoGoKit_92bpm","NeoSoulKit_84bpm","PopKit_92bpm","RetroKit_100bpm","SixEightKit_64bpm"] },

  // ── Blair Sinta ──
  { folder: "BlairSintaV1_Drums_WAV", artist: "Blair Sinta", instrument: "drums", genre: "Rock",
    grooves: ["112bpm","16ths 1","16ths 2","2Bar","8ths 1","8ths 2","8ths 3","96bpm","Bass Break 1","Bass Break 2","Bell 1","Bell 2","Bell 3","Break","Choke Hat 1","Choke Hat 2","Crash 1","Crash 2","Crash Groove 1","Crash Groove 2","Driving","Dry 1","Dry 2","Dry 3","Effected 1","Effected 2","Effected 3","Empty1","Fill 1","Fill 2","Fill 3","Fill 4","Fill 5","Fills Dry 1","Fills Dry 2","Fills Dry 3","Fills Effected 1","Fills Effected 2","Fills Effected 3","Floor 8ths 1","Floor 8ths 2","Grit","Groove","Halftime 1","Halftime 2","Hat Groove 1","Hat Groove 2","Hat Groove 3","Hat Groove 4","Hat Groove 5","Intro 1","Intro 2","Loops","Loose 16ths 1","Loose 16ths 2","Loose Hat 1","Loose Hat 2","Loose Hat 3","Loose Hat 4","Marchy 1","Marchy 2","Open Hat 1","Open Hat 2","Open Hat 3","Open Hat 4","QuarterHat","Ride 1","Ride 2","Ride 3","Ride 4","Snare","Snares Off 1","Snares Off 2","Space","Tom Groove 1","Tom Groove 2","Tom Groove 3","Tom Groove 4"] },
  { folder: "BlairSintaV2_Drums_WAV", artist: "Blair Sinta", instrument: "drums", genre: "Rock",
    grooves: ["1 Bar Grooves","16s Grooves 1","16s Grooves 2","2 Bar Grooves 1","2 Bar Grooves 2","2 Bar Grooves 3","4 Bar Grooves 1","4 Bar Grooves 2","4 Bar Grooves 3","Bell Grooves 1","Bell Grooves 2","Blown Out 104 bpm","Break","Dropouts","Dry 1","Dry 2","Dry 3","EFX 1","EFX 2","EFX 3","Halftime","Industrial","Tom Grooves 1","Tom Grooves 2","With Percussion 1","With Percussion 2","XStick","with perc"] },

  // ── Blues Drums ──
  { folder: "BluesDrumsVol1_MIDI_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Blues",
    grooves: ["AntiGravity 125bpm","Boogaloo 128bpm","Driving Eighths 110bpm","Slow Pocket 156bpm","Sweet Chicago 115bpm","Uptempo Bounce 210bpm"] },

  // ── Bob Reynolds ──
  { folder: "BobReynoldsV1_Saxophone_WAV", artist: "Bob Reynolds", instrument: "guitar", genre: "Jazz",
    grooves: ["FunkLarry_F_107","HipHop_D_90","Hurley Pop 118 Cm","InRainbows-ish G 140bpm","InThree Db 188","Slow And Low Am 64bpm","WurliGroove BbEb 83bpm"] },

  // ── Bonhamology (Stereo editions - full songs) ──
  { folder: "BonhamologyVol1_StereoEdition_WAV", artist: "Bonhamology", instrument: "drums", genre: "Rock",
    grooves: ["Drop Kick 72bpm","Light And Shade 60bpm","Light On The Love 130bpm","Mountain Mist 130bpm","Never Did No Wrong 95bpm","Swiss Mix 88bpm","Swunky 87bpm","Take 1","Take 2"] },
  { folder: "BonhamologyVol2_StereoEdition_WAV", artist: "Bonhamology", instrument: "drums", genre: "Rock",
    grooves: ["7 to 11 120bpm","Boogie Mama 138bpm","California Sunshine 140bpm","HardToQuit_70bpm","Just Join Hands 110bpm","Keep a Coolin 92bpm","Quick Step 210bpm","Squeeze It 83bpm","The Winds of Thor 66bpm"] },

  // ── Brush Drums V1-V5 ──
  { folder: "BrushDrumsV1_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["BigLudwigs_87bpm","DirtyEFX_122bpm","IndieRawk_99bpm","JangleDrums_111bpm","LaidBack_73bpm","VinylBeats_80bpm"] },
  { folder: "BrushDrumsV2_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Folk",
    grooves: ["FolkTrain_187bpm","FunkyGretsch_90bpm","HighLow_116bpm","MalletsBrushes_75bpm","PongEFX_83bpm","ThreeFour_140bpm"] },
  { folder: "BrushDrumsV3_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["ARolling_200bpm","AlienWires_105bpm","CinematicTubs_70bpm","GretschFunk_95bpm","LooseVintage_100bpm","SwunkTown_85bpm"] },
  { folder: "BrushDrumsV4_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Blues",
    grooves: ["BigScreen_68bpm","BrushBlues_183bpm","FourFloor_92bpm","GoesThunk_79bpm","HighTribe_108bpm","NashvilleSpecial_99bpm"] },
  { folder: "BrushDrumsV5_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["BigBrushes_80bpm","HighAndWide_91bpm","HypnoticThree_165bpm","InSeven_111bpm","LostTapes_85bpm","Roto80s_102bpm"] },

  // ── Charlie Hunter ──
  { folder: "CharieHunterCarterMcLeanV1_DrumsBassGuitar_WAV", artist: "Charlie Hunter & Carter McLean", instrument: "guitar", genre: "Jazz",
    grooves: ["Drums 1","Drums 2","Drums 3","Drums 4","Drums 5","Drums 6","Drums 7","GuitarBass 1","GuitarBass 2","GuitarBass 3","GuitarBass 4","GuitarBass 5","GuitarBass 6","GuitarBass 7","GuitarBass 8","GuitarBass A 1","GuitarBass A 2","Take 1","Take 2"] },
  { folder: "CharlieHunter_KickSnareBariGuitar_WAV", artist: "Charlie Hunter", instrument: "guitar", genre: "Blues",
    grooves: ["CH_Cedar Market_Ab_100bpm","CH_Fat Dogs Cloud Car_G_112bpm","CH_Flints_C_104bpm","CH_Oscars_C_112bpm","CH_Roots Hobby Hut_Eb_90bpm","CH_Silver Ball Gardens_Eb_140bpm","CH_Sneaking Into The US Theater_F_77bpm","CH_Stop The Clock_Bb_96bpm","CH_Tiki Massage_D_81bpm","Alt Guitar","Drums 1","Drums 2","Drums 3","Drums 4","Drums 5","Drums 6","Drums 7","Drums 8","Drums 9","Guitar 1","Guitar 2","Guitar 3","Guitar 4","Guitar 5","Guitar 6","Guitar 7","Guitar 8","Guitar 9"] },
  { folder: "CharlieHunter_PattonInPercussion_WAV", artist: "Charlie Hunter", instrument: "percussion", genre: "World",
    grooves: ["Bass 1","Bass 2","Bass 3","Bass 4","Bass 5","Bass 6","Bass 7","Bass 8","Bell 1","Bell 2","Bell 3","Brushes 1","Brushes 2","Brushes 3","Cajon 1","Cajon 2","Cajon 3","Cajon 4","Cajon 5","Cajons","Caxixi","Claps 1","Claps 2","Conga 1","Conga 2","Conga 3","Conga 4","Guitar 1","Guitar 2","Guitar 3","Guitar 4","Guitar 5","Guitar 6","Guitar 7","Guitar 8","Pandeiro","Pony Blues 108bpm","Quinto 1","Quinto 2","Quinto 3","Quinto 4","Rebolo 1","Rebolo 2","Shaker 1","Shaker 2","Shakers","Some Happy Day","Surdo","Tambourine","Tumba"] },
  { folder: "CharlieHunterBobbyPrevite_LogicMultitracksPt1", artist: "Charlie Hunter & Bobby Previte", instrument: "guitar", genre: "Blues", isMultitrack: true,
    grooves: ["C#_160bpm","D_108bpm","E_84bpm","Eb_120bpm","F#_144bpm","F_172bpm","G#_96bpm","G_132bpm"] },
  { folder: "CharlieHunterBobbyPrevite_LogicMultitracksPt2", artist: "Charlie Hunter & Bobby Previte", instrument: "guitar", genre: "Blues", isMultitrack: true,
    grooves: ["A_74bpm","B_30bpm","Bb_48bpm","C_60bpm"] },
  { folder: "CharlieHunterBobbyPrevite_StereoLoops", artist: "Charlie Hunter & Bobby Previte", instrument: "guitar", genre: "Blues",
    grooves: ["Blues_A_74bpm","Blues_B_30bpm","Blues_Bb_48bpm","Blues_C#_160bpm","Blues_C_60bpm","Blues_D_108bpm","Blues_E_84bpm","Blues_Eb_120bpm","Blues_F#_144bpm","Blues_F_172bpm","Blues_G#_96bpm","Blues_G_132bpm"] },

  // ── Chris Kimmerer ──
  { folder: "ChrisKimmererV1_Drums_WAV", artist: "Chris Kimmerer", instrument: "drums", genre: "Rock",
    grooves: ["Beefy Rock 132bpm","Rock Delay 120bpm","Roomy 96bpm","Slow Burn 72bpm","Train Time140bpm","Vintage Dark 88bpm"] },

  // ── Cinematic Drums ──
  { folder: "Cinematic DrumsV1_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Cinematic",
    grooves: ["Found Objects 82bpm","Hypnotic Three Four 196bpm","Intense 80s 117bpm","The Lurker 75bpm","Tom City 109bpm","Warehouse Chase 97bpm"] },
  { folder: "Cinematic DrumsV2_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Cinematic",
    grooves: ["Danger Looms 81bpm","Floating 79bpm","Good Cop 105bpm","Percussion Kit 102bpm","Three Four Simmer 142bpm","Underwater 67bpm"] },
  { folder: "Cinematic DrumsV3_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Cinematic",
    grooves: ["Big Brushes 75bpm","In The Cracks 95bpm","Loose Cord 129bpm","Robot March 115bpm","Twisted Cave 68bpm","Wall of Toms 110bpm"] },

  // ── Clyde Stubblefield (stereo) ──
  { folder: "ClydeStublefield_Drums", artist: "Clyde Stubblefield", instrument: "drums", genre: "Funk",
    grooves: ["Easy shuffle","Okay 128bpm","Shuffle","The Hippest March 108bpm","The Original 85bpm","Walking 102bpm","You Said 100.5bpm"] },

  // ── Complete Takes ──
  { folder: "CompleteTakesV1_MIDI_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["Downtown Funk 102bpm","Floored 110bpm","Indie Sandwich 90bpm","Slow Blues 180bpm","Songwriter Swung 83bpm","Soul Sixteenths 75bpm"] },
  { folder: "CompleteTakesV2_MIDI_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["Fast Three 193bpm","Last Bite 210bpm","Led It Out 80bpm","Purple Paisley 115bpm","Rootsy Pop 92bpm","Sweet Home 112bpm"] },
  { folder: "CompleteTakesV3_MIDI_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["Big FM 77bpm","Blues In Three 187bpm","Cocktail 105bpm","Garage Door 150bpm","Purdie Withered 82bpm","Retro Pop 120bpm"] },

  // ── Doug Wamble ──
  { folder: "DougWambleV1_ResonatorGuitar_WAV", artist: "Doug Wamble", instrument: "guitar", genre: "Blues",
    grooves: ["A Back Roads 80bpm","A Swinging 100bpm","C Picking 100bpm","C Southern Deluxe 85bpm","D Grooving 100bpm","D Sliding 90bpm","Db Lemonade 120bpm","Db Mellow 90bpm","E Shuffling 120bpm","G Back Home 110bpm","G Blues 80bpm"] },

  // ── Drums Of The World ──
  { folder: "DrumsOfTheWorld_WAV", artist: "Yurt Rock", instrument: "percussion", genre: "World",
    grooves: ["African Loops","Brasil World Loops","Caribbean Loops","Cuban Loops","Egyptian Loops","India Loops","Latin America Loops","Tahitian Loops"] },
  { folder: "DrumsOfTheWorldV2_WAV", artist: "Yurt Rock", instrument: "percussion", genre: "World",
    grooves: ["Afropop Drums","Baila Drums","Bossa Nova Drums","Celtic Drums","Hip Life Drums","Merengue Drums","Middle Eastern Drums 2","Polka Drums"] },

  // ── Dry Drums V1-V5 ──
  { folder: "DryDrumsV1_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["DiddleySquat_87bpm","DryDelay_79bpm","GetUp_175bpm","LoftParty_128bpm","SaharaBlues_199bpm","Tempe_98bpm"] },
  { folder: "DryDrumsV2_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["8thWonder_93bpm","DetroitSpecial_121bpm","FastThree_220bpm","IndieSun_140bpm","SlowFunk_73bpm","Thumper_100bpm"] },
  { folder: "DryDrumsV3_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["DryDC_90bpm","HardKnocks_100bpm","HeavyThree_120bpm","LAShuffle_140bpm","MotelDelay_75bpm","PowerPop_150bpm"] },
  { folder: "DryDrumsV4_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["130Minutes_130bpm","BakedShuffle_99bpm","CrispyMotown_111bpm","RootsyDry_80bpm","SevenEight_95bpm","UpBeat_182bpm"] },
  { folder: "DryDrumsV5_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Rock",
    grooves: ["Cairo_101bpm","Casablanca_141bpm","Dubai_ThreeFour_179bpm","Moab_120bpm","PalmSprings_88bpm","Vegas_93bpm"] },

  // ── Dylan Wissing ──
  { folder: "DylanWissing_BIGDRUMSV1_Copper", artist: "Dylan Wissing", instrument: "drums", genre: "Hip Hop",
    grooves: ["Loops and Samples"] },
  { folder: "DylanWissing_CincinnatiFunkDrumsV1", artist: "Dylan Wissing", instrument: "drums", genre: "Funk",
    grooves: ["Congas","Kit","Kit with Percussion","Shakers"] },
  { folder: "DylanWissing_DONUTDRUMSV2_VinylMix", artist: "Dylan Wissing", instrument: "drums", genre: "Hip Hop",
    grooves: ["Loops and Samples"] },

  // ── Eric Harland ──
  { folder: "EricHarlandV1_Drums_WAV", artist: "Eric Harland", instrument: "drums", genre: "Jazz",
    grooves: ["Afro Cuban 126bpm","BoomCrack 59bpm","Brush to Stick 87bpm","Brushes 89bpm","BuildUp 60bpm","Driving Take 1 266bpm","Driving Take 2 266bpm","Fusion Fury Take 1 130bpm","GrooveEFX 192bpm","Linear Things 69bpm","Space is the Place 139bpm","Subtleties 224","Swunk 197bpm","ThreeFour Time"] },
  { folder: "EricHarlandV2_Drums_WAV", artist: "Eric Harland", instrument: "drums", genre: "Jazz",
    grooves: ["Cinematic 60bpm","Comp1 86bpm","Fully On 147bpm","Intensity 121bpm","Love 117bpm","Petter Seven Four 252bpm","Shine 96bpm"] },

  // ── Funk Drums ──
  { folder: "FunkDrumsVol1_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Funk",
    grooves: ["Funk Drums Vol1 100bpm","Funk Drums Vol1 105bpm","Funk Drums Vol1 110bpm","Funk Drums Vol1 115bpm","Funk Drums Vol1 120bpm","Funk Drums Vol1 75bpm","Funk Drums Vol1 80bpm","Funk Drums Vol1 85bpm","Funk Drums Vol1 90bpm","Funk Drums Vol1 95bpm"] },
  { folder: "FunkDrumsVol2_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Funk",
    grooves: ["Funk Drums Vol2 100bpm","Funk Drums Vol2 105bpm","Funk Drums Vol2 110bpm","Funk Drums Vol2 120bpm","Funk Drums Vol2 90bpm","Funk Drums Vol2 95bpm"] },

  // ── Indie Rock Drums V1-V6 ──
  { folder: "IndieRockDrumsVol1_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["Bouncy Room 104bpm","Deep Fried 79bpm","Lower East Side140bpm","Taped Up 80bpm","The Opener 87bpm","Vintage Brushes 96bpm"] },
  { folder: "IndieRockDrumsVol2_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["Akron Shuffle 91bpm","Bedford Ave 134bpm","Pumped Up 108bpm","Silverlake 129bpm","Stutter Stomp 100bpm","Warm Brushes 75bpm"] },
  { folder: "IndieRockDrumsVol3_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["Detroit Delay 75bpm","Gritty Brushes 121bpm","NY Lust 195bpm","Pinball Flame 68bpm","Spork 145bpm","Talking Beds 105bpm"] },
  { folder: "IndieRockDrumsVol4_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["Dance Dance 118bpm","Faded Memory 108bpm","Indie Blues 162bpm","Tape Slap 94bpm","Thick Pocket 80bpm","Upside Down 82bpm"] },
  { folder: "IndieRockDrumsVol5_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["Caved In 92bpm","Classic Three Four 175bpm","In The Middle 95bpm","Late Encore 104bpm","Right Angles 112bpm","Shake It Froth 161bpm"] },
  { folder: "IndieRockDrumsVol6_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock",
    grooves: ["1977 77bpm","1988 88bpm","Chunky Monkey 99bpm","Demo Deal 127bpm","Folk In Three 181bpm","Moving Out 167bpm"] },

  // ── Odd Meter Drums ──
  { folder: "OddMeterDrums_Vol1_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Jazz",
    grooves: ["Brushed Five Four 99bpm","Detroit Fifteen Eight 120bpm","Funksion Seven Eight 111bpm","Slow Thirteen Eight 77bpm","The Krunge Nine Eight 113bpm","Tight Seven Eight 83bpm"] },
  { folder: "OddMeterDrums_Vol2_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Jazz",
    grooves: ["Brisk Seventeen Eight 141bpm","Dark Dreamy Fifteen Eight 77bpm","Nine Eight EFX 101bpm","Super Dry Mix","Super Live Mix","Swunk Seven Eight 88bpm","Vintage Thirteen Eight 82bpm"] },
  { folder: "OddMeterDrums_Vol3_WAV", artist: "Yurt Rock", instrument: "drums", genre: "Jazz",
    grooves: ["70s Five Four 103bpm","Funky Thirteen Eight 129bpm","Fusion Fifteen Eight 136bpm","Retro Seven Four 115bpm","Slinky Seven Eight 72bpm","Swung Three Four 160bpm"] },

  // ── Nate Smith ──
  { folder: "NateSmith_PocketChangeV2_WAV", artist: "Nate Smith", instrument: "drums", genre: "Funk",
    grooves: ["107bpm Wait For It","109bpm Slithery","128bpm Processional","130bpm Trapped","138bpm Winky Dinky Dog","140bpm Showdown","242bpm Tick","82bpm River","93bpm Repurposed","94bpm Heavyweight","97bpm Run-On","99bpm Wisk"] },

  // ── Reuben Rogers ──
  { folder: "ReubenRogersV1_AcousticBass_WAV", artist: "Reuben Rogers", instrument: "bass", genre: "Reggae",
    grooves: ["Blues Reggae Dance Db min 63bpm","Calypsoish C 75bpm","Caribbean Slap C 85bpm","Garvey Dub Eb 76bpm","Inspired Rhythm D 70bpm","Jam Band A 140bpm","Rastaman G 120bpm","Rock Steady Db 78bpm","Roundhouse F 120bpm","Slider Bb minor 145bpm","Soca Eb 122bpm","Upbeat Jam A Major 140bpm","Upbeat Jam B minor 150bpm","Vanity G 75bpm"] },

  // ── Sean Hurley ──
  { folder: "SeanHurleyV1_Bass_WAV", artist: "Sean Hurley", instrument: "bass", genre: "Pop",
    grooves: ["#2 C 77bpm","Funky Blues A 84bpm","Funky Riff Cm 100bpm","HipHop Em 96bpm","Indie Pop Em 119bpm","Pop Bm 90bpm","Pop Country D 92bpm","Pop Grooves Bb 118bpm"] },

  // ── Ryan Gruss ──
  { folder: "RyanGruss_HybridDrumsBundle_MIDI_WAV", artist: "Ryan Gruss", instrument: "drums", genre: "Rock",
    grooves: ["80s Delays 85bpm","80s Shuffle 105bpm","90s Alt Rock 115bpm","Afro Cuban 210bpm","After Hours 180bpm","Big Linear 111bpm","Big Three 110bpm","Blooze In Three 183bpm","Boo Bighters 160bpm","Cinematic Ballad 72bpm","Cinematic Mallets 175bpm","Dry Aggression 71bpm","Fast Folk 205bpm","Fast Funk 122bpm","Five Four Fun 119bpm","Fusion Funk 117bpm","Fusion Three 120bpm","Grainy Day 83bpm","Hip Hop 82bpm","In Three 180bpm","Indie 93bpm","Indie Rock 110bpm","Latin Lounge 105bpm","Lucky Sevens 77bpm","Moon Light 140bpm","On The Floor 90bpm","On The One 129bpm","Organic Mallets 95bpm","Pretty Purdie 80bpm","Punked 142bpm","Retro Rock Ballad 135bpm","Robot Waltz 197bpm","Rock Shuffle 167bpm","Rock This Way 95bpm","Roll And Rock 133bpm","Rosie 80bpm","Seven Eight 90bpm","Slow Chicago Blues 160bpm","Slow Funk 79bpm","Slow Snow 63bpm","Soul 110bpm","Soul Ballad 69bpm","Soul Stomp 100bpm","Sprockets 136bpm","Thick Blues 170bpm","Turnaround 91bpm","Vintage Blues 200bpm","Vintage Pop 100bpm"] },
  { folder: "RyanGruss_HybridDrumsVol1_WAV_MIDI", artist: "Ryan Gruss", instrument: "drums", genre: "Rock",
    grooves: ["HybridV1_HipHop_82bpm","HybridV1_InThree_180bpm","HybridVol1_Indie_93bpm","HybridVol1_SlowFunk_79bpm","HybridVol1_Soul_110bpm","HybridVol1_VintagePop_100bpm"] },
  { folder: "RyanGruss_ManVsMoogV1_WAV_ALP", artist: "Ryan Gruss", instrument: "electronic", genre: "Electronic",
    grooves: ["Deep Springs 120bpm","Grit Bit 109bpm","Soundsystem 105bpm","Space Funk 91bpm","Totally Buzzed 85bpm","Whos Who 127bpm"] },
  { folder: "RyanGruss_ManVsMoogV2_WAV_ALP", artist: "Ryan Gruss", instrument: "electronic", genre: "Electronic",
    grooves: ["Crunchy Bits 94bpm","Deep Drumbs 79.5bpm","Not Latin 88bpm","On Foot 108bpm","Say No 126.5bpm","Waking Up 92bpm"] },
  { folder: "RyanGruss_ManVsMoogV3_WAV_ALP", artist: "Ryan Gruss", instrument: "electronic", genre: "Electronic",
    grooves: ["Angular Angles 100bpm","Back Alley 98.5bpm","Funk Drunk 101bpm","Indie Cosmos 129bpm","Subtle Stadium 121bpm","The Deep End 79bpm"] },
  { folder: "RyanGruss_ManVsMoogV4_WAV_ALP", artist: "Ryan Gruss", instrument: "electronic", genre: "Electronic",
    grooves: ["Friend Zone 115bpm","Plandemic 102bpm","Snow Day 75bpm","Tech Bro 84bpm","Vacation Mode 91bpm","Wally World 130bpm"] },

  // ── Todd Sucherman ──
  { folder: "ToddSuchermanV2_WAV", artist: "Todd Sucherman", instrument: "drums", genre: "Rock",
    grooves: ["Big 1","Big 2","Big 3","Big 4","Big 5","Big 6","Big 7","Crush 1","Crush 2","Crush 3","Crush 4","Crush 5","Crush 6","Crush 7","Jungle Shaker 73bpm","Nice 1","Nice 2","Nice 3","Nice 4","Nice 5","Nice 6","Nice 7","Shuffle 118bpm","Simple 102bpm","Simple 119bpm","SongForm RN 127bpm","Tommin 126bpm","Toolin 6:8 88bpm","Tribal 95bpm","Tribal Groove 106bpm","Tribal Shake 106bpm"] },

  // ── Multitrack folders ──
  { folder: "Multitracks_AcousticFolk_BackbeatBrush_83bpm", artist: "Yurt Rock", instrument: "drums", genre: "Folk", bpm: 83, isMultitrack: true,
    grooves: ["Bridge1","Bridge2CrashFill","Bridge3CrashFill","Bridge4","Bridge5Fill","Chorus1Crash","Chorus2Crash","Chorus3Fill","Chorus4Fill","Chorus5Fill","Chorus6","Chorus7","End1Hit","End2Crash","Fill1","Fill2","Intro1Crash","Intro2Crash","Intro3","Intro4","Verse1Crash","Verse2Crash","Verse3Fill","Verse4Crash","Verse5","Verse6Fill","Verse7Crash"] },
  { folder: "Multitracks_AcousticFolk_BluesBrushes_180bpm", artist: "Yurt Rock", instrument: "drums", genre: "Folk", bpm: 180, isMultitrack: true,
    grooves: ["Bridge1Crash","Bridge2","Bridge3Crash","Bridge4Fill","Bridge5","Bridge6Fill","Bridge7Crash","Chorus1","Chorus2Crash","Chorus3Crash","Chorus4","Chorus5Crash","Chorus6Fill","End1Crash","End2Hit","Fill1","Fill2","Fill3","Fill4","Fill5","Intro1Crash","Intro2","Intro3","Verse1Crash","Verse2","Verse3Crash","Verse4Fill","Verse5Fill","Verse6Fill","Verse7Fill","Verse8Crash","Verse9"] },
  { folder: "Multitracks_DryDrums_Mulholland_85bpm", artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 85, isMultitrack: true,
    grooves: ["Bridge1","Bridge2","Bridge3","Bridge4Fill","Chorus1","Chorus2Fill","Chorus3Crash","Chorus4Fill","EndCrash","EndTight","Fill1","Fill2","Fill3","Intro1","Intro2","Intro3","Intro4Fill","Outro1","Outro2","Verse1","Verse2Fill","Verse3Fill","Verse4"] },
  { folder: "Multitracks_DryDrums_Topanga_110bpm", artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 110, isMultitrack: true,
    grooves: ["Bridge1","Bridge2","Bridge3","Bridge4","Chorus1Crash","Chorus2","Chorus3","Chorus4Fill","Chorus5Fill","EndCrash","EndTight","Fill1","Fill2","Fill3","Intro1","Intro2Fill","Intro3Fill","Intro4Fill","Outro1","Outro2Fill","Verse1Crash","Verse2","Verse3","Verse4Crash"] },
  { folder: "Multitracks_IndieRockDrums_FrontPocket_122bpm", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock", bpm: 122, isMultitrack: true,
    grooves: ["Bridge01Crash","Bridge02Crash","Bridge03","Bridge04","Bridge05","Bridge06","Chorus01Crash","Chorus02","Chorus03","Chorus04Crash","Chorus05CrashFill","Chorus06Fill","Chorus07CrashFill","Chorus08","EndCrash","EndHit","Fill01","Fill02","Fill03","Intro01Crash","Intro02","Intro03","Intro04","Intro05","Intro06Fill","Intro07Fill","Intro08Fill","Intro09Crash","Verse01Crash","Verse02","Verse03","Verse04Fill","Verse05Fill","Verse06","Verse07","Verse08Fill","Verse09Crash","Verse10","Verse11"] },
  { folder: "Multitracks_IndieRockDrums_VintagePunch_89bpm", artist: "Yurt Rock", instrument: "drums", genre: "Indie Rock", bpm: 89, isMultitrack: true,
    grooves: ["Bridge01Crash","Bridge02","Bridge03","Bridge04Fill","Bridge05Fill","Chorus01","Chorus02Crash","Chorus03CrashFill","Chorus04Fill","Chorus05Fill","Chorus06Fill","EndCrash","EndHit","Intro01Crash","Intro02Crash","Intro03","Intro04","Intro05","Intro06","Intro07CrashFill","Intro08Fill","Intro09Crash","Intro10","Verse01Crash","Verse02","Verse03Crash","Verse04","Verse05","Verse06","Verse07","Verse08"] },
  { folder: "Multitracks_RockAndRoll_Downtown_80bpm", artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 80, isMultitrack: true,
    grooves: ["Bridge1Crash","Bridge2","Bridge3Fill","Chorus1Crash","Chorus2CrashFill","Chorus3","EndCrash","EndTight","Fill1","Fill2","Fill3","Intro1","Intro2","Intro3Fill","Outro1","Outro2","Verse1Crash","Verse2","Verse3Fill","Verse4Fill"] },
  { folder: "Multitracks_RockAndRoll_InTheVan_105bpm", artist: "Yurt Rock", instrument: "drums", genre: "Rock", bpm: 105, isMultitrack: true,
    grooves: ["Bridge1Crash","Bridge2","Chorus1Crash","Chorus2","Chorus3","EndCrash","EndTight","Fill1","Fill2","Fill3","Intro1","Intro2","Intro3Fill","Outro1Crash","Outro2","Verse1Crash","Verse2","Verse3CrashFill","Verse4Fill"] },
  { folder: "Multitracks_Songwriter_Brushes_77bpm", artist: "Yurt Rock", instrument: "drums", genre: "Folk", bpm: 77, isMultitrack: true,
    grooves: ["Bridge1Crash","Bridge2","Bridge3","Bridge4Fill","Chorus1Crash","Chorus2","Chorus3Crash","Chorus4","EndCrash","EndTight","Fill1","Fill2","Fill3","Intro1","Intro2","Verse1","Verse2Crash","Verse3Fill","Verse4","Verse5"] },
  { folder: "Multitracks_Songwriter_StraightUp_91bpm", artist: "Yurt Rock", instrument: "drums", genre: "Pop", bpm: 91, isMultitrack: true,
    grooves: ["Bridge1","Bridge2Crash","Chorus1","Chorus2","Chorus3Fill","EndCrash","EndTight","Fill1","Fill2","Fill3","Intro1","Intro2","Verse1Crash","Verse2","Verse3Fill"] },
  { folder: "Multitracks_StudioDrums_StudioA_95bpm", artist: "Yurt Rock", instrument: "drums", genre: "Pop", bpm: 95, isMultitrack: true,
    grooves: ["Bridge1","Bridge2","Bridge3","Bridge4Toms","Bridge5TomsFill","Bridge6TomsFill","Chorus1Crash","Chorus2Fill","Chorus3","Chorus4Crash","Chorus5Fill","Chorus6Fill","EndCrash","EndTight","Fill1","Fill2","Fill3","Fill4","Intro1","Intro2","Intro3","IntroFill1","Verse1","Verse2","Verse3","Verse4"] },
  { folder: "Multitracks_StudioDrums_StudioB_115bpm", artist: "Yurt Rock", instrument: "drums", genre: "Pop", bpm: 115, isMultitrack: true,
    grooves: ["Bridge1Crash","Bridge2","Bridge3","Chorus1Crash","Chorus2CrashFill","Chorus3","Chorus4Crash","Chorus5Funky","Chorus6Funky","Chorus7Funky","Chorus8FunkyFill","End1Tight","End2Crash","Fill1","Fill2","Fill3Build","Fill4","Fill5","Intro1Crash","Intro2","Intro3Fill","Intro4","Intro5Fill","Verse1Crash","Verse2CrashFill","Verse3","Verse4Fill","Verse5","Verse6Fill","Verse7Fill"] },

  // ── BFM V1 (generated) ──
  { folder: "BrianFrasierMooreV1_Drums_Stereo", artist: "Brian Frasier-Moore", instrument: "drums", genre: "Pop",
    grooves: ["BFM 100 16th Note Broken Hat Pop","BFM 100 Swing Pop","BFM 105 RnB Shuffle","BFM 109 8th Note Dance Pop","BFM 110 Motown Snare","BFM 113 8th Note Pop","BFM 115 Dance Pop","BFM 118 Motown","BFM 119 Triplet Pop","BFM 123 8th Note Pop","BFM 128 16th Note Dance Pop Latin","BFM 130 8th Note Dance Pop","BFM 136 8th Note Dance Pop","BFM 143 8th Note Pop","BFM 52 Triplet Pop","BFM 70 16th Note Ride Pop","BFM 79 8th Note Swing","BFM 85 Broken Hat Pop","BFM 95 16th Note Pop RnB"] },
  { folder: "BrianFrasierMooreV1_Drums_MultitrackPt2", artist: "Brian Frasier-Moore", instrument: "drums", genre: "Pop", isMultitrack: true,
    grooves: [
      ...bfm(100, "Swing Pop", { Break: 10, Chorus: 30, Verse: 31 }, ["Chorus Fill 1","Chorus Fill 2","Chorus Fill 3","Chorus Fill 4","Chorus Fill 5","Chorus Fill 6","Chorus Fill 7","Chorus Fill 8","Stripped 1","Stripped 2","Stripped 3","Verse Fill 1","Verse Fill 2","Verse Fill 3","Verse Fill 4","Verse Fill 5"]),
      ...bfm(105, "RnB Shuffle", { Break: 7, Chorus: 23, Verse: 34 }, ["Stripped 1","Verse Fill 1","Verse Fill 2"]),
      ...bfm(109, "8th Note Dance Pop", { Chorus: 3, Verse: 14 }, ["Chorus Fill 1","Chorus Fill 2","Verse Fill 1","Verse Fill 2","Verse Fill 3","Verse Fill 4","Verse Fill 5","Verse Fill 6","Verse Fill 7","Verse Fill 8","Verse Fill 9","Verse Fill 10","Verse Fill 11","Verse Fill 12","Verse Fill 13","Verse Fill 14","Verse Fill 15","Verse Fill 16","Verse Fill 17","Verse Fill 18","Verse Fill 19","Verse Fill 20","Verse Fill 21","Verse Fill 22","Verse Fill 23"]),
      ...bfm(110, "Motown Snare", { Break: 4, Chorus: 5, Verse: 10 }, ["Chorus Fill 1","Verse Fill 1","Verse Fill 2","Verse Fill 3","Verse Fill 4","Verse Fill 5","Verse Fill 6","Verse Fill 7","Verse Fill 8"]),
      ...bfm(113, "8th Note Pop", { Break: 2, Chorus: 9, Verse: 7 }, ["Chorus Fill 1","Chorus Fill 2","Verse Fill 1","Verse Fill 2","Verse Fill 3"]),
      ...bfm(115, "Dance Pop", { Break: 14, Chorus: 20, Verse: 20 }, ["Stripped 1","Stripped 2","Stripped 3","Stripped 4","Stripped 5","Stripped 6","Stripped 7","Stripped 8"]),
      ...bfm(118, "Motown", { Break: 4, Chorus: 10, Verse: 7 }, ["Chorus Fill 1","Stripped","Verse Fill 1"]),
    ] },
  { folder: "BrianFrasierMooreV1_Drums_MultitrackPt3", artist: "Brian Frasier-Moore", instrument: "drums", genre: "Pop", isMultitrack: true,
    grooves: [
      ...bfm(119, "Triplet Pop", { Verse: 4 }, ["Stripped 1","Stripped 2","Stripped 3"]),
      ...bfm(123, "8th Note Pop", { Break: 12, Chorus: 8, Verse: 9 }, ["Chorus Fill 1","Stripped 1","Verse Fill 1","Verse Fill 2"]),
      ...bfm(128, "16th Note Dance Pop Latin", { Break: 20, Chorus: 17, Verse: 3 }, ["Chorus Fill 1","Stripped 1","Stripped 2","Stripped 3","Stripped 4","Stripped 5","Stripped 6","Stripped 7","Stripped 8","Stripped 9","Stripped 10","Stripped 11","Stripped 12"]),
      ...bfm(130, "8th Note Dance Pop", { Break: 5, Chorus: 3, Verse: 7 }),
      ...bfm(136, "8th Note Dance Pop", { Break: 7, Chorus: 7, Verse: 10 }, ["Verse Fill 1"]),
      ...bfm(143, "8th Note Pop", { Break: 5, Chorus: 9, Verse: 6 }, ["Break Fill","Stripped 1","Stripped 2"]),
    ] },
  { folder: "BrianFrasierMooreV2_Drums_MultitrackPt1", artist: "Brian Frasier-Moore", instrument: "drums", genre: "Pop", isMultitrack: true,
    grooves: [
      ...bfm(101, "16th Note Pop", { Break: 3, Chorus: 22, Verse: 19 }),
      ...bfm(107, "16th Note Pop", { Chorus: 13, Verse: 6 }, ["Stripped 1"]),
      ...bfm(110, "Motown Drum Improv", { Break: 6, Verse: 3 }, ["Stripped 1","Stripped 2","Verse Fill 1","Verse Fill 2","Verse Fill 3","Verse Fill 4","Verse Fill 5"]),
      ...bfm(74, "8th Note Pop", { Break: 7, Chorus: 6, Verse: 11 }),
      ...bfm(87, "8th Note RnB Pop", { Break: 4, Chorus: 14, Verse: 14 }),
      ...bfm(88, "16th Note Pop", { Break: 5, Chorus: 12, Verse: 21 }, ["Chorus End 1","Verse Fill 1"]),
      ...bfm(96, "16th Note Pop", { Break: 8, Chorus: 14, Verse: 12 }, ["Chorus Fill 1","Chorus Fill 2","Chorus Fill 3","Verse Fill 1"]),
    ] },
  { folder: "BrianFrasierMooreV2_Drums_MultitrackPt2", artist: "Brian Frasier-Moore", instrument: "drums", genre: "Pop", isMultitrack: true,
    grooves: [
      ...bfm(112, "Soundcheck Groove", { Break: 3 }, ["Fill 1"]),
      ...bfm(114, "16th Note Pop", { Break: 3, Chorus: 7, Verse: 4 }),
      ...bfm(115, "RnB Shuffle", { Chorus: 3, Verse: 6 }),
      ...bfm(119, "Dance Pop", { Break: 3, Chorus: 13, Verse: 18 }, ["Stripped 1","Verse Fill 1"]),
      ...bfm(120, "Dance Pop Latin", { Break: 47, Chorus: 26, Verse: 28 }, ["Chorus Fill 1","Chorus Fill 2","Stripped 1","Stripped 2","Stripped 3","Stripped 4","Stripped 5","Stripped 6","Stripped 7","Stripped 8","Stripped 9","Stripped 10","Stripped 11","Stripped 12","Stripped 13","Verse Fill 1","Verse Fill 2","Verse Fill 3","Verse Fill 4"]),
      ...bfm(127, "Dance Pop Latin", { Chorus: 4, Verse: 9 }, ["Chorus Fill 1"]),
      ...bfm(128, "Dance Latin", { Break: 7, Chorus: 12, Verse: 9 }),
    ] },
  { folder: "BrianFrasierMooreV2_Drums_MultitrackPt3", artist: "Brian Frasier-Moore", instrument: "drums", genre: "Pop", isMultitrack: true,
    grooves: [
      ...bfm(107, "16th Note Broken Hat", { Break: 11, Chorus: 14, Verse: 25 }),
      ...bfm(133, "8th Note Pop", { Break: 3, Chorus: 8, Verse: 12 }, ["Chorus Fill 1"]),
      ...bfm(142, "16th Note Dance", { Chorus: 14, Verse: 3 }, ["Stripped 1","Stripped 2"]),
      ...bfm(152, "8th Note Dance Pop", { Break: 5, Chorus: 12, Verse: 13 }),
      ...bfm(80, "16th Note RnB", { Break: 9, Chorus: 9, Verse: 20 }, ["Fill 1","Stripped 1","Stripped 2","Stripped 3","Stripped 4","Stripped 5","Stripped 6"]),
      ...bfm(87, "16th Note RnB Pop", { Break: 10, Chorus: 5, Verse: 9 }, ["Fill 1","Fill 2"]),
    ] },

  // ── George Sluppick ── (45 grooves with unique names)
  { folder: "GeorgeSluppickV1_Drums_WAV", artist: "George Sluppick", instrument: "drums", genre: "Funk",
    grooves: ["100 BPM Groove 47 The Hovercraft","103 BPM Groove 62 Noodle Bowl","105 BPM Groove 22 Honey Im Home","105 BPM Groove 64 Too Cool","108 BPM Groove 31 The Spizz","108 BPM Groove 53 The Barksdale Jones Shuffle","108 BPM Groove 58 Pretty Good Dude","110 BPM Groove 14 Lets Shuffle","110 BPM Groove 15 Flat Tire Beat","114 BPM Groove 30 The Happy Food Dance","114 BPM Groove 42 There It Is","116 BPM Groove 12 The Sluppy Shuffle","118 BPM Groove 19 Papa Lou","129 BPM Groove 17 The Funky Broadway","129 BPM Groove 23 Pony Ride","130 BPM Groove 16 The Walk on Shuffle","132 BPM Groove 52 Caramel Macchiato","133 BPM Groove 59 Warm Bath","135 BPM 12:8 Groove 27","136 BPM Groove 56 Break it Up","142 BPM Groove 71 Lets Go for a Ride","167 BPM Groove 63 Sixteenths","62 BPM 12:8 Groove 50 Brushin","63 BPM Groove 28 The Blues","64 BPM Groove 45 Brush Stick","64 BPM Groove 46 Swervin","77 BPM Groove 21 The Meatball Sub","80 BPM Groove 29 Crusin Down MLK","80 BPM Groove 57 Stanky","81 BPM Groove 13 In the Delta","82 BPM Groove 36 The Splat","82 BPM Groove 65 Totes McGottes","83 BPM Groove 37 River Train","84 BPM Groove 18 Chinatown Stroll","84 BPM Groove 39 Boom Bap Number Two","90 BPM Groove 11 The Side to Side","92 BPM Groove 44 The Comeback","93 BPM Groove 26 Oomph","94 BPM Groove 48 Brush Train","95 BPM Groove 60 The Setup","97 BPM Groove 33 Heavy Shoes","97 BPM Groove 51 Thats Dirty","98 BPM Groove 25 The Humpback","99 BPM Groove 35 The Ol Boom Bap","99 BPM Groove 54 Sidewalk Surfin"] },

  // ── Shawn Zorn (88 unique grooves) ──
  { folder: "ShawnZornV1_Drums_WAV", artist: "Shawn Zorn", instrument: "drums", genre: "Funk",
    grooves: ["100 BPM 1960s Slingerland Kit Groove 2 Walkin Small","100 BPM Apt Rehearsal Kit Groove 11 Neva Dat","100 BPM Apt Rehearsal Kit Groove 12 Soft Shuffle","100 BPM Apt Rehearsal Kit Groove 30 Rico Clave","100 BPM Apt Rehearsal Kit Groove 31 Toy Train","105 BPM 1970s Pearl Kit Groove 17 Grandpas Getdown","105 BPM 1970s Pearl Kit Groove 21 Training Day","105 BPM Apt Rehearsal Kit Groove 10 Cow Pan","108 BPM 1970s Pearl Kit Groove 11 Black Widow","110 BPM 1960s Slingerland Kit Groove 3 Dodgeball","110 BPM 1960s Slingerland Kit Groove 4 Spare Tire","110 BPM 1960s Slingerland Kit Groove 5 Kick Flip","110 BPM 1960s Slingerland Kit Groove 6 Soft Shoe","110 BPM 1970s Pearl Kit Groove 1 Coop Mo Dee","110 BPM 1970s Pearl Kit Groove 2 Pea Suit","110 BPM 1970s Pearl Kit Groove 27 Nodding Off","110 BPM 1970s Pearl Kit Groove 5 Cali Cold","110 BPM Apt Rehearsal Kit Groove 24 Coupla Pennies","115 BPM 1960s Slingerland Kit Groove 26 Tom Lee Park","115 BPM Apt Rehearsal Kit Groove 13 Quick Trip","115 BPM Apt Rehearsal Kit Groove 14 Drunk on Beale","115 BPM Apt Rehearsal Kit Groove 15 Wheres Crackle","115 BPM Apt Rehearsal Kit Groove 16 Needs Less Cowbell","118 BPM Apt Rehearsal Kit Groove 28 Short Leg","120 BPM 1960s Slingerland Kit Groove 21 Trippin on the Abyss","120 BPM 1960s Slingerland Kit Groove 22 Vacuum Hose","120 BPM 1960s Slingerland Kit Groove 23 Scrambled","120 BPM 1960s Slingerland Kit Groove 7 Dusk Dance","120 BPM 1960s Slingerland Kit Groove 8 Texas Time","120 BPM 1960s Slingerland Kit Groove 9 Surf n Sway","120 BPM Apt Rehearsal Kit Groove 19 Pocket Change","120 BPM Apt Rehearsal Kit Groove 20 Silky Spector","120 BPM Apt Rehearsal Kit Groove 21 Ghost Kick","120 BPM 1960s Slingerland Kit Groove 20 Apple of Doom","122 BPM Apt Rehearsal Kit Groove 25 Gravel Surf","123 BPM Apt Rehearsal Kit Groove 23 ShakeNTamb","130 BPM 1960s Slingerland Kit Groove 10 Changin Lanes","130 BPM 1970s Pearl Kit Groove 10 The Maxx","130 BPM 1970s Pearl Kit Groove 20 Magnolia Hot","130 BPM 1970s Pearl Kit Groove 23 Sane Train","130 BPM Apt Rehearsal Kit Groove 17 Shufflin Up Stream","130 BPM Apt Rehearsal Kit Groove 18 Motor City","130 BPM Apt Rehearsal Kit Groove 22 Hol Up","131 BPM Apt Rehearsal Kit Groove 29 Wandas Feel","131 BPM Apt Rehearsal Kit Groove 30 Rico Clave","140 BPM 1970s Pearl Kit Groove 12 Yr Boyfriend","140 BPM 1970s Pearl Kit Groove 26 Quick Six","140 BPM Apt Rehearsal Kit Groove 26 Surfs Up","140 BPM Apt Rehearsal Kit Groove 32 Tuesday at 6","150 BPM 1960s Slingerland Kit Groove 17 Sock Hop","150 BPM 1960s Slingerland Kit Groove 18 Too Fast Too Furious","150 BPM 1960s Slingerland Kit Groove 19 Mister Hot Stepper","150 BPM 1970s Pearl Kit Groove 22 Devil Train","150 BPM 1970s Pearl Kit Groove 6 Panda Brains","155 BPM 1970s Pearl Kit Groove 24 Yellow Bird","155 BPM 1970s Pearl Kit Groove 25 Fill er Up","160 BPM 1960s Slingerland Kit Groove 11 Drunken Waltz","160 BPM 1960s Slingerland Kit Groove 12 Swayin in 6","160 BPM 1960s Slingerland Kit Groove 13 Lower 6th","160 BPM 1960s Slingerland Kit Groove 14 Six Hand Man","160 BPM 1960s Slingerland Kit Groove 15 Swimmin Ground","160 BPM Apt Rehearsal Kit Groove 33 A Quick Six","200 BPM 1960s Slingerland Kit Groove 16 The Wind Up","80 BPM Apt Rehearsal Kit Groove 4 Put it On","80 BPM Apt Rehearsal Kit Groove 2 Turn off the Machine","80 BPM Apt Rehearsal Kit Groove 3 Record Skip","85 BPM 1970s Pearl Kit Groove 14 Gatekeeper","85 BPM 1970s Pearl Kit Groove 15 Cement Frog","85 BPM 1970s Pearl Kit Groove 3 Strong Guy","85 BPM 1970s Pearl Kit Groove 4 All or Nothin","85 BPM 1970s Pearl Kit Groove 9 Glass Head","85 BPM Apt Rehearsal Kit Groove 1 Bumblin","90 BPM 1960s Slingerland Kit Groove 1 Shoelace Untied","90 BPM 1960s Slingerland Kit Groove 24 Bing Bong","90 BPM 1960s Slingerland Kit Groove 25 Xenon Gurl","90 BPM 1970s Pearl Kit Groove 13 Creekbed","90 BPM 1970s Pearl Kit Groove 16 Cool Hat","90 BPM 1970s Pearl Kit Groove 19 Country Pleasin","95 BPM 1970s Pearl Kit Groove 7 Camerons Groove","95 BPM 1970s Pearl Kit Groove 8 Can I Get a","95 BPM Apt Rehearsal Kit Groove 27 Hopskotch","95 BPM Apt Rehearsal Kit Groove 5 Puttin Along","95 BPM Apt Rehearsal Kit Groove 6 Snake Bounce","95 BPM Apt Rehearsal Kit Groove 7 King Shakey","95 BPM Apt Rehearsal Kit Groove 8 Snap Man","96 BPM 1970s Pearl Kit Groove 18 Trip and a Hop"] },

  // ── Damon Grant ──
  { folder: "DamonGrantV1_Percussion_WAV", artist: "Damon Grant", instrument: "percussion", genre: "World",
    grooves: ["Cajon 1","Cajon 2","FX","Gadgets and Gizmos","Hand Drums 1","Hand Drums 2","Hand Drums 3","Metal Things 1","Metal Things 2","Metal Things 3","Other Drums 1","Other Drums 2","Other Drums 3","Shakers","Shaking Things 1","Shaking Things 2","Shaking Things 3","Snare Drums 1","Snare Drums 2","Snare Drums 3","Tambourines","Timbales 1","Timbales 2","Wood Things 1","Wood Things 2"] },

  // ── Mike Clark ──
  { folder: "MikeClarkV1_Drums_MIDI_WAV", artist: "Mike Clark", instrument: "drums", genre: "Funk",
    grooves: ["Bell Grooves 1","Bell Grooves 2","BrazilianLatin 95bpm","Brush Grooving 80bpm","Fills 1","Fills 2","Funk In Three 90bpm","Hat Grooves 1","Hat Grooves 2","Jazz 155bpm","Linear Funk 90bpm","Mallets 75bpm","Session 1","Session 2"] },
  { folder: "MikeClarkV2_Drums_MIDI_WAV", artist: "Mike Clark", instrument: "drums", genre: "Funk",
    grooves: ["Brush Blues 60bpm","Latin 87bpm","NOLA Funk 80bpm","On Four Funk 97bpm","Session 1","Session 2","Session A","Session B","Session C","Session D","Shuffle 100bpm"] },

  // ── Greg Hersey ──
  { folder: "GregHerseyV1_Perc_WAV", artist: "Greg Hersey", instrument: "percussion", genre: "Pop",
    grooves: ["Dry 1","Dry 2","Dry 3","Dry 4","Dry 5","Dry 6","Mixed 1","Mixed 2","Mixed 3","Mixed 4","Mixed 5","Mixed 6"] },

  // ── Joey Waronker (Stereo) ──
  { folder: "JoeyWaronkerV1_Drums_WAV", artist: "Joey Waronker", instrument: "drums", genre: "Indie Rock",
    grooves: ["Drum Kit Loops 1","Drum Kit Loops 2","Drum Kit Loops 3","Drum Kit Loops 4","Drum Kit Loops 5","Drum Kit Loops 6","Percussion Loops 1","Percussion Loops 2","Percussion Loops 3","Percussion Loops 4","Percussion Loops 5","Percussion Loops 6"] },

  // ── Curt Bisquera (Stereo) ──
  { folder: "CurtRockV2_StereoEdition_WAV", artist: "Curt Bisquera", instrument: "drums", genre: "Rock",
    grooves: ["Brushes 1","Brushes 2","Brushes 3","Filibeats 90bpm","LA Samba 120bpm","Ringy","Snare","Sticks 1","Sticks 2","Sticks 3","Sunset Strip Rock 140bpm","Tight","XStick"] },

  // ── Rich Redmond (Stereo editions) ──
  { folder: "RichRedmondV1_StereoEdition_WAV", artist: "Rich Redmond", instrument: "drums", genre: "Rock",
    grooves: ["BrickRoad_Take1_Dry_64bpm","BrickRoad_Take1_Wet_64bpm","BrickRoad_Take2_Dry_64bpm","BrickRoad_Take2_Wet_64bpm","BrushBackbeat_Dry_90bpm","BrushBackbeat_Wet_90bpm","MoneyBeats_Dry_86bpm","MoneyBeats_Wet_86bpm","OnSunset_Take1_Dry_123bpm","OnSunset_Take1_Wet_123bpm","OnSunset_Take2_Dry_123bpm","OnSunset_Take2_Wet_123bpm","RadarGlove_Dry_77bpm","RadarGlove_Wet_77bpm","SixEight_Dry_66bpm","SixEight_Wet_66bpm","StudioA_Dry_80bpm","StudioA_Wet_80bpm","Swung_Dry_70bpm","Swung_Wet_70bpm","SyncoRock_Dry_118bpm","SyncoRock_Wet_118bpm","TrainBeats_Dry_84bpm","TrainBeats_Wet_84bpm"] },
  { folder: "RichRedmondV2_StereoEdition_WAV", artist: "Rich Redmond", instrument: "drums", genre: "Rock",
    grooves: ["BigRedSwing_Take1_Dry_72bpm","BigRedSwing_Take1_Wet_72bpm","BigRedSwing_Take2_Dry_72bpm","BigRedSwing_Take2_Wet_72bpm","BusyRock_Dry_78bpm","BusyRock_Wet_78bpm","Choo-Choo_Dry_136bpm","Choo-Choo_Wet_136bpm","Hitsville_Dry_114bpm","Hitsville_Wet_114bpm","MarchTempo_Dry_120bpm","MarchTempo_Wet_120bpm","Phat_Dry_82bpm","Phat_Wet_82bpm","Plod_Dry_89bpm","Plod_Wet_89bpm","PowerMid_Dry_68bpm","PowerMid_Wet_68bpm","SpongyIn6_Dry_80bpm","Wet_SixEight_80bpm","Workhorse_Dry_65bpm","Workhorse_Wet_65bpm"] },

  // ── Marcus Finnie (Session Drums copies in genre folders already covered) ──
  // Adding the unique Pt1/Pt2/Pt3 folder loops not in genre folders
  { folder: "MarcusFinnieSessionDrumsV1_Pt1_WAV", artist: "Marcus Finnie", instrument: "drums", genre: "Rock",
    grooves: ["Bridge Tower 97bpm 1","Ending Drums Metallic 124bpm","Ending Tower 97bpm","Groove Tower 97bpm 1","GrooveAndBridge Tower 97bpm 1","GuitarBreak Tower 97bpm 1","GuitarBreak Tower 97bpm 2","GuitarBreak Tower 97bpm 3","GuitarBreak Tower 97bpm 4","GuitarBreak Tower 97bpm 5","GuitarBreak Tower 97bpm 6","GuitarBreak Tower 97bpm 7","GuitarBreakAndBridge Tower 97bpm 1","GuitarSolo Drums Metallic 124bpm 1","GuitarSolo Drums Metallic 124bpm 2","Intro Drums Metallic 124bpm 1","Intro Drums Metallic 124bpm 2","Intro Tower 97bpm 1","Intro Tower 97bpm 2","LoudSoft Drums Metallic 124bpm 1","LoudSoft Drums Metallic 124bpm 2","LoudSoft Drums Metallic 124bpm 3","LoudSoft Drums Metallic 124bpm 4","LoudSoft Drums Metallic 124bpm 5","LoudSoft Drums Metallic 124bpm 6","LoudSoftStop Drums Metallic 124bpm 1","LoudSoftStop Drums Metallic 124bpm 2","Pedal Tower 97bpm 1","Pedal Tower 97bpm 2","PedalAndBridge Tower 97bpm 1","Rockin Drums Metallic 124bpm 1","Rockin Drums Metallic 124bpm 2","Rockin Drums Metallic 124bpm 3","TomIntro Drums Metallic 124bpm 1","TomIntroAndRock Drums Metallic 124bpm 1","Verse Drums Metallic 124bpm 1","Verse Drums Metallic 124bpm 2","Verse Drums Metallic 124bpm 3"] },
  { folder: "MarcusFinnieSessionDrumsV1_Pt2_WAV", artist: "Marcus Finnie", instrument: "drums", genre: "Rock",
    grooves: ["Bridge Motown 127bpm 1","Bridge Motown 127bpm 2","BridgeAndWalkdown Motown 127bpm 1","BridgeAndWalkdown Motown 127bpm 2","Chorus Zepp 81bpm 1","Chorus Zepp 81bpm 2","Chorus Zepp 81bpm 3","Chorus Zepp 81bpm 4","DrumBreak Motown 127bpm 1","EndHit Motown 127bpm","Ending Zepp 81bpm","Groove Motown 127bpm 1","Groove Motown 127bpm 2","Groove Motown 127bpm 3","Groove Motown 127bpm 4","Groove Motown 127bpm 5","GrooveAndWalkdown Motown 127bpm 1","GuitarSolo Zepp 81bpm 1","GuitarSolo Zepp 81bpm 2","GuitarSolo Zepp 81bpm 3","GuitarSolo Zepp 81bpm 4","Interlude Zepp 81bpm 1","Interlude Zepp 81bpm 2","Intro Motown 127bpm 1","Intro Zepp 81bpm 1","Intro Zepp 81bpm 2","Intro Zepp 81bpm 3","IntroBreak Motown 127bpm 1","Outro Motown 127bpm 1","Outro Motown 127bpm 2","PedalAndWalkdown Motown 127bpm 1","Verse Zepp 81bpm 1","Verse Zepp 81bpm 2","Verse Zepp 81bpm 3","Verse Zepp 81bpm 4","Walkdown Motown 127bpm 1","Walkdown Motown 127bpm 2"] },
  { folder: "MarcusFinnieSessionDrumsV1_Pt3_WAV", artist: "Marcus Finnie", instrument: "drums", genre: "Blues",
    grooves: ["A Toto 82bpm 1","A Toto 82bpm 2","A Toto 82bpm 3","Bridge Toto 82bpm 1","Bridge Toto 82bpm 2","BuildUp Toto 82bpm 1","C Bb Toto 82bpm 1","Chorus Toto 82bpm 1","Chorus Toto 82bpm 2","ChorusAndEnd Toto 82bpm","ChorusAndEnding Drums Blues 113bpm","F Db Ab Toto 82bpm 1","F Db Ab Toto 82bpm 2","F Db Ab Toto 82bpm 3","F Db Ab Toto 82bpm 4","F# D A Toto 82bpm 1","F# D A Toto 82bpm 2","FullChorus Drums Blues 113bpm 1","FullChorus Drums Blues 113bpm 2","Groove Toto 82bpm 1","Groove Toto 82bpm 2","Groove Toto 82bpm 3","Groove Toto 82bpm 4","GrooveFill Toto 82bpm 1","I Drums Blues 113bpm 1","I Drums Blues 113bpm 2","I Drums Blues 113bpm 3","IV-I Drums Blues 113bpm 1","IV-I Drums Blues 113bpm 2","IV-I Drums Blues 113bpm 3","Intro Drums Blues 113bpm 1","Intro Drums Blues 113bpm 2","Intro Toto 82bpm 1","RockoutChrs Drums Blues 113bpm 1","StopTimeChorus Drums Blues 113bpm 1","Turnaround Drums Blues 113bpm 1","Turnaround Drums Blues 113bpm 2","Turnaround Drums Blues 113bpm 3"] },
];

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Count total grooves
  let totalGrooves = 0;
  for (const f of FOLDERS) totalGrooves += f.grooves.length;
  console.log(`Processing ${FOLDERS.length} folders, ${totalGrooves} total grooves`);

  // Clear and insert
  await pool.query("DELETE FROM audio_loops");
  console.log("Cleared audio_loops table");

  let inserted = 0;
  let errors = 0;

  for (const folder of FOLDERS) {
    const validGrooves = folder.grooves.filter(g => !shouldSkip(g));

    for (const groove of validGrooves) {
      const bpm = extractBpm(groove, folder.bpm);
      const sec = extractSection(groove);
      const genre = detectGenre(groove, folder.genre);
      const feel = detectFeel(groove);
      const timeSig = detectTimeSig(groove);
      const wavUrl = `https://${CDN}/${slug(folder.artist)}/${slug(folder.folder)}/${slug(groove)}.wav`;

      try {
        await pool.query(
          `INSERT INTO audio_loops (title, artist, collection, groove_name, instrument_category, genre, bpm, key_signature, time_signature, feel, section_type, section_number, is_multitrack, wav_url, tags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [groove, folder.artist, folder.folder, groove, folder.instrument, genre, bpm, folder.key || null, timeSig, feel, sec.type, sec.num, folder.isMultitrack || false, wavUrl, []]
        );
        inserted++;
      } catch (e: any) {
        errors++;
        if (errors <= 10) console.error(`Error: ${groove} — ${e.message}`);
      }
    }

    console.log(`  ${folder.folder}: ${validGrooves.length} grooves inserted`);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`SEED COMPLETE: ${inserted} inserted, ${errors} errors`);
  console.log(`${"=".repeat(50)}`);

  // Verify
  const count = await pool.query("SELECT COUNT(*)::int as c FROM audio_loops");
  console.log(`Database now has ${count.rows[0].c} audio loops`);

  const artists = await pool.query("SELECT DISTINCT artist FROM audio_loops ORDER BY artist");
  console.log(`Artists: ${artists.rows.map(r => r.artist).join(", ")}`);

  const collections = await pool.query("SELECT COUNT(DISTINCT collection)::int as c FROM audio_loops");
  console.log(`Collections: ${collections.rows[0].c}`);

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
