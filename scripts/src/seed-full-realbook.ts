import pg from "pg";

const { Pool } = pg;

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChordEntry {
  chord: string;
  beats: number;
}

interface StandardDef {
  name: string;
  composer: string;
  key: string;
  difficulty: number;
  timeSig?: "3/4" | "6/8" | "12/8"; // default 4/4
  chart?: string; // bar notation: bars separated by |, chords in a bar separated by space
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

function rootIndex(root: string): number {
  const n = FLAT_TO_SHARP[root] || root;
  const i = CHROMATIC.indexOf(n);
  return i >= 0 ? i : 0;
}

function transpose(root: string, semitones: number): string {
  const idx = rootIndex(root);
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = CHROMATIC[newIdx];
  const SHARP_TO_FLAT: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
  if (root.includes("b") && SHARP_TO_FLAT[newRoot]) return SHARP_TO_FLAT[newRoot];
  return newRoot;
}

function parseBar(bar: string): ChordEntry[] {
  const chords = bar.trim().split(/\s+/);
  if (chords.length === 1) return [{ chord: chords[0], beats: 4 }];
  if (chords.length === 2) return chords.map((c) => ({ chord: c, beats: 2 }));
  return chords.map((c) => ({ chord: c, beats: Math.max(1, Math.floor(4 / chords.length)) }));
}

function parseChart(notation: string): ChordEntry[] {
  return notation
    .split("|")
    .filter((b) => b.trim())
    .flatMap(parseBar);
}

// ── Chord Generation ───────────────────────────────────────────────────────────

function generateAABA32(key: string): string {
  const root = key.replace(/m$/, "");
  const minor = key.endsWith("m");

  if (minor) {
    const im = root + "m7";
    const ivm = transpose(root, 5) + "m7";
    const V = transpose(root, 7) + "7";
    const bIII = transpose(root, 3) + "maj7";
    const bVI = transpose(root, 8) + "maj7";
    const bVII = transpose(root, 10) + "7";
    const iib5 = transpose(root, 2) + "m7b5";
    const A = `${im}|${im}|${ivm}|${ivm}|${iib5}|${V}|${im}|${im}`;
    const B = `${bIII}|${bVI}|${bVII}|${bVII}|${iib5}|${V}|${im}|${im}`;
    return `${A}|${A}|${B}|${A}`;
  }
  const I = root + "maj7";
  const ii = transpose(root, 2) + "m7";
  const V = transpose(root, 7) + "7";
  const iii = transpose(root, 4) + "m7";
  const vi = transpose(root, 9) + "m7";
  const IV = transpose(root, 5) + "maj7";
  const IVm = transpose(root, 5) + "m7";
  const A = `${I}|${I}|${ii}|${V}|${iii}|${vi}|${ii}|${V}`;
  const B = `${IV}|${IVm}|${I}|${vi}|${ii}|${V}|${I}|${I}`;
  return `${A}|${A}|${B}|${A}`;
}

function generateBlues12(key: string): string {
  const root = key.replace(/m$/, "");
  const minor = key.endsWith("m");
  if (minor) {
    const i = root + "m7";
    const iv = transpose(root, 5) + "m7";
    const v = transpose(root, 7) + "7";
    const bvi = transpose(root, 8) + "7";
    return `${i}|${i}|${i}|${i}|${iv}|${iv}|${i}|${i}|${bvi}|${v}|${i}|${v}`;
  }
  const I = root + "7";
  const IV = transpose(root, 5) + "7";
  const ii = transpose(root, 2) + "m7";
  const V = transpose(root, 7) + "7";
  return `${I}|${I}|${I}|${I}|${IV}|${IV}|${I}|${I}|${ii}|${V}|${I}|${ii} ${V}`;
}

function generateWaltzAABA(key: string): string {
  // 3/4 AABA - same chords but waltz feel
  return generateAABA32(key);
}

function generateBossaAABA(key: string): string {
  const root = key.replace(/m$/, "");
  const minor = key.endsWith("m");
  if (minor) {
    const im = root + "m9";
    const ivm = transpose(root, 5) + "m7";
    const V = transpose(root, 7) + "7b9";
    const bIII = transpose(root, 3) + "maj7";
    const bVI = transpose(root, 8) + "maj9";
    const iib5 = transpose(root, 2) + "m7b5";
    const A = `${im}|${im}|${ivm}|${ivm}|${iib5}|${V}|${im}|${im}`;
    const B = `${bIII}|${bVI}|${iib5}|${V}|${im}|${ivm}|${iib5} ${V}|${im}`;
    return `${A}|${A}|${B}|${A}`;
  }
  const I = root + "maj9";
  const ii = transpose(root, 2) + "m7";
  const V = transpose(root, 7) + "7";
  const IV = transpose(root, 5) + "maj7";
  const vi = transpose(root, 9) + "m7";
  const iii = transpose(root, 4) + "m7";
  const A = `${I}|${I}|${ii}|${V}|${iii}|${vi}|${ii}|${V}`;
  const B = `${IV}|${IV}|${iii}|${vi}|${ii}|${V}|${I}|${I}`;
  return `${A}|${A}|${B}|${A}`;
}

function getChords(std: StandardDef): ChordEntry[] {
  if (std.chart) return parseChart(std.chart);
  // fallback: generate based on key
  return parseChart(generateAABA32(std.key));
}

// ── The Full Real Book Standards List ──────────────────────────────────────────
// Standards with known Real Book chord changes have explicit charts.
// Others get generated progressions based on key/form.

const ALL_STANDARDS: StandardDef[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // BEGINNER (difficulty 1-3)
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "Afternoon In Paris",
    composer: "John Lewis",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|Dm7 G7|Cmaj7|Dm7 G7|" +
      "Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|Dm7 G7|Cmaj7|Cmaj7|" +
      "Dm7|G7|Cmaj7|Am7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|Dm7 G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Ain't Misbehavin'",
    composer: "Fats Waller",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebdim7|Bb7|G7|Cm7|F7|Bb7|Bb7|" +
      "Eb6|C7|Fm7|Bb7|Ebmaj7|C7|Fm7|Bb7|" +
      "Ab6|Ab6|Abm6|Abm6|Ebmaj7|C7|Fm7|Bb7|" +
      "Ebmaj7|Ebdim7|Bb7|G7|Cm7|F7|Bb7 Eb6|Eb6",
  },
  {
    name: "Angel Eyes",
    composer: "Matt Dennis",
    key: "Dm",
    difficulty: 3,
    chart:
      "Dm7|Dm7|Bm7b5|E7|Am7|Am7|Gm7|A7|" +
      "Dm7|Dm7|Bm7b5|E7|Am7|Am7|Dm7|Dm7|" +
      "Dmaj7|Dmaj7|Bm7|E7|Em7|A7|Dmaj7|A7|" +
      "Dm7|Dm7|Bm7b5|E7|Am7|Am7|Dm7|Dm7",
  },
  {
    name: "April In Paris",
    composer: "Vernon Duke",
    key: "C",
    difficulty: 3,
    chart:
      "Gm7|C7|Fmaj7|Fmaj7|Am7b5|D7|Gm7|Gm7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbm7|Eb7|Fmaj7|Dm7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Gm7|C7|Am7 D7|Gm7 C7|Am7 D7|Gm7 C7|Fmaj7|Fmaj7",
  },
  {
    name: "Autumn In New York",
    composer: "Vernon Duke",
    key: "F",
    difficulty: 3,
    chart:
      "Gm7|Am7|Bbmaj7|C7|Fmaj7|Gm7|Am7|D7|" +
      "Gm7|Am7|Bbmaj7|Bdim7|Am7|D7|Gm7|C7|" +
      "Fm7|Bb7|Ebmaj7|Ebmaj7|Abmaj7|Dbmaj7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|D7|Gm7 C7|Fmaj7",
  },
  {
    name: "Basin Street Blues",
    composer: "Spencer Williams",
    key: "Bb",
    difficulty: 1,
    chart:
      "Bbmaj7|Bbmaj7|Bb7|Bb7|Ebmaj7|Ebm6|Bbmaj7|G7|" +
      "Cm7|F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7|Bb7|Bb7|" +
      "Ebmaj7|Ebm6|Bbmaj7|G7|Cm7|F7|Bbmaj7|Cm7 F7|" +
      "Bbmaj7|Bbmaj7|Bb7|Bb7|Ebmaj7|Ebm6|Bbmaj7 G7|Cm7 F7",
  },
  {
    name: "Beautiful Love",
    composer: "Victor Young",
    key: "Dm",
    difficulty: 3,
    chart:
      "Em7b5|A7|Dm7|Dm7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Em7b5|A7|Dm7|Dm7|Gm7|Gm7|Em7b5|A7|" +
      "Em7b5|A7|Dm7|Dm7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Em7b5|A7|Dm7|Dm7|Gm7 Em7b5|A7|Dm7|Dm7",
  },
  {
    name: "Begin The Beguine",
    composer: "Cole Porter",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Cmaj7|Dm7|G7|Cmaj7|Cmaj7|Dm7|G7|" +
      "Em7|Am7|Dm7|G7|Cmaj7|Cmaj7|Dm7|G7|" +
      "Cmaj7|Cmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Dm7|G7|" +
      "Cmaj7|Am7|Dm7|G7|Cmaj7|Am7|Dm7 G7|Cmaj7",
  },
  {
    name: "Between The Devil And The Deep Blue Sea",
    composer: "Harold Arlen",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|D7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|D7|Gm7|C7|Am7|D7|Gm7 C7|Fmaj7|" +
      "Bbm7|Eb7|Fmaj7|Dm7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fmaj7|D7|Gm7|C7|Am7|D7|Gm7 C7|Fmaj7",
  },
  {
    name: "Black Coffee",
    composer: "Sonny Burke",
    key: "Dm",
    difficulty: 2,
    chart:
      "Dm7|Dm7|Dm7|Dm7|Gm7|Gm7|Dm7|Dm7|" +
      "Em7b5|A7|Dm7|Em7b5 A7|Dm7|Dm7|Dm7|Dm7|" +
      "Gm7|Gm7|Dm7|Dm7|Em7b5|A7|Dm7|Em7b5 A7|" +
      "Dm7|Dm7|Dm7|Dm7|Gm7|Gm7|Dm7|Em7b5 A7",
  },
  {
    name: "Black Orpheus",
    composer: "Luiz Bonfa",
    key: "Am",
    difficulty: 2,
    chart:
      "Am7|Am7|Bm7b5|E7|Am7|Am7|Dm7|G7|" +
      "Cmaj7|Cmaj7|Fmaj7|Fmaj7|Bm7b5|E7|Am7|Am7|" +
      "Am7|Am7|Bm7b5|E7|Am7|Am7|Dm7|G7|" +
      "Cmaj7|A7|Dm7|G7|Cmaj7|Fmaj7|Bm7b5 E7|Am7",
  },
  {
    name: "Bluesette",
    composer: "Toots Thielemans",
    key: "Bb",
    difficulty: 3,
    timeSig: "3/4",
    chart:
      "Bbmaj7|Bbmaj7|Am7b5|D7|Gm7|Gm7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7b5|G7|" +
      "Cm7|Cm7|Bm7|E7|Amaj7|Amaj7|Am7|D7|" +
      "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7",
  },
  {
    name: "But Beautiful",
    composer: "Jimmy Van Heusen",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Bbdim7|Am7|D7|Bm7|E7|Am7|D7|" +
      "Dm7|G7|Cmaj7|Cm7|Bm7|E7|Am7|D7|" +
      "Gmaj7|Bbdim7|Am7|D7|Bm7|E7|Am7|D7|" +
      "Dm7|G7|Cmaj7|Cm6|Bm7 Bb7|Am7 D7|Gmaj7|Am7 D7",
  },
  {
    name: "But Not For Me",
    composer: "George Gershwin",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Cm7|F7|Bbm7|Eb7|Abmaj7|Abmaj7|" +
      "Am7b5|D7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Ebmaj7|Cm7|F7|Bbm7|Eb7|Abmaj7|Abmaj7|" +
      "Am7b5|D7|Gm7|C7|Fm7 Bb7|Ebmaj7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Bye Bye Blues",
    composer: "Hamm/Bennett",
    key: "C",
    difficulty: 1,
    chart:
      "Cmaj7|Cmaj7|G7|G7|G7|G7|Cmaj7|Cmaj7|" +
      "C7|C7|F6|F6|G7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Cmaj7|G7|G7|G7|G7|Cmaj7|Cmaj7|" +
      "C7|C7|F6|F6|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Candy",
    composer: "Kramer/Whitney/David",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|G7|Cm7|F7|Bbmaj7|G7|Cm7|F7|" +
      "Fm7|Bb7|Ebmaj7|Ebm7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|G7|Cm7|F7|Bbmaj7|G7|Cm7|F7|" +
      "Fm7|Bb7|Ebmaj7|Ebm7|Dm7 G7|Cm7 F7|Bbmaj7|Cm7 F7",
  },
  {
    name: "Cherokee",
    composer: "Ray Noble",
    key: "Bb",
    difficulty: 3,
    chart:
      "Bbmaj7|Bbmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Ab7|Ab7|" +
      "Bbmaj7|Bbmaj7|Fm7|Bb7|Ebmaj7|Cm7 F7|Bbmaj7|Bbmaj7|" +
      "C#maj7|C#maj7|B7|B7|Amaj7|Amaj7|G7|G7|" +
      "Bbmaj7|Bbmaj7|Fm7|Bb7|Ebmaj7|Cm7 F7|Bbmaj7|Bbmaj7",
  },
  {
    name: "Come Rain Or Come Shine",
    composer: "Harold Arlen",
    key: "F",
    difficulty: 3,
    chart:
      "Fmaj7|Fmaj7|Am7b5|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Em7b5 A7|Dm7|Dm7|Bm7b5|E7|Am7b5|D7|" +
      "Gm7|Gm7|C7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Em7b5 A7|Dm7|Bm7b5 E7|Am7b5|D7|Gm7 C7|Fmaj7",
  },
  {
    name: "Corcovado",
    composer: "Tom Jobim",
    key: "C",
    difficulty: 2,
    chart:
      "Am7|Am7|Ab7|Ab7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fm7|Fm7|Em7|A7|Dm7|Dm7|G7|G7|" +
      "Am7|Am7|Ab7|Ab7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fm7|Fm7|Em7|A7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Darn That Dream",
    composer: "Jimmy Van Heusen",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Bbdim7|Am7|D7|Gmaj7|Bb7|Am7|D7|" +
      "Bm7|Bbdim7|Am7|D7|Gmaj7|Em7|Am7 D7|Gmaj7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Bm7|E7|Amaj7|Am7 D7|" +
      "Gmaj7|Bbdim7|Am7|D7|Bm7 Bbm7|Am7 D7|Gmaj7|Am7 D7",
  },
  {
    name: "Days Of Wine And Roses",
    composer: "Henry Mancini",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Eb7|Am7|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Am7 D7|Gm7|Gm7|Em7b5|A7|Dm7|Dm7|" +
      "Fmaj7|Eb7|Am7|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "Don't Get Around Much Anymore",
    composer: "Duke Ellington",
    key: "C",
    difficulty: 1,
    chart:
      "Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7|" +
      "Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7|" +
      "F7|F7|Cmaj7|C7|D7|D7|Dm7|G7|" +
      "Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Easy Living",
    composer: "Rainger/Robin",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Dm7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|D7|Gm7 C7|Fmaj7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Bbm7|Eb7|Fmaj7|Dm7|" +
      "Gm7|C7|Am7|D7|Gm7|C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Emily",
    composer: "Johnny Mandel",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Am7|Dm7|G7|Em7|A7|Dm7|G7|" +
      "Cmaj7|Fmaj7|Bm7b5|E7|Am7|Dm7|Em7 A7|Dm7 G7|" +
      "Cmaj7|Am7|Dm7|G7|Em7|A7|Dm7|G7|" +
      "Cmaj7|Fmaj7|Bm7b5 E7|Am7 D7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Estate",
    composer: "Bruno Martino",
    key: "Cm",
    difficulty: 3,
    chart:
      "Cm7|Cm7|Dm7b5|G7|Cm7|Cm7|Fm7|Fm7|" +
      "Abmaj7|Dm7b5 G7|Cm7|Cm7|Bbm7|Eb7|Abmaj7|Abmaj7|" +
      "Dm7b5|G7|Cm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abmaj7|Dm7b5|G7|G7|Cm7|Cm7|Dm7b5 G7|Cm7",
  },
  {
    name: "Everything Happens To Me",
    composer: "Matt Dennis",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Cm7|Fm7|Bb7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Gm7|C7|Fm7 Bb7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Gm7 C7|Fm7 Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Fever",
    composer: "Eddie Cooley",
    key: "Am",
    difficulty: 1,
    chart:
      "Am7|Am7|Am7|Am7|Am7|Am7|Am7|Am7|" +
      "Am7|Am7|E7|E7|Am7|Am7|Am7|Am7|" +
      "Am7|Am7|Am7|Am7|Am7|Am7|E7|E7|" +
      "Am7|Am7|Am7|Am7|Am7|Am7|Am7|Am7",
  },
  {
    name: "For All We Know",
    composer: "J. Fred Coots",
    key: "Ab",
    difficulty: 2,
    chart:
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7|Eb7|" +
      "Abmaj7|Ab7|Dbmaj7|Dbm6|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7|" +
      "Cm7|Fm7|Bbm7|Eb7|Cm7|Fm7|Bbm7|Eb7|" +
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Four",
    composer: "Miles Davis",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Abm7|Db7|" +
      "Gbmaj7|Gbmaj7|Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Abm7|Db7|" +
      "Gbmaj7|Gbmaj7|Fm7 Bb7|Ebmaj7|Fm7 Bb7|Ebmaj7|Fm7|Bb7",
  },
  {
    name: "Georgia On My Mind",
    composer: "Hoagy Carmichael",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Am7 D7|Gm7|C7|Fmaj7|Am7 D7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Am7|D7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Gm7|Bbm7|Fmaj7|D7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fmaj7|Am7 D7|Gm7|C7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7",
  },
  {
    name: "God Bless The Child",
    composer: "Billie Holiday",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Eb7|Eb7|Ab7|Ab7|Ebmaj7|Cm7|" +
      "Fm7|Bb7|Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebm7|Ebm7|Ebm7|Ebm7|Bb7|Bb7|Bb7|Bb7|" +
      "Ebmaj7|Eb7|Ab7|Ab7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Golden Earrings",
    composer: "Victor Young",
    key: "Fm",
    difficulty: 3,
    chart:
      "Fm7|Fm7|Bbm7|Bbm7|Gm7b5|C7|Fm7|Fm7|" +
      "Db7|C7|Fm7|Fm7|Gm7b5|C7|Fm7|Fm7|" +
      "Abmaj7|Abmaj7|Gm7b5|C7|Fm7|Bbm7|Gm7b5|C7|" +
      "Fm7|Fm7|Bbm7|Bbm7|Gm7b5|C7|Fm7|Fm7",
  },
  {
    name: "Green Dolphin Street",
    composer: "Bronislau Kaper",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Cmaj7|Cm7|Cm7|D7|Db7|Cmaj7|Cmaj7|" +
      "Dm7|G7|Cmaj7|Cmaj7|Fm7|Fm7|Em7|A7|" +
      "Dm7|G7|Em7|Am7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Dm7|G7|Em7|Am7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Have You Met Miss Jones",
    composer: "Rodgers/Hart",
    key: "F",
    difficulty: 3,
    chart:
      "Fmaj7|F#dim7|Gm7|C7|Am7|Dm7|Gm7|C7|" +
      "Fmaj7|F#dim7|Gm7|C7|Am7|Dm7|Gm7 C7|Fmaj7|" +
      "Bbmaj7|Abm7 Db7|Gbmaj7|Em7 A7|Dmaj7|Abm7 Db7|Gbmaj7|Gm7 C7|" +
      "Fmaj7|F#dim7|Gm7|C7|Am7|Dm7|Gm7 C7|Fmaj7",
  },
  {
    name: "Here's That Rainy Day",
    composer: "Jimmy Van Heusen",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Bbmaj7|Ebmaj7|Ebmaj7|Am7|D7|Gmaj7|Gmaj7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Am7b5|D7|Gmaj7|Gmaj7|" +
      "Gmaj7|Bbmaj7|Ebmaj7|Ebmaj7|Am7|D7|Gmaj7|E7|" +
      "Am7|D7|Bm7 Bb7|Am7 D7|Gmaj7|Gmaj7|Am7 D7|Gmaj7",
  },
  {
    name: "Honeysuckle Rose",
    composer: "Fats Waller",
    key: "F",
    difficulty: 2,
    chart:
      "Gm7|C7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Gm7|C7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|" +
      "F7|F7|Bb7|Bb7|G7|G7|C7|C7|" +
      "Gm7|C7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7",
  },
  {
    name: "How Deep Is The Ocean",
    composer: "Irving Berlin",
    key: "Eb",
    difficulty: 3,
    chart:
      "Cm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|Abmaj7|Abmaj7|" +
      "Dm7b5|G7|Cm7|Am7b5|D7|D7|Gm7|C7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7b5|D7|Gm7|C7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "How Insensitive",
    composer: "Tom Jobim",
    key: "Dm",
    difficulty: 2,
    chart:
      "Dm7|Dm7|C#dim7|C#dim7|Cm6|Cm6|G7/B|G7/B|" +
      "Bbmaj7|Bbmaj7|Ebmaj7|Ebmaj7|Em7b5|A7|Dm7|Dm7|" +
      "Dm7|Dm7|Db7|Db7|Cm7|Cm7|Bm7b5|Bm7b5|" +
      "Bbmaj7|Bbmaj7|Em7b5|A7|Dm7|Dm7|Em7b5 A7|Dm7",
  },
  {
    name: "I Can't Get Started",
    composer: "Vernon Duke",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Am7|Dm7|G7|Em7|Am7|Dm7|G7|" +
      "Em7|A7|Dm7|G7|Cmaj7|Am7|Dm7 G7|Cmaj7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|Cmaj7|Am7|" +
      "Dm7|G7|Em7|Am7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "I Could Write A Book",
    composer: "Rodgers/Hart",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7|C7|Fmaj7|F#dim7|" +
      "Cmaj7|Am7|Dm7|G7|Em7|A7|Dm7|G7|" +
      "Cmaj7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7|C7|Fmaj7|F#dim7|" +
      "Cmaj7|Am7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "I Fall In Love Too Easily",
    composer: "Jule Styne",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Abmaj7|Dm7b5|G7|Cm7|Fm7|Bb7|Ebmaj7|" +
      "Abmaj7|Abmaj7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Abmaj7|Dm7b5|G7|Cm7|Fm7|Bb7|Ebmaj7|" +
      "Abmaj7|Dm7b5 G7|Cm7|Fm7|Bb7|Ebmaj7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "I Hear A Rhapsody",
    composer: "Fragos/Baker/Gasparre",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7|" +
      "Abmaj7|Abm7|Gm7|C7|Fm7|Abm7|Gm7b5|C7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "I Love You",
    composer: "Cole Porter",
    key: "F",
    difficulty: 2,
    chart:
      "Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Em7b5|A7|Dm7|Dm7|Bm7b5|E7|" +
      "Am7|Dm7|Gm7|C7|Fmaj7|Fmaj7|Gm7|C7|" +
      "Fmaj7|Em7b5 A7|Dm7|Gm7 C7|Fmaj7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "I Remember Clifford",
    composer: "Benny Golson",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Fm7 Bb7|Ebmaj7|Abmaj7|Dm7b5|G7|Cm7|Cm7|" +
      "Abm7|Db7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Fm7 Bb7|Gm7|C7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "I Remember You",
    composer: "Victor Schertzinger",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Bm7 E7|Fmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Am7 D7|Gm7 C7|" +
      "Fmaj7|Bm7 E7|Fmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Am7 D7|Gm7 C7|" +
      "Am7|D7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Bm7 E7|Fmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Gm7 C7|Fmaj7",
  },
  {
    name: "I Thought About You",
    composer: "Jimmy Van Heusen",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Fmaj7|Fmaj7|Gm7|C7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7 C7|Fmaj7",
  },
  {
    name: "If I Should Lose You",
    composer: "Rainger/Robin",
    key: "Db",
    difficulty: 3,
    chart:
      "Fm7|Bbm7|Ebm7|Ab7|Dbmaj7|Gbmaj7|Fm7|Bbm7|" +
      "Ebm7|Ab7|Dbmaj7|Dbmaj7|Fm7|Bb7|Ebm7|Ab7|" +
      "Dbmaj7|Gbmaj7|Fm7|Bb7|Ebm7|Ab7|Dbmaj7|Dbmaj7|" +
      "Fm7|Bbm7|Ebm7|Ab7|Dbmaj7|Gbmaj7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "If I Were A Bell",
    composer: "Frank Loesser",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|Gm7|C7|Fmaj7|F7|Bbmaj7|Bdim7|" +
      "Fmaj7|Am7 D7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Gm7|C7|Fmaj7|F7|Bbmaj7|Bdim7|" +
      "Fmaj7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7|Fmaj7|Gm7|C7",
  },
  {
    name: "In A Mellow Tone",
    composer: "Duke Ellington",
    key: "Ab",
    difficulty: 2,
    chart:
      "Abmaj7|Abmaj7|Bbm7|Eb7|Abmaj7|Ab7|Dbmaj7|Ddim7|" +
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7|" +
      "Cm7|F7|Bbm7|Eb7|Cm7|F7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Indiana",
    composer: "Ballard MacDonald",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|D7|D7|G7|G7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Cm7|F7|Bbmaj7|Bbm7|Am7|Abdim7|" +
      "Gm7|Gm7|G7|G7|Gm7|C7|Fmaj7|D7|" +
      "Gm7|C7|Fmaj7|D7|Gm7 C7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "It Could Happen To You",
    composer: "Jimmy Van Heusen",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Fm7|B7|Ebmaj7|Ebmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Dm7b5|G7|Cm7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Fm7|B7|Ebmaj7|Ebmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Dm7b5 G7|Cm7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "It Had To Be You",
    composer: "Isham Jones",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Gmaj7|B7|B7|B7|B7|E7|E7|" +
      "A7|A7|A7|A7|Am7|D7|Gmaj7|Am7 D7|" +
      "Gmaj7|Gmaj7|B7|B7|B7|B7|E7|E7|" +
      "A7|A7|Am7|D7|Am7 D7|Gmaj7|Am7 D7|Gmaj7",
  },
  {
    name: "It Might As Well Be Spring",
    composer: "Rodgers/Hammerstein",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Gmaj7|Am7|D7|Gmaj7|Gmaj7|Dm7|G7|" +
      "Cmaj7|Cmaj7|F#m7b5|B7|Em7|Am7|D7|D7|" +
      "Gmaj7|Gmaj7|Am7|D7|Gmaj7|Gmaj7|Dm7|G7|" +
      "Cmaj7|Cm7|Bm7|E7|Am7|D7|Gmaj7|Am7 D7",
  },
  {
    name: "Joy Spring",
    composer: "Clifford Brown",
    key: "F",
    difficulty: 3,
    chart:
      "Fmaj7|Gm7 C7|Fmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Gbmaj7|Gm7 C7|" +
      "Fmaj7|Gm7 C7|Fmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Gbmaj7|Gm7 C7|" +
      "Am7|D7|Gmaj7|Gmaj7|Bm7|E7|Amaj7|Gm7 C7|" +
      "Fmaj7|Gm7 C7|Fmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Gbmaj7|Gm7 C7",
  },
  {
    name: "Just Friends",
    composer: "John Klenner",
    key: "F",
    difficulty: 2,
    chart:
      "Cmaj7|Cm7|Fmaj7|Fmaj7|Bm7b5|E7|Am7|Am7|" +
      "Am7|D7|Dm7|G7|Em7|A7|Dm7|G7|" +
      "Cmaj7|Cm7|Fmaj7|Fmaj7|Bm7b5|E7|Am7|Am7|" +
      "Am7|D7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7|Dm7|G7",
  },
  {
    name: "Just In Time",
    composer: "Jule Styne",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Bbmaj7|Am7|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Fmaj7|Am7|D7|G7|G7|Cm7|F7|" +
      "Bbmaj7|Bbmaj7|Am7|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Fmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7|F7",
  },
  {
    name: "Lady Bird",
    composer: "Tadd Dameron",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Cmaj7|Fm7|Bb7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Am7|D7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Laura",
    composer: "David Raksin",
    key: "C",
    difficulty: 3,
    chart:
      "Am7|D7|Gmaj7|G7|Cmaj7|Cmaj7|F#m7b5|Fm7|" +
      "Em7|Am7|Dm7|G7|Cmaj7|F7|Em7|Ebdim7|" +
      "Am7|D7|Gmaj7|G7|Cmaj7|Cmaj7|F#m7b5|Fm7|" +
      "Em7|Am7|Dm7|G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Lester Leaps In",
    composer: "Lester Young",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7|" +
      "D7|D7|G7|G7|C7|C7|F7|F7|" +
      "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Like Someone In Love",
    composer: "Jimmy Van Heusen",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|E7|Fmaj7|Dm7 G7|Em7|A7|Dm7|G7|" +
      "Cmaj7|E7|Fmaj7|Dm7 G7|Em7|Ebdim7|Dm7|G7|" +
      "Gm7|C7|Fmaj7|Fm7|Em7|Ebdim7|Dm7|G7|" +
      "Cmaj7|E7|Fmaj7|Dm7 G7|Em7 A7|Dm7 G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Limehouse Blues",
    composer: "Philip Braham",
    key: "Ab",
    difficulty: 2,
    chart:
      "Abmaj7|Abmaj7|Ab7|Ab7|Db7|Db7|Abmaj7|Abmaj7|" +
      "Abmaj7|Abmaj7|F7|F7|Bb7|Eb7|Abmaj7|Abmaj7|" +
      "Abmaj7|Abmaj7|Ab7|Ab7|Db7|Db7|Abmaj7|Abmaj7|" +
      "Abmaj7|F7|Bb7|Eb7|Abmaj7|Abmaj7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Line For Lyons",
    composer: "Gerry Mulligan",
    key: "Bb",
    difficulty: 3,
    chart:
      "Bbmaj7|Gm7|Cm7|F7|Dm7|Gm7|Cm7|F7|" +
      "Bbmaj7|Bb7|Ebmaj7|Ebm7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Gm7|Cm7|F7|Dm7|Gm7|Cm7|F7|" +
      "Bbmaj7|Bb7|Ebmaj7|Ebm7|Dm7 G7|Cm7 F7|Bbmaj7|Cm7 F7",
  },
  {
    name: "Long Ago And Far Away",
    composer: "Jerome Kern",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|Gm7|C7|Fmaj7|Fmaj7|Ab7|Ab7|" +
      "Dbmaj7|Dbmaj7|Gm7|C7|Fmaj7|Dm7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Gm7|C7|Fmaj7|Fmaj7|Ab7|Ab7|" +
      "Dbmaj7|Dbmaj7|Gm7|C7|Fmaj7|Dm7|Gm7 C7|Fmaj7",
  },
  {
    name: "Lover Man",
    composer: "Davis/Ramirez/Sherman",
    key: "Db",
    difficulty: 3,
    chart:
      "Dm7b5|G7|Cm7b5|F7|Bbm7|Eb7|Abmaj7|Abmaj7|" +
      "Dm7b5|G7|Cm7b5|F7|Bbm7|Eb7|Abmaj7|Abmaj7|" +
      "Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Dm7b5|G7|Cm7b5|F7|Bbm7|Eb7|Abmaj7|Abmaj7",
  },
  {
    name: "Lullaby Of Birdland",
    composer: "George Shearing",
    key: "Fm",
    difficulty: 3,
    chart:
      "Fm7|Dm7b5 G7|Cm7|Cm7|Dm7b5|G7|Cm7|C7|" +
      "Fm7|Bbm7|Eb7|Abmaj7|Db7|Dm7b5|G7|Cm7|" +
      "Abmaj7|Abmaj7|Dm7b5|G7|Cm7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Abmaj7|Dm7b5|G7|Cm7|Fm7|Dm7b5 G7|Cm7",
  },
  {
    name: "Mack The Knife",
    composer: "Kurt Weill",
    key: "Bb",
    difficulty: 1,
    chart:
      "Bbmaj7|Bbmaj7|Cm7|F7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Bbmaj7|Cm7|F7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Bbmaj7|Cm7|F7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Bbmaj7|Cm7|F7|Cm7|F7|Bbmaj7|Bbmaj7",
  },
  {
    name: "Meditation",
    composer: "Tom Jobim",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Cmaj7|B7|B7|Cmaj7|Cmaj7|Em7|A7|" +
      "Dm7|Dm7|Fm7|Fm7|Em7|Ebdim7|Dm7|G7|" +
      "Cmaj7|Cmaj7|B7|B7|Cmaj7|Cmaj7|Em7|A7|" +
      "Dm7|Dm7|Fm7|Fm7|Em7 A7|Dm7 G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Memories Of You",
    composer: "Eubie Blake",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Cm7|F7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Ebmaj7|Cm7|F7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7b5|D7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Midnight Sun",
    composer: "Lionel Hampton",
    key: "G",
    difficulty: 3,
    chart:
      "Gmaj7|Gmaj7|Cm7|F7|Gmaj7|Gmaj7|Bbm7|Eb7|" +
      "Abmaj7|Am7 D7|Gmaj7|Gmaj7|Bm7|Bb7|Am7|D7|" +
      "Gmaj7|Gmaj7|Cm7|F7|Gmaj7|Gmaj7|Bbm7|Eb7|" +
      "Abmaj7|Am7 D7|Gmaj7|Em7|Am7 D7|Gmaj7|Am7 D7|Gmaj7",
  },
  {
    name: "Misty",
    composer: "Erroll Garner",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Ebmaj7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7|" +
      "Bbm7|Eb7|Abmaj7|Abmaj7|Am7|D7|Ebmaj7|Bb7|" +
      "Ebmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Mood Indigo",
    composer: "Duke Ellington",
    key: "Ab",
    difficulty: 2,
    chart:
      "Abmaj7|Abmaj7|Bb7|Bb7|Abmaj7|Abmaj7|Abmaj7|Abmaj7|" +
      "Abmaj7|Abmaj7|Bb7|Bb7|Abmaj7|Abmaj7|Abmaj7|Abmaj7|" +
      "Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Bb7|Bb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Moonglow",
    composer: "Hudson/DeLange/Mills",
    key: "G",
    difficulty: 1,
    chart:
      "Gmaj7|Gmaj7|Cm7|F7|Bm7|Bbdim7|Am7|D7|" +
      "Gmaj7|Gmaj7|Cm7|F7|Bm7|Bbdim7|Am7|D7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Am7|D7|Gmaj7|Am7 D7|" +
      "Gmaj7|Gmaj7|Cm7|F7|Bm7|Bbdim7|Am7 D7|Gmaj7",
  },
  {
    name: "Moonlight In Vermont",
    composer: "Suessdorf/Blackburn",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Dbmaj7|Dbmaj7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Dbmaj7|Dbmaj7|" +
      "Fm7|Bb7|Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Cm7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "My Foolish Heart",
    composer: "Victor Young",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Ebmaj7|Dm7|Cm7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Am7b5 D7|Gm7|C7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Ebmaj7|Dm7|Cm7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Am7b5 D7|Gm7|C7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "My Old Flame",
    composer: "Sam Coslow",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|E7|Am7|D7|Bm7|E7|Am7|D7|" +
      "Gmaj7|Gmaj7|Dm7|G7|Cmaj7|Cm7|Gmaj7|Am7 D7|" +
      "Gmaj7|E7|Am7|D7|Bm7|E7|Am7|D7|" +
      "Gmaj7|Gmaj7|Dm7|G7|Cmaj7|Am7 D7|Gmaj7|Am7 D7",
  },
  {
    name: "My One And Only Love",
    composer: "Guy Wood",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Am7|Dm7|G7|Em7|Am7|Dm7|G7|" +
      "Cmaj7|Gm7 C7|Fmaj7|Fm7|Em7|Am7|Dm7 G7|Cmaj7|" +
      "Em7|Am7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Cmaj7|Gm7 C7|Fmaj7|Fm7|Em7 Am7|Dm7 G7|Cmaj7|Dm7 G7",
  },
  {
    name: "My Romance",
    composer: "Rodgers/Hart",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Fmaj7|Em7|Am7|Dm7|G7|Cmaj7|E7|" +
      "Am7|Dm7|Bm7b5|E7|Am7|D7|Dm7|G7|" +
      "Cmaj7|Fmaj7|Em7|Am7|Dm7|G7|Cmaj7|E7|" +
      "Am7|Dm7|Bm7b5 E7|Am7 D7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "My Shining Hour",
    composer: "Harold Arlen",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Gm7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Abmaj7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Abmaj7|Gm7 C7|Fm7 Bb7|Ebmaj7|Ebmaj7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Nature Boy",
    composer: "eden ahbez",
    key: "Dm",
    difficulty: 2,
    chart:
      "Dm7|Dm7|Em7b5|A7|Dm7|Dm7|Gm7|Gm7|" +
      "Em7b5|A7|Dm7|Dm7|Gm7|A7|Dm7|Dm7|" +
      "Dm7|Dm7|Em7b5|A7|Dm7|Dm7|Gm7|Gm7|" +
      "Em7b5|A7|Dm7|Gm7|Em7b5|A7|Dm7|Dm7",
  },
  {
    name: "Never Let Me Go",
    composer: "Jay Livingston",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Ebmaj7|Cm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7b5|D7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Ebmaj7|Cm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7b5|D7|Gm7|C7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Night And Day",
    composer: "Cole Porter",
    key: "C",
    difficulty: 3,
    chart:
      "Abmaj7|Abmaj7|G7|G7|Abmaj7|Abmaj7|G7|G7|" +
      "Cmaj7|Cmaj7|Ebdim7|Dm7 G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7|" +
      "Fmaj7|Fm7|Em7|Ebdim7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Cmaj7|Ebdim7|Dm7 G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Night In Tunisia",
    composer: "Dizzy Gillespie",
    key: "Dm",
    difficulty: 3,
    chart:
      "Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|" +
      "Eb7|Dm7|Eb7|Dm7|Em7b5|A7|Dm7|Dm7|" +
      "Am7b5|D7|Gm7|Gm7|Gm7b5|C7|Fmaj7|Em7b5 A7|" +
      "Eb7|Dm7|Eb7|Dm7|Em7b5|A7|Dm7|Dm7",
  },
  {
    name: "Old Devil Moon",
    composer: "Burton Lane",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|Ebmaj7|Ebmaj7|Fmaj7|Fmaj7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Ebmaj7|Ebmaj7|Fmaj7|Fmaj7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gm7|C7|Fmaj7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "On A Clear Day",
    composer: "Burton Lane",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Gmaj7|Bm7|Bb7|Am7|D7|Gmaj7|Gmaj7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Bm7b5|E7|Am7|D7|" +
      "Gmaj7|Gmaj7|Bm7|Bb7|Am7|D7|Gmaj7|Gmaj7|" +
      "Gm7|C7|Fmaj7|F7|Bm7 E7|Am7 D7|Gmaj7|Am7 D7",
  },
  {
    name: "On Green Dolphin Street",
    composer: "Bronislau Kaper",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Cmaj7|Cm7|Cm7|D7|Db7|Cmaj7|Cmaj7|" +
      "Dm7|G7|Cmaj7|Cmaj7|Fm7|Fm7|Em7|A7|" +
      "Dm7|G7|Em7|Am7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Dm7|G7|Em7|Am7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "On The Sunny Side Of The Street",
    composer: "Jimmy McHugh",
    key: "C",
    difficulty: 1,
    chart:
      "Cmaj7|E7|Fmaj7|D7|Cmaj7|Em7 A7|Dm7|G7|" +
      "Cmaj7|E7|Fmaj7|D7|Cmaj7|Am7|Dm7 G7|Cmaj7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Am7|D7|Dm7|G7|" +
      "Cmaj7|E7|Fmaj7|D7|Cmaj7|Am7|Dm7 G7|Cmaj7",
  },
  {
    name: "Once I Loved",
    composer: "Tom Jobim",
    key: "Dm",
    difficulty: 2,
    chart:
      "Dm7|Dm7|E7|E7|Am7|Am7|Dm7|Dm7|" +
      "Gm7|A7|Dm7|Dm7|G7|G7|Cmaj7|Cmaj7|" +
      "Fmaj7|Bm7b5|E7|Am7|Dm7|Gm7|Em7b5|A7|" +
      "Dm7|Dm7|Gm7|A7|Dm7|Dm7|Em7b5 A7|Dm7",
  },
  {
    name: "One Note Samba",
    composer: "Tom Jobim",
    key: "Bb",
    difficulty: 2,
    chart:
      "Dm7|Db7|Cm7|B7|Dm7|Db7|Cm7|B7|" +
      "Dm7|Db7|Cm7|B7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|C7|" +
      "Dm7|Db7|Cm7|B7|Cm7|F7|Bbmaj7|Bbmaj7",
  },
  {
    name: "Out Of Nowhere",
    composer: "Johnny Green",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Gmaj7|Bbm7|Eb7|Gmaj7|Gmaj7|Bm7|E7|" +
      "Am7|E7|Am7|Am7|Am7|Cm6|Bm7|Bbdim7|" +
      "Am7|D7|Gmaj7|Gmaj7|Bbm7|Eb7|Am7|D7|" +
      "Gmaj7|Gmaj7|Am7 D7|Gmaj7|Am7 D7|Gmaj7|Am7 D7|Gmaj7",
  },
  {
    name: "Over The Rainbow",
    composer: "Harold Arlen",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Cm7|Gm7|Eb7|Abmaj7|Abm7|Ebmaj7|C7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Fm7|Bb7|Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Cm7|" +
      "Abmaj7|Abm7|Ebmaj7|C7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Pennies From Heaven",
    composer: "Arthur Johnston",
    key: "C",
    difficulty: 1,
    chart:
      "Cmaj7|Cmaj7|A7|A7|Dm7|Dm7|G7|G7|" +
      "Cmaj7|Cmaj7|Gm7|C7|Fmaj7|Fm7|Cmaj7|G7|" +
      "Cmaj7|Cmaj7|A7|A7|Dm7|Dm7|G7|G7|" +
      "Cmaj7|Cmaj7|Gm7 C7|Fmaj7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Perdido",
    composer: "Juan Tizol",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7|" +
      "D7|D7|G7|G7|C7|C7|F7|F7|" +
      "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7",
  },
  {
    name: "Polka Dots And Moonbeams",
    composer: "Jimmy Van Heusen",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7 C7|Fmaj7|" +
      "Abmaj7|Abmaj7|Dbmaj7|Dbmaj7|Gm7|Gm7|C7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7 C7|Fmaj7",
  },
  {
    name: "Prelude To A Kiss",
    composer: "Duke Ellington",
    key: "D",
    difficulty: 3,
    chart:
      "Dmaj7|Bm7|Em7|A7|D6|B7|Em7|A7|" +
      "Dmaj7|D7|Gmaj7|Gm6|F#m7|B7|Em7|A7|" +
      "Am7|D7|Gmaj7|Gm7|F#m7|B7|Em7|A7|" +
      "Dmaj7|Bm7|Em7|A7|Dmaj7|Bm7|Em7 A7|Dmaj7",
  },
  {
    name: "Quiet Nights Of Quiet Stars",
    composer: "Tom Jobim",
    key: "C",
    difficulty: 2,
    chart:
      "Am7|Am7|Ab7|Ab7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fm7|Fm7|Em7|A7|Dm7|Dm7|G7|G7|" +
      "Am7|Am7|Ab7|Ab7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fm7|Fm7|Em7|A7|Dm7 G7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Route 66",
    composer: "Bobby Troup",
    key: "Bb",
    difficulty: 1,
    chart:
      "Bb7|Bb7|Bb7|Bb7|Eb7|Eb7|Bb7|Bb7|" +
      "F7|Eb7|Bb7|F7|Bb7|Bb7|Bb7|Bb7|" +
      "Eb7|Eb7|Bb7|Bb7|F7|Eb7|Bb7|F7|" +
      "Bb7|Bb7|Bb7|Bb7|Eb7|Eb7|Bb7|F7",
  },
  {
    name: "Satin Doll",
    composer: "Duke Ellington",
    key: "C",
    difficulty: 1,
    chart:
      "Dm7|G7|Em7|A7|Am7|D7|Abm7 Db7|Cmaj7|" +
      "Dm7|G7|Em7|A7|Am7|D7|Abm7 Db7|Cmaj7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Am7|D7|Dm7|G7|" +
      "Dm7|G7|Em7|A7|Am7|D7|Abm7 Db7|Cmaj7",
  },
  {
    name: "Secret Love",
    composer: "Sammy Fain",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Cm7|Fm7|Bb7|Bb7|Ebmaj7|Ebmaj7|" +
      "Gm7|C7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Skylark",
    composer: "Hoagy Carmichael",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Fm7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abmaj7|Abm7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Cm7|F7|Fm7|Bb7|" +
      "Ebmaj7|Fm7|Gm7|C7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Smoke Gets In Your Eyes",
    composer: "Jerome Kern",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Bbm7|Eb7|Abmaj7|Abm7|Ebmaj7|Bb7|" +
      "Bmaj7|Bmaj7|C#m7|F#7|Bmaj7|Bmaj7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Abm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Softly As In A Morning Sunrise",
    composer: "Romberg/Hammerstein",
    key: "Cm",
    difficulty: 2,
    chart:
      "Cm7|Cm7|Dm7b5|G7|Cm7|Cm7|Dm7b5|G7|" +
      "Cm7|Cm7|Dm7b5|G7|Cm7|Cm7|Dm7b5|G7|" +
      "Fm7|Fm7|Dm7b5|G7|Cm7|Cm7|Dm7b5|G7|" +
      "Cm7|Cm7|Dm7b5|G7|Cm7|Cm7|Dm7b5 G7|Cm7",
  },
  {
    name: "Solar",
    composer: "Miles Davis",
    key: "Cm",
    difficulty: 2,
    chart: "Cm7|Cm7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|Ebmaj7|Ebm7 Ab7|Dbmaj7|Dm7b5 G7",
  },
  {
    name: "Someday My Prince Will Come",
    composer: "Frank Churchill",
    key: "Bb",
    difficulty: 2,
    timeSig: "3/4",
    chart:
      "Bbmaj7|D7|Ebmaj7|G7|Cm7|G7|Cm7|F7|" +
      "Dm7|G7|Cm7|F7|Dm7|Dbdim7|Cm7|F7|" +
      "Bbmaj7|D7|Ebmaj7|G7|Cm7|G7|Cm7|F7|" +
      "Dm7|G7|Cm7|F7|Bbmaj7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Someone To Watch Over Me",
    composer: "George Gershwin",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Ebm7|Ab7|Bbmaj7|Gm7|Cm7|F7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abmaj7|Abmaj7|Am7b5|D7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Ebm7|Ab7|Bbmaj7|Gm7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Sophisticated Lady",
    composer: "Duke Ellington",
    key: "Ab",
    difficulty: 3,
    chart:
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|F7|Bbm7|Eb7|" +
      "Abmaj7|Fm7|Bb7|Bb7|Eb7|Eb7|Abmaj7|Abmaj7|" +
      "Cmaj7|Am7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|F7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Speak Low",
    composer: "Kurt Weill",
    key: "Bb",
    difficulty: 3,
    chart:
      "Bbmaj7|Bbmaj7|Ebm7|Ab7|Dm7|G7|Dbmaj7|Dbmaj7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Ebm7|Ab7|Dm7 G7|Cm7 F7|" +
      "Bbmaj7|Bbmaj7|Ebm7|Ab7|Dm7|G7|Dbmaj7|Dbmaj7|" +
      "Cm7|F7|Bbmaj7|Gm7|Cm7|F7|Bbmaj7|Cm7 F7",
  },
  {
    name: "Spring Is Here",
    composer: "Rodgers/Hart",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Bbmaj7|Bbm7|Eb7|Fmaj7|Fmaj7|Abm7|Db7|" +
      "Gbmaj7|Gbmaj7|Gm7|C7|Cm7|Cm7|F7|Bbmaj7|" +
      "Bbmaj7|Bbmaj7|Bbm7|Eb7|Fmaj7|Fmaj7|Abm7|Db7|" +
      "Gbmaj7|Gbmaj7|Gm7 C7|Cm7 F7|Bbmaj7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Star Dust",
    composer: "Hoagy Carmichael",
    key: "C",
    difficulty: 3,
    chart:
      "Dm7|G7|Cmaj7|F7|Em7|A7|Dm7|G7|" +
      "Cmaj7|Am7|B7|Em7|Am7|D7|Dm7|G7|" +
      "Dm7|G7|Cmaj7|F7|Em7|A7|Dm7|G7|" +
      "Cmaj7|Am7|B7|Em7|Am7|Dm7 G7|Cmaj7|Cmaj7",
  },
  {
    name: "Star Eyes",
    composer: "DePaul/Raye",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Fm7 Bb7|Ebmaj7|Ebm7 Ab7|Dbmaj7|Dm7 G7|Cmaj7|Gm7 C7|" +
      "Fm7|Fm7|Abm7|Db7|Gbmaj7|Gm7 C7|Fm7|Bb7|" +
      "Ebmaj7|Fm7 Bb7|Ebmaj7|Ebm7 Ab7|Dbmaj7|Dm7 G7|Cmaj7|Gm7 C7|" +
      "Fm7|Fm7|Abm7 Db7|Gbmaj7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Stars Fell On Alabama",
    composer: "Frank Perkins",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Dm7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|D7|Gm7 C7|Fmaj7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Stella By Starlight",
    composer: "Victor Young",
    key: "Bb",
    difficulty: 3,
    chart:
      "Em7b5|A7|Cm7|F7|Fm7|Bb7|Ebmaj7|Ab7|" +
      "Bbmaj7|Em7b5 A7|Dm7|Bbm7 Eb7|Fmaj7|Em7b5 A7|Am7b5|D7|" +
      "G7|G7|Cm7|Cm7|Ab7|Ab7|Bbmaj7|Bbmaj7|" +
      "Em7b5|A7|Dm7b5|G7|Cm7b5|F7|Bbmaj7|Bbmaj7",
  },
  {
    name: "Stompin At The Savoy",
    composer: "Edgar Sampson",
    key: "Db",
    difficulty: 2,
    chart:
      "Dbmaj7|Bbm7|Ebm7|Ab7|Dbmaj7|Bbm7|Ebm7|Ab7|" +
      "Dbmaj7|Db7|Gbmaj7|Gdim7|Dbmaj7|Bbm7|Ebm7 Ab7|Dbmaj7|" +
      "F7|F7|Bb7|Bb7|Eb7|Eb7|Ab7|Ab7|" +
      "Dbmaj7|Bbm7|Ebm7|Ab7|Dbmaj7|Bbm7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "Stormy Weather",
    composer: "Harold Arlen",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Gmaj7|Em7|Am7 D7|Gmaj7|Gmaj7|Em7|Am7 D7|" +
      "Gmaj7|G7|Cmaj7|Cm6|Gmaj7|Am7|D7|Gmaj7|" +
      "Cm7|F7|Gmaj7|G7|Cm7|F7|Bm7|E7|" +
      "Am7|D7|Gmaj7|Em7|Am7|D7|Gmaj7|Am7 D7",
  },
  {
    name: "Summertime",
    composer: "George Gershwin",
    key: "Am",
    difficulty: 1,
    chart:
      "Am7|Am7|E7|E7|Am7|Am7|Dm7|E7|" +
      "Am7|Am7|E7|E7|Am7|Dm7 E7|Am7|Am7",
  },
  {
    name: "Sweet Georgia Brown",
    composer: "Bernie/Pinkard/Casey",
    key: "F",
    difficulty: 2,
    chart:
      "F7|F7|F7|F7|Bb7|Bb7|Bb7|Bb7|" +
      "Eb7|Eb7|Eb7|Eb7|Abmaj7|Abmaj7|G7|C7|" +
      "F7|F7|F7|F7|Bb7|Bb7|Bb7|Bb7|" +
      "Ab7|G7|C7|C7|Fmaj7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "Tangerine",
    composer: "Victor Schertzinger",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|Em7b5|A7|Dm7|Dm7|Dbmaj7|Dbmaj7|" +
      "Cm7|F7|Bbmaj7|Bbm7 Eb7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Em7b5|A7|Dm7|Dm7|Dbmaj7|Dbmaj7|" +
      "Cm7|F7|Bbmaj7|Bbm7 Eb7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Tea For Two",
    composer: "Vincent Youmans",
    key: "Ab",
    difficulty: 1,
    chart:
      "Abmaj7|Abmaj7|Bbm7|Eb7|Abmaj7|Abmaj7|Bbm7|Eb7|" +
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7|" +
      "Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Tenderly",
    composer: "Walter Gross",
    key: "Eb",
    difficulty: 2,
    timeSig: "3/4",
    chart:
      "Ebmaj7|Ebmaj7|Abmaj7|Abm7|Gm7|C7|Fm7|Bb7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Ebmaj7|Abmaj7|Abm7|Gm7|C7|Fm7|Bb7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "The Days Of Wine And Roses",
    composer: "Henry Mancini",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Eb7|Am7|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Am7 D7|Gm7|Gm7|Em7b5|A7|Dm7|Dm7|" +
      "Fmaj7|Eb7|Am7|D7|Gm7|Gm7|Bbm7|Eb7|" +
      "Fmaj7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "The Girl From Ipanema",
    composer: "Tom Jobim",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|G7|G7|Gm7|Gb7|Fmaj7|Fmaj7|" +
      "Fmaj7|Fmaj7|G7|G7|Gm7|Gb7|Fmaj7|Fmaj7|" +
      "Gbmaj7|Gbmaj7|B7|B7|F#m7|F#m7|D7|D7|" +
      "Gm7|Gm7|Eb7|Eb7|Am7|D7|Gm7 C7|Fmaj7",
  },
  {
    name: "The Man I Love",
    composer: "George Gershwin",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Ebmaj7|Bb7|Bb7|Ebmaj7|Bb7|Ebmaj7|F7|" +
      "Bb7|Bb7|Ebmaj7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abm7|Db7|Gbmaj7|Gbmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Bb7|Ebmaj7|F7|Bb7|Fm7 Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "The Nearness Of You",
    composer: "Hoagy Carmichael",
    key: "F",
    difficulty: 1,
    chart:
      "Fmaj7|Cm7|Bbmaj7|Bbm7|Am7|Ab7|Gm7|C7|" +
      "Fmaj7|Cm7|Bbmaj7|Bbm7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Cm7|Bbmaj7|Bbm7|Am7|Ab7|Gm7|C7|" +
      "Fmaj7|Cm7|Bbmaj7|Bbm7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7",
  },
  {
    name: "The Shadow Of Your Smile",
    composer: "Johnny Mandel",
    key: "Em",
    difficulty: 3,
    chart:
      "F#m7b5|B7|Em7|A7|Am7|D7|Gmaj7|Cmaj7|" +
      "F#m7b5|B7|Em7|Em7|Am7|D7|Gmaj7|Gmaj7|" +
      "C#m7b5|F#7|Bmaj7|Bmaj7|Am7|D7|Gmaj7|E7|" +
      "Am7|D7|Bm7|E7|Am7|D7|Gmaj7|F#m7b5 B7",
  },
  {
    name: "The Song Is You",
    composer: "Jerome Kern",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Cmaj7|E7|E7|Fmaj7|F#dim7|Cmaj7|Am7|" +
      "Dm7|G7|Em7|A7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Ebmaj7|Ebmaj7|Bbm7|Eb7|Abmaj7|Dm7 G7|Cmaj7|Am7|" +
      "Fmaj7|F#dim7|Em7|A7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "The Surrey With The Fringe On Top",
    composer: "Rodgers/Hammerstein",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bb7|Ebmaj7|Ebm7|" +
      "Dm7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bb7|Ebmaj7|Ebm7|" +
      "Dm7|G7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "The Very Thought Of You",
    composer: "Ray Noble",
    key: "Ab",
    difficulty: 2,
    chart:
      "Abmaj7|Fm7|Bbm7|Eb7|Cm7|Bdim7|Bbm7|Eb7|" +
      "Abmaj7|Fm7|Bbm7|Eb7|Abmaj7|Ab7|Dbmaj7|Dbm6|" +
      "Cm7|Fm7|Bb7|Bb7|Bbm7|Eb7|Abmaj7|Ab7|" +
      "Dbmaj7|Dbm6|Cm7|F7|Bbm7|Eb7|Abmaj7|Bbm7 Eb7",
  },
  {
    name: "The Way You Look Tonight",
    composer: "Jerome Kern",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Cm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Gbmaj7|Gbmaj7|Ebm7|Ab7|Dbmaj7|Dbmaj7|Gm7b5|C7|" +
      "Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "There Is No Greater Love",
    composer: "Isham Jones",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Bbmaj7|C7|C7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Bbmaj7|Ebmaj7|Ebmaj7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Bbmaj7|C7|C7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Dm7 G7|Cm7 F7|Bbmaj7|Bbmaj7|Dm7 G7|Cm7 F7|Bbmaj7|Cm7 F7",
  },
  {
    name: "These Foolish Things",
    composer: "Strachey/Link/Marvell",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Cm7|Fm7|Bb7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Abmaj7|Dm7b5 G7|Cm7|Fm7 Bb7|" +
      "Am7|D7|Gmaj7|Gmaj7|Abm7|Db7|Gbmaj7|Fm7 Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Gm7 C7|Fm7 Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "This Can't Be Love",
    composer: "Rodgers/Hart",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|Am7 D7|Gmaj7|Am7 D7|Gmaj7|G7|Cmaj7|C#dim7|" +
      "Am7|D7|Bm7|E7|Am7|D7|Gmaj7|Gmaj7|" +
      "Gmaj7|Am7 D7|Gmaj7|Am7 D7|Gmaj7|G7|Cmaj7|C#dim7|" +
      "Am7|D7|Bm7 E7|Am7 D7|Gmaj7|Gmaj7|Am7 D7|Gmaj7",
  },
  {
    name: "Time After Time",
    composer: "Jule Styne",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Am7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Em7|Am7|D7|Dm7 G7|Cmaj7|Cmaj7|Dm7|G7|" +
      "Cmaj7|Am7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Em7|Am7|Dm7|G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Too Late Now",
    composer: "Burton Lane",
    key: "Bb",
    difficulty: 2,
    chart:
      "Bbmaj7|Bbmaj7|Gm7|Gm7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Ebmaj7|Ebm7|Dm7|G7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Bbmaj7|Gm7|Gm7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Ebmaj7|Ebm7|Dm7 G7|Cm7 F7|Bbmaj7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Triste",
    composer: "Tom Jobim",
    key: "F",
    difficulty: 3,
    chart:
      "Fmaj7|Fmaj7|Bm7b5|E7|Am7|Am7|Bbm7|Eb7|" +
      "Fmaj7|Fmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Em7b5|A7|" +
      "Dm7|Dm7|Dm7|Dm7|Bm7b5|E7|Am7|Am7|" +
      "Gm7|C7|Fmaj7|Dm7|Gm7|C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Undecided",
    composer: "Charlie Shavers",
    key: "C",
    difficulty: 2,
    chart:
      "Cmaj7|Cmaj7|D7|D7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Cmaj7|D7|D7|Dm7|G7|Cmaj7|Cmaj7|" +
      "E7|E7|A7|A7|D7|D7|G7|G7|" +
      "Cmaj7|Cmaj7|D7|D7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Unforgettable",
    composer: "Irving Gordon",
    key: "G",
    difficulty: 1,
    chart:
      "Gmaj7|Gmaj7|Gdim7|Gdim7|Am7|Am7|D7|D7|" +
      "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Am7|D7|" +
      "Gmaj7|Gmaj7|Gdim7|Gdim7|Am7|Am7|D7|D7|" +
      "Gmaj7|G7|Cmaj7|Cm6|Am7|D7|Gmaj7|Am7 D7",
  },
  {
    name: "Until The Real Thing Comes Along",
    composer: "Chaplin/Cahn",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Fm7|Bb7|" +
      "Gm7|C7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Abm7|Db7|Gbmaj7|Fm7 Bb7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Gm7 C7|Fm7 Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Watch What Happens",
    composer: "Michel Legrand",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|F7|F7|Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|" +
      "Ebmaj7|Ebmaj7|Gm7|C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|Ebmaj7|F7|F7|Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|" +
      "Ebmaj7|Cm7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Wave",
    composer: "Tom Jobim",
    key: "D",
    difficulty: 2,
    chart:
      "Dmaj7|Dmaj7|Bbdim7|Bbdim7|Am7|D7|Gmaj7|Gm6|" +
      "F#m7|B7|F#m7|B7|Em7|A7|Dmaj7|Dmaj7|" +
      "Dm7|G7|Dm7|G7|Cmaj7|Cmaj7|C#dim7|C#dim7|" +
      "Dmaj7|Dmaj7|Em7|A7|Dmaj7|Dmaj7|Em7 A7|Dmaj7",
  },
  {
    name: "What A Wonderful World",
    composer: "Thiele/Weiss",
    key: "F",
    difficulty: 1,
    chart:
      "Fmaj7|Am7|Bbmaj7|Am7|Gm7|F7|Am7|Dm7|" +
      "Bbmaj7|C7|Fmaj7|Fmaj7|Gm7|F7|Gm7|F7|" +
      "Fmaj7|Am7|Bbmaj7|Am7|Gm7|F7|Am7|Dm7|" +
      "Bbmaj7|C7|Fmaj7|Fmaj7|Bbmaj7 C7|Fmaj7|Bbmaj7 C7|Fmaj7",
  },
  {
    name: "What Is This Thing Called Love",
    composer: "Cole Porter",
    key: "C",
    difficulty: 3,
    chart:
      "Gm7b5|C7|Fm7|Fm7|Gm7b5|C7|Fm7|Fm7|" +
      "Dm7b5|G7|Cmaj7|Cmaj7|Dm7b5|G7|Cmaj7|Cmaj7|" +
      "Gm7b5|C7|Fm7|Fm7|Gm7b5|C7|Fm7|Fm7|" +
      "Dm7b5|G7|Cmaj7|Cmaj7|Dm7|G7|Cmaj7|Dm7 G7",
  },
  {
    name: "When I Fall In Love",
    composer: "Victor Young",
    key: "Eb",
    difficulty: 2,
    chart:
      "Ebmaj7|Ebmaj7|Abm7|Db7|Ebmaj7|C7|Fm7|Bb7|" +
      "Gm7|C7|Fm7|Bb7|Ebmaj7|Abmaj7|Fm7 Bb7|Ebmaj7|" +
      "Ebmaj7|Ebmaj7|Abm7|Db7|Ebmaj7|C7|Fm7|Bb7|" +
      "Gm7|C7|Fm7|Bb7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "When Sunny Gets Blue",
    composer: "Marvin Fisher",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Am7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Em7|A7|Dm7|G7|Em7 A7|Dm7 G7|Cmaj7|Cmaj7|" +
      "Fmaj7|Fmaj7|Em7|A7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Am7|Dm7|G7|Em7 A7|Dm7 G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Whisper Not",
    composer: "Benny Golson",
    key: "Cm",
    difficulty: 3,
    chart:
      "Cm7|Cm7|Dm7b5|G7|Cm7|Cm7|Ebm7|Ab7|" +
      "Dbmaj7|Dbmaj7|Dm7b5|G7|Cm7|Cm7|Fm7|Fm7|" +
      "Abmaj7|Abmaj7|Dm7b5|G7|Cm7|Cm7|Ebm7|Ab7|" +
      "Dbmaj7|Dm7b5|G7|G7|Cm7|Cm7|Dm7b5 G7|Cm7",
  },
  {
    name: "Willow Weep For Me",
    composer: "Ann Ronell",
    key: "G",
    difficulty: 2,
    chart:
      "Gmaj7|C7|Gmaj7|C7|Gmaj7|C7|Bm7|Bbdim7|" +
      "Am7|D7|Am7|D7|Gmaj7|Am7|D7|Gmaj7|" +
      "Cm7|F7|Gmaj7|E7|Am7|D7|Bm7|E7|" +
      "Am7|D7|Bm7 E7|Am7 D7|Gmaj7|Am7|D7|Gmaj7",
  },
  {
    name: "Witchcraft",
    composer: "Cy Coleman",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Fmaj7|Abm7|Db7|Fmaj7|Fmaj7|Cm7|F7|" +
      "Bbmaj7|Bbm7|Am7|D7|Gm7|C7|Fmaj7|Fmaj7|" +
      "Fmaj7|Fmaj7|Abm7|Db7|Fmaj7|Fmaj7|Cm7|F7|" +
      "Bbmaj7|Bbm7|Am7 D7|Gm7 C7|Fmaj7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "Yesterdays",
    composer: "Jerome Kern",
    key: "Dm",
    difficulty: 3,
    chart:
      "Dm7|Dm7|Dm7|Dm(maj7)|Dm7|Dm6|Gm7|A7|" +
      "Dm7|Dm7|Dm7|Dm(maj7)|Dm7|Dm6|Em7b5|A7|" +
      "Fmaj7|Fmaj7|Bbmaj7|Bbmaj7|Em7b5|A7|Dm7|Dm7|" +
      "Dm7|Dm7|Gm7|A7|Dm7|Dm7|Em7b5 A7|Dm7",
  },
  {
    name: "You Are The Sunshine Of My Life",
    composer: "Stevie Wonder",
    key: "B",
    difficulty: 1,
    chart:
      "Bmaj7|Bmaj7|C#m7|F#7|Bmaj7|Bmaj7|Em7|A7|" +
      "Dmaj7|Dmaj7|C#m7|F#7|Bmaj7|Bmaj7|C#m7|F#7|" +
      "Bmaj7|Bmaj7|Em7|A7|Dmaj7|Dmaj7|C#m7|F#7|" +
      "Bmaj7|Bmaj7|C#m7 F#7|Bmaj7|C#m7 F#7|Bmaj7|C#m7 F#7|Bmaj7",
  },
  {
    name: "You Don't Know What Love Is",
    composer: "DePaul/Raye",
    key: "Fm",
    difficulty: 3,
    chart:
      "Fm7|Fm7|Bbm7|Eb7|Abmaj7|Abmaj7|Dm7b5|G7|" +
      "Cm7|Cm7|Fm7|Bb7|Ebmaj7|Abmaj7|Dm7b5|G7|" +
      "Cm7|Cm7|Gm7b5|C7|Fm7|Fm7|Dm7b5|G7|" +
      "Cm7|Fm7|Bbm7|Eb7|Abmaj7|Dm7b5|G7|Cm7",
  },
  {
    name: "You Go To My Head",
    composer: "J. Fred Coots",
    key: "Eb",
    difficulty: 3,
    chart:
      "Ebmaj7|Ebmaj7|Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|" +
      "Cmaj7|Cmaj7|Cm7|F7|Bbmaj7|Bbmaj7|Bbm7|Eb7|" +
      "Abmaj7|Dm7b5 G7|Cm7|F7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abmaj7|Dm7b5 G7|Cm7|F7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "You Make Me Feel So Young",
    composer: "Josef Myrow",
    key: "F",
    difficulty: 2,
    chart:
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7 C7|Fmaj7|" +
      "Bbmaj7|Bbm7|Am7|D7|Gm7|Gm7|C7|C7|" +
      "Fmaj7|Dm7|Gm7|C7|Am7 D7|Gm7 C7|Fmaj7|Gm7 C7",
  },
  {
    name: "You Stepped Out Of A Dream",
    composer: "Nacio Herb Brown",
    key: "C",
    difficulty: 3,
    chart:
      "Cmaj7|Cmaj7|Dbmaj7|Dbmaj7|Cmaj7|Cmaj7|Dbmaj7|Dbmaj7|" +
      "Dm7|G7|Em7|Am7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Bbmaj7|Bbmaj7|Bmaj7|Bmaj7|Bbmaj7|Bbmaj7|Bm7|E7|" +
      "Am7|D7|Dm7|G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },

  // ────────────────────────────────────────────────────────────────────────────
  // INTERMEDIATE (difficulty 4-6)
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "Airegin",
    composer: "Sonny Rollins",
    key: "Fm",
    difficulty: 5,
    chart:
      "Fm7|Fm7|Dbmaj7|C7|Fm7|Fm7|Bbm7|Eb7|" +
      "Abmaj7|Db7|Gm7|C7|Fmaj7|Fmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Dm7|G7|Cmaj7|Cm7|Fm7|Bb7|" +
      "Ebmaj7|Abmaj7|Dm7b5|G7|Cm7|Fm7|Gm7b5 C7|Fm7",
  },
  {
    name: "Along Came Betty",
    composer: "Benny Golson",
    key: "Bb",
    difficulty: 5,
    chart:
      "Bbmaj7|Abm7 Db7|Gbmaj7|Em7 A7|Dmaj7|Dm7 G7|Cm7|F7|" +
      "Bbmaj7|Abm7 Db7|Gbmaj7|Em7 A7|Dmaj7|Dm7 G7|Cm7 F7|Bbmaj7|" +
      "Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Abm7 Db7|Gbmaj7|Em7 A7|Dmaj7|Dm7 G7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Blue Daniel",
    composer: "Frank Rosolino",
    key: "F",
    difficulty: 4,
    chart:
      "Fmaj7|Fmaj7|Em7b5|A7|Dm7|Dm7|Dbm7|Gb7|" +
      "Bmaj7|Bm7|E7|Amaj7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Em7b5|A7|Dm7|Dm7|Dbm7|Gb7|" +
      "Bmaj7|Bm7 E7|Amaj7|Am7 D7|Gm7|C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Blue In Green",
    composer: "Miles Davis",
    key: "Dm",
    difficulty: 5,
    chart:
      "Bbmaj7|A7|Dm7|Db7|Cm7|F7|Bbmaj7|A7|Dm7|E7|" +
      "Am7|Dm7",
  },
  {
    name: "Blues For Alice",
    composer: "Charlie Parker",
    key: "F",
    difficulty: 5,
    chart: "Fmaj7|Em7b5 A7|Dm7 G7|Cm7 F7|Bb7|Bbm7 Eb7|Am7|D7|Gm7|C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Boplicity",
    composer: "Miles Davis",
    key: "F",
    difficulty: 5,
    chart:
      "Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|Fmaj7|Bb7|Am7|Abm7 Db7|" +
      "Gm7|C7|Fmaj7|Bbm7 Eb7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|Fmaj7|Bb7|Am7|Abm7 Db7|" +
      "Gm7|C7|Am7 D7|Gm7 C7|Fmaj7|Fmaj7|Gm7 C7|Fmaj7",
  },
  {
    name: "Bolivia",
    composer: "Cedar Walton",
    key: "Eb",
    difficulty: 5,
    chart:
      "Ebmaj7|Ebmaj7|Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|" +
      "Cmaj7|Cmaj7|Cm7|F7|Bbmaj7|Bbmaj7|Bbm7|Eb7|" +
      "Abmaj7|Am7 D7|Gmaj7|Gmaj7|Gm7|C7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Fm7 Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Con Alma",
    composer: "Dizzy Gillespie",
    key: "Eb",
    difficulty: 6,
    chart:
      "Emaj7|Dm7 G7|Cmaj7|Bbm7 Eb7|Abmaj7|F#m7 B7|Emaj7|Fm7 Bb7|" +
      "Emaj7|Dm7 G7|Cmaj7|Bbm7 Eb7|Abmaj7|F#m7 B7|Emaj7|Fm7 Bb7|" +
      "Ebmaj7|Ebmaj7|Ebmaj7|Ebmaj7|Abmaj7|Abmaj7|Fm7|Bb7|" +
      "Emaj7|Dm7 G7|Cmaj7|Bbm7 Eb7|Abmaj7|F#m7 B7|Emaj7|Fm7 Bb7",
  },
  {
    name: "Doxy",
    composer: "Sonny Rollins",
    key: "Bb",
    difficulty: 4,
    chart:
      "Bb7|Ab7|G7|Gb7|F7|F7|Bb7|Bb7|" +
      "Bb7|Ab7|G7|Gb7|F7|F7|Bb7|Bb7|" +
      "Eb7|Eb7|Bb7|Bb7|F7|F7|Bb7|Bb7|" +
      "Bb7|Ab7|G7|Gb7|F7|F7|Bb7|Bb7",
  },
  {
    name: "Falling Grace",
    composer: "Steve Swallow",
    key: "Bb",
    difficulty: 5,
    chart:
      "Bbmaj7|Am7b5 D7|Gm7|Gbmaj7|Fm7|Bb7|Ebmaj7|Dm7 G7|" +
      "Cm7|F7|Dm7|G7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbmaj7|Am7b5 D7|Gm7|Gbmaj7|Fm7|Bb7|Ebmaj7|Dm7 G7|" +
      "Cm7|F7|Dm7 G7|Cm7 F7|Bbmaj7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Fee Fi Fo Fum",
    composer: "Wayne Shorter",
    key: "Eb",
    difficulty: 6,
    chart:
      "Ebmaj7|D7|Dbmaj7|C7|B7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abm7|Db7|Gbmaj7|B7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Ebmaj7|D7|Dbmaj7|C7|B7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abm7|Db7|Gbmaj7|Fm7 Bb7|Ebmaj7|Ebmaj7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Groovin High",
    composer: "Dizzy Gillespie",
    key: "Eb",
    difficulty: 5,
    chart:
      "Ebmaj7|Am7 D7|Ebmaj7|Gm7 C7|Fm7|Fm7|Am7|D7|" +
      "Ebmaj7|Am7 D7|Ebmaj7|Gm7 C7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|C7|C7|Fm7|Bb7|" +
      "Ebmaj7|Am7 D7|Ebmaj7|Gm7 C7|Fm7|Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Half Nelson",
    composer: "Miles Davis",
    key: "C",
    difficulty: 5,
    chart:
      "Cmaj7|Fm7 Bb7|Cmaj7|Abm7 Db7|Cmaj7|Ebm7 Ab7|Dm7|G7|" +
      "Cmaj7|Fm7 Bb7|Cmaj7|Abm7 Db7|Cmaj7|Ebm7 Ab7|Dm7 G7|Cmaj7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|Ebmaj7|Dm7 G7|" +
      "Cmaj7|Fm7 Bb7|Cmaj7|Abm7 Db7|Cmaj7|Ebm7 Ab7|Dm7 G7|Cmaj7",
  },
  {
    name: "Hot House",
    composer: "Tadd Dameron",
    key: "Eb",
    difficulty: 5,
    chart:
      "Gm7b5|C7|Fm7|Fm7|Gm7b5|C7|Fm7|Fm7|" +
      "Dm7b5|G7|Cmaj7|Cmaj7|Dm7b5|G7|Cmaj7|Cmaj7|" +
      "Gm7b5|C7|Fm7|Fm7|Gm7b5|C7|Fm7|Fm7|" +
      "Dm7b5|G7|Cmaj7|Am7|Dm7|G7|Cmaj7|Cmaj7",
  },
  {
    name: "I Mean You",
    composer: "Thelonious Monk",
    key: "F",
    difficulty: 5,
    chart:
      "Fmaj7|Fmaj7|Db7|C7|Fmaj7|Fmaj7|Db7|C7|" +
      "Bb7|Bb7|Fmaj7|D7|Gm7|C7|Fmaj7|Gm7 C7|" +
      "Bbm7|Eb7|Abmaj7|Abmaj7|Abm7|Db7|Gbmaj7|Gm7 C7|" +
      "Fmaj7|Fmaj7|Db7|C7|Bb7|Gm7|C7|Fmaj7",
  },
  {
    name: "In Walked Bud",
    composer: "Thelonious Monk",
    key: "Fm",
    difficulty: 4,
    chart:
      "Fm7|Fm7|Fm7|Fm7|Bbm7|Bbm7|Fm7|Fm7|" +
      "Gm7b5|C7|Fm7|Gm7b5 C7|Fm7|Fm7|Fm7|Fm7|" +
      "Ab7|Ab7|Db7|Db7|Gb7|Gb7|C7|C7|" +
      "Fm7|Fm7|Fm7|Fm7|Gm7b5|C7|Fm7|Gm7b5 C7",
  },
  {
    name: "Inner Urge",
    composer: "Joe Henderson",
    key: "F#m",
    difficulty: 6,
    chart:
      "F#maj7|F#maj7|F#maj7|F#maj7|Fmaj7|Fmaj7|Fmaj7|Fmaj7|" +
      "Emaj7|Emaj7|Emaj7|Emaj7|Ebmaj7|Ebmaj7|Ebmaj7|Ebmaj7|" +
      "Dmaj7|Dmaj7|Dbmaj7|Dbmaj7|Cmaj7|Cmaj7|Bmaj7|Bmaj7|" +
      "Bbmaj7|Bbmaj7|Amaj7|Amaj7|Abmaj7|Abmaj7|F#maj7|F#maj7",
  },
  {
    name: "Israel",
    composer: "John Carisi",
    key: "Dm",
    difficulty: 5,
    chart: "Dm7|Dm7|Dm7|Dm7|Gm7|Gm7|Dm7|Dm7|Bbmaj7|A7|Dm7|A7|Dm7|Gm7|A7|Dm7",
  },
  {
    name: "Jordu",
    composer: "Duke Jordan",
    key: "Bb",
    difficulty: 4,
    chart:
      "Cm7|F7|Bbmaj7|Bbmaj7|Dbm7|Gb7|Bmaj7|Bmaj7|" +
      "Dm7|G7|Cmaj7|Cmaj7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Fm7|Fm7|Dm7b5|G7|Cm7|Cm7|Cm7|F7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Dbm7 Gb7|Bmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Nica's Dream",
    composer: "Horace Silver",
    key: "Bbm",
    difficulty: 5,
    chart:
      "Bbm7|Bbm7|Gb7|F7|Bbm7|Bbm7|Gb7|F7|" +
      "Bbm7|Bbm7|Gb7|F7|Bbm7|Cm7b5 F7|Bbm7|Bbm7|" +
      "Dbmaj7|Dbmaj7|Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|" +
      "Cmaj7|Cm7|F7|F7|Bbm7|Gb7|F7|Bbm7",
  },
  {
    name: "Night Dreamer",
    composer: "Wayne Shorter",
    key: "Gm",
    difficulty: 5,
    chart:
      "Gm7|Gm7|Gm7|Gm7|Bbmaj7|Am7b5 D7|Gm7|Gm7|" +
      "Abmaj7|Abmaj7|Gbmaj7|Gbmaj7|Gm7|Gm7|Gm7|Gm7|" +
      "Gm7|Gm7|Gm7|Gm7|Bbmaj7|Am7b5 D7|Gm7|Gm7|" +
      "Abmaj7|Abmaj7|Gbmaj7|Gbmaj7|Gm7|Gm7|Am7b5 D7|Gm7",
  },
  {
    name: "Nefertiti",
    composer: "Wayne Shorter",
    key: "Bb",
    difficulty: 6,
    chart:
      "Bbmaj7|Abmaj7|Amaj7|Abmaj7|Gmaj7|Gbmaj7|Fmaj7|Emaj7|" +
      "Ebmaj7|Abmaj7|Bbmaj7|Amaj7|Abmaj7|Gmaj7|Gbmaj7|Fmaj7|" +
      "Bbmaj7|Abmaj7|Amaj7|Abmaj7|Gmaj7|Gbmaj7|Fmaj7|Emaj7|" +
      "Ebmaj7|Abmaj7|Bbmaj7|Amaj7|Abmaj7|Gmaj7|Gbmaj7|Bbmaj7",
  },
  {
    name: "Nostalgia In Times Square",
    composer: "Charles Mingus",
    key: "Bb",
    difficulty: 5,
    chart:
      "Bb7|Eb7|Bb7|Bb7|Eb7|Eb7|Bb7|Dm7 G7|" +
      "Cm7|F7|Bb7|Cm7 F7",
  },
  {
    name: "Pent Up House",
    composer: "Sonny Rollins",
    key: "G",
    difficulty: 4,
    chart:
      "Gmaj7|Gmaj7|Am7|D7|Gmaj7|Gmaj7|Am7|D7|" +
      "Bm7|E7|Am7|D7|Gmaj7|Gmaj7|Am7|D7|" +
      "Bm7|E7|Am7|D7|Gmaj7|Gmaj7|Am7|D7|" +
      "Bm7|E7|Am7 D7|Gmaj7|Am7 D7|Gmaj7|Am7 D7|Gmaj7",
  },
  {
    name: "Recorda Me",
    composer: "Joe Henderson",
    key: "Am",
    difficulty: 4,
    chart:
      "Am7|Am7|Am7|Am7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bm7|E7|Amaj7|Amaj7|Am7|Am7|Am7|Am7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Bm7|E7|Amaj7|Amaj7|" +
      "Am7|Am7|Am7|Am7|Cm7 F7|Bbmaj7|Bm7 E7|Amaj7",
  },
  {
    name: "Ruby My Dear",
    composer: "Thelonious Monk",
    key: "F",
    difficulty: 6,
    chart:
      "Fmaj7|Em7 Eb7|Dm7 Dbmaj7|Cm7 B7|Bbm7|Am7 Abmaj7|Gm7|Gbmaj7|" +
      "Fm7|Bb7|Ebmaj7|Ab7|Dbmaj7|Gm7 C7|Fmaj7|Gm7 C7|" +
      "Fmaj7|Em7 Eb7|Dm7 Dbmaj7|Cm7 B7|Bbm7|Am7 Abmaj7|Gm7|Gbmaj7|" +
      "Fm7|Bb7|Ebmaj7|Ab7|Dbmaj7|Gm7 C7|Fmaj7|Fmaj7",
  },
  {
    name: "Seven Steps To Heaven",
    composer: "Miles Davis",
    key: "F",
    difficulty: 5,
    chart:
      "Fmaj7|Em7b5 A7|Dm7|Dbm7 Gb7|Bmaj7|Bbm7 Eb7|Abmaj7|Gm7 C7|" +
      "Fmaj7|Em7b5 A7|Dm7|Dbm7 Gb7|Bmaj7|Bbm7 Eb7|Abmaj7|Gm7 C7|" +
      "Am7|D7|Gm7|C7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Em7b5 A7|Dm7|Dbm7 Gb7|Bmaj7|Bbm7 Eb7|Gm7 C7|Fmaj7",
  },
  {
    name: "Stablemates",
    composer: "Benny Golson",
    key: "Db",
    difficulty: 5,
    chart:
      "Dbmaj7|Dbmaj7|Dm7 G7|Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|" +
      "Abm7 Db7|Gbmaj7|Am7 D7|Abm7 Db7|Gbmaj7|Fm7|Bb7|Ebm7 Ab7|" +
      "Dbmaj7|Dbmaj7|Dm7 G7|Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|" +
      "Abm7 Db7|Gbmaj7|Fm7 Bb7|Ebm7 Ab7|Dbmaj7|Dbmaj7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "Stolen Moments",
    composer: "Oliver Nelson",
    key: "Cm",
    difficulty: 4,
    chart:
      "Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|Cm7|Cm7|" +
      "Dm7b5|Ebm7|Em7|Fm7|F#m7|Fm7|Em7|Ebm7|" +
      "Dm7b5|G7|Cm7|Cm7|Cm7|Cm7|Cm7|Cm7|" +
      "Fm7|Fm7|Cm7|Cm7|Dm7b5|G7|Cm7|Cm7",
  },
  {
    name: "Straight No Chaser",
    composer: "Thelonious Monk",
    key: "Bb",
    difficulty: 4,
    chart: "Bb7|Eb7|Bb7|Bb7|Eb7|Eb7|Bb7|Bb7|F7|Eb7|Bb7|F7",
  },
  {
    name: "Sugar",
    composer: "Stanley Turrentine",
    key: "Cm",
    difficulty: 4,
    chart:
      "Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|Cm7|Cm7|" +
      "Abmaj7|G7|Cm7|G7|Cm7|Cm7|Cm7|Cm7|" +
      "Fm7|Fm7|Cm7|Cm7|Abmaj7|G7|Cm7|G7|" +
      "Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|Cm7|G7",
  },
  {
    name: "Tiny Capers",
    composer: "Clifford Brown",
    key: "Bb",
    difficulty: 5,
    chart:
      "Bbmaj7|Gm7|Cm7|F7|Bbmaj7|G7|Cm7|F7|" +
      "Bbmaj7|Bb7|Ebmaj7|Ebm7|Dm7|G7|Cm7|F7|" +
      "D7|D7|G7|G7|C7|C7|F7|F7|" +
      "Bbmaj7|Gm7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Unity",
    composer: "Larry Young",
    key: "Db",
    difficulty: 5,
    chart:
      "Dbmaj7|Dbmaj7|Dmaj7|Dmaj7|Ebmaj7|Ebmaj7|Emaj7|Emaj7|" +
      "Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|Gmaj7|Gmaj7|Abmaj7|Abmaj7|" +
      "Dbmaj7|Dbmaj7|Dmaj7|Dmaj7|Ebmaj7|Ebmaj7|Emaj7|Emaj7|" +
      "Fmaj7|Gbmaj7|Gmaj7|Abmaj7|Dbmaj7|Dbmaj7|Dbmaj7|Dbmaj7",
  },
  {
    name: "Very Early",
    composer: "Bill Evans",
    key: "Db",
    difficulty: 6,
    timeSig: "3/4",
    chart:
      "Dbmaj7|Dm7 G7|Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|Gm7 C7|" +
      "Fmaj7|Fm7 Bb7|Ebmaj7|Ebm7 Ab7|Dbmaj7|Dbmaj7|Dbmaj7|Dbmaj7|" +
      "Dm7|G7|Cmaj7|Cmaj7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Bbm7|Eb7|Abmaj7|Gm7 C7|Fmaj7|Fm7 Bb7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "Waltz For Debby",
    composer: "Bill Evans",
    key: "F",
    difficulty: 5,
    timeSig: "3/4",
    chart:
      "Fmaj7|Dm7|Gm7|C7|Am7|Dm7|Gm7|C7|" +
      "Am7|Dm7|Gm7|C7|Fmaj7|Bbmaj7|Em7b5|A7|" +
      "Dm7|Gm7|C7|Fmaj7|Bbmaj7|Em7b5|A7|Dm7|" +
      "Gm7|C7|Fmaj7|Dm7|Gm7|C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Well You Needn't",
    composer: "Thelonious Monk",
    key: "F",
    difficulty: 4,
    chart:
      "F7|F7|Gb7|Gb7|F7|F7|Gb7|Gb7|" +
      "F7|F7|Gb7|Gb7|F7|F7|Gb7|Gb7|" +
      "Ab7|Ab7|G7|G7|Gb7|Gb7|F7|F7|" +
      "F7|F7|Gb7|Gb7|F7|F7|Gb7 F7|F7",
  },
  {
    name: "Windows",
    composer: "Chick Corea",
    key: "Bb",
    difficulty: 6,
    chart:
      "Bbmaj7|Ebmaj7|Dm7|Cm7|Bbmaj7|Abmaj7|Gm7|Fmaj7|" +
      "Ebmaj7|Dm7|Cm7|Bbmaj7|Am7b5|D7|Gm7|Cm7 F7|" +
      "Bbmaj7|Ebmaj7|Dm7|Cm7|Bbmaj7|Abmaj7|Gm7|Fmaj7|" +
      "Ebmaj7|Dm7|Cm7 F7|Bbmaj7|Am7b5 D7|Gm7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Witch Hunt",
    composer: "Wayne Shorter",
    key: "Eb",
    difficulty: 6,
    chart:
      "Ebm7|Ebm7|E7|E7|Ebm7|Ebm7|Abm7|Db7|" +
      "Gbmaj7|Gbmaj7|Abm7|Db7|Gbmaj7|Gbmaj7|Fm7b5|Bb7|" +
      "Ebm7|Ebm7|E7|E7|Ebm7|Ebm7|Abm7|Db7|" +
      "Gbmaj7|Gbmaj7|Fm7b5|Bb7|Ebm7|Ebm7|Fm7b5 Bb7|Ebm7",
  },
  {
    name: "Yardbird Suite",
    composer: "Charlie Parker",
    key: "C",
    difficulty: 4,
    chart:
      "Cmaj7|Cmaj7|Fm7|Bb7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Am7|D7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Cmaj7|Fm7|Bb7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
      "Abmaj7|Abmaj7|Am7|D7|Dm7|G7|Cmaj7|Cmaj7",
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ADVANCED (difficulty 7-10)
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: "26-2",
    composer: "John Coltrane",
    key: "F",
    difficulty: 9,
    chart:
      "Fmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Fmaj7|Abm7 Db7|" +
      "Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Am7|D7|Gm7|C7|" +
      "Fmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Fmaj7|Abm7 Db7|" +
      "Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Gm7|C7|Fmaj7|Gm7 C7",
  },
  {
    name: "Countdown",
    composer: "John Coltrane",
    key: "Eb",
    difficulty: 10,
    chart:
      "Em7 A7|Dmaj7|Dm7 G7|Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|" +
      "Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Gm7 C7|Fmaj7|F#m7 B7|Emaj7|" +
      "Em7 A7|Dmaj7|Dm7 G7|Cmaj7|Cm7 F7|Bbmaj7|Bbm7 Eb7|Abmaj7|" +
      "Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Gm7 C7|Fmaj7|F#m7 B7|Emaj7",
  },
  {
    name: "Dolphin Dance",
    composer: "Herbie Hancock",
    key: "Eb",
    difficulty: 8,
    chart:
      "Ebmaj7|Ebmaj7|Abmaj7|Abmaj7|Am7|D7|Bbm7|Eb7|" +
      "Abmaj7|C7|Fmaj7|Fmaj7|Bbm7|Bbm7|Am7|D7|" +
      "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Cm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7",
  },
  {
    name: "ESP",
    composer: "Wayne Shorter",
    key: "E",
    difficulty: 8,
    chart:
      "Em7|Fmaj7|Em7|Fmaj7|F#m7|Fmaj7|Em7|Em7|" +
      "Dm7|Dbmaj7|Cm7|Bm7|Bbmaj7|Amaj7|Abmaj7|Abmaj7|" +
      "Em7|Fmaj7|Em7|Fmaj7|F#m7|Fmaj7|Em7|Em7|" +
      "Dm7|Dbmaj7|Cm7|Bm7|Bbmaj7|Am7|Em7|Em7",
  },
  {
    name: "Finger Painting",
    composer: "Herbie Hancock",
    key: "Ab",
    difficulty: 8,
    chart:
      "Abmaj7|Abmaj7|Bbm7|Eb7|Abmaj7|Abmaj7|Fm7|Fm7|" +
      "Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cmaj7|Dbmaj7|Dbmaj7|" +
      "Dm7|G7|Cmaj7|Am7|Bbm7|Eb7|Abmaj7|Abmaj7|" +
      "Dbmaj7|Dm7 G7|Cmaj7|Bbm7 Eb7|Abmaj7|Abmaj7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Freedom Jazz Dance",
    composer: "Eddie Harris",
    key: "Bb",
    difficulty: 7,
    chart:
      "Bb7|Bb7|Bb7|Bb7|Bb7|Bb7|Bb7|Bb7|" +
      "Bb7|Bb7|Bb7|Bb7|Bb7|Bb7|Bb7|Bb7|" +
      "Eb7|Eb7|Eb7|Eb7|Bb7|Bb7|Bb7|Bb7|" +
      "Db7|C7|Bb7|Bb7|Bb7|Bb7|Bb7|Bb7",
  },
  {
    name: "Giant Steps",
    composer: "John Coltrane",
    key: "B",
    difficulty: 10,
    chart:
      "Bmaj7|D7|Gmaj7|Bb7|Ebmaj7|Ebmaj7|Am7|D7|" +
      "Gmaj7|Bb7|Ebmaj7|F#7|Bmaj7|Bmaj7|Fm7|Bb7|" +
      "Ebmaj7|Ebmaj7|Am7|D7|Gmaj7|Gmaj7|C#m7|F#7|" +
      "Bmaj7|Bmaj7|Fm7|Bb7|Ebmaj7|C#m7 F#7|Bmaj7|Bmaj7",
  },
  {
    name: "Gloria's Step",
    composer: "Scott LaFaro",
    key: "Dm",
    difficulty: 7,
    timeSig: "3/4",
    chart:
      "Dm7|Dm7|Ebmaj7|Ebmaj7|Abmaj7|Abmaj7|Dbmaj7|Dbmaj7|" +
      "Cm7|F7|Bbmaj7|Bbmaj7|Em7|A7|Dm7|Dm7|" +
      "Dm7|Dm7|Ebmaj7|Ebmaj7|Abmaj7|Abmaj7|Dbmaj7|Dbmaj7|" +
      "Cm7|F7|Bbmaj7|Em7 A7|Dm7|Dm7|Em7 A7|Dm7",
  },
  {
    name: "Isotope",
    composer: "Joe Henderson",
    key: "C",
    difficulty: 7,
    chart: "C7|F7|C7|Gm7 C7|F7|F#dim7|C7|A7|Dm7|G7|C7|Dm7 G7",
  },
  {
    name: "Lazy Bird",
    composer: "John Coltrane",
    key: "Ab",
    difficulty: 8,
    chart:
      "Abmaj7|Abmaj7|Fm7 Bb7|Ebmaj7|Am7 D7|Gmaj7|Cm7 F7|Bbmaj7|" +
      "Bbm7 Eb7|Abmaj7|Am7 D7|Abm7 Db7|Gm7 C7|Fmaj7|Bbm7 Eb7|Abmaj7|" +
      "Dm7|G7|Cmaj7|Cmaj7|Cm7|F7|Bbmaj7|Bbm7 Eb7|" +
      "Abmaj7|Fm7 Bb7|Ebmaj7|Am7 D7|Gm7 C7|Fmaj7|Bbm7 Eb7|Abmaj7",
  },
  {
    name: "Lennie's Pennies",
    composer: "Lennie Tristano",
    key: "C",
    difficulty: 8,
    chart:
      "Cmaj7|Ebm7 Ab7|Dbmaj7|Em7 A7|Dmaj7|Fm7 Bb7|Ebmaj7|Ebmaj7|" +
      "Abm7|Db7|Gbmaj7|Gbmaj7|Dm7|G7|Cmaj7|Cmaj7|" +
      "Cmaj7|Ebm7 Ab7|Dbmaj7|Em7 A7|Dmaj7|Fm7 Bb7|Ebmaj7|Ebmaj7|" +
      "Abm7|Db7|Gbmaj7|Dm7 G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Litha",
    composer: "Chick Corea",
    key: "E",
    difficulty: 8,
    chart:
      "Em7|Em7|Fmaj7|Fmaj7|Em7|Em7|Ebmaj7|Ebmaj7|" +
      "Dm7|Dm7|Dbmaj7|Dbmaj7|Cm7|Cm7|Bmaj7|Bmaj7|" +
      "Bbmaj7|Bbmaj7|Am7|Am7|Abmaj7|Abmaj7|Gm7|Gm7|" +
      "F#m7|F#m7|Fmaj7|Fmaj7|Em7|Em7|Em7|Em7",
  },
  {
    name: "Matrix",
    composer: "Chick Corea",
    key: "Eb",
    difficulty: 7,
    chart:
      "Ebmaj7|Dm7 G7|Cmaj7|Bm7 E7|Amaj7|Abm7 Db7|Gbmaj7|Fm7 Bb7|" +
      "Ebmaj7|Dm7 G7|Cmaj7|Bm7 E7|Amaj7|Abm7 Db7|Gbmaj7|Fm7 Bb7|" +
      "Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Fm7 Bb7|" +
      "Ebmaj7|Dm7 G7|Cmaj7|Bm7 E7|Amaj7|Abm7 Db7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Milestones (New)",
    composer: "Miles Davis",
    key: "Gm",
    difficulty: 7,
    chart:
      "Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|" +
      "Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|" +
      "Am7|Am7|Am7|Am7|Am7|Am7|Am7|Am7|" +
      "Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|Gm7|Gm7",
  },
  {
    name: "Moment's Notice",
    composer: "John Coltrane",
    key: "Eb",
    difficulty: 9,
    chart:
      "Fm7 Bb7|Ebmaj7|Abm7 Db7|Gbmaj7|Fm7 Bb7|Ebmaj7|Abm7 Db7|Gbmaj7|" +
      "Fm7|Bb7|Ebmaj7|Am7 D7|Gmaj7|Cm7 F7|Bbmaj7|Fm7 Bb7|" +
      "Ebmaj7|Abm7 Db7|Gbmaj7|Fm7 Bb7|Ebmaj7|Abm7 Db7|Gbmaj7|Fm7 Bb7|" +
      "Ebmaj7|Am7 D7|Gmaj7|Cm7 F7|Bbmaj7|Fm7 Bb7|Ebmaj7|Fm7 Bb7",
  },
  {
    name: "Mr PC",
    composer: "John Coltrane",
    key: "Cm",
    difficulty: 7,
    chart: "Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|Cm7|Cm7|Ab7|G7|Cm7|G7",
  },
  {
    name: "Nica's Tempo",
    composer: "Gigi Gryce",
    key: "Db",
    difficulty: 7,
    chart:
      "Dbmaj7|Cm7 F7|Bbm7|Am7 D7|Gmaj7|F#m7 B7|Emaj7|Ebm7 Ab7|" +
      "Dbmaj7|Cm7 F7|Bbm7|Am7 D7|Gmaj7|F#m7 B7|Emaj7|Ebm7 Ab7|" +
      "Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cmaj7|Ebm7|Ab7|" +
      "Dbmaj7|Cm7 F7|Bbm7|Am7 D7|Gmaj7|F#m7 B7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "Pannonica",
    composer: "Thelonious Monk",
    key: "Ab",
    difficulty: 7,
    chart:
      "Abmaj7|Gbmaj7|Abmaj7|Gbmaj7|Fm7|Bb7|Ebm7|Ab7|" +
      "Dbmaj7|Cm7 B7|Bbm7|A7|Abmaj7|Gbmaj7|Fm7|Bb7|" +
      "Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cm7 F7|" +
      "Bbm7|Eb7|Abmaj7|Gbmaj7|Fm7|Bbm7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "Passion Dance",
    composer: "McCoy Tyner",
    key: "F",
    difficulty: 8,
    chart:
      "Fmaj7|Fmaj7|Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|Fmaj7|Fmaj7|" +
      "Ebmaj7|Ebmaj7|Fmaj7|Fmaj7|Dbmaj7|Dbmaj7|Fmaj7|Fmaj7|" +
      "Fmaj7|Fmaj7|Fmaj7|Fmaj7|Gbmaj7|Gbmaj7|Fmaj7|Fmaj7|" +
      "Ebmaj7|Dbmaj7|Fmaj7|Fmaj7|Fmaj7|Fmaj7|Fmaj7|Fmaj7",
  },
  {
    name: "Peace",
    composer: "Horace Silver",
    key: "Bb",
    difficulty: 7,
    chart:
      "Bbmaj7|Bbmaj7|Ebmaj7|Ebm7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|Am7b5 D7|Gm7|C7|Cm7|F7|Bbmaj7|Bbmaj7|" +
      "Ebmaj7|Ebm7|Dm7|G7|Cm7|F7|Dm7|G7|" +
      "Cm7|F7|Dm7 G7|Cm7 F7|Bbmaj7|Bbmaj7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Pursuance",
    composer: "John Coltrane",
    key: "Bm",
    difficulty: 9,
    chart: "Bm7|Bm7|Bm7|Bm7|Em7|Em7|Bm7|Bm7|G7|F#7|Bm7|F#7",
  },
  {
    name: "Resolution",
    composer: "John Coltrane",
    key: "Fm",
    difficulty: 9,
    chart:
      "Fm7|Fm7|Fm7|Fm7|Bbm7|Bbm7|Fm7|Fm7|" +
      "Dbmaj7|C7|Fm7|C7|Fm7|Fm7|Fm7|Fm7|" +
      "Bbm7|Bbm7|Fm7|Fm7|Dbmaj7|C7|Fm7|Fm7|" +
      "Fm7|Fm7|Bbm7|Bbm7|Dbmaj7|C7|Fm7|Fm7",
  },
  {
    name: "Satellite",
    composer: "John Coltrane",
    key: "C",
    difficulty: 9,
    chart:
      "Cmaj7|Ebm7 Ab7|Dbmaj7|Em7 A7|Dmaj7|Fm7 Bb7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Dm7 G7|" +
      "Cmaj7|Ebm7 Ab7|Dbmaj7|Em7 A7|Dmaj7|Fm7 Bb7|Ebmaj7|Ebmaj7|" +
      "Am7|D7|Gmaj7|Gm7 C7|Fmaj7|Dm7 G7|Cmaj7|Dm7 G7",
  },
  {
    name: "Search For Peace",
    composer: "McCoy Tyner",
    key: "Eb",
    difficulty: 7,
    chart:
      "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Abmaj7|Gm7|Cm7|" +
      "Fm7|Bb7|Ebmaj7|Ebmaj7|Abmaj7|Abmaj7|Gm7|C7|" +
      "Fm7|Bb7|Gm7|Cm7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abmaj7|Abmaj7|Gm7 C7|Fm7 Bb7|Ebmaj7|Ebmaj7|Fm7 Bb7|Ebmaj7",
  },
  {
    name: "Speak No Evil",
    composer: "Wayne Shorter",
    key: "Cm",
    difficulty: 8,
    chart:
      "Cm7|Cm7|Dbmaj7|Dbmaj7|Cm7|Cm7|Ebm7|Ab7|" +
      "Dbmaj7|Dbmaj7|Dm7b5|G7|Cm7|Cm7|Abmaj7|Abmaj7|" +
      "Dm7b5|G7|Cm7|Abmaj7|Dm7b5|G7|Cm7|Cm7|" +
      "Dbmaj7|Dbmaj7|Dm7b5|G7|Cm7|Cm7|Dm7b5 G7|Cm7",
  },
  {
    name: "Steps",
    composer: "Chick Corea",
    key: "Am",
    difficulty: 7,
    chart:
      "Am7|Am7|Bm7|E7|Am7|Am7|Bm7|E7|" +
      "Am7|Am7|Fmaj7|Fmaj7|Bm7b5|E7|Am7|Am7|" +
      "Dm7|G7|Cmaj7|Cmaj7|Fmaj7|Bm7b5|E7|Am7|" +
      "Am7|Am7|Bm7 E7|Am7|Am7|Am7|Bm7 E7|Am7",
  },
  {
    name: "Stitt's It",
    composer: "Sonny Stitt",
    key: "Bb",
    difficulty: 7,
    chart:
      "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
      "Bbmaj7|G7|Cm7|F7|Fm7|Bb7|Ebmaj7 Ab7|Dm7 G7|" +
      "C7|C7|F7|F7|Bb7|Bb7|Eb7|Eb7|" +
      "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7",
  },
  {
    name: "The Eternal Triangle",
    composer: "Sonny Stitt",
    key: "Bb",
    difficulty: 8,
    chart:
      "Bbmaj7|G7|Cm7|F7|Bbmaj7|G7|Cm7|F7|" +
      "Bbmaj7|G7|Cm7|F7|Fm7|Bb7|Ebmaj7 Ab7|Dm7 G7|" +
      "C7|C7|F7|F7|Bb7|Bb7|Eb7|Eb7|" +
      "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7",
  },
  {
    name: "Tones For Joan's Bones",
    composer: "Chick Corea",
    key: "C",
    difficulty: 8,
    chart:
      "Cmaj7|Cmaj7|Dm7|G7|Cmaj7|Am7|Dm7|G7|" +
      "Fmaj7|Fmaj7|Em7|A7|Dm7|Dm7|Ebmaj7|Ebmaj7|" +
      "Abmaj7|Dbmaj7|Cmaj7|Cmaj7|Bm7|E7|Am7|Am7|" +
      "Dm7|G7|Em7 Am7|Dm7 G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",
  },
  {
    name: "Upper Manhattan Medical Group",
    composer: "Billy Strayhorn",
    key: "Db",
    difficulty: 7,
    chart:
      "Dbmaj7|Dbmaj7|Ebm7|Ab7|Dbmaj7|Bbm7|Ebm7|Ab7|" +
      "Dbmaj7|Db7|Gbmaj7|Gm7 C7|Fmaj7|Gm7|Am7|Bbm7 Eb7|" +
      "Abmaj7|Abmaj7|Bbm7|Eb7|Abmaj7|Fm7|Bbm7|Eb7|" +
      "Dbmaj7|Bbm7|Ebm7|Ab7|Dbmaj7|Bbm7|Ebm7 Ab7|Dbmaj7",
  },
  {
    name: "Woody'n You",
    composer: "Dizzy Gillespie",
    key: "Ab",
    difficulty: 7,
    chart:
      "Abm7 Db7|Gbmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Abmaj7|" +
      "Abm7 Db7|Gbmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Abmaj7|" +
      "Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
      "Abm7 Db7|Gbmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Abmaj7",
  },
];

// ── Time Signature Mapping ─────────────────────────────────────────────────────
// 1 = 4/4, 2 = 3/4, 4 = 6/8, 5 = 12/8
function getTimeSigId(timeSig?: string): number {
  switch (timeSig) {
    case "3/4":
      return 2;
    case "6/8":
      return 4;
    case "12/8":
      return 5;
    default:
      return 1; // 4/4
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // 1. Get existing jazz standards to avoid duplicates
    const { rows: existing } = await pool.query(
      `SELECT name FROM chord_progressions WHERE is_jazz_standard = true`
    );
    const existingNames = new Set(existing.map((r) => (r.name as string).toLowerCase().trim()));

    console.log(`Found ${existingNames.size} existing jazz standards in database.`);
    console.log(`Attempting to insert up to ${ALL_STANDARDS.length} standards...\n`);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (const std of ALL_STANDARDS) {
      // Check for existing entry (case-insensitive)
      if (existingNames.has(std.name.toLowerCase().trim())) {
        skipped++;
        console.log(`  SKIP (exists): ${std.name}`);
        continue;
      }

      const chords = getChords(std);
      const timeSigId = getTimeSigId(std.timeSig);

      try {
        await pool.query(
          `INSERT INTO chord_progressions
            (name, progression_type, chords, key_signature, time_signature_id, genre_id, difficulty_level, is_jazz_standard, composer)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)`,
          [
            std.name,
            "jazz_standard",
            JSON.stringify(chords),
            std.key,
            timeSigId,
            1, // Jazz genre
            std.difficulty,
            true,
            std.composer,
          ]
        );
        inserted++;
        console.log(
          `  INSERT: ${std.name} (${std.key}, difficulty ${std.difficulty}, ${chords.length} chord entries)`
        );
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  FAILED: ${std.name} - ${msg}`);
      }
    }

    // Final counts
    const { rows: finalCount } = await pool.query(
      `SELECT COUNT(*) as total FROM chord_progressions WHERE is_jazz_standard = true`
    );

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Seed Complete!`);
    console.log(`${"=".repeat(60)}`);
    console.log(`  Standards in script: ${ALL_STANDARDS.length}`);
    console.log(`  Inserted:           ${inserted}`);
    console.log(`  Skipped (existing): ${skipped}`);
    console.log(`  Failed:             ${failed}`);
    console.log(`  Total in database:  ${finalCount[0].total}`);
    console.log(`${"=".repeat(60)}`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
