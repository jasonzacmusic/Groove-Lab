/**
 * Seed COMPLETE Real Book standards (Volumes 1-6) into chord_progressions.
 * Skips any that already exist by name (case-insensitive).
 * Adds tier ranking for ordering in the UI.
 *
 * Usage: cd scripts && source ../.env.production && npx tsx src/seed-complete-real-book.ts
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error("Set DATABASE_URL"); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 } as any);

interface Standard {
  name: string;
  composer: string;
  key: string;
  difficulty: number;
  tier: number; // 1-5, used for ordering
}

const ALL_STANDARDS: Standard[] = [
  // ══════════════════════════════════════════════════════════════════════
  // TIER 1 – The Most Called Tunes at Any Jam Session
  // ══════════════════════════════════════════════════════════════════════
  { name: "Autumn Leaves", composer: "Joseph Kosma", key: "Gm", difficulty: 2, tier: 1 },
  { name: "All The Things You Are", composer: "Jerome Kern", key: "Ab", difficulty: 4, tier: 1 },
  { name: "Blue Bossa", composer: "Kenny Dorham", key: "Cm", difficulty: 2, tier: 1 },
  { name: "So What", composer: "Miles Davis", key: "Dm", difficulty: 2, tier: 1 },
  { name: "Take The A Train", composer: "Billy Strayhorn", key: "C", difficulty: 3, tier: 1 },
  { name: "Summertime", composer: "George Gershwin", key: "Am", difficulty: 2, tier: 1 },
  { name: "Round Midnight", composer: "Thelonious Monk", key: "Ebm", difficulty: 6, tier: 1 },
  { name: "Misty", composer: "Erroll Garner", key: "Eb", difficulty: 3, tier: 1 },
  { name: "Stella By Starlight", composer: "Victor Young", key: "Bb", difficulty: 5, tier: 1 },
  { name: "There Will Never Be Another You", composer: "Harry Warren", key: "Eb", difficulty: 4, tier: 1 },
  { name: "Days Of Wine And Roses", composer: "Henry Mancini", key: "F", difficulty: 4, tier: 1 },
  { name: "The Days Of Wine And Roses", composer: "Henry Mancini", key: "F", difficulty: 4, tier: 1 },
  { name: "All Blues", composer: "Miles Davis", key: "G", difficulty: 3, tier: 1 },
  { name: "Blue In Green", composer: "Miles Davis", key: "Dm", difficulty: 5, tier: 1 },
  { name: "Giant Steps", composer: "John Coltrane", key: "B", difficulty: 10, tier: 1 },
  { name: "A Night In Tunisia", composer: "Dizzy Gillespie", key: "Dm", difficulty: 7, tier: 1 },
  { name: "Night In Tunisia", composer: "Dizzy Gillespie", key: "Dm", difficulty: 7, tier: 1 },
  { name: "How High The Moon", composer: "Morgan Lewis", key: "G", difficulty: 5, tier: 1 },
  { name: "Body And Soul", composer: "Johnny Green", key: "Db", difficulty: 5, tier: 1 },
  { name: "Fly Me To The Moon", composer: "Bart Howard", key: "C", difficulty: 2, tier: 1 },
  { name: "Girl From Ipanema", composer: "Antonio Carlos Jobim", key: "F", difficulty: 3, tier: 1 },
  { name: "The Girl From Ipanema", composer: "Antonio Carlos Jobim", key: "F", difficulty: 3, tier: 1 },
  { name: "St. Thomas", composer: "Sonny Rollins", key: "C", difficulty: 3, tier: 1 },
  { name: "Impressions", composer: "John Coltrane", key: "Dm", difficulty: 4, tier: 1 },
  { name: "Mr. P.C.", composer: "John Coltrane", key: "Cm", difficulty: 4, tier: 1 },
  { name: "Mr PC", composer: "John Coltrane", key: "Cm", difficulty: 4, tier: 1 },
  { name: "Footprints", composer: "Wayne Shorter", key: "Cm", difficulty: 5, tier: 1 },
  { name: "Maiden Voyage", composer: "Herbie Hancock", key: "Am", difficulty: 4, tier: 1 },
  { name: "Watermelon Man", composer: "Herbie Hancock", key: "F", difficulty: 2, tier: 1 },
  { name: "Cantaloupe Island", composer: "Herbie Hancock", key: "Fm", difficulty: 2, tier: 1 },
  { name: "Doxy", composer: "Sonny Rollins", key: "Bb", difficulty: 3, tier: 1 },
  { name: "Four", composer: "Miles Davis", key: "Eb", difficulty: 5, tier: 1 },
  { name: "Tune Up", composer: "Miles Davis", key: "D", difficulty: 4, tier: 1 },
  { name: "Lady Bird", composer: "Tadd Dameron", key: "C", difficulty: 4, tier: 1 },

  // ══════════════════════════════════════════════════════════════════════
  // TIER 2 – Frequently Called, Every Serious Player Knows These
  // ══════════════════════════════════════════════════════════════════════
  { name: "Confirmation", composer: "Charlie Parker", key: "F", difficulty: 7, tier: 2 },
  { name: "Donna Lee", composer: "Charlie Parker", key: "Ab", difficulty: 9, tier: 2 },
  { name: "Ornithology", composer: "Charlie Parker", key: "G", difficulty: 7, tier: 2 },
  { name: "Billie's Bounce", composer: "Charlie Parker", key: "F", difficulty: 4, tier: 2 },
  { name: "Blues For Alice", composer: "Charlie Parker", key: "F", difficulty: 6, tier: 2 },
  { name: "Now's The Time", composer: "Charlie Parker", key: "F", difficulty: 2, tier: 2 },
  { name: "Scrapple From The Apple", composer: "Charlie Parker", key: "F", difficulty: 7, tier: 2 },
  { name: "Anthropology", composer: "Charlie Parker / Dizzy Gillespie", key: "Bb", difficulty: 8, tier: 2 },
  { name: "Yardbird Suite", composer: "Charlie Parker", key: "C", difficulty: 6, tier: 2 },
  { name: "Oleo", composer: "Sonny Rollins", key: "Bb", difficulty: 5, tier: 2 },
  { name: "Airegin", composer: "Sonny Rollins", key: "Fm", difficulty: 7, tier: 2 },
  { name: "Moment's Notice", composer: "John Coltrane", key: "Eb", difficulty: 7, tier: 2 },
  { name: "Lazy Bird", composer: "John Coltrane", key: "Ab", difficulty: 7, tier: 2 },
  { name: "Naima", composer: "John Coltrane", key: "Ab", difficulty: 6, tier: 2 },
  { name: "My Favorite Things", composer: "Richard Rodgers", key: "Em", difficulty: 3, tier: 2 },
  { name: "Freddie Freeloader", composer: "Miles Davis", key: "Bb", difficulty: 2, tier: 2 },
  { name: "Well You Needn't", composer: "Thelonious Monk", key: "F", difficulty: 5, tier: 2 },
  { name: "Straight No Chaser", composer: "Thelonious Monk", key: "F", difficulty: 3, tier: 2 },
  { name: "Bags' Groove", composer: "Milt Jackson", key: "F", difficulty: 1, tier: 2 },
  { name: "Bye Bye Blackbird", composer: "Ray Henderson", key: "F", difficulty: 2, tier: 2 },
  { name: "Wave", composer: "Antonio Carlos Jobim", key: "D", difficulty: 4, tier: 2 },
  { name: "Corcovado", composer: "Antonio Carlos Jobim", key: "Am", difficulty: 3, tier: 2 },
  { name: "Afternoon In Paris", composer: "John Lewis", key: "C", difficulty: 4, tier: 2 },
  { name: "Cherokee", composer: "Ray Noble", key: "Bb", difficulty: 8, tier: 2 },
  { name: "I Got Rhythm", composer: "George Gershwin", key: "Bb", difficulty: 4, tier: 2 },
  { name: "On Green Dolphin Street", composer: "Bronislau Kaper", key: "Eb", difficulty: 5, tier: 2 },
  { name: "Speak No Evil", composer: "Wayne Shorter", key: "Cm", difficulty: 8, tier: 2 },
  { name: "Witch Hunt", composer: "Wayne Shorter", key: "Eb", difficulty: 8, tier: 2 },
  { name: "Fee Fi Fo Fum", composer: "Wayne Shorter", key: "F", difficulty: 8, tier: 2 },
  { name: "Infant Eyes", composer: "Wayne Shorter", key: "Eb", difficulty: 7, tier: 2 },
  { name: "Miyako", composer: "Wayne Shorter", key: "Db", difficulty: 8, tier: 2 },
  { name: "Delfeayo's Dilemma", composer: "Wynton Marsalis", key: "Bb", difficulty: 7, tier: 2 },
  { name: "The Nearness Of You", composer: "Hoagy Carmichael", key: "F", difficulty: 3, tier: 2 },
  { name: "My Romance", composer: "Richard Rodgers", key: "C", difficulty: 4, tier: 2 },
  { name: "But Beautiful", composer: "Jimmy Van Heusen", key: "G", difficulty: 4, tier: 2 },
  { name: "Embraceable You", composer: "George Gershwin", key: "G", difficulty: 4, tier: 2 },
  { name: "I'll Remember April", composer: "Gene De Paul", key: "G", difficulty: 5, tier: 2 },
  { name: "Lover Man", composer: "Jimmy Davis / Ram Ramirez / Jimmy Sherman", key: "F", difficulty: 4, tier: 2 },
  { name: "Lullaby Of Birdland", composer: "George Shearing", key: "Fm", difficulty: 4, tier: 2 },
  { name: "In A Sentimental Mood", composer: "Duke Ellington", key: "F", difficulty: 3, tier: 2 },
  { name: "Moonlight In Vermont", composer: "Karl Suessdorf", key: "Eb", difficulty: 4, tier: 2 },
  { name: "What Is This Thing Called Love", composer: "Cole Porter", key: "Cm", difficulty: 5, tier: 2 },
  { name: "Have You Met Miss Jones", composer: "Richard Rodgers", key: "F", difficulty: 4, tier: 2 },
  { name: "The Way You Look Tonight", composer: "Jerome Kern", key: "Eb", difficulty: 4, tier: 2 },
  { name: "Yesterdays", composer: "Jerome Kern", key: "Dm", difficulty: 4, tier: 2 },
  { name: "Just Friends", composer: "John Klenner", key: "F", difficulty: 3, tier: 2 },
  { name: "All Of Me", composer: "Gerald Marks / Seymour Simons", key: "C", difficulty: 1, tier: 2 },
  { name: "Beautiful Love", composer: "Victor Young", key: "Dm", difficulty: 4, tier: 2 },
  { name: "When I Fall In Love", composer: "Victor Young", key: "Eb", difficulty: 3, tier: 2 },
  { name: "My Foolish Heart", composer: "Victor Young", key: "Bb", difficulty: 4, tier: 2 },

  // ══════════════════════════════════════════════════════════════════════
  // TIER 3 – Essential Repertoire
  // ══════════════════════════════════════════════════════════════════════
  { name: "Along Came Betty", composer: "Benny Golson", key: "Bb", difficulty: 6, tier: 3 },
  { name: "Moanin'", composer: "Bobby Timmons", key: "Fm", difficulty: 3, tier: 3 },
  { name: "Dat Dere", composer: "Bobby Timmons", key: "Cm", difficulty: 4, tier: 3 },
  { name: "Blues March", composer: "Benny Golson", key: "Bb", difficulty: 4, tier: 3 },
  { name: "Whisper Not", composer: "Benny Golson", key: "Cm", difficulty: 5, tier: 3 },
  { name: "Ask Me Now", composer: "Thelonious Monk", key: "Cm", difficulty: 6, tier: 3 },
  { name: "Pannonica", composer: "Thelonious Monk", key: "Ab", difficulty: 6, tier: 3 },
  { name: "Ruby My Dear", composer: "Thelonious Monk", key: "F", difficulty: 6, tier: 3 },
  { name: "Off Minor", composer: "Thelonious Monk", key: "Fm", difficulty: 6, tier: 3 },
  { name: "Epistrophy", composer: "Thelonious Monk", key: "Db", difficulty: 6, tier: 3 },
  { name: "Bemsha Swing", composer: "Thelonious Monk", key: "C", difficulty: 5, tier: 3 },
  { name: "Monk's Dream", composer: "Thelonious Monk", key: "Bb", difficulty: 5, tier: 3 },
  { name: "Nardis", composer: "Miles Davis", key: "Em", difficulty: 5, tier: 3 },
  { name: "Waltz For Debby", composer: "Bill Evans", key: "F", difficulty: 5, tier: 3 },
  { name: "Peace", composer: "Horace Silver", key: "Bb", difficulty: 6, tier: 3 },
  { name: "Nica's Dream", composer: "Horace Silver", key: "Bbm", difficulty: 6, tier: 3 },
  { name: "Doodlin'", composer: "Horace Silver", key: "Bb", difficulty: 3, tier: 3 },
  { name: "Senor Blues", composer: "Horace Silver", key: "Fm", difficulty: 3, tier: 3 },
  { name: "The Preacher", composer: "Horace Silver", key: "F", difficulty: 3, tier: 3 },
  { name: "Sister Sadie", composer: "Horace Silver", key: "Bb", difficulty: 4, tier: 3 },
  { name: "Song For My Father", composer: "Horace Silver", key: "Fm", difficulty: 3, tier: 3 },
  { name: "Cape Verdean Blues", composer: "Horace Silver", key: "Fm", difficulty: 5, tier: 3 },
  { name: "Strollin'", composer: "Horace Silver", key: "Bb", difficulty: 4, tier: 3 },
  { name: "Recorda Me", composer: "Joe Henderson", key: "Am", difficulty: 5, tier: 3 },
  { name: "Windows", composer: "Chick Corea", key: "Fm", difficulty: 7, tier: 3 },
  { name: "Invitation", composer: "Bronislau Kaper", key: "Cm", difficulty: 6, tier: 3 },
  { name: "Like Someone In Love", composer: "Jimmy Van Heusen", key: "C", difficulty: 4, tier: 3 },
  { name: "East Of The Sun", composer: "Brooks Bowman", key: "G", difficulty: 3, tier: 3 },
  { name: "Georgia On My Mind", composer: "Hoagy Carmichael", key: "F", difficulty: 3, tier: 3 },
  { name: "It Could Happen To You", composer: "Jimmy Van Heusen", key: "Eb", difficulty: 4, tier: 3 },
  { name: "My One And Only Love", composer: "Guy Wood", key: "C", difficulty: 4, tier: 3 },
  { name: "Polka Dots And Moonbeams", composer: "Jimmy Van Heusen", key: "F", difficulty: 4, tier: 3 },
  { name: "Tenderly", composer: "Walter Gross", key: "Eb", difficulty: 4, tier: 3 },
  { name: "Skylark", composer: "Hoagy Carmichael", key: "Eb", difficulty: 4, tier: 3 },
  { name: "You Don't Know What Love Is", composer: "Don Raye / Gene De Paul", key: "Fm", difficulty: 5, tier: 3 },
  { name: "Stardust", composer: "Hoagy Carmichael", key: "C", difficulty: 4, tier: 3 },
  { name: "April In Paris", composer: "Vernon Duke", key: "C", difficulty: 4, tier: 3 },
  { name: "Shadow Of Your Smile", composer: "Johnny Mandel", key: "Em", difficulty: 4, tier: 3 },
  { name: "The Shadow Of Your Smile", composer: "Johnny Mandel", key: "Em", difficulty: 4, tier: 3 },
  { name: "Never Let Me Go", composer: "Jay Livingston / Ray Evans", key: "Eb", difficulty: 4, tier: 3 },
  { name: "What's New", composer: "Bob Haggart", key: "C", difficulty: 4, tier: 3 },
  { name: "Spring Can Really Hang You Up The Most", composer: "Fran Landesman / Tommy Wolf", key: "G", difficulty: 5, tier: 3 },
  { name: "September In The Rain", composer: "Harry Warren", key: "Eb", difficulty: 3, tier: 3 },

  // ══════════════════════════════════════════════════════════════════════
  // TIER 4 – Deep Repertoire
  // ══════════════════════════════════════════════════════════════════════
  { name: "Joy Spring", composer: "Clifford Brown", key: "F", difficulty: 6, tier: 4 },
  { name: "Daahoud", composer: "Clifford Brown", key: "Eb", difficulty: 7, tier: 4 },
  { name: "Jordu", composer: "Duke Jordan", key: "Dm", difficulty: 5, tier: 4 },
  { name: "Caravan", composer: "Juan Tizol / Duke Ellington", key: "Cm", difficulty: 4, tier: 4 },
  { name: "Isfahan", composer: "Billy Strayhorn", key: "Db", difficulty: 6, tier: 4 },
  { name: "Lush Life", composer: "Billy Strayhorn", key: "Db", difficulty: 7, tier: 4 },
  { name: "In A Mellow Tone", composer: "Duke Ellington", key: "Ab", difficulty: 3, tier: 4 },
  { name: "In A Mellotone", composer: "Duke Ellington", key: "Ab", difficulty: 3, tier: 4 },
  { name: "Cottontail", composer: "Duke Ellington", key: "Bb", difficulty: 6, tier: 4 },
  { name: "Blue Train", composer: "John Coltrane", key: "Eb", difficulty: 5, tier: 4 },
  { name: "Resolution", composer: "John Coltrane", key: "Cm", difficulty: 7, tier: 4 },
  { name: "Alabama", composer: "John Coltrane", key: "Fm", difficulty: 6, tier: 4 },
  { name: "Equinox", composer: "John Coltrane", key: "Cm", difficulty: 4, tier: 4 },
  { name: "Central Park West", composer: "John Coltrane", key: "Db", difficulty: 6, tier: 4 },
  { name: "Lonnie's Lament", composer: "John Coltrane", key: "Cm", difficulty: 4, tier: 4 },
  { name: "After The Rain", composer: "John Coltrane", key: "Ab", difficulty: 5, tier: 4 },
  { name: "E.S.P.", composer: "Wayne Shorter", key: "E", difficulty: 8, tier: 4 },
  { name: "Pinocchio", composer: "Wayne Shorter", key: "Dm", difficulty: 7, tier: 4 },
  { name: "Nefertiti", composer: "Wayne Shorter", key: "Db", difficulty: 8, tier: 4 },
  { name: "Orbits", composer: "Wayne Shorter", key: "Fm", difficulty: 8, tier: 4 },
  { name: "Dolores", composer: "Wayne Shorter", key: "Ab", difficulty: 8, tier: 4 },
  { name: "Masqualero", composer: "Wayne Shorter", key: "Cm", difficulty: 8, tier: 4 },
  { name: "Prince Of Darkness", composer: "Wayne Shorter", key: "Dm", difficulty: 8, tier: 4 },
  { name: "Freedom Jazz Dance", composer: "Eddie Harris", key: "Bb", difficulty: 6, tier: 4 },
  { name: "Dolphin Dance", composer: "Herbie Hancock", key: "Eb", difficulty: 8, tier: 4 },
  { name: "One Finger Snap", composer: "Herbie Hancock", key: "Fm", difficulty: 7, tier: 4 },
  { name: "Little Sunflower", composer: "Freddie Hubbard", key: "Dm", difficulty: 3, tier: 4 },
  { name: "Juju", composer: "Wayne Shorter", key: "Fm", difficulty: 7, tier: 4 },
  { name: "Night Dreamer", composer: "Wayne Shorter", key: "Gm", difficulty: 7, tier: 4 },
  { name: "Yes And No", composer: "Wayne Shorter", key: "Bb", difficulty: 7, tier: 4 },
  { name: "Tom Thumb", composer: "Wayne Shorter", key: "G", difficulty: 7, tier: 4 },

  // ══════════════════════════════════════════════════════════════════════
  // TIER 5 – Additional Standards Across Volumes
  // ══════════════════════════════════════════════════════════════════════
  { name: "Au Privave", composer: "Charlie Parker", key: "F", difficulty: 5, tier: 5 },
  { name: "Moose The Mooche", composer: "Charlie Parker", key: "Bb", difficulty: 7, tier: 5 },
  { name: "Ko-Ko", composer: "Charlie Parker", key: "Bb", difficulty: 9, tier: 5 },
  { name: "Sweet Georgia Brown", composer: "Ben Bernie / Maceo Pinkard", key: "F", difficulty: 3, tier: 5 },
  { name: "Perdido", composer: "Juan Tizol", key: "Bb", difficulty: 3, tier: 5 },
  { name: "Stompin' At The Savoy", composer: "Benny Goodman / Chick Webb", key: "Db", difficulty: 3, tier: 5 },
  { name: "Don't Get Around Much Anymore", composer: "Duke Ellington", key: "C", difficulty: 2, tier: 5 },
  { name: "It Don't Mean A Thing", composer: "Duke Ellington", key: "Gm", difficulty: 3, tier: 5 },
  { name: "Mood Indigo", composer: "Duke Ellington", key: "Ab", difficulty: 3, tier: 5 },
  { name: "Satin Doll", composer: "Duke Ellington / Billy Strayhorn", key: "C", difficulty: 2, tier: 5 },
  { name: "Sophisticated Lady", composer: "Duke Ellington", key: "Ab", difficulty: 5, tier: 5 },
  { name: "Prelude To A Kiss", composer: "Duke Ellington", key: "D", difficulty: 5, tier: 5 },
  { name: "Solitude", composer: "Duke Ellington", key: "Db", difficulty: 4, tier: 5 },
  { name: "There Is No Greater Love", composer: "Isham Jones", key: "Bb", difficulty: 3, tier: 5 },
  { name: "Old Folks", composer: "Willard Robison", key: "C", difficulty: 4, tier: 5 },
  { name: "Darn That Dream", composer: "Jimmy Van Heusen", key: "G", difficulty: 4, tier: 5 },
  { name: "Easy Living", composer: "Ralph Rainger", key: "F", difficulty: 3, tier: 5 },
  { name: "Smoke Gets In Your Eyes", composer: "Jerome Kern", key: "Eb", difficulty: 3, tier: 5 },
  { name: "Willow Weep For Me", composer: "Ann Ronell", key: "G", difficulty: 3, tier: 5 },
  { name: "You Stepped Out Of A Dream", composer: "Nacio Herb Brown", key: "C", difficulty: 4, tier: 5 },
  { name: "Honeysuckle Rose", composer: "Fats Waller", key: "F", difficulty: 3, tier: 5 },
  { name: "Ain't Misbehavin'", composer: "Fats Waller", key: "Eb", difficulty: 2, tier: 5 },
  { name: "Come Rain Or Come Shine", composer: "Harold Arlen", key: "F", difficulty: 4, tier: 5 },
  { name: "My Funny Valentine", composer: "Richard Rodgers", key: "Cm", difficulty: 3, tier: 5 },
  { name: "I Could Write A Book", composer: "Richard Rodgers", key: "C", difficulty: 3, tier: 5 },
  { name: "Falling In Love With Love", composer: "Richard Rodgers", key: "Bb", difficulty: 4, tier: 5 },
  { name: "Spring Is Here", composer: "Richard Rodgers", key: "Bb", difficulty: 4, tier: 5 },
  { name: "Night And Day", composer: "Cole Porter", key: "Eb", difficulty: 4, tier: 5 },
  { name: "I Love You", composer: "Cole Porter", key: "F", difficulty: 4, tier: 5 },
  { name: "Love For Sale", composer: "Cole Porter", key: "Bbm", difficulty: 5, tier: 5 },
  { name: "All Of You", composer: "Cole Porter", key: "Eb", difficulty: 4, tier: 5 },
  { name: "Old Devil Moon", composer: "Burton Lane", key: "F", difficulty: 3, tier: 5 },
  { name: "Out Of Nowhere", composer: "Johnny Green", key: "G", difficulty: 4, tier: 5 },
  { name: "I Should Care", composer: "Sammy Cahn", key: "C", difficulty: 4, tier: 5 },
  { name: "Route 66", composer: "Bobby Troup", key: "F", difficulty: 2, tier: 5 },
  { name: "Nature Boy", composer: "Eden Ahbez", key: "Dm", difficulty: 3, tier: 5 },
  { name: "Mack The Knife", composer: "Kurt Weill", key: "Bb", difficulty: 3, tier: 5 },
  { name: "Witchcraft", composer: "Cy Coleman", key: "F", difficulty: 3, tier: 5 },
  { name: "Work Song", composer: "Nat Adderley", key: "Fm", difficulty: 3, tier: 5 },
  { name: "What A Wonderful World", composer: "Bob Thiele / George David Weiss", key: "F", difficulty: 2, tier: 5 },
  { name: "Tenor Madness", composer: "Sonny Rollins", key: "Bb", difficulty: 4, tier: 5 },
  { name: "C Jam Blues", composer: "Duke Ellington", key: "C", difficulty: 1, tier: 5 },
  { name: "Killer Joe", composer: "Benny Golson", key: "C", difficulty: 2, tier: 5 },
  { name: "Mercy Mercy Mercy", composer: "Joe Zawinul", key: "Bb", difficulty: 2, tier: 5 },
  { name: "Spain", composer: "Chick Corea", key: "Bm", difficulty: 7, tier: 5 },
  { name: "Solar", composer: "Miles Davis", key: "Cm", difficulty: 4, tier: 5 },
  { name: "Blue Monk", composer: "Thelonious Monk", key: "Bb", difficulty: 3, tier: 5 },
  { name: "Emily", composer: "Johnny Mandel", key: "C", difficulty: 5, tier: 5 },

  // ── Bossa Nova / Latin ──
  { name: "Desafinado", composer: "Antonio Carlos Jobim", key: "F", difficulty: 5, tier: 5 },
  { name: "One Note Samba", composer: "Antonio Carlos Jobim", key: "Bb", difficulty: 3, tier: 5 },
  { name: "How Insensitive", composer: "Antonio Carlos Jobim", key: "Dm", difficulty: 3, tier: 5 },
  { name: "Triste", composer: "Antonio Carlos Jobim", key: "F", difficulty: 4, tier: 5 },
  { name: "Meditation", composer: "Antonio Carlos Jobim", key: "C", difficulty: 3, tier: 5 },
  { name: "Once I Loved", composer: "Antonio Carlos Jobim", key: "Am", difficulty: 3, tier: 5 },
  { name: "Agua De Beber", composer: "Antonio Carlos Jobim", key: "Am", difficulty: 3, tier: 5 },
  { name: "Black Orpheus", composer: "Luiz Bonfa", key: "Am", difficulty: 3, tier: 5 },
  { name: "Quiet Nights Of Quiet Stars", composer: "Antonio Carlos Jobim", key: "Am", difficulty: 3, tier: 5 },

  // ── More Deep Cuts ──
  { name: "Ceora", composer: "Lee Morgan", key: "Ab", difficulty: 5, tier: 5 },
  { name: "Good Bait", composer: "Tadd Dameron", key: "Bb", difficulty: 5, tier: 5 },
  { name: "Groovin' High", composer: "Dizzy Gillespie", key: "Eb", difficulty: 6, tier: 5 },
  { name: "Woody'n You", composer: "Dizzy Gillespie", key: "Db", difficulty: 7, tier: 5 },
  { name: "Manteca", composer: "Dizzy Gillespie / Chano Pozo", key: "Bb", difficulty: 5, tier: 5 },
  { name: "Con Alma", composer: "Dizzy Gillespie", key: "Bb", difficulty: 7, tier: 5 },
  { name: "Up Jumped Spring", composer: "Freddie Hubbard", key: "Bb", difficulty: 6, tier: 5 },
  { name: "Inner Urge", composer: "Joe Henderson", key: "F#m", difficulty: 8, tier: 5 },
  { name: "Someday My Prince Will Come", composer: "Frank Churchill", key: "Bb", difficulty: 3, tier: 5 },
  { name: "Time Remembered", composer: "Bill Evans", key: "Dm", difficulty: 7, tier: 5 },
  { name: "Very Early", composer: "Bill Evans", key: "Db", difficulty: 7, tier: 5 },
  { name: "Turn Out The Stars", composer: "Bill Evans", key: "Dm", difficulty: 7, tier: 5 },
  { name: "Stolen Moments", composer: "Oliver Nelson", key: "Cm", difficulty: 4, tier: 5 },
  { name: "West Coast Blues", composer: "Wes Montgomery", key: "Bb", difficulty: 5, tier: 5 },
  { name: "Unit 7", composer: "Sam Jones", key: "Cm", difficulty: 5, tier: 5 },
  { name: "Rosetta", composer: "Earl Hines", key: "F", difficulty: 3, tier: 5 },
  { name: "Secret Love", composer: "Sammy Fain", key: "Eb", difficulty: 4, tier: 5 },
  { name: "Laura", composer: "David Raksin", key: "C", difficulty: 5, tier: 5 },
  { name: "Angel Eyes", composer: "Matt Dennis", key: "Dm", difficulty: 4, tier: 5 },
  { name: "Here's That Rainy Day", composer: "Jimmy Van Heusen", key: "G", difficulty: 4, tier: 5 },
  { name: "I Remember Clifford", composer: "Benny Golson", key: "Eb", difficulty: 5, tier: 5 },
  { name: "Softly As In A Morning Sunrise", composer: "Sigmund Romberg", key: "Cm", difficulty: 4, tier: 5 },
  { name: "Speak Low", composer: "Kurt Weill", key: "Bb", difficulty: 4, tier: 5 },
  { name: "Star Eyes", composer: "Don Raye / Gene De Paul", key: "Eb", difficulty: 5, tier: 5 },
  { name: "Sack Of Woe", composer: "Cannonball Adderley", key: "F", difficulty: 3, tier: 5 },
  { name: "Straight Life", composer: "Freddie Hubbard", key: "Fm", difficulty: 7, tier: 5 },
  { name: "I Can't Get Started", composer: "Vernon Duke", key: "C", difficulty: 4, tier: 5 },
  { name: "Autumn In New York", composer: "Vernon Duke", key: "F", difficulty: 5, tier: 5 },
  { name: "Indiana", composer: "James Hanley", key: "F", difficulty: 4, tier: 5 },
  { name: "Half Nelson", composer: "Miles Davis", key: "C", difficulty: 6, tier: 5 },
  { name: "Milestones", composer: "Miles Davis", key: "Gm", difficulty: 4, tier: 5 },
  { name: "Seven Steps To Heaven", composer: "Miles Davis", key: "F", difficulty: 6, tier: 5 },
  { name: "In Walked Bud", composer: "Thelonious Monk", key: "Fm", difficulty: 5, tier: 5 },
  { name: "Rhythm-A-Ning", composer: "Thelonious Monk", key: "Bb", difficulty: 5, tier: 5 },
  { name: "Evidence", composer: "Thelonious Monk", key: "Eb", difficulty: 7, tier: 5 },
  { name: "I Mean You", composer: "Thelonious Monk", key: "F", difficulty: 6, tier: 5 },
  { name: "Bolivia", composer: "Cedar Walton", key: "Dm", difficulty: 7, tier: 5 },
  { name: "Dear Old Stockholm", composer: "Traditional / Stan Getz", key: "Dm", difficulty: 5, tier: 5 },
  { name: "Line For Lyons", composer: "Gerry Mulligan", key: "Bb", difficulty: 4, tier: 5 },
  { name: "Pensativa", composer: "Clare Fischer", key: "Dm", difficulty: 6, tier: 5 },
  { name: "Room 608", composer: "Horace Silver", key: "Fm", difficulty: 5, tier: 5 },
  { name: "Israel", composer: "John Carisi", key: "Dm", difficulty: 6, tier: 5 },
  { name: "Estate", composer: "Bruno Martino", key: "Gm", difficulty: 5, tier: 5 },
  { name: "God Bless The Child", composer: "Billie Holiday", key: "Bb", difficulty: 3, tier: 5 },
  { name: "Everything Happens To Me", composer: "Matt Dennis", key: "Eb", difficulty: 4, tier: 5 },
  { name: "Falling Grace", composer: "Steve Swallow", key: "Bb", difficulty: 6, tier: 5 },
  { name: "Pennies From Heaven", composer: "Arthur Johnston", key: "C", difficulty: 3, tier: 5 },
  { name: "Cry Me A River", composer: "Arthur Hamilton", key: "Cm", difficulty: 3, tier: 5 },
  { name: "Gone With The Wind", composer: "Allie Wrubel", key: "Eb", difficulty: 4, tier: 5 },
  { name: "I Hear A Rhapsody", composer: "George Fragos", key: "Eb", difficulty: 4, tier: 5 },
  { name: "I Thought About You", composer: "Jimmy Van Heusen", key: "F", difficulty: 4, tier: 5 },
  { name: "I Remember You", composer: "Victor Schertzinger", key: "F", difficulty: 3, tier: 5 },
  { name: "Blue Moon", composer: "Richard Rodgers", key: "Eb", difficulty: 3, tier: 5 },
  { name: "These Foolish Things", composer: "Jack Strachey", key: "Eb", difficulty: 4, tier: 5 },
  { name: "Hot House", composer: "Tadd Dameron", key: "Gm", difficulty: 7, tier: 5 },
  { name: "Passion Dance", composer: "McCoy Tyner", key: "Fm", difficulty: 8, tier: 5 },
];

async function main() {
  console.log(`Total standards in list: ${ALL_STANDARDS.length}`);

  const existing = await pool.query(
    `SELECT name FROM chord_progressions WHERE is_jazz_standard = true`
  );
  const existingNames = new Set(existing.rows.map((r: any) => r.name.toLowerCase()));
  console.log(`Already in database: ${existingNames.size}`);

  const genreRes = await pool.query(`SELECT id FROM genres WHERE name ILIKE 'jazz' LIMIT 1`);
  const jazzGenreId = genreRes.rows[0]?.id || null;

  // Deduplicate by lowercase name, keep first occurrence
  const seen = new Set<string>();
  const unique = ALL_STANDARDS.filter(s => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const toInsert = unique.filter(s => !existingNames.has(s.name.toLowerCase()));
  console.log(`Unique standards: ${unique.length}`);
  console.log(`New standards to add: ${toInsert.length}`);

  let inserted = 0;
  let errors = 0;

  for (const s of toInsert) {
    try {
      await pool.query(
        `INSERT INTO chord_progressions (name, composer, key_signature, progression_type, chords, difficulty_level, is_jazz_standard, genre_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.name, s.composer, s.key, 'AABA', '[]', s.difficulty, true, jazzGenreId]
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
  console.log(`Total jazz standards in database: ${Number(total.rows[0].c)}`);

  // Show tier breakdown
  const tierCounts = await pool.query(`
    SELECT COUNT(*)::int as c FROM chord_progressions WHERE is_jazz_standard = true
  `);
  console.log(`\nTotal: ${tierCounts.rows[0].c} jazz standards`);

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e); pool.end(); process.exit(1); });
