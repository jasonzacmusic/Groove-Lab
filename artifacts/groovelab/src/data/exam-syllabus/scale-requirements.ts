// Scale and arpeggio requirements for ABRSM / Trinity graded exams (Grades 1-8)
// Based on standard published syllabi — public knowledge requirements.

export interface ScaleReq {
  keys: string[];
  type:
    | 'major'
    | 'natural_minor'
    | 'harmonic_minor'
    | 'melodic_minor'
    | 'chromatic'
    | 'blues'
    | 'whole_tone'
    | 'dorian'
    | 'mixolydian'
    | 'pentatonic';
  octaves: number;
  label?: string; // display name override
}

export interface ArpeggioReq {
  keys: string[];
  type: 'major' | 'minor' | 'dominant7' | 'diminished7' | 'augmented';
  octaves: number;
  label?: string;
}

export interface GradeRequirements {
  scales: ScaleReq[];
  arpeggios: ArpeggioReq[];
  additional?: string[]; // extra requirements like "contrary motion", "chromatic starting on any note"
}

export const GRADE_REQUIREMENTS: Record<string, GradeRequirements> = {
  // ─── GRADE 1 ───────────────────────────────────────────────────────────
  'Grade 1': {
    scales: [
      { keys: ['C', 'G', 'F'], type: 'major', octaves: 1 },
      { keys: ['A', 'D'], type: 'natural_minor', octaves: 1 },
      { keys: ['A', 'D'], type: 'harmonic_minor', octaves: 1 },
    ],
    arpeggios: [
      { keys: ['C', 'G', 'F'], type: 'major', octaves: 1 },
      { keys: ['A', 'D'], type: 'minor', octaves: 1 },
    ],
    additional: [
      'Hands separately',
      'Even tone and rhythm throughout',
    ],
  },

  // ─── GRADE 2 ───────────────────────────────────────────────────────────
  'Grade 2': {
    scales: [
      { keys: ['C', 'G', 'D', 'F', 'Bb'], type: 'major', octaves: 2 },
      { keys: ['A', 'D', 'E', 'G'], type: 'harmonic_minor', octaves: 2 },
      { keys: ['A', 'D', 'E', 'G'], type: 'melodic_minor', octaves: 2 },
    ],
    arpeggios: [
      { keys: ['C', 'G', 'D', 'F', 'Bb'], type: 'major', octaves: 2 },
      { keys: ['A', 'D', 'E', 'G'], type: 'minor', octaves: 2 },
    ],
    additional: [
      'Hands separately or hands together',
    ],
  },

  // ─── GRADE 3 ───────────────────────────────────────────────────────────
  'Grade 3': {
    scales: [
      {
        keys: ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'],
        type: 'major',
        octaves: 2,
      },
      {
        keys: ['A', 'D', 'E', 'B', 'G', 'C', 'F#'],
        type: 'harmonic_minor',
        octaves: 2,
      },
      {
        keys: ['A', 'D', 'E', 'B', 'G', 'C', 'F#'],
        type: 'melodic_minor',
        octaves: 2,
      },
      {
        keys: ['C'],
        type: 'chromatic',
        octaves: 2,
        label: 'Chromatic scale starting on C',
      },
    ],
    arpeggios: [
      {
        keys: ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'],
        type: 'major',
        octaves: 2,
      },
      {
        keys: ['A', 'D', 'E', 'B', 'G', 'C', 'F#'],
        type: 'minor',
        octaves: 2,
      },
    ],
    additional: [
      'Hands together',
    ],
  },

  // ─── GRADE 4 ───────────────────────────────────────────────────────────
  'Grade 4': {
    scales: [
      {
        keys: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
        type: 'major',
        octaves: 2,
      },
      {
        keys: ['A', 'D', 'E', 'B', 'F#', 'C#', 'G', 'C', 'F', 'Bb'],
        type: 'harmonic_minor',
        octaves: 2,
      },
      {
        keys: ['A', 'D', 'E', 'B', 'F#', 'C#', 'G', 'C', 'F', 'Bb'],
        type: 'melodic_minor',
        octaves: 2,
      },
      {
        keys: ['C', 'D'],
        type: 'chromatic',
        octaves: 2,
        label: 'Chromatic scales',
      },
    ],
    arpeggios: [
      {
        keys: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
        type: 'major',
        octaves: 2,
      },
      {
        keys: ['A', 'D', 'E', 'B', 'F#', 'C#', 'G', 'C', 'F', 'Bb'],
        type: 'minor',
        octaves: 2,
      },
      {
        keys: ['C', 'G', 'F'],
        type: 'dominant7',
        octaves: 2,
        label: 'Dominant 7th arpeggios',
      },
    ],
    additional: [
      'Hands together throughout',
      'Contrary motion scale in C major',
    ],
  },

  // ─── GRADE 5 ───────────────────────────────────────────────────────────
  'Grade 5': {
    scales: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 3,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'harmonic_minor',
        octaves: 3,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'melodic_minor',
        octaves: 3,
      },
      {
        keys: ['C', 'D', 'Eb', 'F'],
        type: 'chromatic',
        octaves: 2,
        label: 'Chromatic scales',
      },
    ],
    arpeggios: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 3,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'minor',
        octaves: 3,
      },
      {
        keys: ['C', 'G', 'D', 'F', 'Bb', 'Eb'],
        type: 'dominant7',
        octaves: 2,
        label: 'Dominant 7th arpeggios',
      },
    ],
    additional: [
      'All scales and arpeggios hands together',
      'Contrary motion in C and A major',
      'Contrary motion in A and D harmonic minor',
    ],
  },

  // ─── GRADE 6 ───────────────────────────────────────────────────────────
  'Grade 6': {
    scales: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B', 'F#',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 3,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'harmonic_minor',
        octaves: 3,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'melodic_minor',
        octaves: 3,
      },
      {
        keys: ['C', 'C#', 'D', 'Eb', 'E', 'F'],
        type: 'chromatic',
        octaves: 3,
        label: 'Chromatic scales',
      },
      {
        keys: ['C', 'Db'],
        type: 'whole_tone',
        octaves: 2,
        label: 'Whole-tone scales',
      },
    ],
    arpeggios: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B', 'F#',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 3,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'minor',
        octaves: 3,
      },
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B',
          'F', 'Bb', 'Eb', 'Ab', 'Db',
        ],
        type: 'dominant7',
        octaves: 3,
        label: 'Dominant 7th arpeggios',
      },
      {
        keys: ['C', 'C#', 'D', 'Eb'],
        type: 'diminished7',
        octaves: 3,
        label: 'Diminished 7th arpeggios',
      },
    ],
    additional: [
      'All scales and arpeggios hands together',
      'Contrary motion in all major keys',
      'Contrary motion in all harmonic minor keys',
    ],
  },

  // ─── GRADE 7 ───────────────────────────────────────────────────────────
  'Grade 7': {
    scales: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B', 'F#',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 4,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'harmonic_minor',
        octaves: 4,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'melodic_minor',
        octaves: 4,
      },
      {
        keys: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
        type: 'chromatic',
        octaves: 4,
        label: 'Chromatic scales starting on any note',
      },
      {
        keys: ['C', 'Db'],
        type: 'whole_tone',
        octaves: 2,
        label: 'Whole-tone scales',
      },
      {
        keys: ['C', 'D', 'E', 'G', 'A'],
        type: 'dorian',
        octaves: 2,
        label: 'Dorian mode',
      },
      {
        keys: ['C', 'D', 'G', 'A', 'Bb'],
        type: 'mixolydian',
        octaves: 2,
        label: 'Mixolydian mode',
      },
    ],
    arpeggios: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B', 'F#',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 4,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'minor',
        octaves: 4,
      },
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'dominant7',
        octaves: 4,
        label: 'Dominant 7th arpeggios',
      },
      {
        keys: ['C', 'C#', 'D', 'Eb'],
        type: 'diminished7',
        octaves: 4,
        label: 'Diminished 7th arpeggios',
      },
    ],
    additional: [
      'All scales and arpeggios hands together',
      'Contrary motion in all major keys',
      'Contrary motion in all harmonic minor keys',
      'Scales in thirds in C and G major',
    ],
  },

  // ─── GRADE 8 ───────────────────────────────────────────────────────────
  'Grade 8': {
    scales: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B', 'F#',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 4,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'harmonic_minor',
        octaves: 4,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'melodic_minor',
        octaves: 4,
      },
      {
        keys: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
        type: 'chromatic',
        octaves: 4,
        label: 'Chromatic scales starting on any note',
      },
      {
        keys: ['C', 'Db'],
        type: 'whole_tone',
        octaves: 2,
        label: 'Whole-tone scales',
      },
      {
        keys: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb'],
        type: 'dorian',
        octaves: 2,
        label: 'Dorian mode',
      },
      {
        keys: ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'],
        type: 'mixolydian',
        octaves: 2,
        label: 'Mixolydian mode',
      },
    ],
    arpeggios: [
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B', 'F#',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'major',
        octaves: 4,
      },
      {
        keys: [
          'A', 'D', 'E', 'B', 'F#', 'C#', 'G#',
          'G', 'C', 'F', 'Bb', 'Eb', 'Ab',
        ],
        type: 'minor',
        octaves: 4,
      },
      {
        keys: [
          'C', 'G', 'D', 'A', 'E', 'B',
          'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        ],
        type: 'dominant7',
        octaves: 4,
        label: 'Dominant 7th arpeggios',
      },
      {
        keys: ['C', 'C#', 'D', 'Eb'],
        type: 'diminished7',
        octaves: 4,
        label: 'Diminished 7th arpeggios',
      },
      {
        keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
        type: 'augmented',
        octaves: 4,
        label: 'Augmented arpeggios',
      },
    ],
    additional: [
      'All scales and arpeggios hands together',
      'Contrary motion in all major keys',
      'Contrary motion in all harmonic minor keys',
      'Scales in thirds in all major and minor keys',
      'Scales in sixths in all major and minor keys',
      'Chromatic scales in minor thirds',
      'Chromatic scales in major thirds',
      'Double octave scales',
      'Legato and staccato articulation as directed',
    ],
  },
};
