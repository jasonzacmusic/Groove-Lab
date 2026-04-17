// ABC notation generators for scales and arpeggios
// Self-contained, no external dependencies

// ─── Constants ───────────────────────────────────────────────────────────────

export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const FLAT_NAMES: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};

export const FLAT_KEYS = [
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm',
];

// Instrument ranges with clef info
export const INSTRUMENT_RANGES: Record<string, { low: string; high: string; clef: string }> = {
  piano_treble: { low: 'C4', high: 'C7', clef: 'treble' },
  piano_bass: { low: 'C2', high: 'C5', clef: 'bass' },
  guitar: { low: 'E3', high: 'E6', clef: 'treble' },
  bass_guitar: { low: 'E1', high: 'G4', clef: 'bass' },
  violin: { low: 'G3', high: 'E7', clef: 'treble' },
  cello: { low: 'C2', high: 'A5', clef: 'bass' },
  flute: { low: 'C4', high: 'C7', clef: 'treble' },
  clarinet: { low: 'D3', high: 'Bb6', clef: 'treble' },
  saxophone: { low: 'Bb3', high: 'F#6', clef: 'treble' },
  trumpet: { low: 'F#3', high: 'C6', clef: 'treble' },
};

// ─── Interval Maps ───────────────────────────────────────────────────────────

// Intervals in semitones from root for each scale degree
export const SCALE_INTERVALS: Record<string, number[]> = {
  major:          [0, 2, 4, 5, 7, 9, 11],
  natural_minor:  [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:  [0, 2, 3, 5, 7, 9, 11], // ascending form
  chromatic:      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  blues:          [0, 3, 5, 6, 7, 10],
  whole_tone:     [0, 2, 4, 6, 8, 10],
  dorian:         [0, 2, 3, 5, 7, 9, 10],
  mixolydian:     [0, 2, 4, 5, 7, 9, 10],
  pentatonic:     [0, 2, 4, 7, 9],
};

export const ARPEGGIO_INTERVALS: Record<string, number[]> = {
  major:       [0, 4, 7],
  minor:       [0, 3, 7],
  dominant7:   [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  augmented:   [0, 4, 8],
};

// ─── Internal Helpers ────────────────────────────────────────────────────────

/** Normalize a key name to its root note in sharps (e.g. 'Bb' -> 'A#', 'Ebm' -> 'D#') */
function normalizeKeyRoot(key: string): { root: string; suffix: string } {
  let suffix = '';
  let root = key;
  if (key.endsWith('m') && key.length > 1) {
    suffix = 'm';
    root = key.slice(0, -1);
  }
  // Convert flat names to sharp equivalents for internal indexing
  for (const [sharp, flat] of Object.entries(FLAT_NAMES)) {
    if (root === flat) {
      root = sharp;
      break;
    }
  }
  return { root, suffix };
}

/** Check whether a key should use flat naming */
function usesFlats(key: string): boolean {
  // Check both the original key and common forms
  return FLAT_KEYS.includes(key);
}

/** Get the note name for a given semitone offset from C, respecting flat/sharp preference */
function noteName(semitone: number, preferFlats: boolean): string {
  const idx = ((semitone % 12) + 12) % 12;
  const name = CHROMATIC[idx];
  if (preferFlats && FLAT_NAMES[name]) {
    return FLAT_NAMES[name];
  }
  return name;
}

/** Convert a note name + octave number to ABC notation */
function toAbcPitch(name: string, octave: number): string {
  // Handle accidentals
  let accidental = '';
  let letter = name;

  if (name.includes('#')) {
    accidental = '^';
    letter = name.replace('#', '');
  } else if (name.includes('b') && name.length === 2) {
    accidental = '_';
    letter = name.replace('b', '');
  }

  // ABC octave mapping:
  // C, D, ... B  = octave 4 (middle C area) — uppercase
  // c, d, ... b  = octave 5 — lowercase
  // C,           = octave 3 — uppercase + comma
  // C,,          = octave 2 — uppercase + two commas
  // c'           = octave 6 — lowercase + apostrophe
  // c''          = octave 7 — lowercase + two apostrophes

  if (octave <= 4) {
    // Uppercase range
    const commas = 4 - octave;
    return accidental + letter.toUpperCase() + ','.repeat(commas);
  } else {
    // Lowercase range (octave 5+)
    const ticks = octave - 5;
    return accidental + letter.toLowerCase() + "'".repeat(ticks);
  }
}

/** Convert a note name + octave to Tone.js pitch string like "C4", "Db3" */
function toTonePitch(name: string, octave: number): string {
  return `${name}${octave}`;
}

/** Get the chromatic index of a root note */
function chromaticIndex(root: string): number {
  // Try direct lookup
  let idx = CHROMATIC.indexOf(root);
  if (idx >= 0) return idx;
  // Try flat name
  for (const [sharp, flat] of Object.entries(FLAT_NAMES)) {
    if (root === flat) {
      idx = CHROMATIC.indexOf(sharp);
      if (idx >= 0) return idx;
    }
  }
  return 0; // fallback to C
}

/** Build an array of { name, octave } for a scale ascending over N octaves */
function buildScaleNotes(
  rootName: string,
  intervals: number[],
  octaves: number,
  startOctave: number,
  preferFlats: boolean
): { name: string; octave: number }[] {
  const rootIdx = chromaticIndex(rootName);
  const notes: { name: string; octave: number }[] = [];

  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      const semitone = rootIdx + interval + oct * 12;
      const absSemitone = semitone;
      const noteOctave = startOctave + Math.floor(absSemitone / 12);
      const name = noteName(absSemitone, preferFlats);
      notes.push({ name, octave: noteOctave });
    }
  }

  // Add the final root note at the top
  const topSemitone = rootIdx + octaves * 12;
  const topOctave = startOctave + Math.floor(topSemitone / 12);
  const topName = noteName(topSemitone, preferFlats);
  notes.push({ name: topName, octave: topOctave });

  return notes;
}

/** Build an array of { name, octave } for an arpeggio ascending over N octaves */
function buildArpeggioNotes(
  rootName: string,
  intervals: number[],
  octaves: number,
  startOctave: number,
  preferFlats: boolean
): { name: string; octave: number }[] {
  const rootIdx = chromaticIndex(rootName);
  const notes: { name: string; octave: number }[] = [];

  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      const semitone = rootIdx + interval + oct * 12;
      const noteOctave = startOctave + Math.floor(semitone / 12);
      const name = noteName(semitone, preferFlats);
      notes.push({ name, octave: noteOctave });
    }
  }

  // Add the final root note at the top
  const topSemitone = rootIdx + octaves * 12;
  const topOctave = startOctave + Math.floor(topSemitone / 12);
  const topName = noteName(topSemitone, preferFlats);
  notes.push({ name: topName, octave: topOctave });

  return notes;
}

/** Format notes into ABC body with bar lines every 4 notes */
function formatAbcBody(abcNotes: string[]): string {
  const groups: string[] = [];
  for (let i = 0; i < abcNotes.length; i += 4) {
    const chunk = abcNotes.slice(i, i + 4);
    groups.push(chunk.join(' '));
  }
  return groups.join(' | ') + ' |';
}

/** Get a display-friendly key name */
function displayKey(key: string): string {
  const { root, suffix } = normalizeKeyRoot(key);
  const flatKey = usesFlats(key);
  const displayRoot = flatKey && FLAT_NAMES[root] ? FLAT_NAMES[root] : root;
  return displayRoot + suffix;
}

/** Determine a good start octave based on clef */
function defaultStartOctave(clef?: string): number {
  if (clef === 'bass') return 2;
  return 4; // treble default
}

/** Format scale type for display */
function displayScaleType(type: string): string {
  const names: Record<string, string> = {
    major: 'Major',
    natural_minor: 'Natural Minor',
    harmonic_minor: 'Harmonic Minor',
    melodic_minor: 'Melodic Minor',
    chromatic: 'Chromatic',
    blues: 'Blues',
    whole_tone: 'Whole Tone',
    dorian: 'Dorian',
    mixolydian: 'Mixolydian',
    pentatonic: 'Pentatonic',
  };
  return names[type] || type;
}

/** Format arpeggio type for display */
function displayArpeggioType(type: string): string {
  const names: Record<string, string> = {
    major: 'Major',
    minor: 'Minor',
    dominant7: 'Dominant 7th',
    diminished7: 'Diminished 7th',
    augmented: 'Augmented',
  };
  return names[type] || type;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate ABC notation for a scale (ascending and descending).
 * For melodic minor, ascending uses raised 6/7, descending uses natural minor.
 */
export function generateScaleAbc(
  key: string,
  type: string,
  octaves: number,
  clef?: string
): string {
  const { root } = normalizeKeyRoot(key);
  const preferFlats = usesFlats(key);
  const startOctave = defaultStartOctave(clef);
  const intervals = SCALE_INTERVALS[type];
  if (!intervals) throw new Error(`Unknown scale type: ${type}`);

  // Build ascending notes
  const ascNotes = buildScaleNotes(root, intervals, octaves, startOctave, preferFlats);
  const ascAbc = ascNotes.map(n => toAbcPitch(n.name, n.octave));

  // Build descending notes (top note repeated to match standard notation)
  let descNotes: { name: string; octave: number }[];
  if (type === 'melodic_minor') {
    // Descending melodic minor uses natural minor intervals
    const naturalMinorIntervals = SCALE_INTERVALS.natural_minor;
    const fullDesc = buildScaleNotes(root, naturalMinorIntervals, octaves, startOctave, preferFlats);
    descNotes = [...fullDesc].reverse();
  } else {
    descNotes = [...ascNotes].reverse();
  }
  const descAbc = descNotes.map(n => toAbcPitch(n.name, n.octave));

  const allAbc = [...ascAbc, ...descAbc];
  const body = formatAbcBody(allAbc);

  const abcKey = displayKey(key).replace('m', 'min').replace('#', '#');
  const title = `${displayKey(key)} ${displayScaleType(type)} Scale`;
  const clefDirective = clef && clef !== 'treble' ? ` clef=${clef}` : '';

  return [
    'X:1',
    `T:${title}`,
    'M:4/4',
    'L:1/4',
    `K:${abcKey}${clefDirective}`,
    body,
  ].join('\n');
}

/**
 * Generate ABC notation for an arpeggio (ascending and descending).
 */
export function generateArpeggioAbc(
  key: string,
  type: string,
  octaves: number,
  clef?: string
): string {
  const { root } = normalizeKeyRoot(key);
  const preferFlats = usesFlats(key);
  const startOctave = defaultStartOctave(clef);
  const intervals = ARPEGGIO_INTERVALS[type];
  if (!intervals) throw new Error(`Unknown arpeggio type: ${type}`);

  const ascNotes = buildArpeggioNotes(root, intervals, octaves, startOctave, preferFlats);
  const ascAbc = ascNotes.map(n => toAbcPitch(n.name, n.octave));

  // Descending (top note repeated to match standard notation)
  const descNotes = [...ascNotes].reverse();
  const descAbc = descNotes.map(n => toAbcPitch(n.name, n.octave));

  const allAbc = [...ascAbc, ...descAbc];
  const body = formatAbcBody(allAbc);

  const abcKey = displayKey(key).replace('m', 'min').replace('#', '#');
  const title = `${displayKey(key)} ${displayArpeggioType(type)} Arpeggio`;
  const clefDirective = clef && clef !== 'treble' ? ` clef=${clef}` : '';

  return [
    'X:1',
    `T:${title}`,
    'M:4/4',
    'L:1/4',
    `K:${abcKey}${clefDirective}`,
    body,
  ].join('\n');
}

/**
 * Generate ABC notation for a chromatic scale.
 */
export function generateChromaticAbc(
  startNote: string,
  octaves: number,
  clef?: string
): string {
  const preferFlats = false; // chromatic uses sharps ascending
  const startOctave = defaultStartOctave(clef);
  const rootIdx = chromaticIndex(startNote);

  // Ascending: use sharps
  const ascNotes: { name: string; octave: number }[] = [];
  const totalSemitones = octaves * 12;
  for (let i = 0; i <= totalSemitones; i++) {
    const semitone = rootIdx + i;
    const oct = startOctave + Math.floor(semitone / 12);
    const name = noteName(semitone, false); // sharps ascending
    ascNotes.push({ name, octave: oct });
  }

  // Descending: use flats
  const descNotes: { name: string; octave: number }[] = [];
  for (let i = totalSemitones - 1; i >= 0; i--) {
    const semitone = rootIdx + i;
    const oct = startOctave + Math.floor(semitone / 12);
    const name = noteName(semitone, true); // flats descending
    descNotes.push({ name, octave: oct });
  }

  const ascAbc = ascNotes.map(n => toAbcPitch(n.name, n.octave));
  const descAbc = descNotes.map(n => toAbcPitch(n.name, n.octave));
  const allAbc = [...ascAbc, ...descAbc];
  const body = formatAbcBody(allAbc);

  const displayRoot = FLAT_NAMES[startNote] || startNote;
  const clefDirective = clef && clef !== 'treble' ? ` clef=${clef}` : '';

  return [
    'X:1',
    `T:${displayRoot} Chromatic Scale`,
    'M:4/4',
    'L:1/4',
    `K:C${clefDirective}`,
    body,
  ].join('\n');
}

/**
 * Convert a scale to MelodyNote-compatible array for Tone.js playback.
 * Each note is a quarter note with beat incrementing by 1.
 */
export function scaleToNotes(
  key: string,
  type: string,
  octaves: number,
  startOctave?: number
): { pitch: string; duration: string; beat: number }[] {
  const { root } = normalizeKeyRoot(key);
  const preferFlats = usesFlats(key);
  const sOctave = startOctave ?? 4;
  const intervals = SCALE_INTERVALS[type];
  if (!intervals) throw new Error(`Unknown scale type: ${type}`);

  // Build ascending
  const ascNotes = buildScaleNotes(root, intervals, octaves, sOctave, preferFlats);

  // Build descending (top note repeated)
  let descNotes: { name: string; octave: number }[];
  if (type === 'melodic_minor') {
    const naturalMinorIntervals = SCALE_INTERVALS.natural_minor;
    const fullDesc = buildScaleNotes(root, naturalMinorIntervals, octaves, sOctave, preferFlats);
    descNotes = [...fullDesc].reverse();
  } else {
    descNotes = [...ascNotes].reverse();
  }

  const allNotes = [...ascNotes, ...descNotes];
  return allNotes.map((n, i) => ({
    pitch: toTonePitch(n.name, n.octave),
    duration: '4n',
    beat: i,
  }));
}

/**
 * Convert an arpeggio to MelodyNote-compatible array for Tone.js playback.
 * Each note is a quarter note with beat incrementing by 1.
 */
export function arpeggioToNotes(
  key: string,
  type: string,
  octaves: number,
  startOctave?: number
): { pitch: string; duration: string; beat: number }[] {
  const { root } = normalizeKeyRoot(key);
  const preferFlats = usesFlats(key);
  const sOctave = startOctave ?? 4;
  const intervals = ARPEGGIO_INTERVALS[type];
  if (!intervals) throw new Error(`Unknown arpeggio type: ${type}`);

  const ascNotes = buildArpeggioNotes(root, intervals, octaves, sOctave, preferFlats);
  const descNotes = [...ascNotes].reverse();
  const allNotes = [...ascNotes, ...descNotes];

  return allNotes.map((n, i) => ({
    pitch: toTonePitch(n.name, n.octave),
    duration: '4n',
    beat: i,
  }));
}
