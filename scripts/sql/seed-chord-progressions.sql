-- Seed additional chord progressions to give Chord Lab broader coverage.
-- Each row's progression_type maps to a curated video key in
-- artifacts/groovelab/src/data/chord-videos.ts via PROGRESSION_TYPE_TO_VIDEO_KEY,
-- so every seeded progression renders curated YouTube backing tracks.
--
-- Idempotent: skips rows whose (name, key_signature) already exist.
-- Run once after schema migration:
--   psql "$DATABASE_URL" -f scripts/sql/seed-chord-progressions.sql

INSERT INTO chord_progressions
  (name, progression_type, chords, key_signature, time_signature_id, genre_id, difficulty_level, is_jazz_standard)
SELECT * FROM (VALUES
  ('12-Bar Blues in A',     'blues_12bar',    '[{"chord":"A7","beats":16},{"chord":"D7","beats":8},{"chord":"A7","beats":8},{"chord":"E7","beats":4},{"chord":"D7","beats":4},{"chord":"A7","beats":8}]'::jsonb, 'A',  1, 2,  3, false),
  ('12-Bar Blues in E',     'blues_12bar',    '[{"chord":"E7","beats":16},{"chord":"A7","beats":8},{"chord":"E7","beats":8},{"chord":"B7","beats":4},{"chord":"A7","beats":4},{"chord":"E7","beats":8}]'::jsonb, 'E',  1, 2,  3, false),
  ('12-Bar Blues in G',     'blues_12bar',    '[{"chord":"G7","beats":16},{"chord":"C7","beats":8},{"chord":"G7","beats":8},{"chord":"D7","beats":4},{"chord":"C7","beats":4},{"chord":"G7","beats":8}]'::jsonb, 'G',  1, 2,  3, false),
  ('Rhythm Changes in Bb',  'rhythm_changes', '[{"chord":"Bbmaj7","beats":2},{"chord":"G7","beats":2},{"chord":"Cm7","beats":2},{"chord":"F7","beats":2}]'::jsonb,                                             'Bb', 1, 1,  8, true),
  ('I-V-vi-IV in C (Pop)',  'pop',            '[{"chord":"C","beats":4},{"chord":"G","beats":4},{"chord":"Am","beats":4},{"chord":"F","beats":4}]'::jsonb,                                                    'C',  1, 8,  2, false),
  ('I-V-vi-IV in G (Pop)',  'pop',            '[{"chord":"G","beats":4},{"chord":"D","beats":4},{"chord":"Em","beats":4},{"chord":"C","beats":4}]'::jsonb,                                                    'G',  1, 8,  2, false),
  ('Modal — So What',       'modal',          '[{"chord":"Dm7","beats":32},{"chord":"Ebm7","beats":16},{"chord":"Dm7","beats":16}]'::jsonb,                                                                   'Dm', 1, 1,  5, true),
  ('Funk Vamp in E minor',  'funk',           '[{"chord":"Em9","beats":8},{"chord":"A9","beats":8}]'::jsonb,                                                                                                  'Em', 1, 3,  4, false),
  ('Funk Vamp in D minor',  'funk',           '[{"chord":"Dm9","beats":4},{"chord":"G13","beats":4}]'::jsonb,                                                                                                 'Dm', 1, 3,  4, false),
  ('Reggae One Drop in Am', 'reggae',         '[{"chord":"Am","beats":4},{"chord":"F","beats":4},{"chord":"Dm","beats":4},{"chord":"E","beats":4}]'::jsonb,                                                   'Am', 1, 15, 3, false),
  ('Bossa in F (ii-V)',     'latin',          '[{"chord":"Gm7","beats":4},{"chord":"C7","beats":4},{"chord":"Fmaj7","beats":4},{"chord":"Dm7","beats":4}]'::jsonb,                                            'F',  1, 10, 5, false),
  ('Neo-Soul in C minor',   'neo_soul',       '[{"chord":"Cm9","beats":4},{"chord":"Fm11","beats":4},{"chord":"Bb13","beats":4},{"chord":"Ebmaj9","beats":4}]'::jsonb,                                        'Cm', 1, 4,  6, false),
  ('Gospel I-IV-I in G',    'gospel',         '[{"chord":"G","beats":4},{"chord":"C/G","beats":4},{"chord":"G","beats":4},{"chord":"D7","beats":4}]'::jsonb,                                                  'G',  1, 6,  5, false),
  ('R&B 6-4-1-5 in C',      'rnb',            '[{"chord":"Am9","beats":4},{"chord":"Fmaj9","beats":4},{"chord":"Cmaj9","beats":4},{"chord":"G13","beats":4}]'::jsonb,                                         'C',  1, 5,  4, false),
  ('Afrobeat Vamp in Em',   'afrobeat',       '[{"chord":"Em7","beats":8},{"chord":"A7","beats":8}]'::jsonb,                                                                                                  'Em', 1, 14, 4, false)
) AS new_rows(name, progression_type, chords, key_signature, time_signature_id, genre_id, difficulty_level, is_jazz_standard)
WHERE NOT EXISTS (
  SELECT 1 FROM chord_progressions cp
  WHERE cp.name = new_rows.name
    AND cp.key_signature IS NOT DISTINCT FROM new_rows.key_signature
);
