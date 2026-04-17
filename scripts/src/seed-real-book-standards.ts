/**
 * Seed ALL Real Book jazz standards into the chord_progressions table.
 * Standards that already exist (by name) are skipped.
 * New standards are inserted with isJazzStandard=true and empty chords array
 * (chord data to be populated later from Real Book transcriptions).
 *
 * This ensures every standard appears in the sidebar and gets YouTube videos.
 *
 * Usage: cd scripts && source ../.env.production && npx tsx src/seed-real-book-standards.ts
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 } as any);

// ── Complete Real Book Vol 1 & 2 Standards ──────────────────────────────
// Comprehensive list covering the most commonly played jazz standards
interface Standard {
  name: string;
  composer: string;
  key: string;
  form: string;
  difficulty: number; // 1-10
}

const REAL_BOOK_STANDARDS: Standard[] = [
  // ── A ──
  { name: "A Child Is Born", composer: "Thad Jones", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "A Foggy Day", composer: "George Gershwin", key: "F", form: "AABA", difficulty: 3 },
  { name: "A Night In Tunisia", composer: "Dizzy Gillespie", key: "Dm", form: "AABA", difficulty: 7 },
  { name: "A Nightingale Sang In Berkeley Square", composer: "Manning Sherwin", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Actual Proof", composer: "Herbie Hancock", key: "Gm", form: "Through", difficulty: 9 },
  { name: "Afternoon In Paris", composer: "John Lewis", key: "C", form: "AABA", difficulty: 4 },
  { name: "Airegin", composer: "Sonny Rollins", key: "Fm", form: "AABA", difficulty: 7 },
  { name: "All Blues", composer: "Miles Davis", key: "G", form: "12-bar", difficulty: 3 },
  { name: "All Of Me", composer: "Gerald Marks / Seymour Simons", key: "C", form: "AABA", difficulty: 1 },
  { name: "All Of You", composer: "Cole Porter", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "All The Things You Are", composer: "Jerome Kern", key: "Ab", form: "AABA", difficulty: 4 },
  { name: "Alone Together", composer: "Arthur Schwartz", key: "Dm", form: "AABA", difficulty: 5 },
  { name: "Along Came Betty", composer: "Benny Golson", key: "Bb", form: "AABA", difficulty: 6 },
  { name: "Angel Eyes", composer: "Matt Dennis", key: "Dm", form: "AABA", difficulty: 4 },
  { name: "Anthropology", composer: "Charlie Parker / Dizzy Gillespie", key: "Bb", form: "AABA", difficulty: 8 },
  { name: "April In Paris", composer: "Vernon Duke", key: "C", form: "AABA", difficulty: 4 },
  { name: "Au Privave", composer: "Charlie Parker", key: "F", form: "12-bar", difficulty: 5 },
  { name: "Autumn In New York", composer: "Vernon Duke", key: "F", form: "ABAB", difficulty: 5 },
  { name: "Autumn Leaves", composer: "Joseph Kosma", key: "Gm", form: "AABA", difficulty: 2 },

  // ── B ──
  { name: "Bags' Groove", composer: "Milt Jackson", key: "F", form: "12-bar", difficulty: 1 },
  { name: "Beautiful Love", composer: "Victor Young", key: "Dm", form: "AABA", difficulty: 4 },
  { name: "Bernie's Tune", composer: "Bernie Miller", key: "Dm", form: "AABA", difficulty: 4 },
  { name: "Billie's Bounce", composer: "Charlie Parker", key: "F", form: "12-bar", difficulty: 4 },
  { name: "Black Nile", composer: "Wayne Shorter", key: "Gm", form: "Through", difficulty: 8 },
  { name: "Black Orpheus", composer: "Luiz Bonfa", key: "Am", form: "AABA", difficulty: 3 },
  { name: "Blue Bossa", composer: "Kenny Dorham", key: "Cm", form: "AABA", difficulty: 2 },
  { name: "Blue In Green", composer: "Miles Davis", key: "Dm", form: "Through", difficulty: 5 },
  { name: "Blue Monk", composer: "Thelonious Monk", key: "Bb", form: "12-bar", difficulty: 3 },
  { name: "Blue Train", composer: "John Coltrane", key: "Eb", form: "12-bar", difficulty: 5 },
  { name: "Blues For Alice", composer: "Charlie Parker", key: "F", form: "12-bar", difficulty: 6 },
  { name: "Body And Soul", composer: "Johnny Green", key: "Db", form: "AABA", difficulty: 5 },
  { name: "Bolivia", composer: "Cedar Walton", key: "Dm", form: "Through", difficulty: 7 },
  { name: "Boplicity", composer: "Miles Davis", key: "F", form: "Through", difficulty: 7 },
  { name: "Brazil", composer: "Ary Barroso", key: "G", form: "Through", difficulty: 4 },
  { name: "But Beautiful", composer: "Jimmy Van Heusen", key: "G", form: "AABA", difficulty: 4 },
  { name: "But Not For Me", composer: "George Gershwin", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "Bye Bye Blackbird", composer: "Ray Henderson", key: "F", form: "AABA", difficulty: 2 },

  // ── C ──
  { name: "C Jam Blues", composer: "Duke Ellington", key: "C", form: "12-bar", difficulty: 1 },
  { name: "Cantaloupe Island", composer: "Herbie Hancock", key: "Fm", form: "Through", difficulty: 2 },
  { name: "Caravan", composer: "Juan Tizol / Duke Ellington", key: "Cm", form: "AABA", difficulty: 4 },
  { name: "Ceora", composer: "Lee Morgan", key: "Ab", form: "AABA", difficulty: 5 },
  { name: "Chelsea Bridge", composer: "Billy Strayhorn", key: "Bb", form: "AABA", difficulty: 6 },
  { name: "Cherokee", composer: "Ray Noble", key: "Bb", form: "AABA", difficulty: 8 },
  { name: "Come Rain Or Come Shine", composer: "Harold Arlen", key: "F", form: "Through", difficulty: 4 },
  { name: "Compared To What", composer: "Gene McDaniels", key: "Eb", form: "Through", difficulty: 5 },
  { name: "Confirmation", composer: "Charlie Parker", key: "F", form: "AABA", difficulty: 7 },
  { name: "Con Alma", composer: "Dizzy Gillespie", key: "Bb", form: "AABA", difficulty: 7 },
  { name: "Corcovado", composer: "Antonio Carlos Jobim", key: "Am", form: "Through", difficulty: 3 },
  { name: "Cottontail", composer: "Duke Ellington", key: "Bb", form: "AABA", difficulty: 6 },
  { name: "Cry Me A River", composer: "Arthur Hamilton", key: "Cm", form: "AABA", difficulty: 3 },

  // ── D ──
  { name: "Darn That Dream", composer: "Jimmy Van Heusen", key: "G", form: "AABA", difficulty: 4 },
  { name: "Days Of Wine And Roses", composer: "Henry Mancini", key: "F", form: "AABA", difficulty: 4 },
  { name: "Dear Old Stockholm", composer: "Traditional / Stan Getz", key: "Dm", form: "Through", difficulty: 5 },
  { name: "Desafinado", composer: "Antonio Carlos Jobim", key: "F", form: "Through", difficulty: 5 },
  { name: "Dolphin Dance", composer: "Herbie Hancock", key: "Eb", form: "Through", difficulty: 8 },
  { name: "Donna Lee", composer: "Charlie Parker", key: "Ab", form: "AABA", difficulty: 9 },
  { name: "Don't Get Around Much Anymore", composer: "Duke Ellington", key: "C", form: "AABA", difficulty: 2 },
  { name: "Doxy", composer: "Sonny Rollins", key: "Bb", form: "Through", difficulty: 3 },

  // ── E ──
  { name: "East Of The Sun", composer: "Brooks Bowman", key: "G", form: "AABA", difficulty: 3 },
  { name: "Easy Living", composer: "Ralph Rainger", key: "F", form: "AABA", difficulty: 3 },
  { name: "Emily", composer: "Johnny Mandel", key: "C", form: "Through", difficulty: 5 },
  { name: "Embraceable You", composer: "George Gershwin", key: "G", form: "AABA", difficulty: 4 },
  { name: "Epistrophy", composer: "Thelonious Monk", key: "Db", form: "AABA", difficulty: 6 },
  { name: "E.S.P.", composer: "Wayne Shorter", key: "E", form: "Through", difficulty: 8 },
  { name: "Estate", composer: "Bruno Martino", key: "Gm", form: "Through", difficulty: 5 },
  { name: "Evidence", composer: "Thelonious Monk", key: "Eb", form: "AABA", difficulty: 7 },
  { name: "Everything Happens To Me", composer: "Matt Dennis", key: "Eb", form: "AABA", difficulty: 4 },

  // ── F ──
  { name: "Falling Grace", composer: "Steve Swallow", key: "Bb", form: "Through", difficulty: 6 },
  { name: "Falling In Love With Love", composer: "Richard Rodgers", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "Fee Fi Fo Fum", composer: "Wayne Shorter", key: "F", form: "Through", difficulty: 8 },
  { name: "Fly Me To The Moon", composer: "Bart Howard", key: "C", form: "AABA", difficulty: 2 },
  { name: "Footprints", composer: "Wayne Shorter", key: "Cm", form: "Through", difficulty: 5 },
  { name: "Four", composer: "Miles Davis", key: "Eb", form: "AABA", difficulty: 5 },
  { name: "Freddie Freeloader", composer: "Miles Davis", key: "Bb", form: "12-bar", difficulty: 2 },

  // ── G ──
  { name: "Gentle Rain", composer: "Luiz Bonfa", key: "Dm", form: "AABA", difficulty: 4 },
  { name: "Georgia On My Mind", composer: "Hoagy Carmichael", key: "F", form: "AABA", difficulty: 3 },
  { name: "Giant Steps", composer: "John Coltrane", key: "B", form: "Through", difficulty: 10 },
  { name: "Girl From Ipanema", composer: "Antonio Carlos Jobim", key: "F", form: "AABA", difficulty: 3 },
  { name: "God Bless The Child", composer: "Billie Holiday", key: "Bb", form: "AABA", difficulty: 3 },
  { name: "Gone With The Wind", composer: "Allie Wrubel", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Good Bait", composer: "Tadd Dameron", key: "Bb", form: "AABA", difficulty: 5 },
  { name: "Groovin' High", composer: "Dizzy Gillespie", key: "Eb", form: "AABA", difficulty: 6 },

  // ── H ──
  { name: "Half Nelson", composer: "Miles Davis", key: "C", form: "AABA", difficulty: 6 },
  { name: "Have You Met Miss Jones", composer: "Richard Rodgers", key: "F", form: "AABA", difficulty: 4 },
  { name: "Here's That Rainy Day", composer: "Jimmy Van Heusen", key: "G", form: "AABA", difficulty: 4 },
  { name: "Honeysuckle Rose", composer: "Fats Waller", key: "F", form: "AABA", difficulty: 3 },
  { name: "Hot House", composer: "Tadd Dameron", key: "Gm", form: "AABA", difficulty: 7 },
  { name: "How Deep Is The Ocean", composer: "Irving Berlin", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "How High The Moon", composer: "Morgan Lewis", key: "G", form: "AABA", difficulty: 5 },
  { name: "How Insensitive", composer: "Antonio Carlos Jobim", key: "Dm", form: "Through", difficulty: 3 },

  // ── I ──
  { name: "I Can't Get Started", composer: "Vernon Duke", key: "C", form: "AABA", difficulty: 4 },
  { name: "I Could Write A Book", composer: "Richard Rodgers", key: "C", form: "AABA", difficulty: 3 },
  { name: "I Fall In Love Too Easily", composer: "Jule Styne", key: "Eb", form: "AABA", difficulty: 3 },
  { name: "I Got Rhythm", composer: "George Gershwin", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "I Hear A Rhapsody", composer: "George Fragos", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "I Love You", composer: "Cole Porter", key: "F", form: "AABA", difficulty: 4 },
  { name: "I Mean You", composer: "Thelonious Monk", key: "F", form: "AABA", difficulty: 6 },
  { name: "I Remember Clifford", composer: "Benny Golson", key: "Eb", form: "AABA", difficulty: 5 },
  { name: "I Remember You", composer: "Victor Schertzinger", key: "F", form: "AABA", difficulty: 3 },
  { name: "I Should Care", composer: "Sammy Cahn", key: "C", form: "AABA", difficulty: 4 },
  { name: "I Thought About You", composer: "Jimmy Van Heusen", key: "F", form: "AABA", difficulty: 4 },
  { name: "I'll Remember April", composer: "Gene De Paul", key: "G", form: "AABA", difficulty: 5 },
  { name: "If I Were A Bell", composer: "Frank Loesser", key: "F", form: "AABA", difficulty: 3 },
  { name: "Impressions", composer: "John Coltrane", key: "Dm", form: "AABA", difficulty: 4 },
  { name: "In A Mellow Tone", composer: "Duke Ellington", key: "Ab", form: "AABA", difficulty: 3 },
  { name: "In A Sentimental Mood", composer: "Duke Ellington", key: "F", form: "AABA", difficulty: 3 },
  { name: "In Walked Bud", composer: "Thelonious Monk", key: "Fm", form: "AABA", difficulty: 5 },
  { name: "In Your Own Sweet Way", composer: "Dave Brubeck", key: "Db", form: "AABA", difficulty: 5 },
  { name: "Indiana", composer: "James Hanley", key: "F", form: "AABA", difficulty: 4 },
  { name: "Inner Urge", composer: "Joe Henderson", key: "F#m", form: "Through", difficulty: 8 },
  { name: "Invitation", composer: "Bronislau Kaper", key: "Cm", form: "Through", difficulty: 6 },
  { name: "Isfahan", composer: "Billy Strayhorn", key: "Db", form: "Through", difficulty: 6 },
  { name: "Israel", composer: "John Carisi", key: "Dm", form: "Through", difficulty: 6 },
  { name: "It Could Happen To You", composer: "Jimmy Van Heusen", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "It Don't Mean A Thing", composer: "Duke Ellington", key: "Gm", form: "AABA", difficulty: 3 },
  { name: "It Might As Well Be Spring", composer: "Richard Rodgers", key: "G", form: "AABA", difficulty: 4 },

  // ── J ──
  { name: "Jeru", composer: "Gerry Mulligan", key: "Bb", form: "Through", difficulty: 6 },
  { name: "Jordu", composer: "Duke Jordan", key: "Dm", form: "AABA", difficulty: 5 },
  { name: "Joy Spring", composer: "Clifford Brown", key: "F", form: "AABA", difficulty: 6 },
  { name: "Just Friends", composer: "John Klenner", key: "F", form: "Through", difficulty: 3 },
  { name: "Just In Time", composer: "Jule Styne", key: "Bb", form: "AABA", difficulty: 3 },

  // ── K-L ──
  { name: "Killer Joe", composer: "Benny Golson", key: "C", form: "Through", difficulty: 2 },
  { name: "Lady Bird", composer: "Tadd Dameron", key: "C", form: "Through", difficulty: 4 },
  { name: "Laura", composer: "David Raksin", key: "C", form: "Through", difficulty: 5 },
  { name: "Lazy Bird", composer: "John Coltrane", key: "Ab", form: "AABA", difficulty: 7 },
  { name: "Like Someone In Love", composer: "Jimmy Van Heusen", key: "C", form: "AABA", difficulty: 4 },
  { name: "Line For Lyons", composer: "Gerry Mulligan", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "Lullaby Of Birdland", composer: "George Shearing", key: "Fm", form: "AABA", difficulty: 4 },
  { name: "Lush Life", composer: "Billy Strayhorn", key: "Db", form: "Through", difficulty: 7 },

  // ── M ──
  { name: "Mack The Knife", composer: "Kurt Weill", key: "Bb", form: "Through", difficulty: 3 },
  { name: "Maiden Voyage", composer: "Herbie Hancock", key: "Am", form: "Through", difficulty: 4 },
  { name: "Manteca", composer: "Dizzy Gillespie / Chano Pozo", key: "Bb", form: "Through", difficulty: 5 },
  { name: "Meditation", composer: "Antonio Carlos Jobim", key: "C", form: "AABA", difficulty: 3 },
  { name: "Mercy Mercy Mercy", composer: "Joe Zawinul", key: "Bb", form: "Through", difficulty: 2 },
  { name: "Milestones", composer: "Miles Davis", key: "Gm", form: "AABA", difficulty: 4 },
  { name: "Misty", composer: "Erroll Garner", key: "Eb", form: "AABA", difficulty: 3 },
  { name: "Moment's Notice", composer: "John Coltrane", key: "Eb", form: "Through", difficulty: 7 },
  { name: "Mood Indigo", composer: "Duke Ellington", key: "Ab", form: "AABA", difficulty: 3 },
  { name: "Moonlight In Vermont", composer: "Karl Suessdorf", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Moose The Mooche", composer: "Charlie Parker", key: "Bb", form: "AABA", difficulty: 7 },
  { name: "Mr. P.C.", composer: "John Coltrane", key: "Cm", form: "12-bar", difficulty: 4 },
  { name: "My Favorite Things", composer: "Richard Rodgers", key: "Em", form: "AABA", difficulty: 3 },
  { name: "My Foolish Heart", composer: "Victor Young", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "My Funny Valentine", composer: "Richard Rodgers", key: "Cm", form: "AABA", difficulty: 3 },
  { name: "My Little Suede Shoes", composer: "Charlie Parker", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "My One And Only Love", composer: "Guy Wood", key: "C", form: "Through", difficulty: 4 },
  { name: "My Romance", composer: "Richard Rodgers", key: "C", form: "AABA", difficulty: 4 },
  { name: "My Shining Hour", composer: "Harold Arlen", key: "Eb", form: "AABA", difficulty: 4 },

  // ── N ──
  { name: "Naima", composer: "John Coltrane", key: "Ab", form: "Through", difficulty: 6 },
  { name: "Nardis", composer: "Miles Davis", key: "Em", form: "Through", difficulty: 5 },
  { name: "Nature Boy", composer: "Eden Ahbez", key: "Dm", form: "Through", difficulty: 3 },
  { name: "Nica's Dream", composer: "Horace Silver", key: "Bbm", form: "Through", difficulty: 6 },
  { name: "Night And Day", composer: "Cole Porter", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Night In Tunisia", composer: "Dizzy Gillespie", key: "Dm", form: "AABA", difficulty: 7 },
  { name: "Nostalgia In Times Square", composer: "Charles Mingus", key: "Bb", form: "12-bar", difficulty: 5 },
  { name: "Now's The Time", composer: "Charlie Parker", key: "F", form: "12-bar", difficulty: 2 },

  // ── O ──
  { name: "Old Folks", composer: "Willard Robison", key: "C", form: "Through", difficulty: 4 },
  { name: "Oleo", composer: "Sonny Rollins", key: "Bb", form: "AABA", difficulty: 5 },
  { name: "On Green Dolphin Street", composer: "Bronislau Kaper", key: "Eb", form: "AABA", difficulty: 5 },
  { name: "One Note Samba", composer: "Antonio Carlos Jobim", key: "Bb", form: "AABA", difficulty: 3 },
  { name: "Ornithology", composer: "Charlie Parker", key: "G", form: "AABA", difficulty: 7 },
  { name: "Our Love Is Here To Stay", composer: "George Gershwin", key: "G", form: "AABA", difficulty: 3 },
  { name: "Out Of Nowhere", composer: "Johnny Green", key: "G", form: "AABA", difficulty: 4 },

  // ── P ──
  { name: "Passion Dance", composer: "McCoy Tyner", key: "Fm", form: "Through", difficulty: 8 },
  { name: "Peace", composer: "Horace Silver", key: "Bb", form: "Through", difficulty: 6 },
  { name: "Pennies From Heaven", composer: "Arthur Johnston", key: "C", form: "AABA", difficulty: 3 },
  { name: "Pensativa", composer: "Clare Fischer", key: "Dm", form: "Through", difficulty: 6 },
  { name: "Perdido", composer: "Juan Tizol", key: "Bb", form: "AABA", difficulty: 3 },
  { name: "Polka Dots And Moonbeams", composer: "Jimmy Van Heusen", key: "F", form: "AABA", difficulty: 4 },
  { name: "Prelude To A Kiss", composer: "Duke Ellington", key: "D", form: "AABA", difficulty: 5 },

  // ── Q-R ──
  { name: "Quiet Nights Of Quiet Stars", composer: "Antonio Carlos Jobim", key: "Am", form: "Through", difficulty: 3 },
  { name: "Recorda Me", composer: "Joe Henderson", key: "Am", form: "Through", difficulty: 5 },
  { name: "Rhythm-A-Ning", composer: "Thelonious Monk", key: "Bb", form: "AABA", difficulty: 5 },
  { name: "Room 608", composer: "Horace Silver", key: "Fm", form: "Through", difficulty: 5 },
  { name: "Rosetta", composer: "Earl Hines", key: "F", form: "AABA", difficulty: 3 },
  { name: "Round Midnight", composer: "Thelonious Monk", key: "Ebm", form: "AABA", difficulty: 6 },
  { name: "Route 66", composer: "Bobby Troup", key: "F", form: "12-bar", difficulty: 2 },
  { name: "Ruby My Dear", composer: "Thelonious Monk", key: "F", form: "AABA", difficulty: 6 },

  // ── S ──
  { name: "Sack Of Woe", composer: "Cannonball Adderley", key: "F", form: "12-bar", difficulty: 3 },
  { name: "Satin Doll", composer: "Duke Ellington / Billy Strayhorn", key: "C", form: "AABA", difficulty: 2 },
  { name: "Scrapple From The Apple", composer: "Charlie Parker", key: "F", form: "AABA", difficulty: 7 },
  { name: "Secret Love", composer: "Sammy Fain", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Seven Steps To Heaven", composer: "Miles Davis", key: "F", form: "Through", difficulty: 6 },
  { name: "Shadow Of Your Smile", composer: "Johnny Mandel", key: "Em", form: "AABA", difficulty: 4 },
  { name: "Skylark", composer: "Hoagy Carmichael", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "So What", composer: "Miles Davis", key: "Dm", form: "AABA", difficulty: 2 },
  { name: "Softly As In A Morning Sunrise", composer: "Sigmund Romberg", key: "Cm", form: "AABA", difficulty: 4 },
  { name: "Solar", composer: "Miles Davis", key: "Cm", form: "Through", difficulty: 4 },
  { name: "Someday My Prince Will Come", composer: "Frank Churchill", key: "Bb", form: "AABA", difficulty: 3 },
  { name: "Song For My Father", composer: "Horace Silver", key: "Fm", form: "AABA", difficulty: 3 },
  { name: "Sophisticated Lady", composer: "Duke Ellington", key: "Ab", form: "AABA", difficulty: 5 },
  { name: "Spain", composer: "Chick Corea", key: "Bm", form: "Through", difficulty: 7 },
  { name: "Speak Low", composer: "Kurt Weill", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "Speak No Evil", composer: "Wayne Shorter", key: "Cm", form: "Through", difficulty: 8 },
  { name: "Spring Is Here", composer: "Richard Rodgers", key: "Bb", form: "AABA", difficulty: 4 },
  { name: "St. Thomas", composer: "Sonny Rollins", key: "C", form: "Through", difficulty: 3 },
  { name: "Star Eyes", composer: "Don Raye / Gene De Paul", key: "Eb", form: "AABA", difficulty: 5 },
  { name: "Stardust", composer: "Hoagy Carmichael", key: "C", form: "AABA", difficulty: 4 },
  { name: "Stella By Starlight", composer: "Victor Young", key: "Bb", form: "Through", difficulty: 5 },
  { name: "Stolen Moments", composer: "Oliver Nelson", key: "Cm", form: "Through", difficulty: 4 },
  { name: "Stompin' At The Savoy", composer: "Benny Goodman / Chick Webb", key: "Db", form: "AABA", difficulty: 3 },
  { name: "Straight No Chaser", composer: "Thelonious Monk", key: "F", form: "12-bar", difficulty: 3 },
  { name: "Strollin'", composer: "Horace Silver", key: "Bb", form: "Through", difficulty: 4 },
  { name: "Summertime", composer: "George Gershwin", key: "Am", form: "AABA", difficulty: 2 },
  { name: "Sweet Georgia Brown", composer: "Ben Bernie / Maceo Pinkard", key: "F", form: "AABA", difficulty: 3 },

  // ── T ──
  { name: "Take Five", composer: "Paul Desmond", key: "Ebm", form: "AABA", difficulty: 4 },
  { name: "Take The A Train", composer: "Billy Strayhorn", key: "C", form: "AABA", difficulty: 3 },
  { name: "Tenderly", composer: "Walter Gross", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Tenor Madness", composer: "Sonny Rollins", key: "Bb", form: "12-bar", difficulty: 4 },
  { name: "The Days Of Wine And Roses", composer: "Henry Mancini", key: "F", form: "AABA", difficulty: 4 },
  { name: "The Nearness Of You", composer: "Hoagy Carmichael", key: "F", form: "AABA", difficulty: 3 },
  { name: "The Night Has A Thousand Eyes", composer: "Jerry Brainin", key: "G", form: "AABA", difficulty: 5 },
  { name: "The Song Is You", composer: "Jerome Kern", key: "C", form: "AABA", difficulty: 5 },
  { name: "The Way You Look Tonight", composer: "Jerome Kern", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "There Is No Greater Love", composer: "Isham Jones", key: "Bb", form: "AABA", difficulty: 3 },
  { name: "There Will Never Be Another You", composer: "Harry Warren", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "These Foolish Things", composer: "Jack Strachey", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Time Remembered", composer: "Bill Evans", key: "Dm", form: "Through", difficulty: 7 },
  { name: "Triste", composer: "Antonio Carlos Jobim", key: "F", form: "Through", difficulty: 4 },
  { name: "Tune Up", composer: "Miles Davis", key: "D", form: "Through", difficulty: 4 },
  { name: "Turn Out The Stars", composer: "Bill Evans", key: "Dm", form: "Through", difficulty: 7 },

  // ── U-V ──
  { name: "Unit 7", composer: "Sam Jones", key: "Cm", form: "Through", difficulty: 5 },
  { name: "Up Jumped Spring", composer: "Freddie Hubbard", key: "Bb", form: "AABA", difficulty: 6 },
  { name: "Very Early", composer: "Bill Evans", key: "Db", form: "Through", difficulty: 7 },

  // ── W ──
  { name: "Waltz For Debby", composer: "Bill Evans", key: "F", form: "AABA", difficulty: 5 },
  { name: "Watermelon Man", composer: "Herbie Hancock", key: "F", form: "Through", difficulty: 2 },
  { name: "Wave", composer: "Antonio Carlos Jobim", key: "D", form: "Through", difficulty: 4 },
  { name: "Well You Needn't", composer: "Thelonious Monk", key: "F", form: "AABA", difficulty: 5 },
  { name: "West Coast Blues", composer: "Wes Montgomery", key: "Bb", form: "Through", difficulty: 5 },
  { name: "What A Wonderful World", composer: "Bob Thiele / George David Weiss", key: "F", form: "Through", difficulty: 2 },
  { name: "What Is This Thing Called Love", composer: "Cole Porter", key: "Cm", form: "AABA", difficulty: 5 },
  { name: "Whisper Not", composer: "Benny Golson", key: "Cm", form: "AABA", difficulty: 5 },
  { name: "Windows", composer: "Chick Corea", key: "Fm", form: "Through", difficulty: 7 },
  { name: "Witchcraft", composer: "Cy Coleman", key: "F", form: "AABA", difficulty: 3 },
  { name: "Without A Song", composer: "Vincent Youmans", key: "Eb", form: "AABA", difficulty: 4 },
  { name: "Woody'n You", composer: "Dizzy Gillespie", key: "Db", form: "AABA", difficulty: 7 },
  { name: "Work Song", composer: "Nat Adderley", key: "Fm", form: "Through", difficulty: 3 },

  // ── Y ──
  { name: "Yardbird Suite", composer: "Charlie Parker", key: "C", form: "AABA", difficulty: 6 },
  { name: "Yesterdays", composer: "Jerome Kern", key: "Dm", form: "AABA", difficulty: 4 },
  { name: "You And The Night And The Music", composer: "Arthur Schwartz", key: "Cm", form: "AABA", difficulty: 5 },
  { name: "You Don't Know What Love Is", composer: "Don Raye / Gene De Paul", key: "Fm", form: "AABA", difficulty: 5 },
  { name: "You Stepped Out Of A Dream", composer: "Nacio Herb Brown", key: "C", form: "AABA", difficulty: 4 },
  { name: "You'd Be So Nice To Come Home To", composer: "Cole Porter", key: "Am", form: "AABA", difficulty: 4 },
];

async function main() {
  console.log(`Real Book standards to seed: ${REAL_BOOK_STANDARDS.length}`);

  // Check which already exist
  const existing = await pool.query(
    `SELECT name FROM chord_progressions WHERE is_jazz_standard = true`
  );
  const existingNames = new Set(existing.rows.map((r: any) => r.name.toLowerCase()));
  console.log(`Already in database: ${existingNames.size}`);

  // Get the jazz genre ID
  const genreRes = await pool.query(`SELECT id FROM genres WHERE name ILIKE 'jazz' LIMIT 1`);
  const jazzGenreId = genreRes.rows[0]?.id || null;

  // Get 4/4 time signature ID
  const tsRes = await pool.query(`SELECT id FROM time_signatures WHERE value = '4/4' LIMIT 1`);
  const ts44Id = tsRes.rows[0]?.id || null;

  const toInsert = REAL_BOOK_STANDARDS.filter(s => !existingNames.has(s.name.toLowerCase()));
  console.log(`New standards to add: ${toInsert.length}`);

  let inserted = 0;
  let errors = 0;

  for (const s of toInsert) {
    try {
      await pool.query(
        `INSERT INTO chord_progressions (name, composer, key_signature, progression_type, chords, difficulty_level, is_jazz_standard, genre_id, time_signature_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [s.name, s.composer, s.key, s.form, JSON.stringify([]), s.difficulty, true, jazzGenreId, ts44Id]
      );
      inserted++;
    } catch (e: any) {
      errors++;
      if (errors <= 5) console.error(`  ERR: ${s.name} — ${e.message}`);
    }
  }

  console.log(`\nInserted: ${inserted}`);
  console.log(`Errors: ${errors}`);

  const total = await pool.query(`SELECT COUNT(*)::int as c FROM chord_progressions WHERE is_jazz_standard = true`);
  console.log(`\nTotal jazz standards in database: ${Number(total.rows[0].c)}`);

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
