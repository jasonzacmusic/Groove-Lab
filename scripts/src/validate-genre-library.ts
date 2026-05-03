/**
 * Data quality validator for genre-videos.ts
 * Enforces:
 *   - min 10 tracks per bucket (FAIL)
 *   - min 100 total per genre (FAIL)
 *   - no duplicate IDs within genre (FAIL)
 *   - BPM-vs-bucket consistency for entries whose title has an explicit BPM (FAIL)
 *
 * Run from workspace root:
 *   cd scripts && npx tsx src/validate-genre-library.ts
 */
import {
  GENRES,
  TEMPO_BUCKETS,
  GENRE_VIDEO_LIBRARY_BY_TEMPO,
  parseBpm,
  type TempoBucket,
} from '../../artifacts/groovelab/src/data/genre-videos';

const MIN_PER_BUCKET = 10;
const MIN_TOTAL = 100;

// Allowed BPM ranges per bucket (inclusive). Entries without BPM in title are skipped.
const BUCKET_RANGES: Record<TempoBucket, [number, number]> = {
  slow:     [0,   90],
  medium:   [91,  120],
  fast:     [121, 150],
  veryFast: [151, 280],
};

let failures = 0;

for (const genre of GENRES) {
  const buckets = GENRE_VIDEO_LIBRARY_BY_TEMPO[genre];
  if (!buckets) {
    console.error(`FAIL: Genre '${genre}' not found in library`);
    failures++;
    continue;
  }

  let total = 0;
  const seenIds = new Set<string>();

  for (const bucket of TEMPO_BUCKETS as readonly TempoBucket[]) {
    const tracks = buckets[bucket] ?? [];
    total += tracks.length;
    const [lo, hi] = BUCKET_RANGES[bucket];

    for (const t of tracks) {
      // Duplicate check (FAIL)
      if (seenIds.has(t.id)) {
        console.error(`FAIL: Duplicate ID ${t.id} in ${genre}/${bucket}`);
        failures++;
      }
      seenIds.add(t.id);

      // BPM-vs-bucket consistency (FAIL when title has explicit BPM)
      const bpm = parseBpm(t.title);
      if (bpm !== null && (bpm < lo || bpm > hi)) {
        console.error(
          `FAIL: ${genre}/${bucket} BPM=${bpm} out of [${lo},${hi}] — "${t.title.slice(0, 60)}"`
        );
        failures++;
      }
    }

    if (tracks.length < MIN_PER_BUCKET) {
      console.error(
        `FAIL: ${genre}/${bucket} has ${tracks.length} tracks (min ${MIN_PER_BUCKET})`
      );
      failures++;
    }
  }

  if (total < MIN_TOTAL) {
    console.error(`FAIL: ${genre} total=${total} < ${MIN_TOTAL}`);
    failures++;
  }
}

if (failures === 0) {
  console.log(
    `✓ All ${GENRES.length} genres pass: ${MIN_PER_BUCKET}+ per bucket, ` +
    `${MIN_TOTAL}+ total, no duplicates, BPM-consistent`
  );
  process.exit(0);
} else {
  console.error(`\n${failures} hard failure(s) found`);
  process.exit(1);
}
