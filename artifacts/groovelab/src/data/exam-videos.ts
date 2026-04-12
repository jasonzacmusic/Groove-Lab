// Curated exam play-along data for all major music examination boards
// and traditional learning methods. YouTube search queries generated
// from known content — no API calls needed.

export interface ExamEntry {
  board: string;
  instrument: string;
  grade: string;
  searchQueries: string[]; // YouTube search queries that reliably find content
}

// ── All exam boards ──
export const EXAM_BOARDS = [
  { id: 'ABRSM', name: 'ABRSM', fullName: 'Associated Board of the Royal Schools of Music', region: 'UK/International' },
  { id: 'Trinity', name: 'Trinity', fullName: 'Trinity College London', region: 'UK/International' },
  { id: 'Rockschool', name: 'Rockschool', fullName: 'RSL Awards (Rockschool)', region: 'UK/International' },
  { id: 'LCM', name: 'LCM', fullName: 'London College of Music', region: 'UK' },
  { id: 'RCM', name: 'RCM', fullName: 'Royal Conservatory of Music', region: 'Canada/International' },
  { id: 'AMEB', name: 'AMEB', fullName: 'Australian Music Examinations Board', region: 'Australia' },
  { id: 'Methods', name: 'Method Books', fullName: 'Traditional Piano & Instrument Methods', region: 'Universal' },
];

export const INSTRUMENTS = [
  'Piano', 'Guitar', 'Drums', 'Bass', 'Saxophone', 'Trumpet',
  'Flute', 'Violin', 'Clarinet', 'Cello', 'Vocals', 'Ukulele',
];

export const GRADES: Record<string, string[]> = {
  ABRSM: ['Initial', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'],
  Trinity: ['Initial', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'],
  Rockschool: ['Debut', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'],
  LCM: ['Step 1', 'Step 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'],
  RCM: ['Prep A', 'Prep B', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Level 10'],
  AMEB: ['Preliminary', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'],
  Methods: ['Beginner', 'Elementary', 'Intermediate', 'Advanced'],
};

// ── Traditional Piano Method Books ──
export const PIANO_METHODS = [
  { name: 'Alfred Basic Piano Library', searchPrefix: 'Alfred basic piano', levels: ['Level 1A', 'Level 1B', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'] },
  { name: 'Faber Piano Adventures', searchPrefix: 'Faber piano adventures', levels: ['Primer', 'Level 1', 'Level 2A', 'Level 2B', 'Level 3A', 'Level 3B', 'Level 4', 'Level 5'] },
  { name: 'Bastien Piano Basics', searchPrefix: 'Bastien piano basics', levels: ['Primer', 'Level 1', 'Level 2', 'Level 3', 'Level 4'] },
  { name: 'John Thompson', searchPrefix: 'John Thompson easiest piano course', levels: ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'Suzuki Piano', searchPrefix: 'Suzuki piano method', levels: ['Volume 1', 'Volume 2', 'Volume 3', 'Volume 4', 'Volume 5', 'Volume 6', 'Volume 7'] },
  { name: 'Hanon Exercises', searchPrefix: 'Hanon piano exercises', levels: ['Part 1 (1-20)', 'Part 2 (21-43)', 'Part 3 (44-60)'] },
  { name: 'Czerny Studies', searchPrefix: 'Czerny piano etudes', levels: ['Op. 599', 'Op. 849', 'Op. 299', 'Op. 740'] },
  { name: 'Burgmüller', searchPrefix: 'Burgmuller piano', levels: ['Op. 100 (25 Easy)', 'Op. 109 (18 Characteristic)', 'Op. 105 (12 Brilliant)'] },
  { name: 'Mikrokosmos (Bartók)', searchPrefix: 'Bartok Mikrokosmos piano', levels: ['Volume 1', 'Volume 2', 'Volume 3', 'Volume 4', 'Volume 5', 'Volume 6'] },
  { name: 'Bach Inventions', searchPrefix: 'Bach inventions piano play along', levels: ['2-Part Inventions', '3-Part Sinfonias'] },
  { name: 'Sonatinas', searchPrefix: 'sonatina piano play along', levels: ['Clementi', 'Kuhlau', 'Mozart', 'Beethoven'] },
];

// ── Traditional String Methods ──
export const STRING_METHODS = [
  { name: 'Suzuki Violin', searchPrefix: 'Suzuki violin', levels: ['Volume 1', 'Volume 2', 'Volume 3', 'Volume 4', 'Volume 5', 'Volume 6', 'Volume 7', 'Volume 8'] },
  { name: 'Suzuki Cello', searchPrefix: 'Suzuki cello', levels: ['Volume 1', 'Volume 2', 'Volume 3', 'Volume 4', 'Volume 5', 'Volume 6'] },
  { name: 'Essential Elements Strings', searchPrefix: 'Essential Elements strings', levels: ['Book 1', 'Book 2', 'Book 3'] },
  { name: 'Suzuki Viola', searchPrefix: 'Suzuki viola', levels: ['Volume 1', 'Volume 2', 'Volume 3', 'Volume 4'] },
];

// ── Generate search queries for any combination ──
export function generateSearchQueries(board: string, instrument: string, grade: string): string[] {
  if (board === 'Methods') {
    // For method books, return method-specific queries
    const methods = instrument === 'Piano' ? PIANO_METHODS
      : ['Violin', 'Cello', 'Viola'].includes(instrument) ? STRING_METHODS
      : [];
    if (methods.length > 0) {
      return methods.slice(0, 4).map(m => `${m.searchPrefix} ${grade} play along`);
    }
    return [`${instrument} ${grade} play along backing track`];
  }

  const queries = [
    `${board} ${grade} ${instrument} play along`,
    `${board} ${grade} ${instrument} backing track`,
    `${board} ${grade} ${instrument} exam piece`,
  ];

  // Add board-specific queries
  if (board === 'Rockschool') {
    queries.push(`Rockschool ${grade} ${instrument} backing track RSL`);
  }
  if (board === 'Trinity' && ['Guitar', 'Drums', 'Bass', 'Vocals'].includes(instrument)) {
    queries.push(`Trinity Rock Pop ${grade} ${instrument} backing track`);
  }
  if (board === 'RCM') {
    queries.push(`Royal Conservatory ${grade} ${instrument} play along`);
  }

  return queries;
}

// ── Get method book entries for the Methods board ──
export function getMethodBooks(instrument: string): typeof PIANO_METHODS {
  if (instrument === 'Piano' || instrument === 'All Instruments') return PIANO_METHODS;
  if (['Violin', 'Cello', 'Viola'].includes(instrument)) return STRING_METHODS;
  return [];
}
