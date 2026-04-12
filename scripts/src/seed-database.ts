import pg from "pg";
import * as fs from "node:fs";
import * as path from "node:path";

const { Pool } = pg;

const DATA_DIR = path.resolve(import.meta.dirname, "../../data");

interface SeedChordProgression {
  name: string;
  chords: { symbol: string; beats: number }[];
  key: string;
  timeSignature: string;
  genre: string;
  difficulty: number;
  composer: string;
}

interface JazzStandard {
  title: string;
  composer: string;
  yearComposed: number;
  commonKeys: string[];
  timeSignature: string;
  form: string;
  bars: number;
  difficulty: number;
  genreTags: string[];
}

(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // ── Time Signatures ────────────────────────────────────────────────────────
    const timeSignatureRows = [
      [4, 4, "4/4", "simple", 1],
      [3, 4, "3/4", "simple", 2],
      [2, 4, "2/4", "simple", 3],
      [6, 8, "6/8", "compound", 4],
      [12, 8, "12/8", "compound", 5],
      [5, 4, "5/4", "odd", 6],
      [7, 8, "7/8", "odd", 7],
      [9, 8, "9/8", "compound", 8],
      [2, 2, "2/2", "simple", 9],
    ] as const;

    let tsInserted = 0;
    for (const [numerator, denominator, displayName, category, sortOrder] of timeSignatureRows) {
      const res = await pool.query(
        `INSERT INTO time_signatures (numerator, denominator, display_name, category, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [numerator, denominator, displayName, category, sortOrder],
      );
      tsInserted += res.rowCount ?? 0;
    }
    console.log(`Inserted ${tsInserted} time signatures`);

    // ── Feels ──────────────────────────────────────────────────────────────────
    const feelsRows = [
      ["Straight", "Steady, even subdivisions", 1],
      ["Swing", "Triplet-based feel common in jazz", 2],
      ["Shuffle", "Similar to swing with a heavier bounce", 3],
      ["Half-Time", "Snare on beat 3 for spacious feel", 4],
      ["Double-Time", "Fast subdivision feel", 5],
      ["Laid-Back", "Behind the beat, relaxed pocket", 6],
      ["Driving", "Aggressive, on-top-of-beat energy", 7],
      ["Syncopated", "Off-beat accents and anticipations", 8],
      ["Linear", "No two limbs hitting simultaneously", 9],
      ["Ghost Note Heavy", "Subtle ghost notes between main beats", 10],
      ["Train Beat", "Country/folk train rhythm", 11],
    ] as const;

    let feelsInserted = 0;
    for (const [name, description, sortOrder] of feelsRows) {
      const res = await pool.query(
        `INSERT INTO feels (name, description, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, description, sortOrder],
      );
      feelsInserted += res.rowCount ?? 0;
    }
    console.log(`Inserted ${feelsInserted} feels`);

    // ── Genres ─────────────────────────────────────────────────────────────────
    // Insert top-level genres first (parentGenreId = null)
    const topLevelGenres = [
      ["Jazz", 1],
      ["Blues", 2],
      ["Funk", 3],
      ["Neo-Soul", 4],
      ["R&B", 5],
      ["Gospel", 6],
      ["Rock", 7],
      ["Pop", 8],
      ["Latin", 9],
      ["Afro-Cuban", 13],
      ["Afrobeat", 14],
      ["Reggae", 15],
      ["Hip-Hop", 16],
      ["Drum & Bass", 17],
      ["Electronic", 18],
      ["Classical", 19],
      ["World", 20],
      ["Country", 21],
      ["Fusion", 22],
      ["Progressive", 23],
      ["Metal", 24],
      ["Ska", 25],
    ] as const;

    let genresInserted = 0;
    for (const [name, sortOrder] of topLevelGenres) {
      const res = await pool.query(
        `INSERT INTO genres (name, parent_genre_id, sort_order)
         VALUES ($1, NULL, $2)
         ON CONFLICT (name) DO NOTHING`,
        [name, sortOrder],
      );
      genresInserted += res.rowCount ?? 0;
    }

    // Get Latin's ID for sub-genres
    const latinResult = await pool.query(`SELECT id FROM genres WHERE name = 'Latin'`);
    const latinId = latinResult.rows[0]?.id;

    if (latinId) {
      const latinSubGenres = [
        ["Bossa Nova", latinId, 10],
        ["Samba", latinId, 11],
        ["Salsa", latinId, 12],
      ] as const;

      for (const [name, parentId, sortOrder] of latinSubGenres) {
        const res = await pool.query(
          `INSERT INTO genres (name, parent_genre_id, sort_order)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO NOTHING`,
          [name, parentId, sortOrder],
        );
        genresInserted += res.rowCount ?? 0;
      }
    }
    console.log(`Inserted ${genresInserted} genres`);

    // ── Instrument Types ───────────────────────────────────────────────────────
    const instrumentRows = [
      ["Full Kit", "Acoustic", 1],
      ["Electronic Kit", "Electronic", 2],
      ["Cajon", "Percussion", 3],
      ["Congas", "Percussion", 4],
      ["Bongos", "Percussion", 5],
      ["Djembe", "Percussion", 6],
      ["Timbales", "Percussion", 7],
      ["Hand Percussion", "Percussion", 8],
      ["Brush Kit", "Acoustic", 9],
      ["Hybrid Kit", "Hybrid", 10],
    ] as const;

    let instrumentsInserted = 0;
    for (const [name, category, sortOrder] of instrumentRows) {
      const res = await pool.query(
        `INSERT INTO instrument_types (name, category, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, category, sortOrder],
      );
      instrumentsInserted += res.rowCount ?? 0;
    }
    console.log(`Inserted ${instrumentsInserted} instrument types`);

    // ── Content Types ──────────────────────────────────────────────────────────
    const contentTypeRows = [
      ["Drum Loop", "drum", 1],
      ["Backing Track", "music", 2],
      ["Play-Along", "play-circle", 3],
      ["Drum Fill", "zap", 4],
      ["Rudiment", "book", 5],
      ["Solo", "star", 6],
      ["Groove Breakdown", "search", 7],
      ["MIDI Pattern", "cpu", 8],
      ["Performance", "video", 9],
      ["Tutorial", "graduation-cap", 10],
    ] as const;

    let contentTypesInserted = 0;
    for (const [name, icon, sortOrder] of contentTypeRows) {
      const res = await pool.query(
        `INSERT INTO content_types (name, icon, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, icon, sortOrder],
      );
      contentTypesInserted += res.rowCount ?? 0;
    }
    console.log(`Inserted ${contentTypesInserted} content types`);

    // ── Build lookup maps ──────────────────────────────────────────────────────
    const tsLookup = new Map<string, { id: number; numerator: number }>();
    const tsRows = await pool.query(`SELECT id, display_name, numerator FROM time_signatures`);
    for (const row of tsRows.rows) {
      tsLookup.set(row.display_name as string, { id: row.id as number, numerator: row.numerator as number });
    }

    const genreLookup = new Map<string, number>();
    const genreRows = await pool.query(`SELECT id, name FROM genres`);
    for (const row of genreRows.rows) {
      genreLookup.set(row.name as string, row.id as number);
    }

    // ── Chord Progressions from seed-data.json ─────────────────────────────────
    const seedDataPath = path.join(DATA_DIR, "seed-data.json");
    const seedData: SeedChordProgression[] = JSON.parse(
      fs.readFileSync(seedDataPath, "utf-8"),
    );

    let progressionsInserted = 0;
    for (const prog of seedData) {
      const tsEntry = tsLookup.get(prog.timeSignature);
      const genreId = genreLookup.get(prog.genre) ?? null;
      const timeSignatureId = tsEntry?.id ?? null;

      const res = await pool.query(
        `INSERT INTO chord_progressions
           (name, progression_type, chords, key_signature, time_signature_id, genre_id, difficulty_level, is_jazz_standard, composer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          prog.name,
          "standard",
          JSON.stringify(prog.chords),
          prog.key,
          timeSignatureId,
          genreId,
          prog.difficulty,
          false,
          prog.composer,
        ],
      );
      progressionsInserted += res.rowCount ?? 0;
    }
    console.log(`Inserted ${progressionsInserted} chord progressions from seed-data.json`);

    // ── Jazz Standards from jazz-standards-master.json ──────────────────────────
    const jazzPath = path.join(DATA_DIR, "jazz-standards-master.json");
    const jazzData: { standards: JazzStandard[] } = JSON.parse(
      fs.readFileSync(jazzPath, "utf-8"),
    );

    const jazzGenreId = genreLookup.get("Jazz") ?? null;

    let jazzInserted = 0;
    for (const standard of jazzData.standards) {
      const tsEntry = tsLookup.get(standard.timeSignature);
      const timeSignatureId = tsEntry?.id ?? null;
      const numerator = tsEntry?.numerator ?? 4;
      const totalBeats = standard.bars * numerator;

      const chords = [{ chord: standard.form, beats: totalBeats }];

      const res = await pool.query(
        `INSERT INTO chord_progressions
           (name, progression_type, chords, key_signature, time_signature_id, genre_id, difficulty_level, is_jazz_standard, composer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          standard.title,
          "jazz_standard",
          JSON.stringify(chords),
          standard.commonKeys[0],
          timeSignatureId,
          jazzGenreId,
          standard.difficulty,
          true,
          standard.composer,
        ],
      );
      jazzInserted += res.rowCount ?? 0;
    }
    console.log(`Inserted ${jazzInserted} jazz standards from jazz-standards-master.json`);

    console.log("\nSeed complete!");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
