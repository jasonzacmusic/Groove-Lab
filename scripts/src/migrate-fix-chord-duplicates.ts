import pg from "pg";

const { Pool } = pg;

(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log("=== Chord Progression Fix Migration ===\n");

    const TAKE_FIVE_CHORDS = [
      {"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},
      {"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},
      {"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},
      {"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},
      {"chord":"Cbmaj7","beats":4},{"chord":"Abm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},
      {"chord":"Cbmaj7","beats":4},{"chord":"Abm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},
      {"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},
      {"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},{"chord":"Ebm7","beats":4},{"chord":"Bbm7","beats":4},
    ];

    // 1. Fix Take Five if it has < 16 bars (truncated)
    const takeFiveResult = await pool.query(`
      SELECT id, jsonb_array_length(chords) as bar_count
      FROM chord_progressions
      WHERE name = 'Take Five' AND jsonb_array_length(chords) < 16
    `);
    if (takeFiveResult.rows.length > 0) {
      for (const row of takeFiveResult.rows) {
        await pool.query(
          `UPDATE chord_progressions SET chords = $1::jsonb WHERE id = $2`,
          [JSON.stringify(TAKE_FIVE_CHORDS), row.id]
        );
        console.log(`Fixed Take Five: ${row.bar_count} bars → 32 bars (id: ${row.id})`);
      }
    } else {
      console.log("Take Five: already correct (32 bars)");
    }

    // 2. Remove duplicate chord progressions — keep the one with most chords
    const dupsResult = await pool.query(`
      SELECT name, COUNT(*) as cnt
      FROM chord_progressions
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY name
    `);

    if (dupsResult.rows.length === 0) {
      console.log("Duplicates: none found (already clean)");
    } else {
      for (const { name } of dupsResult.rows) {
        const entries = await pool.query(`
          SELECT id, jsonb_array_length(chords) as bar_count
          FROM chord_progressions
          WHERE name = $1
          ORDER BY jsonb_array_length(chords) DESC
        `, [name]);

        const [keep, ...remove] = entries.rows;
        for (const row of remove) {
          await pool.query(`DELETE FROM chord_progressions WHERE id = $1`, [row.id]);
          console.log(`Deleted duplicate '${name}': ${row.bar_count} bars (kept ${keep.bar_count} bars)`);
        }
      }
    }

    // 3. Verify key standards
    const verify = await pool.query(`
      SELECT name, jsonb_array_length(chords) as bars
      FROM chord_progressions
      WHERE name IN ('Autumn Leaves', 'All The Things You Are', 'Take Five')
      ORDER BY name
    `);
    console.log("\n=== Key Standards Verification ===");
    for (const row of verify.rows) {
      console.log(`  ${row.name}: ${row.bars} chord entries`);
    }

    const total = await pool.query(`SELECT COUNT(*) as total FROM chord_progressions`);
    console.log(`\nTotal chord_progressions: ${total.rows[0].total}`);
    console.log("\nMigration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
