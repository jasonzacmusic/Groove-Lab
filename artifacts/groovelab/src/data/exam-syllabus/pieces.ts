/**
 * Exam set piece listings for major exam boards.
 *
 * Sources: publicly available syllabi from ABRSM, Trinity Rock & Pop,
 * and Rockschool (RSL Awards).
 *
 * ABRSM Piano 2023-2024 syllabus
 * Trinity Rock & Pop Guitar & Drums (2018 onwards)
 * Rockschool Drums (2018 onwards)
 *
 * NOTE: Syllabi are updated periodically. Always cross-check with the
 * latest published syllabus from each exam board before an exam.
 */

export interface ExamPiece {
  title: string;
  composer: string;
  list: string; // 'A', 'B', 'C', 'List 1', etc.
}

export const EXAM_PIECES: Record<string, ExamPiece[]> = {
  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 1 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 1': [
    // List A – Baroque / Classical
    { title: 'Minuet in G, BWV Anh. 114', composer: 'J. S. Bach', list: 'A' },
    { title: 'Minuet in C', composer: 'L. Mozart', list: 'A' },
    { title: 'Allegretto in C', composer: 'Diabelli', list: 'A' },
    // List B – Romantic / 20th Century
    { title: 'The Wild Horseman, Op. 68 No. 8', composer: 'Schumann', list: 'B' },
    { title: 'A Sad Story', composer: 'Gurlitt', list: 'B' },
    { title: 'Lullaby', composer: 'Attwood', list: 'B' },
    // List C – Contemporary / Jazz
    { title: 'Le pingouin (The Penguin)', composer: 'Mélanie Music', list: 'C' },
    { title: 'Coconut Rag', composer: 'Pauline Hall', list: 'C' },
    { title: 'Sailing Boat', composer: 'Heather Hammond', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 2 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 2': [
    { title: 'Minuet in G, BWV Anh. 116', composer: 'J. S. Bach', list: 'A' },
    { title: 'Gavotte in G', composer: 'Handel', list: 'A' },
    { title: 'Ecossaise in G, WoO 23', composer: 'Beethoven', list: 'A' },
    { title: 'Soldier\'s March, Op. 68 No. 2', composer: 'Schumann', list: 'B' },
    { title: 'Song of Twilight', composer: 'Yoshinao Nakada', list: 'B' },
    { title: 'Barcarolle', composer: 'Offenbach, arr. Blackwell', list: 'B' },
    { title: 'Mister Swing', composer: 'Sarah Watts', list: 'C' },
    { title: 'Wind Chimes', composer: 'Heather Hammond', list: 'C' },
    { title: 'Rocking Out', composer: 'Nikki Iles', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 3 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 3': [
    { title: 'Musette in D, BWV Anh. 126', composer: 'J. S. Bach', list: 'A' },
    { title: 'Sonatina in G, Op. 36 No. 2: 1st movt', composer: 'Clementi', list: 'A' },
    { title: 'Sonatina in C, Anh. 5 No. 1: 1st movt', composer: 'Beethoven', list: 'A' },
    { title: 'Waltz in A minor, Op. posth.', composer: 'Chopin', list: 'B' },
    { title: 'Morning Prayer, Op. 39 No. 1', composer: 'Tchaikovsky', list: 'B' },
    { title: 'Restless, Op. 76 No. 5', composer: 'Gurlitt', list: 'B' },
    { title: 'Cat Walk', composer: 'Nikki Iles', list: 'C' },
    { title: 'Chase in the Dark', composer: 'Elissa Milne', list: 'C' },
    { title: 'Rum Point', composer: 'Mike Cornick', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 4 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 4': [
    { title: 'Invention No. 1 in C, BWV 772', composer: 'J. S. Bach', list: 'A' },
    { title: 'Sonatina in G, Op. 36 No. 5: 1st movt', composer: 'Clementi', list: 'A' },
    { title: 'Sonatina in F: 1st movt', composer: 'Beethoven', list: 'A' },
    { title: 'Mazurka in B flat, Op. 7 No. 1', composer: 'Chopin', list: 'B' },
    { title: 'In the Hall of the Mountain King', composer: 'Grieg, arr. Blackwell', list: 'B' },
    { title: 'Valse sentimentale, Op. 51 No. 6', composer: 'Tchaikovsky', list: 'B' },
    { title: 'Night Ride', composer: 'Pam Wedgwood', list: 'C' },
    { title: 'Cool Cat', composer: 'Mike Cornick', list: 'C' },
    { title: 'Inner Peace', composer: 'Karen Tanaka', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 5 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 5': [
    { title: 'Invention No. 8 in F, BWV 779', composer: 'J. S. Bach', list: 'A' },
    { title: 'Sonata in C, K. 545: 1st movt', composer: 'Mozart', list: 'A' },
    { title: 'Sonatina in D, Op. 36 No. 6: 1st movt', composer: 'Clementi', list: 'A' },
    { title: 'Nocturne in C sharp minor, Op. posth.', composer: 'Chopin', list: 'B' },
    { title: 'Chanson triste, Op. 40 No. 2', composer: 'Tchaikovsky', list: 'B' },
    { title: 'Clair de lune (from Suite bergamasque)', composer: 'Debussy', list: 'B' },
    { title: 'Prelude No. 1 (from Mikrokosmos Vol. 6)', composer: 'Bartók', list: 'C' },
    { title: 'Coral Reef', composer: 'Pam Wedgwood', list: 'C' },
    { title: 'Take Five', composer: 'Paul Desmond, arr. Cornick', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 6 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 6': [
    { title: 'Sinfonia No. 15 in B minor, BWV 801', composer: 'J. S. Bach', list: 'A' },
    { title: 'Sonata in F, K. 332: 1st movt', composer: 'Mozart', list: 'A' },
    { title: 'Sonata in G, Op. 49 No. 2: 1st movt', composer: 'Beethoven', list: 'A' },
    { title: 'Nocturne in E flat, Op. 9 No. 2', composer: 'Chopin', list: 'B' },
    { title: 'Consolation No. 3 in D flat', composer: 'Liszt', list: 'B' },
    { title: 'Arabesque No. 1', composer: 'Debussy', list: 'B' },
    { title: 'Allegro barbaro', composer: 'Bartók', list: 'C' },
    { title: 'The Cat and the Mouse', composer: 'Copland', list: 'C' },
    { title: 'A Night in Tunisia', composer: 'Gillespie, arr. Cornick', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 7 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 7': [
    { title: 'Prelude and Fugue in D minor, BWV 851', composer: 'J. S. Bach', list: 'A' },
    { title: 'Sonata in B flat, K. 333: 1st movt', composer: 'Mozart', list: 'A' },
    { title: 'Sonata in C minor, Op. 13 (Pathétique): 2nd movt', composer: 'Beethoven', list: 'A' },
    { title: 'Impromptu in A flat, Op. 142 No. 2', composer: 'Schubert', list: 'B' },
    { title: 'Intermezzo in A, Op. 118 No. 2', composer: 'Brahms', list: 'B' },
    { title: 'Clair de lune (from Suite bergamasque)', composer: 'Debussy', list: 'B' },
    { title: 'Doctor Gradus ad Parnassum', composer: 'Debussy', list: 'C' },
    { title: 'Prelude in G minor, Op. 23 No. 5', composer: 'Rachmaninoff', list: 'C' },
    { title: 'Libertango', composer: 'Piazzolla, arr. Cornick', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // ABRSM Piano Grade 8 (2023-2024)
  // ---------------------------------------------------------------------------
  'ABRSM|Piano|Grade 8': [
    { title: 'Prelude and Fugue in C minor, BWV 847', composer: 'J. S. Bach', list: 'A' },
    { title: 'Sonata in C, K. 330: 1st movt', composer: 'Mozart', list: 'A' },
    { title: 'Sonata in C sharp minor, Op. 27 No. 2 (Moonlight): 3rd movt', composer: 'Beethoven', list: 'A' },
    { title: 'Ballade No. 1 in G minor, Op. 23', composer: 'Chopin', list: 'B' },
    { title: 'Liebestraum No. 3 in A flat', composer: 'Liszt', list: 'B' },
    { title: 'La cathédrale engloutie (Preludes Book 1)', composer: 'Debussy', list: 'B' },
    { title: 'Étude-Tableau in E flat minor, Op. 39 No. 5', composer: 'Rachmaninoff', list: 'C' },
    { title: 'Scaramouche: 3rd movt (Brazileira)', composer: 'Milhaud', list: 'C' },
    { title: 'Rhapsody in Blue (solo arr.)', composer: 'Gershwin', list: 'C' },
  ],

  // ---------------------------------------------------------------------------
  // Trinity Rock & Pop – Guitar
  // ---------------------------------------------------------------------------
  'Trinity Rock & Pop|Guitar|Grade 1': [
    { title: 'Come As You Are', composer: 'Nirvana', list: 'Set Piece' },
    { title: 'Pumped Up Kicks', composer: 'Foster the People', list: 'Set Piece' },
    { title: 'Another One Bites the Dust', composer: 'Queen', list: 'Set Piece' },
    { title: 'Seven Nation Army', composer: 'The White Stripes', list: 'Set Piece' },
    { title: 'Wish You Were Here', composer: 'Pink Floyd', list: 'Set Piece' },
    { title: 'Hey Joe', composer: 'Jimi Hendrix', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Guitar|Grade 2': [
    { title: 'Back in Black', composer: 'AC/DC', list: 'Set Piece' },
    { title: 'Zombie', composer: 'The Cranberries', list: 'Set Piece' },
    { title: 'Sunshine of Your Love', composer: 'Cream', list: 'Set Piece' },
    { title: 'Knockin\' on Heaven\'s Door', composer: 'Bob Dylan', list: 'Set Piece' },
    { title: 'Run to You', composer: 'Bryan Adams', list: 'Set Piece' },
    { title: 'Teenage Dirtbag', composer: 'Wheatus', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Guitar|Grade 3': [
    { title: 'Smells Like Teen Spirit', composer: 'Nirvana', list: 'Set Piece' },
    { title: 'Are You Gonna Go My Way', composer: 'Lenny Kravitz', list: 'Set Piece' },
    { title: 'Rebel Rebel', composer: 'David Bowie', list: 'Set Piece' },
    { title: 'Superstition', composer: 'Stevie Wonder', list: 'Set Piece' },
    { title: 'Ain\'t No Sunshine', composer: 'Bill Withers', list: 'Set Piece' },
    { title: 'All Along the Watchtower', composer: 'Bob Dylan / Jimi Hendrix', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Guitar|Grade 4': [
    { title: 'Crazy Train', composer: 'Ozzy Osbourne / Randy Rhoads', list: 'Set Piece' },
    { title: 'Pride and Joy', composer: 'Stevie Ray Vaughan', list: 'Set Piece' },
    { title: 'Hotel California', composer: 'Eagles', list: 'Set Piece' },
    { title: 'Whole Lotta Love', composer: 'Led Zeppelin', list: 'Set Piece' },
    { title: 'Sultans of Swing', composer: 'Dire Straits', list: 'Set Piece' },
    { title: 'Under the Bridge', composer: 'Red Hot Chili Peppers', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Guitar|Grade 5': [
    { title: 'Eruption', composer: 'Van Halen', list: 'Set Piece' },
    { title: 'Comfortably Numb (solo)', composer: 'Pink Floyd', list: 'Set Piece' },
    { title: 'Sweet Child O\' Mine', composer: 'Guns N\' Roses', list: 'Set Piece' },
    { title: 'Stairway to Heaven', composer: 'Led Zeppelin', list: 'Set Piece' },
    { title: 'Purple Rain', composer: 'Prince', list: 'Set Piece' },
    { title: 'Black Dog', composer: 'Led Zeppelin', list: 'Set Piece' },
  ],

  // ---------------------------------------------------------------------------
  // Trinity Rock & Pop – Drums
  // ---------------------------------------------------------------------------
  'Trinity Rock & Pop|Drums|Grade 1': [
    { title: 'We Will Rock You', composer: 'Queen', list: 'Set Piece' },
    { title: 'Another One Bites the Dust', composer: 'Queen', list: 'Set Piece' },
    { title: 'Yellow', composer: 'Coldplay', list: 'Set Piece' },
    { title: 'Seven Nation Army', composer: 'The White Stripes', list: 'Set Piece' },
    { title: 'Come As You Are', composer: 'Nirvana', list: 'Set Piece' },
    { title: 'Billie Jean', composer: 'Michael Jackson', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Drums|Grade 2': [
    { title: 'Back in Black', composer: 'AC/DC', list: 'Set Piece' },
    { title: 'Use Somebody', composer: 'Kings of Leon', list: 'Set Piece' },
    { title: 'Should I Stay or Should I Go', composer: 'The Clash', list: 'Set Piece' },
    { title: 'Are You Gonna Be My Girl', composer: 'Jet', list: 'Set Piece' },
    { title: 'I Love Rock \'n\' Roll', composer: 'Joan Jett & the Blackhearts', list: 'Set Piece' },
    { title: 'Uptown Funk', composer: 'Bruno Mars', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Drums|Grade 3': [
    { title: 'Smells Like Teen Spirit', composer: 'Nirvana', list: 'Set Piece' },
    { title: 'Basket Case', composer: 'Green Day', list: 'Set Piece' },
    { title: 'Dakota', composer: 'Stereophonics', list: 'Set Piece' },
    { title: 'Superstition', composer: 'Stevie Wonder', list: 'Set Piece' },
    { title: 'Walk This Way', composer: 'Aerosmith', list: 'Set Piece' },
    { title: 'Rebel Rebel', composer: 'David Bowie', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Drums|Grade 4': [
    { title: 'Everlong', composer: 'Foo Fighters', list: 'Set Piece' },
    { title: 'Hysteria', composer: 'Muse', list: 'Set Piece' },
    { title: 'Rosanna', composer: 'Toto', list: 'Set Piece' },
    { title: 'Kashmir', composer: 'Led Zeppelin', list: 'Set Piece' },
    { title: 'Hot for Teacher', composer: 'Van Halen', list: 'Set Piece' },
    { title: 'Feeling Good', composer: 'Nina Simone / Muse arr.', list: 'Set Piece' },
  ],

  'Trinity Rock & Pop|Drums|Grade 5': [
    { title: 'Tom Sawyer', composer: 'Rush', list: 'Set Piece' },
    { title: 'YYZ', composer: 'Rush', list: 'Set Piece' },
    { title: 'Take Five', composer: 'Dave Brubeck', list: 'Set Piece' },
    { title: 'Toxicity', composer: 'System of a Down', list: 'Set Piece' },
    { title: '46 & 2', composer: 'Tool', list: 'Set Piece' },
    { title: 'Good Times Bad Times', composer: 'Led Zeppelin', list: 'Set Piece' },
  ],

  // ---------------------------------------------------------------------------
  // Rockschool Drums
  // ---------------------------------------------------------------------------
  'Rockschool|Drums|Grade 1': [
    { title: 'Locked Out of Heaven', composer: 'Bruno Mars', list: 'Set Piece' },
    { title: 'Song 2', composer: 'Blur', list: 'Set Piece' },
    { title: 'Counting Stars', composer: 'OneRepublic', list: 'Set Piece' },
    { title: 'Moves Like Jagger', composer: 'Maroon 5', list: 'Set Piece' },
    { title: 'I Gotta Feeling', composer: 'Black Eyed Peas', list: 'Set Piece' },
    { title: 'Hold the Line', composer: 'Toto', list: 'Set Piece' },
  ],

  'Rockschool|Drums|Grade 2': [
    { title: 'Blinding Lights', composer: 'The Weeknd', list: 'Set Piece' },
    { title: 'Come Together', composer: 'The Beatles', list: 'Set Piece' },
    { title: 'Livin\' on a Prayer', composer: 'Bon Jovi', list: 'Set Piece' },
    { title: 'Treasure', composer: 'Bruno Mars', list: 'Set Piece' },
    { title: 'Message in a Bottle', composer: 'The Police', list: 'Set Piece' },
    { title: 'Sunday Bloody Sunday', composer: 'U2', list: 'Set Piece' },
  ],

  'Rockschool|Drums|Grade 3': [
    { title: 'In the Air Tonight', composer: 'Phil Collins', list: 'Set Piece' },
    { title: 'Under Pressure', composer: 'Queen & David Bowie', list: 'Set Piece' },
    { title: 'Given to Fly', composer: 'Pearl Jam', list: 'Set Piece' },
    { title: 'Uprising', composer: 'Muse', list: 'Set Piece' },
    { title: 'Dani California', composer: 'Red Hot Chili Peppers', list: 'Set Piece' },
    { title: 'Don\'t Stop Me Now', composer: 'Queen', list: 'Set Piece' },
  ],

  'Rockschool|Drums|Grade 4': [
    { title: 'Sir Duke', composer: 'Stevie Wonder', list: 'Set Piece' },
    { title: 'Knights of Cydonia', composer: 'Muse', list: 'Set Piece' },
    { title: 'Rearviewmirror', composer: 'Pearl Jam', list: 'Set Piece' },
    { title: 'La Grange', composer: 'ZZ Top', list: 'Set Piece' },
    { title: 'Enter Sandman', composer: 'Metallica', list: 'Set Piece' },
    { title: 'My Hero', composer: 'Foo Fighters', list: 'Set Piece' },
  ],

  'Rockschool|Drums|Grade 5': [
    { title: 'Fool in the Rain', composer: 'Led Zeppelin', list: 'Set Piece' },
    { title: 'The Pretender', composer: 'Foo Fighters', list: 'Set Piece' },
    { title: 'Aces High', composer: 'Iron Maiden', list: 'Set Piece' },
    { title: 'Cissy Strut', composer: 'The Meters', list: 'Set Piece' },
    { title: 'Chop Suey!', composer: 'System of a Down', list: 'Set Piece' },
    { title: 'Moby Dick', composer: 'Led Zeppelin', list: 'Set Piece' },
  ],
};

/**
 * Look up set pieces for a given board, instrument, and grade.
 *
 * @example
 *   getPieces('ABRSM', 'Piano', 'Grade 3')
 *   getPieces('Trinity Rock & Pop', 'Guitar', 'Grade 1')
 *   getPieces('Rockschool', 'Drums', 'Grade 5')
 */
export function getPieces(
  board: string,
  instrument: string,
  grade: string,
): ExamPiece[] {
  return EXAM_PIECES[`${board}|${instrument}|${grade}`] || [];
}

/**
 * Get all available board/instrument/grade combinations.
 */
export function getAvailableSyllabi(): {
  board: string;
  instrument: string;
  grade: string;
}[] {
  return Object.keys(EXAM_PIECES).map((key) => {
    const [board, instrument, grade] = key.split('|');
    return { board, instrument, grade };
  });
}

/**
 * Get all pieces for a given list (e.g. 'A', 'B', 'C') within a syllabus.
 */
export function getPiecesByList(
  board: string,
  instrument: string,
  grade: string,
  list: string,
): ExamPiece[] {
  return getPieces(board, instrument, grade).filter((p) => p.list === list);
}
