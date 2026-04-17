/**
 * Jazz Standard Melodies — ABC notation for staff rendering + note events for Tone.js playback.
 *
 * ABC notation reference: https://abcnotation.com/wiki/abc:standard:v2.1
 * Each melody is keyed by the standard's name (must match chord_progressions.name).
 *
 * Notes on ABC format:
 * - L:1/8 means default note length is eighth note
 * - C = middle C (C4), c = C5, C, = C3
 * - z = rest, z2 = half rest
 * - | = barline, |: :| = repeat
 */

export interface MelodyNote {
  pitch: string;      // Tone.js note: "C5", "Eb4"
  duration: string;   // Tone.js duration: "4n", "8n", "2n", "4n."
  beat: number;       // Beat offset from start (0-indexed, quarter note = 1 beat)
}

export interface StandardMelody {
  abc: string;
  notes: MelodyNote[];
}

export const STANDARD_MELODIES: Record<string, StandardMelody> = {

  // ═══════════════════════════════════════════════════════════════════
  // ALL OF ME — Gerald Marks / Seymour Simons (Key: C, AABA, 32 bars)
  // ═══════════════════════════════════════════════════════════════════
  'All Of Me': {
    abc: `X:1
T:All Of Me
M:4/4
L:1/8
K:C
|: C4 E2 G2 | c6 z2 | E4 G2 B2 | d6 z2 |
d4 e2 d2 | c4 A2 c2 | B8- | B6 z2 |
A4 c2 e2 | g6 z2 | e4 d2 c2 | B4 A2 G2 |
A4 B2 A2 | G4 E2 C2 | D8- | D6 z2 |
C4 E2 G2 | c6 z2 | E4 G2 B2 | d6 z2 |
d4 e2 d2 | c4 A2 c2 | B8- | B6 z2 |
d4 e2 f2 | e4 d2 c2 | c4 B2 A2 | B4 G2 E2 |
A4 G2 E2 | F4 E2 D2 | C8- | C6 z2 :|`,
    notes: [
      // A section (bars 1-8)
      { pitch: 'C4', duration: '2n', beat: 0 }, { pitch: 'E4', duration: '4n', beat: 2 }, { pitch: 'G4', duration: '4n', beat: 3 },
      { pitch: 'C5', duration: '2n.', beat: 4 },
      { pitch: 'E4', duration: '2n', beat: 8 }, { pitch: 'G4', duration: '4n', beat: 10 }, { pitch: 'B4', duration: '4n', beat: 11 },
      { pitch: 'D5', duration: '2n.', beat: 12 },
      { pitch: 'D5', duration: '2n', beat: 16 }, { pitch: 'E5', duration: '4n', beat: 18 }, { pitch: 'D5', duration: '4n', beat: 19 },
      { pitch: 'C5', duration: '2n', beat: 20 }, { pitch: 'A4', duration: '4n', beat: 22 }, { pitch: 'C5', duration: '4n', beat: 23 },
      { pitch: 'B4', duration: '1n', beat: 24 },
      // A section repeat (bars 9-16)
      { pitch: 'A4', duration: '2n', beat: 32 }, { pitch: 'C5', duration: '4n', beat: 34 }, { pitch: 'E5', duration: '4n', beat: 35 },
      { pitch: 'G5', duration: '2n.', beat: 36 },
      { pitch: 'E5', duration: '2n', beat: 40 }, { pitch: 'D5', duration: '4n', beat: 42 }, { pitch: 'C5', duration: '4n', beat: 43 },
      { pitch: 'B4', duration: '2n', beat: 44 }, { pitch: 'A4', duration: '4n', beat: 46 }, { pitch: 'G4', duration: '4n', beat: 47 },
      { pitch: 'A4', duration: '2n', beat: 48 }, { pitch: 'B4', duration: '4n', beat: 50 }, { pitch: 'A4', duration: '4n', beat: 51 },
      { pitch: 'G4', duration: '2n', beat: 52 }, { pitch: 'E4', duration: '4n', beat: 54 }, { pitch: 'C4', duration: '4n', beat: 55 },
      { pitch: 'D4', duration: '1n', beat: 56 },
      // A section (bars 17-24) — same as bars 1-8
      { pitch: 'C4', duration: '2n', beat: 64 }, { pitch: 'E4', duration: '4n', beat: 66 }, { pitch: 'G4', duration: '4n', beat: 67 },
      { pitch: 'C5', duration: '2n.', beat: 68 },
      { pitch: 'E4', duration: '2n', beat: 72 }, { pitch: 'G4', duration: '4n', beat: 74 }, { pitch: 'B4', duration: '4n', beat: 75 },
      { pitch: 'D5', duration: '2n.', beat: 76 },
      { pitch: 'D5', duration: '2n', beat: 80 }, { pitch: 'E5', duration: '4n', beat: 82 }, { pitch: 'D5', duration: '4n', beat: 83 },
      { pitch: 'C5', duration: '2n', beat: 84 }, { pitch: 'A4', duration: '4n', beat: 86 }, { pitch: 'C5', duration: '4n', beat: 87 },
      { pitch: 'B4', duration: '1n', beat: 88 },
      // Final A (bars 25-32)
      { pitch: 'D5', duration: '2n', beat: 96 }, { pitch: 'E5', duration: '4n', beat: 98 }, { pitch: 'F5', duration: '4n', beat: 99 },
      { pitch: 'E5', duration: '2n', beat: 100 }, { pitch: 'D5', duration: '4n', beat: 102 }, { pitch: 'C5', duration: '4n', beat: 103 },
      { pitch: 'C5', duration: '2n', beat: 104 }, { pitch: 'B4', duration: '4n', beat: 106 }, { pitch: 'A4', duration: '4n', beat: 107 },
      { pitch: 'B4', duration: '2n', beat: 108 }, { pitch: 'G4', duration: '4n', beat: 110 }, { pitch: 'E4', duration: '4n', beat: 111 },
      { pitch: 'A4', duration: '2n', beat: 112 }, { pitch: 'G4', duration: '4n', beat: 114 }, { pitch: 'E4', duration: '4n', beat: 115 },
      { pitch: 'F4', duration: '2n', beat: 116 }, { pitch: 'E4', duration: '4n', beat: 118 }, { pitch: 'D4', duration: '4n', beat: 119 },
      { pitch: 'C4', duration: '1n', beat: 120 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // AUTUMN LEAVES — Joseph Kosma (Key: Gm / Bb, AABA, 32 bars)
  // ═══════════════════════════════════════════════════════════════════
  'Autumn Leaves': {
    abc: `X:1
T:Autumn Leaves
M:4/4
L:1/8
K:Gm
|: c4 d2 e2 | f6 z2 | B4 c2 d2 | e6 z2 |
A4 B2 c2 | d4 c2 B2 | A8- | A6 z2 |
c4 d2 e2 | f6 z2 | B4 c2 d2 | e6 z2 |
A4 B2 c2 | d4 c2 B2 | A8- | A6 z2 |
d4 e2 f2 | g6 z2 | c4 d2 e2 | f6 z2 |
B4 c2 d2 | e4 d2 c2 | A4 B2 G2 | A6 z2 |
d4 c2 B2 | c4 B2 A2 | B4 A2 G2 | A6 z2 |
d4 c2 B2 | A4 G2 F2 | G8- | G6 z2 :|`,
    notes: [
      // A section (bars 1-8)
      { pitch: 'C5', duration: '2n', beat: 0 }, { pitch: 'D5', duration: '4n', beat: 2 }, { pitch: 'E5', duration: '4n', beat: 3 },
      { pitch: 'F5', duration: '2n.', beat: 4 },
      { pitch: 'Bb4', duration: '2n', beat: 8 }, { pitch: 'C5', duration: '4n', beat: 10 }, { pitch: 'D5', duration: '4n', beat: 11 },
      { pitch: 'Eb5', duration: '2n.', beat: 12 },
      { pitch: 'A4', duration: '2n', beat: 16 }, { pitch: 'Bb4', duration: '4n', beat: 18 }, { pitch: 'C5', duration: '4n', beat: 19 },
      { pitch: 'D5', duration: '2n', beat: 20 }, { pitch: 'C5', duration: '4n', beat: 22 }, { pitch: 'Bb4', duration: '4n', beat: 23 },
      { pitch: 'A4', duration: '1n', beat: 24 },
      // A repeat (bars 9-16)
      { pitch: 'C5', duration: '2n', beat: 32 }, { pitch: 'D5', duration: '4n', beat: 34 }, { pitch: 'E5', duration: '4n', beat: 35 },
      { pitch: 'F5', duration: '2n.', beat: 36 },
      { pitch: 'Bb4', duration: '2n', beat: 40 }, { pitch: 'C5', duration: '4n', beat: 42 }, { pitch: 'D5', duration: '4n', beat: 43 },
      { pitch: 'Eb5', duration: '2n.', beat: 44 },
      { pitch: 'A4', duration: '2n', beat: 48 }, { pitch: 'Bb4', duration: '4n', beat: 50 }, { pitch: 'C5', duration: '4n', beat: 51 },
      { pitch: 'D5', duration: '2n', beat: 52 }, { pitch: 'C5', duration: '4n', beat: 54 }, { pitch: 'Bb4', duration: '4n', beat: 55 },
      { pitch: 'A4', duration: '1n', beat: 56 },
      // B section (bars 17-24)
      { pitch: 'D5', duration: '2n', beat: 64 }, { pitch: 'Eb5', duration: '4n', beat: 66 }, { pitch: 'F5', duration: '4n', beat: 67 },
      { pitch: 'G5', duration: '2n.', beat: 68 },
      { pitch: 'C5', duration: '2n', beat: 72 }, { pitch: 'D5', duration: '4n', beat: 74 }, { pitch: 'Eb5', duration: '4n', beat: 75 },
      { pitch: 'F5', duration: '2n.', beat: 76 },
      { pitch: 'Bb4', duration: '2n', beat: 80 }, { pitch: 'C5', duration: '4n', beat: 82 }, { pitch: 'D5', duration: '4n', beat: 83 },
      { pitch: 'Eb5', duration: '2n', beat: 84 }, { pitch: 'D5', duration: '4n', beat: 86 }, { pitch: 'C5', duration: '4n', beat: 87 },
      { pitch: 'A4', duration: '2n', beat: 88 }, { pitch: 'Bb4', duration: '4n', beat: 90 }, { pitch: 'G4', duration: '4n', beat: 91 },
      // Final A (bars 25-32)
      { pitch: 'D5', duration: '2n', beat: 96 }, { pitch: 'C5', duration: '4n', beat: 98 }, { pitch: 'Bb4', duration: '4n', beat: 99 },
      { pitch: 'C5', duration: '2n', beat: 100 }, { pitch: 'Bb4', duration: '4n', beat: 102 }, { pitch: 'A4', duration: '4n', beat: 103 },
      { pitch: 'Bb4', duration: '2n', beat: 104 }, { pitch: 'A4', duration: '4n', beat: 106 }, { pitch: 'G4', duration: '4n', beat: 107 },
      { pitch: 'A4', duration: '2n.', beat: 108 },
      { pitch: 'D5', duration: '2n', beat: 112 }, { pitch: 'C5', duration: '4n', beat: 114 }, { pitch: 'Bb4', duration: '4n', beat: 115 },
      { pitch: 'A4', duration: '2n', beat: 116 }, { pitch: 'G4', duration: '4n', beat: 118 }, { pitch: 'F4', duration: '4n', beat: 119 },
      { pitch: 'G4', duration: '1n', beat: 120 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BLUE BOSSA — Kenny Dorham (Key: Cm, 16 bars)
  // ═══════════════════════════════════════════════════════════════════
  'Blue Bossa': {
    abc: `X:1
T:Blue Bossa
M:4/4
L:1/8
K:Cm
|: G4 _A2 G2 | F4 _E2 F2 | G8- | G6 z2 |
_A4 _B2 _A2 | G4 F2 G2 | _A8- | _A6 z2 |
c4 _d2 c2 | _B4 _A2 _B2 | c8- | c6 z2 |
_A4 _B2 _A2 | G4 F2 G2 | _E8- | _E6 z2 :|`,
    notes: [
      // First 8 bars
      { pitch: 'G4', duration: '2n', beat: 0 }, { pitch: 'Ab4', duration: '4n', beat: 2 }, { pitch: 'G4', duration: '4n', beat: 3 },
      { pitch: 'F4', duration: '2n', beat: 4 }, { pitch: 'Eb4', duration: '4n', beat: 6 }, { pitch: 'F4', duration: '4n', beat: 7 },
      { pitch: 'G4', duration: '1n', beat: 8 },
      { pitch: 'Ab4', duration: '2n', beat: 16 }, { pitch: 'Bb4', duration: '4n', beat: 18 }, { pitch: 'Ab4', duration: '4n', beat: 19 },
      { pitch: 'G4', duration: '2n', beat: 20 }, { pitch: 'F4', duration: '4n', beat: 22 }, { pitch: 'G4', duration: '4n', beat: 23 },
      { pitch: 'Ab4', duration: '1n', beat: 24 },
      // Last 8 bars
      { pitch: 'C5', duration: '2n', beat: 32 }, { pitch: 'Db5', duration: '4n', beat: 34 }, { pitch: 'C5', duration: '4n', beat: 35 },
      { pitch: 'Bb4', duration: '2n', beat: 36 }, { pitch: 'Ab4', duration: '4n', beat: 38 }, { pitch: 'Bb4', duration: '4n', beat: 39 },
      { pitch: 'C5', duration: '1n', beat: 40 },
      { pitch: 'Ab4', duration: '2n', beat: 48 }, { pitch: 'Bb4', duration: '4n', beat: 50 }, { pitch: 'Ab4', duration: '4n', beat: 51 },
      { pitch: 'G4', duration: '2n', beat: 52 }, { pitch: 'F4', duration: '4n', beat: 54 }, { pitch: 'G4', duration: '4n', beat: 55 },
      { pitch: 'Eb4', duration: '1n', beat: 56 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // FLY ME TO THE MOON — Bart Howard (Key: C, AABA, 32 bars)
  // ═══════════════════════════════════════════════════════════════════
  'Fly Me To The Moon': {
    abc: `X:1
T:Fly Me To The Moon
M:4/4
L:1/8
K:C
|: c4 B2 A2 | G4 F2 E2 | F4 G2 A2 | B6 z2 |
A4 G2 F2 | E4 D2 C2 | D4 E2 F2 | G6 z2 |
G4 A2 B2 | c4 d2 c2 | B4 A2 G2 | A6 z2 |
F4 G2 A2 | B4 c2 B2 | A4 G2 A2 | G6 z2 |
c4 B2 A2 | G4 F2 E2 | F4 G2 A2 | B6 z2 |
A4 G2 F2 | E4 D2 C2 | D4 E2 F2 | G6 z2 |
G4 A2 B2 | c4 d2 c2 | B4 A2 G2 | A4 G2 F2 |
E4 F2 G2 | A4 B2 c2 | c8- | c6 z2 :|`,
    notes: [
      // A section (bars 1-8)
      { pitch: 'C5', duration: '2n', beat: 0 }, { pitch: 'B4', duration: '4n', beat: 2 }, { pitch: 'A4', duration: '4n', beat: 3 },
      { pitch: 'G4', duration: '2n', beat: 4 }, { pitch: 'F4', duration: '4n', beat: 6 }, { pitch: 'E4', duration: '4n', beat: 7 },
      { pitch: 'F4', duration: '2n', beat: 8 }, { pitch: 'G4', duration: '4n', beat: 10 }, { pitch: 'A4', duration: '4n', beat: 11 },
      { pitch: 'B4', duration: '2n.', beat: 12 },
      { pitch: 'A4', duration: '2n', beat: 16 }, { pitch: 'G4', duration: '4n', beat: 18 }, { pitch: 'F4', duration: '4n', beat: 19 },
      { pitch: 'E4', duration: '2n', beat: 20 }, { pitch: 'D4', duration: '4n', beat: 22 }, { pitch: 'C4', duration: '4n', beat: 23 },
      { pitch: 'D4', duration: '2n', beat: 24 }, { pitch: 'E4', duration: '4n', beat: 26 }, { pitch: 'F4', duration: '4n', beat: 27 },
      { pitch: 'G4', duration: '2n.', beat: 28 },
      // A repeat (bars 9-16)
      { pitch: 'G4', duration: '2n', beat: 32 }, { pitch: 'A4', duration: '4n', beat: 34 }, { pitch: 'B4', duration: '4n', beat: 35 },
      { pitch: 'C5', duration: '2n', beat: 36 }, { pitch: 'D5', duration: '4n', beat: 38 }, { pitch: 'C5', duration: '4n', beat: 39 },
      { pitch: 'B4', duration: '2n', beat: 40 }, { pitch: 'A4', duration: '4n', beat: 42 }, { pitch: 'G4', duration: '4n', beat: 43 },
      { pitch: 'A4', duration: '2n.', beat: 44 },
      { pitch: 'F4', duration: '2n', beat: 48 }, { pitch: 'G4', duration: '4n', beat: 50 }, { pitch: 'A4', duration: '4n', beat: 51 },
      { pitch: 'B4', duration: '2n', beat: 52 }, { pitch: 'C5', duration: '4n', beat: 54 }, { pitch: 'B4', duration: '4n', beat: 55 },
      { pitch: 'A4', duration: '2n', beat: 56 }, { pitch: 'G4', duration: '4n', beat: 58 }, { pitch: 'A4', duration: '4n', beat: 59 },
      { pitch: 'G4', duration: '2n.', beat: 60 },
      // A section (bars 17-24) — same as 1-8
      { pitch: 'C5', duration: '2n', beat: 64 }, { pitch: 'B4', duration: '4n', beat: 66 }, { pitch: 'A4', duration: '4n', beat: 67 },
      { pitch: 'G4', duration: '2n', beat: 68 }, { pitch: 'F4', duration: '4n', beat: 70 }, { pitch: 'E4', duration: '4n', beat: 71 },
      { pitch: 'F4', duration: '2n', beat: 72 }, { pitch: 'G4', duration: '4n', beat: 74 }, { pitch: 'A4', duration: '4n', beat: 75 },
      { pitch: 'B4', duration: '2n.', beat: 76 },
      { pitch: 'A4', duration: '2n', beat: 80 }, { pitch: 'G4', duration: '4n', beat: 82 }, { pitch: 'F4', duration: '4n', beat: 83 },
      { pitch: 'E4', duration: '2n', beat: 84 }, { pitch: 'D4', duration: '4n', beat: 86 }, { pitch: 'C4', duration: '4n', beat: 87 },
      { pitch: 'D4', duration: '2n', beat: 88 }, { pitch: 'E4', duration: '4n', beat: 90 }, { pitch: 'F4', duration: '4n', beat: 91 },
      { pitch: 'G4', duration: '2n.', beat: 92 },
      // Final A with ending (bars 25-32)
      { pitch: 'G4', duration: '2n', beat: 96 }, { pitch: 'A4', duration: '4n', beat: 98 }, { pitch: 'B4', duration: '4n', beat: 99 },
      { pitch: 'C5', duration: '2n', beat: 100 }, { pitch: 'D5', duration: '4n', beat: 102 }, { pitch: 'C5', duration: '4n', beat: 103 },
      { pitch: 'B4', duration: '2n', beat: 104 }, { pitch: 'A4', duration: '4n', beat: 106 }, { pitch: 'G4', duration: '4n', beat: 107 },
      { pitch: 'A4', duration: '2n', beat: 108 }, { pitch: 'G4', duration: '4n', beat: 110 }, { pitch: 'F4', duration: '4n', beat: 111 },
      { pitch: 'E4', duration: '2n', beat: 112 }, { pitch: 'F4', duration: '4n', beat: 114 }, { pitch: 'G4', duration: '4n', beat: 115 },
      { pitch: 'A4', duration: '2n', beat: 116 }, { pitch: 'B4', duration: '4n', beat: 118 }, { pitch: 'C5', duration: '4n', beat: 119 },
      { pitch: 'C5', duration: '1n', beat: 120 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SO WHAT — Miles Davis (Key: Dm, AABA, 32 bars)
  // ═══════════════════════════════════════════════════════════════════
  'So What': {
    abc: `X:1
T:So What
M:4/4
L:1/8
K:Dm
|: z4 D2 E2 | F2 G2 A4 | z4 A2 G2 | F2 E2 D4 |
z4 D2 E2 | F2 G2 A4 | z4 A2 G2 | F2 E2 D4 |
z4 D2 E2 | F2 G2 A4 | z4 A2 G2 | F2 E2 D4 |
z4 D2 E2 | F2 G2 A4 | z4 A2 G2 | F2 E2 D4 |
z4 _E2 F2 | G2 A2 _B4 | z4 _B2 A2 | G2 F2 _E4 |
z4 _E2 F2 | G2 A2 _B4 | z4 _B2 A2 | G2 F2 _E4 |
z4 D2 E2 | F2 G2 A4 | z4 A2 G2 | F2 E2 D4 |
z4 D2 E2 | F2 G2 A4 | D8- | D6 z2 :|`,
    notes: [
      // A section (bars 1-8) — Dm Dorian
      { pitch: 'D4', duration: '4n', beat: 2 }, { pitch: 'E4', duration: '4n', beat: 3 },
      { pitch: 'F4', duration: '4n', beat: 4 }, { pitch: 'G4', duration: '4n', beat: 5 }, { pitch: 'A4', duration: '2n', beat: 6 },
      { pitch: 'A4', duration: '4n', beat: 10 }, { pitch: 'G4', duration: '4n', beat: 11 },
      { pitch: 'F4', duration: '4n', beat: 12 }, { pitch: 'E4', duration: '4n', beat: 13 }, { pitch: 'D4', duration: '2n', beat: 14 },
      { pitch: 'D4', duration: '4n', beat: 18 }, { pitch: 'E4', duration: '4n', beat: 19 },
      { pitch: 'F4', duration: '4n', beat: 20 }, { pitch: 'G4', duration: '4n', beat: 21 }, { pitch: 'A4', duration: '2n', beat: 22 },
      { pitch: 'A4', duration: '4n', beat: 26 }, { pitch: 'G4', duration: '4n', beat: 27 },
      { pitch: 'F4', duration: '4n', beat: 28 }, { pitch: 'E4', duration: '4n', beat: 29 }, { pitch: 'D4', duration: '2n', beat: 30 },
      // A repeat (bars 9-16) — same pattern
      { pitch: 'D4', duration: '4n', beat: 34 }, { pitch: 'E4', duration: '4n', beat: 35 },
      { pitch: 'F4', duration: '4n', beat: 36 }, { pitch: 'G4', duration: '4n', beat: 37 }, { pitch: 'A4', duration: '2n', beat: 38 },
      { pitch: 'A4', duration: '4n', beat: 42 }, { pitch: 'G4', duration: '4n', beat: 43 },
      { pitch: 'F4', duration: '4n', beat: 44 }, { pitch: 'E4', duration: '4n', beat: 45 }, { pitch: 'D4', duration: '2n', beat: 46 },
      { pitch: 'D4', duration: '4n', beat: 50 }, { pitch: 'E4', duration: '4n', beat: 51 },
      { pitch: 'F4', duration: '4n', beat: 52 }, { pitch: 'G4', duration: '4n', beat: 53 }, { pitch: 'A4', duration: '2n', beat: 54 },
      { pitch: 'A4', duration: '4n', beat: 58 }, { pitch: 'G4', duration: '4n', beat: 59 },
      { pitch: 'F4', duration: '4n', beat: 60 }, { pitch: 'E4', duration: '4n', beat: 61 }, { pitch: 'D4', duration: '2n', beat: 62 },
      // B section (bars 17-24) — Ebm Dorian (up half step)
      { pitch: 'Eb4', duration: '4n', beat: 66 }, { pitch: 'F4', duration: '4n', beat: 67 },
      { pitch: 'G4', duration: '4n', beat: 68 }, { pitch: 'A4', duration: '4n', beat: 69 }, { pitch: 'Bb4', duration: '2n', beat: 70 },
      { pitch: 'Bb4', duration: '4n', beat: 74 }, { pitch: 'A4', duration: '4n', beat: 75 },
      { pitch: 'G4', duration: '4n', beat: 76 }, { pitch: 'F4', duration: '4n', beat: 77 }, { pitch: 'Eb4', duration: '2n', beat: 78 },
      { pitch: 'Eb4', duration: '4n', beat: 82 }, { pitch: 'F4', duration: '4n', beat: 83 },
      { pitch: 'G4', duration: '4n', beat: 84 }, { pitch: 'A4', duration: '4n', beat: 85 }, { pitch: 'Bb4', duration: '2n', beat: 86 },
      { pitch: 'Bb4', duration: '4n', beat: 90 }, { pitch: 'A4', duration: '4n', beat: 91 },
      { pitch: 'G4', duration: '4n', beat: 92 }, { pitch: 'F4', duration: '4n', beat: 93 }, { pitch: 'Eb4', duration: '2n', beat: 94 },
      // Final A (bars 25-32) — back to Dm
      { pitch: 'D4', duration: '4n', beat: 98 }, { pitch: 'E4', duration: '4n', beat: 99 },
      { pitch: 'F4', duration: '4n', beat: 100 }, { pitch: 'G4', duration: '4n', beat: 101 }, { pitch: 'A4', duration: '2n', beat: 102 },
      { pitch: 'A4', duration: '4n', beat: 106 }, { pitch: 'G4', duration: '4n', beat: 107 },
      { pitch: 'F4', duration: '4n', beat: 108 }, { pitch: 'E4', duration: '4n', beat: 109 }, { pitch: 'D4', duration: '2n', beat: 110 },
      { pitch: 'D4', duration: '4n', beat: 114 }, { pitch: 'E4', duration: '4n', beat: 115 },
      { pitch: 'F4', duration: '4n', beat: 116 }, { pitch: 'G4', duration: '4n', beat: 117 }, { pitch: 'A4', duration: '2n', beat: 118 },
      { pitch: 'D4', duration: '1n', beat: 120 },
    ],
  },
};

/** Get melody for a standard, or null if not yet transcribed */
export function getMelody(standardName: string): StandardMelody | null {
  return STANDARD_MELODIES[standardName] || null;
}

/** Get count of available melodies */
export function getMelodyCount(): number {
  return Object.keys(STANDARD_MELODIES).length;
}

/** Check if a melody exists for a standard */
export function hasMelody(standardName: string): boolean {
  return standardName in STANDARD_MELODIES;
}
