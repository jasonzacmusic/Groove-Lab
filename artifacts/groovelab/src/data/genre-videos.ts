// AUTO-GENERATED — GrooveLab Genre Backing Tracks Database
// Genres with empty arrays = data pending (YouTube quota exhausted)

export type GenreVideo = { id: string; title: string; channel: string };
export type TempoBucket = 'slow' | 'medium' | 'fast' | 'veryFast';

/** Parse BPM from a YouTube title. Returns null if not found. */
export function parseBpm(title: string): number | null {
  // Match patterns like "120 bpm", "120bpm", "BPM 120", "(140 BPM)", "tempo 90"
  const patterns = [
    /(\d{2,3})\s*(?:bpm|BPM)/,
    /(?:bpm|BPM)\s*[:=]?\s*(\d{2,3})/,
    /(?:tempo|Tempo)\s*[:=]?\s*(\d{2,3})/,
    /\((\d{2,3})\s*bpm\)/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 40 && n <= 280) return n;
    }
  }
  return null;
}

/** Bucket a BPM into tempo categories. Slow ≤90, Medium 91-120, Fast 121-150, Very Fast >150. */
export function bpmToBucket(bpm: number | null): TempoBucket {
  if (bpm === null) return 'medium'; // default
  if (bpm <= 90) return 'slow';
  if (bpm <= 120) return 'medium';
  if (bpm <= 150) return 'fast';
  return 'veryFast';
}

/** Heuristic tempo bucketing from title keywords when BPM not present. */
export function bucketFromTitle(title: string): TempoBucket {
  const bpm = parseBpm(title);
  if (bpm !== null) return bpmToBucket(bpm);
  const t = title.toLowerCase();
  if (/\b(slow|ballad|relaxing|chill|mellow|sleepy|ambient)\b/.test(t)) return 'slow';
  if (/\b(burning|fast|uptempo|up-tempo|driving|intense|hard|energetic)\b/.test(t)) return 'fast';
  if (/\b(very fast|burning|breakneck|blazing|frenetic)\b/.test(t)) return 'veryFast';
  return 'medium';
}

/** Get all videos for a genre grouped by tempo bucket. */
export function getGenreByTempo(genre: string): Record<TempoBucket, GenreVideo[]> {
  const all = GENRE_VIDEO_LIBRARY[genre] || [];
  const buckets: Record<TempoBucket, GenreVideo[]> = {
    slow: [], medium: [], fast: [], veryFast: [],
  };
  for (const v of all) buckets[bucketFromTitle(v.title)].push(v);
  return buckets;
}

export const GENRE_VIDEO_LIBRARY: Record<string, GenreVideo[]> = {
  'Blues': [
    { id: 'UcIIXFqTUgs', title: "Chicago Shuffle In A - 12 Bar Blues Backing Track In A", channel: "JJ one EIGHTY" },
    { id: 'XFVw6fPCAkA', title: "12 Bar Blues Backing Track A7", channel: "Guitar Hell:  Music and Guitar Backing Tracks" },
    { id: 'SP7b9qqcT4M', title: "Shuffle 12 Bar Blues in E | Guitar Backing Track", channel: "AUsher Tracks" },
    { id: '8rZMpYHj1w0', title: "Smooth 12 Bar Blues in A | Guitar Backing Track", channel: "AUsher Tracks" },
    { id: 'wlgnfOttRoU', title: "Minor Blues Backing Track  in A minor | 12 Bar Blues", channel: "Jam Along Backing Tracks" },
    { id: 'ZdeGVGg5J_4', title: "Blues Shuffle in E - Guitar Backing Track Jam - Medium Fast Tempo", channel: "Randy Soller" },
    { id: '36X3wecT2z8', title: "Blues in E (90bpm) : Backing track", channel: "Guitare Improvisation" },
    { id: 'vnXVrMbnyLU', title: "Classic 12 Bar Blues in C major | Guitar Backing Track", channel: "AUsher Tracks" },
    { id: 'o5xCVtkOPVc', title: "Blues Shuffle in G : Backing Track", channel: "Guitare Improvisation" },
    { id: 'lFV6mqP7rfY', title: "Blues Shuffle in A", channel: "Guitare Improvisation" },
    { id: 'pCPX38JJBV0', title: "12 Bar Blues in E (backing track)", channel: "Guitare Improvisation" },
    { id: '9yFM0DJTE98', title: "Slow Blues in A Backing Track", channel: "Quist" },
    { id: 'GKX8ToeSpH8', title: "Blues Backing Track in Bb (Slow Blues)", channel: "Quist" },
    { id: 'kd3rqCHZ-q8', title: "Slow Blues Backing Track in G", channel: "Quist" },
    { id: 'TDuQFniqdOI', title: "12 Bar Blues Backing Track in G", channel: "Backing Track" },
    { id: 'y57Vy5PbP6w', title: "12 Bar Blues Backing Track in F", channel: "Backing Track" },
    { id: '8I0KnoaAQGU', title: "Country Blues Backing Track in E", channel: "Quist" },
    { id: 'V5xfEg5eMbc', title: "Slow Jazz Blues Backing Track in Bb", channel: "PRACTICE JAZZ" },
    { id: 'fRPOniXNXj8', title: "Minor Blues Backing Track Am", channel: "Backing Track" },
    { id: '4DuRnkN3Ybw', title: "Medium Shuffle Blues Backing Track in A", channel: "Quist" },
    { id: 'BbqUxN6bvPE', title: "Jazz Blues Backing Track Bb 130bpm", channel: "Backingtracks JAZZ" },
    { id: 'nJ69MHKHoK0', title: "Funky Blues Backing Track in G", channel: "Quist" },
    { id: 'tM1TfZ8-3Eo', title: "Texas Blues Backing Track in A", channel: "Now YOU Shred Backing Tracks" },
  ],
  'Reggae': [
    { id: 'qHej0AIUmAs', title: "Backing track Am Reggae (AM - F - DM - E)", channel: "Backing Track" },
    { id: '_1YdWRmNxzY', title: "Reggae in Dm : Backing Track", channel: "Guitare Improvisation" },
    { id: 'PT-kJLVAw6M', title: "Reggae Backing Track C Major", channel: "Backing Track" },
    { id: 'JMCVqNu3N5Y', title: "IRIE Roots Reggae Jam | Guitar Backing Track In A Minor", channel: "Now YOU Shred Backing Tracks" },
    { id: 'ZRcth7W8_oM', title: "Reggae Backing Track B minor (Bm)", channel: "Backing Track" },
    { id: 's2ixvFplMNk', title: "Reggae Backing Track in D Major 70 BPM, Vol. 1", channel: "Sydney Backing Tracks" },
    { id: 'dwKRh3OM9pk', title: "Happy Reggae Backing Track in C (C Major)", channel: "Backing Track" },
    { id: '8U0mh_Fqs34', title: "Reggae Backing Track in C Major | 80 bpm", channel: "Elite Backing Tracks" },
    { id: 'v6eArn5IDbc', title: "Reggae Backing Track (Cm) | 75 bpm", channel: "Mega Backing Tracks" },
    { id: '2VculWlQYXc', title: "Reggae Blues Jam Backing Track (Bm)", channel: "Quist" },
    { id: 'fezx2FrPQrg', title: "Reggae Backing Track F Minor (fm)", channel: "Backing Track" },
    { id: 'CQShlDkv3Pc', title: "Reggae Backing Track A Minor (am)", channel: "Backing Track" },
    { id: 'sVs3YEwXqhg', title: "Dub Reggae Backing Track Gm (G Minor)", channel: "Backing Track" },
    { id: 'q2OwV3BTItk', title: "Roots Reggae Backing Track Gm - Dm", channel: "Backing Track" },
    { id: 'Km_ADA05SWI', title: "Backing Track Reggae E Minor (EM)", channel: "Backing Track" },
    { id: 'lokzs5KnL4A', title: "Rock Reggae Backing Track in A Minor", channel: "The Track Shack" },
    { id: 'hg6kcvOH5I4', title: "Mellow Reggae Jam Track in A Major \ud83c\udfb8 Guitar Backing Track", channel: "SubFunc Jam Tracks" },
    { id: 'G_9totCKy6U', title: "Reggae BACKING TRACK JAM - c minor", channel: "Backing Tracks Studio" },
    { id: '_y7JCY4TZWI', title: "Reggae One Drop Backing Track | Drum Metronome | 125 BPM", channel: "Pocket Jams" },
    { id: 'v47F3_pe4y4', title: "No Guitar Backing Track - Reggae Am 78 BPM", channel: "BSBacking Track" },
    { id: '1q7Vu-0cEs0', title: "Reggae Blues Backing Track (Am)", channel: "Quist" },
    { id: 'XIFPGMHmxPs', title: "Reggae BLUES Backing Track in G minor", channel: "Sebastien Zunino" },
    { id: 'xi_BUw_9KS4', title: "Slow Reggae Backing Track (C)", channel: "Quist" },
    { id: 'vmH-xBYBQIg', title: "Dub Reggae Backing Track Em Bm", channel: "YT Jam Tracks" },
    { id: 'fkiJy777pLI', title: "C Major Reggae Backing Track 80bpm", channel: "Karl Joensen Guitar" },
    { id: 'jZT69Jyrors', title: "Reggae Bass - Backing Track (BM)", channel: "Ancient Sounds" },
    { id: 'zWeN2lQj2RI', title: "Reggae - Drumless Track | 138 BPM | No Drums | Backing Track Jam For Drummers", channel: "Dagnar Music Jams" },
    { id: 'cyB09Lu9Qx4', title: "Jam with the 420 Riddim: A Drumless Reggae Backing Track", channel: "buffbaffTV" },
  ],
  'Rock': [
    { id: 'rn07fBYqo9A', title: "Rock Guitar Backing Track Jam", channel: "Nick Neblo" },
    { id: 'nEEsfU-PC74', title: "Rock Backing Track Guitar Play-Along", channel: "TGuitar" },
    { id: 'y3DTSp850DU', title: "Rock Guitar Backing Track | Elevated Jam", channel: "Elevated Jam Tracks" },
    { id: 'pvAtxNa8ZvI', title: "Rock Guitar Backing Track Jam Play-Along", channel: "JamTracksChannel" },
    { id: 'BNVbWDIT4eo', title: "Rock Pop Backing Track Guitar", channel: "TGuitar" },
    { id: '78-nA8U6Rj8', title: "Rock Pop Backing Track A Major | A E Bm D | 80 BPM", channel: "TGuitar" },
    { id: 'qmlHtyS_P8k', title: "Rock Backing Track Guitar Jam Play-Along", channel: "Nick Neblo" },
    { id: 'cVxQpBlOIzM', title: "Rock Guitar Backing Track Jam", channel: "Now YOU Shred Backing Tracks" },
  ],
  'Pop': [
    { id: 'tSM40GlyFvk', title: "Pop Guitar Backing Track Play-Along", channel: "Guitars Playbacks" },
    { id: '5j0sBFLM8Bg', title: "Pop Rock Guitar Backing Track", channel: "Now YOU Shred Backing Tracks" },
    { id: 'JttlFZzL814', title: "Pop Guitar Backing Track Play-Along", channel: "My Backing Track" },
    { id: 'BNVbWDIT4eo', title: "Pop Rock Backing Track Guitar", channel: "TGuitar" },
    { id: 'HoR-wGfJU08', title: "Rock Pop Backing Track D Major | D A Em G | 80 BPM", channel: "TGuitar" },
    { id: 'GWyEe3pqZiQ', title: "Pop Guitar Backing Track Play-Along", channel: "Nuson B-Track" },
    { id: '3stpZKNF_jQ', title: "Pop Rock Backing Track Guitar Play-Along", channel: "TGuitar" },
  ],
  'Folk': [
    { id: '0IWW9-vm3Ro', title: "Acoustic Folk Guitar Backing Track Play-Along", channel: "reinhold tracks" },
    { id: 'jMGHdi9zhOY', title: "Folk Acoustic Backing Track Play-Along", channel: "Tom Bailey Backing Tracks" },
    { id: 'lSGD8A8PKtM', title: "Folk Acoustic Backing Track Play-Along", channel: "Nuson B-Track" },
    { id: 'wG6HBu0XpwM', title: "Acoustic Folk Guitar Backing Track Jam", channel: "Suke Cerulo" },
    { id: '8vLt5XtFaWk', title: "Folk Acoustic Guitar Backing Track Jam", channel: "Nick Neblo" },
    { id: 'ML5jkVWL_NA', title: "Folk Acoustic Backing Track Play-Along", channel: "reinhold tracks" },
  ],
  'Fusion': [
    { id: 'w4x05O_4myE', title: "Modern Jazz Fusion Guitar Backing Track in Bm", channel: "Jam Along Backing Tracks" },
    { id: '8nyxKGDa2oU', title: "Spacey Fusion Guitar Backing Track in C# Minor", channel: "Jam'in Backing Tracks" },
    { id: 'NGHux5lJBX4', title: "Fusion Groove Guitar Backing Track in F# Minor", channel: "Jam'in Backing Tracks" },
    { id: 'RrvAvqZVpgo', title: "Fusion / Jazz Funk Guitar Backing Track in Gm", channel: "JamTracksChannel" },
    { id: 'feYvzdklpWk', title: "Jazz Funk Fusion / Backing Track (Em 106 BPM)", channel: "slohan RECORDS" },
    { id: '3MvJ0bW3osE', title: "Fusion Backing Track in C Minor", channel: "Backing Track" },
    { id: 'gwnKhukDyf0', title: "Funky Jazz Fusion Backing Track in G", channel: "Quist" },
  ],
  'Odd Meter': [
    { id: 'RX4PFKBvV5s', title: "Odd Meter Backing Track 7/8 - 148 bpm", channel: "Dagnar Music Jams" },
    { id: 'asi4MJuKgvA', title: "5/4 Odd Time Signature Backing Track Play-Along", channel: "Theodore Ziras" },
    { id: '3hWSByjKPzs', title: "7/8 Odd Time Signature Backing Track Play-Along", channel: "Theodore Ziras" },
    { id: 'ZWO_ShHDvn0', title: "5/4 Odd Meter Backing Track Play-Along", channel: "Inspire: Backing Tracks" },
    { id: 'WNYRewVFaRs', title: "Odd Meter 7/8 Backing Track Jam", channel: "Dagnar Music Jams" },
    { id: '-OB7WTVuJ4U', title: "5/4 Odd Time Signature Backing Track", channel: "Michele Paternoster" },
  ],
  'Jazz': [
    { id: 'Mss0u20GmBo', title: "Jazz Guitar Backing Track 2 - 5 - 1 | C Major (Medium Swing)", channel: "Etienne de Loriol - Guitar Lessons" },
    { id: 'FZpHCjCY-9w', title: "[BackingTrack] Jazz Swing ii-V-i A minor BPM180", channel: "Studio Closet" },
    { id: '-ae_tBkCqeQ', title: "Bb Blues (110bpm) : Backing track", channel: "Guitare Improvisation" },
    { id: 'B2y30snlNTo', title: "Swing Jazz Walks in D major | Guitar Backing Track", channel: "AUsher Tracks" },
    { id: 'UGCxrt7Gcb4', title: "Minor Swing (160 bpm) (Old Style) - Gypsy jazz Backing track / Jazz manouche", channel: "Guitare Improvisation" },
    { id: 'DOWAaukVfTg', title: "Beautiful Love (Jazz/Swing feel) : Backing Track", channel: "Guitare Improvisation" },
    { id: '5XdjRYtHe2M', title: "Swing Jazz Backing Track in C Major | 140bpm", channel: "Elite Backing Tracks" },
    { id: 'H0j_xIm4fW0', title: "Jazz Bossa Nova C minor | Guitar Jam Track", channel: "AUsher Tracks" },
    { id: 'M46i3p5xBy8', title: "Bb Blues (Jazz/Swing feel) 170 bpm : Backing Track", channel: "Guitare Improvisation" },
    { id: 'NZht6wLcNTA', title: "Soulful SMOOTH JAZZ Backing Track in E minor (Blues &amp; Altered Scale Diagrams)", channel: "Pocket Jam Tracks" },
    { id: 'AE99pL-9AtE', title: "II V I in all keys - Backing Track", channel: "Lucciano Pizzichini" },
    { id: 'L9PeqG9C5os', title: "Jazz Backing Track | II-V-I | C major", channel: "Backing Tracks Channel" },
    { id: 'vk01tpTI3Ig', title: "Miles Davis - So What (Backing Track)", channel: "Miles Guitar Archives" },
    { id: '8nyxKGDa2oU', title: "Jazz Swing Backing Track in F Major", channel: "PRACTICE JAZZ" },
    { id: 'KJvFM1uS8ew', title: "Fly Me To The Moon (Jazz/Swing feel) : Backing Track", channel: "Guitare Improvisation" },
    { id: 'P2KuJCZuEso', title: "Take Five (Paul Desmond) : Backing Track", channel: "Guitare Improvisation" },
    { id: 'zuoM8OgGcXw', title: "Cantaloupe Island (114bpm) : Backing track", channel: "Guitare Improvisation" },
    { id: 'ftimPWSbR6M', title: "Jazz Backing Track - Maiden Voyage", channel: "Eagleheart Jazz Channel" },
    { id: 'j1XQUE6GVpY', title: "Satin Doll (Duke Ellington) : Backing Track", channel: "Guitare Improvisation" },
    { id: 'xEfrbn8XAfI', title: "Straight, No Chaser Backing Track", channel: "BaBoSound" },
    { id: 'WAbMcq7bmA8', title: "Stella by Starlight : Backing track", channel: "Guitare Improvisation" },
    { id: 'Xjf2kiDO19Y', title: "Autumn Leaves (120 bpm) : Backing track", channel: "Guitare Improvisation" },
    { id: '7H7Xg6U7P5g', title: "Blue Bossa (150bpm) : Backing track", channel: "Guitare Improvisation" },
  ],
  'Funk': [
    { id: '8pKr3j6qnm4', title: "\ud834\udd22 FUNK Backing Track - No Bass - Backing track for bass. 95 BPM in A. #backingtrack", channel: "JunzBass \ud834\udd22 Backing Tracks" },
    { id: 'D7SPz5B-54k', title: "Funk Groove Jam for\u3010Bass\u3011E Minor BPM103 | No Bass Backing Track", channel: "Music Jam Tracks" },
    { id: 'k1aER0GGcs0', title: "Funk Guitar Backing Track in C Minor", channel: "Jam'in Backing Tracks" },
    { id: 'X-KIYkieLzk', title: "Cosmic Funk Backing Track For Bass (Em)", channel: "Backing Tracks Channel" },
    { id: 'TKbNUqF_-X8', title: "\ud83c\udfb8 Nasty Funk Jam Track | Guitar Backing Track (D Minor)", channel: "Now YOU Shred Backing Tracks" },
    { id: 'EppDg69I6KY', title: "Easy Groove Jam for\u3010Bass\u3011C Major BPM88 | No Bass Backing Track", channel: "Music Jam Tracks" },
    { id: 'nGsJ2rsHuLY', title: "Soulful Jam For\u3010Bass\u3011G Major 80BPM | No Bass BackingTrack.", channel: "Music Jam Tracks" },
    { id: 'ShK1Ew1qHiw', title: "R&amp;B Groove Jam for\u3010Bass\u3011G Major BPM115 | No Bass Backing Track", channel: "Music Jam Tracks" },
    { id: '6ZQEdV0L334', title: "Sticky Funk Rock | Backing Track Jam in E MINOR | 91 BPM", channel: "minimalist guitar" },
    { id: '4MPYRltRx3w', title: "Funk Bass Backing Track (Gm)", channel: "Quist" },
    { id: '3MvJ0bW3osE', title: "Funk Backing Track in C Minor", channel: "Backing Track" },
    { id: 'gwnKhukDyf0', title: "Funky Groove Backing Track in G", channel: "Quist" },
    { id: 'h2r-5nMBbFk', title: "Funk Jam Track in Em - No Bass", channel: "JamTracksChannel" },
    { id: 'mMVQlEi5koc', title: "Funk Backing Track - Dm", channel: "Backing Track" },
    { id: 'v0oRz-g-Agk', title: "Funky Groove in E - Guitar Backing Track", channel: "Jam'in Backing Tracks" },
    { id: 'ADcYDNTpqOM', title: "Funk Backing Track Am No Bass", channel: "Backing Track" },
    { id: 'GxHxH_SfK6k', title: "Hard Funk Groove Backing Track E Minor", channel: "Now YOU Shred Backing Tracks" },
    { id: '8RJQAO0hHt8', title: "Funky Groove Jam Track in Gm", channel: "JamTracksChannel" },
    { id: 'PbsEStMYsGo', title: "Smooth Funk Backing Track in D Minor", channel: "Jam Along Backing Tracks" },
    { id: 'lM-sWoqXkOs', title: "Funk Groove Backing Track Bm", channel: "Backing Track" },
    { id: 'qj4vOQoOXqI', title: "Old School Funk Backing Track in E", channel: "Quist" },
    { id: 'yHXaVi0MLKQ', title: "Funky Soul Backing Track in A", channel: "Now YOU Shred Backing Tracks" },
    { id: 'ZWVNjFP4OV8', title: "Funk Backing Track Cm", channel: "Backing Track" },
  ],
  'Latin': [
    { id: 'eg9nGzi3QGU', title: "Latin Jazz Fusion Jam Track in C minor 'Cascara Mascara'", channel: "Ben's Jam Tracks" },
    { id: 'H0j_xIm4fW0', title: "Jazz Bossa Nova C minor | Guitar Jam Track", channel: "AUsher Tracks" },
    { id: '4riDIWsISjI', title: "BOSSA NOVA (2516) Backing track in C Major", channel: "HW MUSIC" },
    { id: 'lTNy2Wo69b4', title: "Latin Jazz backing track in Dm", channel: "FooTracks" },
    { id: 'wHvfV918PNo', title: "Fast Blue Bossa Groove in Cm – Latin Jazz Backing Track (Tempo 180)", channel: "PRACTICE JAZZ" },
    { id: 'ntVuMhZ3-xM', title: "Latin Bossa n.1 in A Minor - Backing Track with Real Instruments", channel: "Jam4All - Backing Tracks" },
    { id: 'ugbYCEYITxw', title: "Salsa Backing Track for improvisation in A minor", channel: "Salsa Backing Track" },
    { id: 'fRt2XRSKUcI', title: "Latin Groove Backing Track in Am", channel: "Sebastien Zunino" },
    { id: 'jdRbmN-isHQ', title: "[BackingTrack] Bossanova 1-6-2-5 in D major", channel: "Studio Closet" },
  ],
  'Soul': [
    { id: '55MTcCE6ZIk', title: "Deep Soul Groove Backing Track in A Minor", channel: "Jamanji Backing Tracks" },
    { id: 'einl3CzAp1E', title: "Soul Guitar Backing Track Play-Along", channel: "Sebastien Zunino" },
    { id: 'jw5rxl2c1bI', title: "Smooth Neo Soul Guitar Backing Track in E | Jam Track", channel: "Jam It! Backing Tracks" },
    { id: 'ICPydA4Y5ro', title: "Soul Guitar Backing Track Jam", channel: "Now YOU Shred Backing Tracks" },
    { id: '4cs1NwbZp2w', title: "Soul Guitar Backing Track Play-Along", channel: "Freddie Edwards" },
    { id: 'pjyzyRB5T5Y', title: "Soul Groove Backing Track Play-Along", channel: "Jamanji Backing Tracks" },
    { id: 'dJ65mSwyldM', title: "Soulful Gospel Blues Backing Track for Guitar in C", channel: "JamTrax Productions" },
    { id: 'SqcuZ-XW0cM', title: "Soul Guitar Backing Track Jam Play-Along", channel: "Sebastien Zunino" },
  ],
  'Gospel': [
    { id: 'dJ65mSwyldM', title: "Soulful Gospel Blues Backing Track for Guitar in C", channel: "JamTrax Productions" },
    { id: 'BGE7axEK7G8', title: "D major Ambient Worship - Backing Track - 68 Bpm", channel: "WillMax JamTracks" },
    { id: 'fndMF41pcRA', title: "Soulful Blues Gospel Backing Track in G", channel: "Nashville Jam Tracks" },
    { id: 'u8bsQmi3MMU', title: "Modern Worship Backing Track | 1 5 6 4 in E Major", channel: "Worship Guitar Skills" },
    { id: 'sXdODL-w2R4', title: "Smooth Soul Gospel Backing Track Cm", channel: "EssentialBackingTracks" },
    { id: 'MEz0eQZW8Lw', title: "Gospel Hip Hop Jam For Bass C minor 100bpm", channel: "Music Jam Tracks" },
  ],
  'Afrobeat': [
    { id: 'XYlFFrLsLfE', title: "Afrobeat Funk 'Fufu' Guitar Jam Track in A Dorian", channel: "Petti Music Studios" },
    { id: 'Ez34vrYSN4c', title: "Afro Jazz Groove Backing Track in G Dorian", channel: "Petti Music Studios" },
    { id: '5Cu9_vJAgiE', title: "Afrobeat Jazz Funk Guitar Backing Track Jam in Eb Minor Dorian", channel: "Petti Music Studios" },
    { id: 'BowxsStOtoY', title: "Afrobeat Backing Track | Drum Metronome | 100 BPM", channel: "Pocket Jams" },
    { id: '41uooxLTFgU', title: "Afrobeat Drumless Backing Track Play-Along", channel: "Drumless Backing Tracks" },
    { id: 'jxhuRdY8XlA', title: "Afrobeat Funk 'Okra Man' Guitar Jam Track in E Dorian", channel: "Petti Music Studios" },
    { id: 'vXgFA7KJyhw', title: "Afrobeat Pop Backing Track (A Minor) - 'Eh Ya'", channel: "Jam Track Paradise I Guitar" },
    { id: 'ykALVWo7fDs', title: "Afrobeat Funk Backing Track in C Minor Dorian", channel: "Petti Music Studios" },
  ],
  'Drums & Percussion': [
    { id: 'nfwaDgXvjnk', title: "Drum Groove Backing Track Play-Along", channel: "JunzBass Backing Tracks" },
    { id: '85ZptB9kgaM', title: "Drum Groove Backing Track Jam", channel: "Jim Dooley" },
    { id: 's6tj2t8Fd68', title: "Drums Percussion Backing Track Play-Along", channel: "Drums Percussion Tracks" },
    { id: '8ceiFrrHlbI', title: "Drum Groove Backing Track Beat", channel: "FrogBot Beats" },
    { id: '2fqzbwsy4nA', title: "Percussion Groove Backing Track Jam", channel: "Jim Dooley" },
    { id: 'j9W48wMny6w', title: "Drum Groove Backing Track Play-Along Jam", channel: "Jam'in Backing Tracks" },
    { id: 'vRJfV4pG3Do', title: "Drum Groove Backing Track Play-Along", channel: "Backing Tracks Channel" },
  ],
};

// Genre video counts: Blues:23, Reggae:28, Rock:8, Pop:7, Folk:6, Fusion:7, Odd Meter:6, Jazz:23, Funk:23, Latin:9, Soul:8, Gospel:6, Afrobeat:8, Drums & Percussion:7