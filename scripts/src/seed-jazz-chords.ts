import pg from "pg";

const { Pool } = pg;

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChordEntry {
  chord: string;
  beats: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP: Record<string,string> = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };

function rootIndex(root: string): number {
  const n = FLAT_TO_SHARP[root] || root;
  const i = CHROMATIC.indexOf(n);
  return i >= 0 ? i : 0;
}

function transpose(root: string, semitones: number): string {
  const idx = rootIndex(root);
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = CHROMATIC[newIdx];
  // Use flats if the original root used flats
  const SHARP_TO_FLAT: Record<string,string> = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
  if (root.includes('b') && SHARP_TO_FLAT[newRoot]) return SHARP_TO_FLAT[newRoot];
  return newRoot;
}

/** Parse a bar notation string like "Dm7 G7" into chord entries (2 beats each if 2 chords, 4 beats if 1) */
function parseBar(bar: string): ChordEntry[] {
  const chords = bar.trim().split(/\s+/);
  if (chords.length === 1) return [{ chord: chords[0], beats: 4 }];
  if (chords.length === 2) return chords.map(c => ({ chord: c, beats: 2 }));
  // 3 or more — divide beats
  const beatsEach = Math.floor(4 / chords.length);
  return chords.map(c => ({ chord: c, beats: beatsEach || 1 }));
}

/** Parse a full chart notation (bars separated by |) */
function parseChart(notation: string): ChordEntry[] {
  return notation.split('|').filter(b => b.trim()).flatMap(parseBar);
}

// ── Known Real Book Chord Progressions ─────────────────────────────────────────
const KNOWN_CHARTS: Record<string, string> = {
  // 8 standards with real chords provided
  "All Of Me":
    "Cmaj7|Cmaj7|E7|E7|A7|A7|Dm7|Dm7|" +
    "Cmaj7|Cmaj7|E7|E7|A7|A7|Dm7|Dm7|" +
    "F6|Fm6|Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cmaj7|Cmaj7|E7|E7|A7|A7|Dm7 G7|Cmaj7",

  "Autumn Leaves":
    "Cm7|F7|Bbmaj7|Ebmaj7|Am7b5|D7|Gm7|Gm7|" +
    "Cm7|F7|Bbmaj7|Ebmaj7|Am7b5|D7|Gm7|Gm7|" +
    "Am7b5|D7|Gm7|Gm7|Cm7|F7|Bbmaj7|Ebmaj7|" +
    "Am7b5|D7|Gm7 Cm7|F7 Bbmaj7|Am7b5|D7|Gm7|Gm7",

  "Blue Bossa":
    "Cm7|Cm7|Fm7|Fm7|Dm7b5|G7|Cm7|Cm7|Ebm7|Ab7|Dbmaj7|Dbmaj7|Dm7b5|G7|Cm7|Dm7b5 G7",

  "So What":
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|" +
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|" +
    "Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|" +
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7",

  "Fly Me To The Moon":
    "Am7|Dm7|G7|Cmaj7|Fmaj7|Bm7b5|E7|Am7 A7|" +
    "Dm7|G7|Cmaj7|A7|Dm7|G7|Cmaj7 Bm7b5|E7|" +
    "Am7|Dm7|G7|Cmaj7|Fmaj7|Bm7b5|E7|Am7 A7|" +
    "Dm7|G7|Em7 A7|Dm7 G7|Cmaj7|Bm7b5 E7|Am7|Dm7 G7",

  "Summertime":
    "Am7|Am7|E7|E7|Am7|Am7|Dm7|E7|Am7|Am7|E7|E7|Am7|Dm7 E7|Am7|Am7",

  "Take The A Train":
    "Cmaj7|Cmaj7|D7|D7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cmaj7|Cmaj7|D7|D7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Fmaj7|Fmaj7|Fmaj7|Fmaj7|D7|D7|Dm7|G7|" +
    "Cmaj7|Cmaj7|D7|D7|Dm7|G7|Cmaj7|Cmaj7",

  "Satin Doll":
    "Dm7|G7|Em7|A7|Am7|D7|Abm7 Db7|Cmaj7|" +
    "Dm7|G7|Em7|A7|Am7|D7|Abm7 Db7|Cmaj7|" +
    "Gm7|C7|Fmaj7|Fmaj7|Am7|D7|Dm7|G7|" +
    "Dm7|G7|Em7|A7|Am7|D7|Abm7 Db7|Cmaj7",

  // Additional well-known standards with real changes
  "C Jam Blues":
    "C7|C7|C7|C7|F7|F7|C7|C7|Dm7|G7|C7|Dm7 G7",

  "Misty":
    "Ebmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Ebmaj7|Cm7|Fm7|Bb7|" +
    "Ebmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7|" +
    "Bbm7|Eb7|Abmaj7|Abmaj7|Am7|D7|Ebmaj7|Bb7|" +
    "Ebmaj7|Bbm7 Eb7|Abmaj7|Abm7 Db7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",

  "It Don't Mean A Thing":
    "Gm7|Gm7|Gm7|D7|Gm7|Gm7|Gm7|D7|" +
    "Gm7|Gm7|Gm7|D7|Gm7|Gm7|Gm7|D7|" +
    "Bbmaj7|Bbmaj7|Am7b5|D7|Gm7|C7|Fm7|Bb7|" +
    "Gm7|Gm7|Gm7|D7|Gm7|Gm7|Gm7|D7",

  "Take Five":
    "Ebm7|Bbm7|Ebm7|Bbm7|Ebm7|Bbm7|Ebm7|Bbm7|" +
    "Ebm7|Bbm7|Ebm7|Bbm7|Ebm7|Bbm7|Ebm7|Bbm7|" +
    "Cbmaj7|Abm7|Bbm7|Ebm7|Cbmaj7|Abm7|Bbm7|Ebm7|" +
    "Ebm7|Bbm7|Ebm7|Bbm7|Ebm7|Bbm7|Ebm7|Bbm7",

  "Now's The Time":
    "F7|F7|F7|F7|Bb7|Bb7|F7|F7|Gm7|C7|F7|Gm7 C7",

  "Freddie Freeloader":
    "Bb7|Bb7|Bb7|Bb7|Eb7|Eb7|Bb7|Bb7|Ab7|G7|Cm7 F7|Bb7",

  "Billie's Bounce":
    "F7|Bb7|F7|Cm7 F7|Bb7|Bdim7|F7|Am7 D7|Gm7|C7|F7 D7|Gm7 C7",

  "Bags' Groove":
    "F7|F7|F7|F7|Bb7|Bb7|F7|F7|Gm7|C7|F7|Gm7 C7",

  "Bye Bye Blackbird":
    "Fmaj7|Fmaj7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|" +
    "Fmaj7|Fmaj7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|" +
    "Fm7|Fm7|Gm7b5|C7|Fm7|Fm7|Gm7b5|C7|" +
    "Fmaj7|Fmaj7|Gm7|C7|Am7 D7|Gm7 C7|Fmaj7|Fmaj7",

  "Perdido":
    "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7|" +
    "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7|" +
    "D7|D7|G7|G7|C7|C7|F7|F7|" +
    "Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Cm7 F7|Bbmaj7|Bbmaj7",

  "I Got Rhythm":
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
    "D7|D7|G7|G7|C7|C7|F7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7",

  "In A Sentimental Mood":
    "Dm7|Dm(maj7)|Dm7|Dm6|Gm7|Gm(maj7)|Gm7|A7|" +
    "Dm7|Dm(maj7)|Dm7|Dm6|Gm7|Gm(maj7)|Gm7 A7|Dm7|" +
    "Dbmaj7|Dbmaj7|Ebm7 Ab7|Dbmaj7|Dmaj7|Dmaj7|Em7 A7|Dmaj7|" +
    "Dm7|Dm(maj7)|Dm7|Dm6|Gm7|Gm(maj7)|Gm7 A7|Dm7",

  "Mood Indigo":
    "Abmaj7|Abmaj7|Bb7|Bb7|Abmaj7|Abmaj7|Abmaj7|Abmaj7|" +
    "Abmaj7|Abmaj7|Bb7|Bb7|Abmaj7|Abmaj7|Abmaj7|Abmaj7|" +
    "Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
    "Abmaj7|Abmaj7|Bb7|Bb7|Abmaj7|Fm7|Bbm7 Eb7|Abmaj7",

  "My Funny Valentine":
    "Cm7|Cm(maj7)|Cm7|Cm6|Abmaj7|Fm7|Dm7b5|G7|" +
    "Cm7|Cm(maj7)|Cm7|Cm6|Abmaj7|Fm7|Dm7b5 G7|Cm7|" +
    "Ebmaj7|Ebmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Abmaj7|Dm7b5 G7|" +
    "Cm7|Cm(maj7)|Cm7|Cm6|Abmaj7|Dm7b5|G7|Cm7",

  "All The Things You Are":
    "Fm7|Bbm7|Eb7|Abmaj7|Dbmaj7|Dm7 G7|Cmaj7|Cmaj7|" +
    "Cm7|Fm7|Bb7|Ebmaj7|Abmaj7|Am7 D7|Gmaj7|Gmaj7|" +
    "Am7|D7|Gmaj7|Gmaj7|F#m7|B7|Emaj7|C7|" +
    "Fm7|Bbm7|Eb7|Abmaj7|Dbmaj7|Dbm7|Cm7|Bdim7|Bbm7|Eb7|Abmaj7|Abmaj7",

  "Stella By Starlight":
    "Em7b5|A7|Cm7|F7|Fm7|Bb7|Ebmaj7|Ab7|" +
    "Bbmaj7|Em7b5 A7|Dm7|Bbm7 Eb7|Fmaj7|Em7b5 A7|Am7b5|D7|" +
    "G7|G7|Cm7|Cm7|Ab7|Ab7|Bbmaj7|Bbmaj7|" +
    "Em7b5|A7|Dm7b5|G7|Cm7b5|F7|Bbmaj7|Bbmaj7",

  "Body And Soul":
    "Ebm7|Bb7|Ebm7|Ebm7|Ebm7|Abm7 Db7|Gbmaj7|Fm7 Bb7|" +
    "Ebm7|Bb7|Ebm7|Gbm7 Cb7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
    "Dmaj7|Em7 A7|Dmaj7|Dm7 G7|Cmaj7|Ebm7 Ab7|Dbmaj7|Fm7 Bb7|" +
    "Ebm7|Bb7|Ebm7|Ebm7|Ebm7|Abm7 Db7|Gbmaj7|Fm7 Bb7",

  "Night And Day":
    "Abmaj7|Abmaj7|G7|G7|Abmaj7|Abmaj7|G7|G7|" +
    "Cmaj7|Cmaj7|Ebdim7|Dm7 G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7|" +
    "Fmaj7|Fm7|Em7|Ebdim7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cmaj7|Cmaj7|Ebdim7|Dm7 G7|Cmaj7|Cmaj7|Dm7 G7|Cmaj7",

  "There Will Never Be Another You":
    "Ebmaj7|Ebmaj7|Dm7b5|G7|Cm7|Cm7|Bbm7|Eb7|" +
    "Abmaj7|Abmaj7|Abm7|Db7|Ebmaj7|Cm7|Fm7|Bb7|" +
    "Ebmaj7|Ebmaj7|Dm7b5|G7|Cm7|Cm7|Bbm7|Eb7|" +
    "Abmaj7|Abmaj7|Abm7|Db7|Ebmaj7|Cm7|Fm7 Bb7|Ebmaj7",

  "How High The Moon":
    "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|" +
    "Ebmaj7|Am7b5 D7|Gmaj7|Am7 D7|Bm7|Bb7|Am7|D7|" +
    "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|" +
    "Ebmaj7|Am7b5 D7|Gmaj7|Am7 D7|Bm7 Bb7|Am7 D7|Gmaj7|Gmaj7",

  "Someday My Prince Will Come":
    "Bbmaj7|D7|Ebmaj7|G7|Cm7|G7|Cm7|F7|" +
    "Dm7|G7|Cm7|F7|Dm7|Dbdim7|Cm7|F7|" +
    "Bbmaj7|D7|Ebmaj7|G7|Cm7|G7|Cm7|F7|" +
    "Dm7|G7|Cm7|F7|Bbmaj7|Bbmaj7|Cm7 F7|Bbmaj7",

  "Impressions":
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|" +
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|" +
    "Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|Ebm7|" +
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7",

  "Footprints":
    "Cm7|Cm7|Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|" +
    "Cm7|Cm7|Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|" +
    "F#m7b5|Fm7|Em7|A7|Dm7b5|G7|Cm7|Cm7|" +
    "Cm7|Cm7|Cm7|Cm7|Cm7|Cm7|Fm7|Fm7",

  "Watermelon Man":
    "F7|F7|F7|F7|F7|F7|F7|F7|" +
    "Bb7|Bb7|F7|F7|C7|Bb7|F7|F7|" +
    "F7|F7|F7|F7|F7|F7|F7|F7|" +
    "Bb7|Bb7|F7|F7|C7|Bb7|F7|F7",

  "Song For My Father":
    "Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|" +
    "Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|" +
    "Db7|C7|Fm7|Fm7|Db7|C7|Fm7|Fm7|" +
    "Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7",

  "Cantaloupe Island":
    "Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|" +
    "Db7|Db7|Db7|Db7|Db7|Db7|Db7|Db7|" +
    "Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|Dm7|" +
    "Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7|Fm7",

  "Giant Steps":
    "Bmaj7|D7|Gmaj7|Bb7|Ebmaj7|Ebmaj7|Am7|D7|" +
    "Gmaj7|Bb7|Ebmaj7|F#7|Bmaj7|Bmaj7|Fm7|Bb7|" +
    "Ebmaj7|Ebmaj7|Am7|D7|Gmaj7|Gmaj7|C#m7|F#7|" +
    "Bmaj7|Bmaj7|Fm7|Bb7|Ebmaj7|C#m7 F#7|Bmaj7|Bmaj7",

  "Confirmation":
    "Fmaj7|Em7b5 A7|Dm7|Cm7 F7|Bb7|Am7 D7|Gm7|C7|" +
    "Fmaj7|Em7b5 A7|Dm7|Cm7 F7|Bb7|Am7 D7|Gm7 C7|Fmaj7|" +
    "Cm7|F7|Bbmaj7|Bbmaj7|Ebm7|Ab7|Dbmaj7|Gm7 C7|" +
    "Fmaj7|Em7b5 A7|Dm7|Cm7 F7|Bb7|Am7 D7|Gm7 C7|Fmaj7",

  "Donna Lee":
    "Abmaj7|F7|Bb7|Bb7|Bbm7|Eb7|Abmaj7|Ebm7 Ab7|" +
    "Dbmaj7|Dbmaj7|Dm7|G7|Cmaj7|Cm7 F7|Bbm7|Eb7|" +
    "Abmaj7|F7|Bb7|Bb7|Bbm7|Eb7|Abmaj7|Ebm7 Ab7|" +
    "Dbmaj7|Dm7 G7|Cm7|F7|Bbm7|Eb7|Abmaj7|Abmaj7",

  "A Night In Tunisia":
    "Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|" +
    "Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|Em7b5 A7|Dm7|" +
    "Am7b5|D7|Gm7|Gm7|Gm7b5|C7|Fmaj7|Em7b5 A7|" +
    "Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|" +
    "Eb7|Dm7|Eb7|Dm7|Eb7|Dm7|Em7b5 A7|Dm7|" +
    "Am7b5|D7|Gm7|Gm7|Gm7b5|C7|Fmaj7|Em7b5 A7",

  "Round Midnight":
    "Ebm7|Ebm7|Ebm7|Dm7b5 G7|Cm7b5|F7|Bbm7|Bbm7|" +
    "Ebm7|Ebm7|Ebm7|Dm7b5 G7|Cm7b5|F7|Bbm7|Bbm7|" +
    "Abm7|Db7|Gbmaj7|Gbmaj7|Abm7|Db7|Gbmaj7|Cm7b5 F7|" +
    "Ebm7|Ebm7|Ebm7|Dm7b5 G7|Cm7b5|F7|Bbm7|Bbm7",

  "Cherokee":
    "Bbmaj7|Bbmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|Ab7|Ab7|" +
    "Bbmaj7|Bbmaj7|Fm7|Bb7|Ebmaj7|Cm7 F7|Bbmaj7|Bbmaj7|" +
    "C#maj7|C#maj7|B7|B7|Amaj7|Amaj7|G7|G7|" +
    "Bbmaj7|Bbmaj7|Fm7|Bb7|Ebmaj7|Cm7 F7|Bbmaj7|Bbmaj7",

  "Tenor Madness":
    "Bb7|Bb7|Bb7|Bb7|Eb7|Eb7|Bb7|Bb7|Cm7|F7|Bb7|Cm7 F7",

  "Blue Monk":
    "Bb7|Bb7|Bb7|Bb7|Eb7|Eb7|Bb7|Bb7|F7|Eb7|Bb7|F7",

  "Straight No Chaser":
    "Bb7|Eb7|Bb7|Bb7|Eb7|Eb7|Bb7|Bb7|F7|Eb7|Bb7|F7",

  "Tune Up":
    "Em7|A7|Dmaj7|Dmaj7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cm7|F7|Bbmaj7|Bbmaj7|Em7b5|A7|Dm7|Dm7|" +
    "Em7|A7|Dmaj7|Dmaj7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cm7|F7|Bbmaj7|Bbmaj7|Em7b5|A7|Dm7|Dm7",

  "Oleo":
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
    "D7|D7|G7|G7|C7|C7|F7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7 F7|Bbmaj7",

  "Maiden Voyage":
    "D7sus4|D7sus4|D7sus4|D7sus4|F7sus4|F7sus4|F7sus4|F7sus4|" +
    "D7sus4|D7sus4|D7sus4|D7sus4|F7sus4|F7sus4|F7sus4|F7sus4|" +
    "Eb7sus4|Eb7sus4|Eb7sus4|Eb7sus4|Db7sus4|Db7sus4|Db7sus4|Db7sus4|" +
    "D7sus4|D7sus4|D7sus4|D7sus4|F7sus4|F7sus4|F7sus4|F7sus4",

  "Well You Needn't":
    "F7|F7|Gb7|Gb7|F7|F7|Gb7|Gb7|" +
    "F7|F7|Gb7|Gb7|F7|F7|Gb7|Gb7|" +
    "Ab7|Ab7|G7|G7|Gb7|Gb7|F7|F7|" +
    "F7|F7|Gb7|Gb7|F7|F7|Gb7 F7|F7",

  "Rhythm-a-ning":
    "Bbmaj7|G7|Cm7|F7|Bbmaj7|G7|Cm7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Bbmaj7|G7|Cm7 F7|Bbmaj7|" +
    "D7|D7|G7|G7|C7|C7|F7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Bbmaj7|G7|Cm7 F7|Bbmaj7",

  "Epistrophy":
    "D7 Eb7|D7 Eb7|D7 Eb7|D7 Eb7|Db7 D7|Db7 D7|D7 Eb7|D7 Eb7|" +
    "D7 Eb7|D7 Eb7|D7 Eb7|D7 Eb7|Db7 D7|Db7 D7|D7 Eb7|D7 Eb7|" +
    "F#m7|B7|F#m7|B7|Fm7|Bb7|Fm7|Bb7|" +
    "D7 Eb7|D7 Eb7|D7 Eb7|D7 Eb7|Db7 D7|Db7 D7|D7 Eb7|D7 Eb7",

  "St. Thomas":
    "Cmaj7|Cmaj7|Em7|A7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cmaj7|Cmaj7|Em7|A7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Fmaj7|F#dim7|Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cmaj7|Cmaj7|Em7|A7|Dm7|G7|Cmaj7|Cmaj7",

  "Spain":
    "Gmaj7|F#7|Em7|Em7|A7|A7|Dmaj7|Dmaj7|" +
    "Gmaj7|F#7|Em7|Em7|A7|A7|Dmaj7|Dmaj7|" +
    "Gmaj7|F#7|Em7|Em7|A7|A7|Dmaj7|Dmaj7|" +
    "Gmaj7|F#7|Em7|Em7|A7|A7|Dmaj7|Dmaj7|" +
    "Bm7|Bm7|E7|E7|Amaj7|Amaj7|Dmaj7|Dmaj7|" +
    "Gmaj7|Gmaj7|C#m7b5|F#7|Bmaj7|Bmaj7|Bmaj7|Bmaj7",

  "The Girl From Ipanema":
    "Fmaj7|Fmaj7|G7|G7|Gm7|Gb7|Fmaj7|Fmaj7|" +
    "Fmaj7|Fmaj7|G7|G7|Gm7|Gb7|Fmaj7|Fmaj7|" +
    "Gbmaj7|Gbmaj7|B7|B7|F#m7|F#m7|D7|D7|" +
    "Gm7|Gm7|Eb7|Eb7|Am7|D7|Gm7 C7|Fmaj7",

  "Desafinado":
    "Fmaj7|Fmaj7|G7|G7|Gm7|C7|Fmaj7|Fmaj7|" +
    "Fmaj7|Fmaj7|G7b5|G7b5|Gm7|C7|Fmaj7|Fmaj7|" +
    "Bbmaj7|Bbm7|Am7|D7|Gmaj7|Gm7|Fmaj7|E7|" +
    "Am7|Am7|D7|D7|Gm7|A7|Dm7|Gm7 C7",

  "Wave":
    "Dmaj7|Dmaj7|Bbdim7|Bbdim7|Am7|D7|Gmaj7|Gm6|" +
    "F#m7|B7|F#m7|B7|Em7|A7|Dmaj7|Dmaj7|" +
    "Dm7|G7|Dm7|G7|Cmaj7|Cmaj7|C#dim7|C#dim7|" +
    "Dmaj7|Dmaj7|Em7|A7|Dmaj7|Dmaj7|Em7 A7|Dmaj7",

  "Naima":
    "Ebmaj7/Bb|Ebmaj7/Bb|Amaj7/Bb|Amaj7/Bb|Ebmaj7/Bb|Ebmaj7/Bb|Amaj7/Bb|Amaj7/Bb|" +
    "Ebmaj7/Bb|Ebmaj7/Bb|Amaj7/Bb|Amaj7/Bb|Ebmaj7/Bb|Ebmaj7/Bb|Amaj7/Bb|Amaj7/Bb|" +
    "Bmaj7|Bmaj7|Bmaj7|Bmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|" +
    "Ebmaj7/Bb|Ebmaj7/Bb|Amaj7/Bb|Amaj7/Bb|Ebmaj7/Bb|Ebmaj7/Bb|Amaj7/Bb|Amaj7/Bb",

  "Caravan":
    "C7|C7|C7|C7|C7|C7|C7|C7|" +
    "C7|C7|C7|C7|C7|C7|C7|C7|" +
    "Fmaj7|Fmaj7|Fmaj7|Fmaj7|Bb7|Bb7|Bb7|Bb7|" +
    "C7|C7|C7|C7|C7|C7|C7|C7",

  "Honeysuckle Rose":
    "Gm7|C7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|" +
    "Gm7|C7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7|" +
    "F7|F7|Bb7|Bb7|G7|G7|C7|C7|" +
    "Gm7|C7|Gm7|C7|Gm7|C7|Fmaj7|Fmaj7",

  "Scrapple From The Apple":
    "Fmaj7|Em7b5 A7|Dm7|G7|Cm7|F7|Bbmaj7|Gm7 C7|" +
    "Fmaj7|Em7b5 A7|Dm7|G7|Cm7|F7|Bbmaj7|Gm7 C7|" +
    "Bbm7|Eb7|Abmaj7|Abmaj7|Abm7|Db7|Gbmaj7|Gm7 C7|" +
    "Fmaj7|Em7b5 A7|Dm7|G7|Cm7|F7|Bbmaj7|Gm7 C7",

  "Ornithology":
    "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|" +
    "Ebmaj7|Am7 D7|Gmaj7|Gmaj7|Am7|D7|Gmaj7|Gmaj7|" +
    "Gmaj7|Gmaj7|Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|" +
    "Ebmaj7|Am7 D7|Gmaj7|Am7 D7|Bm7 Bb7|Am7 D7|Gmaj7|Gmaj7",

  "Anthropology":
    "Bbmaj7|G7|Cm7|F7|Dm7|G7|Cm7|F7|" +
    "Bbmaj7|G7|Cm7|F7|Fm7|Bb7|Ebmaj7 Ab7|Dm7 G7|" +
    "C7|C7|F7|F7|Bb7|Bb7|Eb7|Eb7|" +
    "Bbmaj7|G7|Cm7|F7|Fm7|Bb7|Cm7 F7|Bbmaj7",

  "Yardbird Suite":
    "Cmaj7|Cmaj7|Fm7|Bb7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
    "Abmaj7|Abmaj7|Am7|D7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cmaj7|Cmaj7|Fm7|Bb7|Cmaj7|Cmaj7|Bbm7|Eb7|" +
    "Abmaj7|Abmaj7|Am7|D7|Dm7|G7|Cmaj7|Cmaj7",

  "Dig":
    "Dm7|Dm7|Dm7|Dm7|Gm7|Gm7|Dm7|Dm7|Em7b5|A7|Dm7|Em7b5 A7",

  "Lush Life":
    "Dbmaj7|Gbmaj7|Dbmaj7|Gbmaj7|Dm7|G7|Dbmaj7|Dbmaj7|" +
    "Bbm7|Ebm7|Ab7|Dbmaj7|Dm7|G7|Cmaj7|Cmaj7|" +
    "Cm7|Fm7|Bb7|Ebmaj7|Abmaj7|Dm7 G7|Cmaj7|Cmaj7|" +
    "Cm7|F7|Bbmaj7|Bbmaj7|Bbm7|Eb7|Abmaj7|Dbmaj7",

  "I'll Remember April":
    "Gmaj7|Gmaj7|Gmaj7|Gmaj7|Gm7|Gm7|Gm7|Gm7|" +
    "Am7|D7|Gmaj7|Gmaj7|F#m7b5|B7|Em7|Am7 D7|" +
    "Cm7|F7|Bbmaj7|Bbmaj7|Bm7|E7|Amaj7|Amaj7|" +
    "Am7|D7|Gmaj7|Gmaj7|F#m7b5|B7|Em7 Am7|D7 Gmaj7",

  "Manteca":
    "Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|" +
    "Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|Bbmaj7|" +
    "Ebmaj7|Ebmaj7|Edim7|Edim7|Bbmaj7|Bbmaj7|Dm7|G7|" +
    "Cm7|F7|Bbmaj7|Bbmaj7|Cm7|F7|Bbmaj7|Bbmaj7",

  "Woody'n You":
    "Abm7 Db7|Gbmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Abmaj7|" +
    "Abm7 Db7|Gbmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Abmaj7|" +
    "Gm7|C7|Fmaj7|Fmaj7|Fm7|Bb7|Ebmaj7|Ebmaj7|" +
    "Abm7 Db7|Gbmaj7|Abm7 Db7|Gbmaj7|Am7 D7|Gmaj7|Bbm7 Eb7|Abmaj7",
};

// ── Generate progressions for standards without known charts ───────────────────

function getKeyRoot(key: string): string {
  // Strip minor indication
  return key.replace(/m$/, '');
}

function isMinorKey(key: string): boolean {
  return key.endsWith('m');
}

/** Generate a standard 12-bar blues in the given key */
function generateBlues12(key: string): string {
  const root = getKeyRoot(key);
  const minor = isMinorKey(key);
  const ri = rootIndex(root);

  if (minor) {
    // Minor blues
    const i   = root + 'm7';
    const iv  = transpose(root, 5) + 'm7';
    const v   = transpose(root, 7) + '7';
    const bvi = transpose(root, 8) + '7';
    return `${i}|${i}|${i}|${i}|${iv}|${iv}|${i}|${i}|${bvi}|${v}|${i}|${v}`;
  } else {
    const I  = root + '7';
    const IV = transpose(root, 5) + '7';
    const ii = transpose(root, 2) + 'm7';
    const V  = transpose(root, 7) + '7';
    return `${I}|${I}|${I}|${I}|${IV}|${IV}|${I}|${I}|${ii}|${V}|${I}|${ii} ${V}`;
  }
}

/** Generate a 16-bar form */
function generate16Bar(key: string): string {
  const root = getKeyRoot(key);
  const minor = isMinorKey(key);
  const ri = rootIndex(root);

  if (minor) {
    const im  = root + 'm7';
    const ivm = transpose(root, 5) + 'm7';
    const V   = transpose(root, 7) + '7';
    const bIII = transpose(root, 3) + 'maj7';
    const bVI = transpose(root, 8) + 'maj7';
    const bVII = transpose(root, 10) + '7';
    const iib5 = transpose(root, 2) + 'm7b5';
    return `${im}|${im}|${ivm}|${ivm}|${iib5}|${V}|${im}|${im}|${bIII}|${bVI}|${bVII}|${bVII}|${iib5}|${V}|${im}|${im}`;
  } else {
    const I   = root + 'maj7';
    const ii  = transpose(root, 2) + 'm7';
    const V   = transpose(root, 7) + '7';
    const IV  = transpose(root, 5) + 'maj7';
    const iii = transpose(root, 4) + 'm7';
    const vi  = transpose(root, 9) + 'm7';
    return `${I}|${I}|${ii}|${V}|${I}|${I}|${IV}|${IV}|${iii}|${vi}|${ii}|${V}|${I}|${vi}|${ii} ${V}|${I}`;
  }
}

/** Generate a 32-bar AABA in the given key */
function generateAABA32(key: string): string {
  const root = getKeyRoot(key);
  const minor = isMinorKey(key);

  if (minor) {
    const im   = root + 'm7';
    const ivm  = transpose(root, 5) + 'm7';
    const V    = transpose(root, 7) + '7';
    const bIII = transpose(root, 3) + 'maj7';
    const bVI  = transpose(root, 8) + 'maj7';
    const bVII = transpose(root, 10) + '7';
    const iib5 = transpose(root, 2) + 'm7b5';

    const A = `${im}|${im}|${ivm}|${ivm}|${iib5}|${V}|${im}|${im}`;
    const B = `${bIII}|${bVI}|${bVII}|${bVII}|${iib5}|${V}|${im}|${im}`;
    return `${A}|${A}|${B}|${A}`;
  } else {
    const I   = root + 'maj7';
    const ii  = transpose(root, 2) + 'm7';
    const V   = transpose(root, 7) + '7';
    const iii = transpose(root, 4) + 'm7';
    const vi  = transpose(root, 9) + 'm7';
    const IV  = transpose(root, 5) + 'maj7';
    const bVII = transpose(root, 10) + '7';
    const IVm = transpose(root, 5) + 'm7';

    const A = `${I}|${I}|${ii}|${V}|${iii}|${vi}|${ii}|${V}`;
    const B = `${IV}|${IVm}|${I}|${vi}|${ii}|${V}|${I}|${I}`;
    return `${A}|${A}|${B}|${A}`;
  }
}

/** Generate an ABAB 32-bar */
function generateABAB32(key: string): string {
  const root = getKeyRoot(key);
  const minor = isMinorKey(key);

  if (minor) {
    const im   = root + 'm7';
    const ivm  = transpose(root, 5) + 'm7';
    const V    = transpose(root, 7) + '7';
    const bIII = transpose(root, 3) + 'maj7';
    const iib5 = transpose(root, 2) + 'm7b5';
    const A = `${im}|${im}|${ivm}|${ivm}|${iib5}|${V}|${im}|${im}`;
    const B = `${bIII}|${bIII}|${iib5}|${V}|${im}|${ivm}|${iib5} ${V}|${im}`;
    return `${A}|${B}|${A}|${B}`;
  } else {
    const I   = root + 'maj7';
    const ii  = transpose(root, 2) + 'm7';
    const V   = transpose(root, 7) + '7';
    const IV  = transpose(root, 5) + 'maj7';
    const vi  = transpose(root, 9) + 'm7';
    const A = `${I}|${I}|${ii}|${V}|${I}|${I}|${ii}|${V}`;
    const B = `${IV}|${IV}|${vi}|${vi}|${ii}|${V}|${I} ${vi}|${ii} ${V}`;
    return `${A}|${B}|${A}|${B}`;
  }
}

/** Generate an ABAC 36-bar */
function generateABAC36(key: string): string {
  const root = getKeyRoot(key);
  const minor = isMinorKey(key);

  if (minor) {
    const im   = root + 'm7';
    const ivm  = transpose(root, 5) + 'm7';
    const V    = transpose(root, 7) + '7';
    const bIII = transpose(root, 3) + 'maj7';
    const iib5 = transpose(root, 2) + 'm7b5';
    const bVI  = transpose(root, 8) + 'maj7';
    const A = `${im}|${im}|${ivm}|${ivm}|${iib5}|${V}|${im}|${im}`;
    const B = `${bIII}|${bVI}|${iib5}|${V}|${im}|${ivm}|${iib5} ${V}|${im}`;
    const C = `${bIII}|${bVI}|${iib5}|${V}|${ivm}|${iib5}|${V}|${im}|${iib5} ${V}|${im}|${im}|${im}`;
    return `${A}|${B}|${A}|${C}`;
  } else {
    const I   = root + 'maj7';
    const ii  = transpose(root, 2) + 'm7';
    const V   = transpose(root, 7) + '7';
    const IV  = transpose(root, 5) + 'maj7';
    const vi  = transpose(root, 9) + 'm7';
    const iii = transpose(root, 4) + 'm7';
    const A = `${I}|${I}|${ii}|${V}|${I}|${I}|${ii}|${V}`;
    const B = `${IV}|${IV}|${iii}|${vi}|${ii}|${V}|${I}|${I}`;
    const C = `${IV}|${IV}|${iii}|${vi}|${ii}|${V}|${I}|${vi}|${ii}|${V}|${I}|${I}`;
    return `${A}|${B}|${A}|${C}`;
  }
}

/** Generate a through-composed 32-bar */
function generateThroughComposed(key: string, bars: number): string {
  const root = getKeyRoot(key);
  const minor = isMinorKey(key);
  const result: string[] = [];

  if (minor) {
    const im   = root + 'm7';
    const ivm  = transpose(root, 5) + 'm7';
    const V    = transpose(root, 7) + '7';
    const bIII = transpose(root, 3) + 'maj7';
    const bVI  = transpose(root, 8) + 'maj7';
    const iib5 = transpose(root, 2) + 'm7b5';
    const pool = [im, im, ivm, V, bIII, bVI, iib5, V, im, im, ivm, ivm, iib5, V, im, im];
    for (let i = 0; i < bars; i++) result.push(pool[i % pool.length]);
  } else {
    const I   = root + 'maj7';
    const ii  = transpose(root, 2) + 'm7';
    const V   = transpose(root, 7) + '7';
    const IV  = transpose(root, 5) + 'maj7';
    const vi  = transpose(root, 9) + 'm7';
    const iii = transpose(root, 4) + 'm7';
    const pool = [I, I, ii, V, iii, vi, ii, V, IV, IV, I, vi, ii, V, I, I];
    for (let i = 0; i < bars; i++) result.push(pool[i % pool.length]);
  }
  return result.join('|');
}

function generateChords(form: string, key: string, bars: number): ChordEntry[] {
  let notation: string;
  if (form === '12-bar blues') {
    notation = generateBlues12(key);
  } else if (bars === 16) {
    notation = generate16Bar(key);
  } else if (form === 'ABAB') {
    notation = generateABAB32(key);
  } else if (form === 'ABAC' && bars === 36) {
    notation = generateABAC36(key);
  } else if (form === 'Through-composed') {
    notation = generateThroughComposed(key, bars);
  } else {
    // Default to AABA 32
    notation = generateAABA32(key);
  }
  return parseChart(notation);
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
    // Fetch all jazz standards
    const { rows } = await pool.query(
      `SELECT id, name, key_signature, progression_type, chords FROM chord_progressions WHERE is_jazz_standard = true ORDER BY name`
    );

    console.log(`Found ${rows.length} jazz standards in database\n`);

    let updatedKnown = 0;
    let updatedGenerated = 0;
    let failed = 0;

    for (const row of rows) {
      const name = row.name as string;
      const key = row.key_signature as string || 'C';
      const form = row.progression_type as string || 'AABA';

      // Check if we have known Real Book changes
      let chords: ChordEntry[];
      let source: string;

      if (KNOWN_CHARTS[name]) {
        chords = parseChart(KNOWN_CHARTS[name]);
        source = 'Real Book';
        updatedKnown++;
      } else {
        // Determine bar count from current chord data
        const currentChords = row.chords as unknown;
        let bars = 32;
        if (Array.isArray(currentChords) && currentChords.length === 1) {
          const totalBeats = (currentChords[0] as { beats: number }).beats;
          bars = Math.round(totalBeats / 4);
        }
        chords = generateChords(form, key, bars);
        source = 'generated';
        updatedGenerated++;
      }

      try {
        await pool.query(
          `UPDATE chord_progressions SET chords = $1::jsonb WHERE id = $2`,
          [JSON.stringify(chords), row.id]
        );
        console.log(`  [${source}] ${name} (${key}) - ${chords.length} chord entries`);
      } catch (err) {
        console.error(`  FAILED: ${name} - ${err}`);
        failed++;
      }
    }

    console.log(`\nDone!`);
    console.log(`  Known charts: ${updatedKnown}`);
    console.log(`  Generated:    ${updatedGenerated}`);
    console.log(`  Failed:       ${failed}`);
    console.log(`  Total:        ${rows.length}`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
