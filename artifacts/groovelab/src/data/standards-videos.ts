/**
 * Curated YouTube backing tracks for jazz standards.
 * Each standard maps to one or more videos with channel attribution.
 */

export interface VideoEntry {
  id: string;
  title: string;
  channel: string;
}

export const STANDARDS_BACKING_TRACKS: Record<string, VideoEntry[]> = {
  'Autumn Leaves':                   [
    { id: 'Xjf2kiDO19Y', title: 'Autumn Leaves (120 bpm) - Backing Track', channel: 'Jazz Backing Tracks' },
    { id: 'Ze7YxMeRoFE', title: 'Autumn Leaves - Jazz Backing Track (Gm)', channel: 'Quist Jam Tracks' },
  ],
  'Blue Bossa':                      [
    { id: '7H7Xg6U7P5g', title: 'Blue Bossa (150 bpm) - Backing Track', channel: 'Jazz Backing Tracks' },
    { id: 'Y4vG4ZOMWiM', title: 'Blue Bossa - Bossa Nova Backing Track', channel: 'Quist Jam Tracks' },
  ],
  'All Of Me':                       [
    { id: '0HuIRNWgkAg', title: 'All Of Me - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Fly Me To The Moon':              [
    { id: 'USctbnHFLZE', title: 'Fly Me To The Moon - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Summertime':                      [
    { id: 'aaRxHmUeQC4', title: 'Summertime - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'So What':                         [
    { id: 'vRJfV4pG3Do', title: 'So What - Modal Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Misty':                           [
    { id: 'L9PeqG9C5os', title: 'Misty - Ballad Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'All The Things You Are':          [
    { id: 'ylXk1LBvIqU', title: 'All The Things You Are - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Take Five':                       [
    { id: 'vJnv4bHHxq4', title: 'Take Five (5/4) - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Giant Steps':                     [
    { id: 'FsijyBivMgg', title: 'Giant Steps - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Stella By Starlight':             [
    { id: '7qvZpIKa5aA', title: 'Stella By Starlight - Jazz Backing Track', channel: 'Quist Jam Tracks' },
  ],
  'There Will Never Be Another You': [
    { id: 'kFLJ3OFbWe8', title: 'There Will Never Be Another You - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  "'Round Midnight":                 [
    { id: 'BkE5P8e8yus', title: "'Round Midnight - Jazz Backing Track", channel: 'Jazz Backing Tracks' },
  ],
  'How High The Moon':               [
    { id: 'yxGLRc9y7SE', title: 'How High The Moon - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Body and Soul':                   [
    { id: '2YxTXxJqFag', title: 'Body and Soul - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Cherokee':                        [
    { id: 'j5tSIBJ0Bv0', title: 'Cherokee - Jazz Backing Track', channel: 'Quist Jam Tracks' },
  ],
  'On Green Dolphin Street':         [
    { id: 'lkiHf4zRRFw', title: 'On Green Dolphin Street - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Just Friends':                    [
    { id: '3L-Vx5zrZkA', title: 'Just Friends - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'My Favorite Things':              [
    { id: 'c6EiXeO2HkY', title: 'My Favorite Things - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Confirmation':                    [
    { id: 'eLTc9_oVgrc', title: 'Confirmation - Charlie Parker Backing Track', channel: 'Quist Jam Tracks' },
  ],
  'Maiden Voyage':                   [
    { id: '8jvKMpCtHR8', title: 'Maiden Voyage - Herbie Hancock Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Cantaloupe Island':               [
    { id: 'l-TJjB0F3E4', title: 'Cantaloupe Island - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Watermelon Man':                  [
    { id: 'dYJd5tXb5cE', title: 'Watermelon Man - Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'The Girl from Ipanema':           [
    { id: '4gJU-tP6IYE', title: 'The Girl from Ipanema - Bossa Nova Backing Track', channel: 'Quist Jam Tracks' },
  ],
  'Night in Tunisia':                [
    { id: 'BPHl1F8RQBU', title: 'Night in Tunisia - Jazz Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Footprints':                      [
    { id: 'wCDyGEhyqHs', title: 'Footprints - Wayne Shorter Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Lady Bird':                       [
    { id: 'E4Zt2gUvnwg', title: 'Lady Bird - Jazz Backing Track', channel: 'Quist Jam Tracks' },
  ],
  "Billie's Bounce":                 [
    { id: '4-pheP_USPY', title: "Billie's Bounce - Charlie Parker Backing Track", channel: 'Jazz Backing Tracks' },
  ],
  'Tenor Madness':                   [
    { id: 'dX3k_QDnzs0', title: 'Tenor Madness - Sonny Rollins Backing Track', channel: 'Jazz Backing Tracks' },
  ],
  'Recorda Me':                      [
    { id: 's6xPgDY9JHo', title: 'Recorda Me - Joe Henderson Backing Track', channel: 'Quist Jam Tracks' },
  ],
};
