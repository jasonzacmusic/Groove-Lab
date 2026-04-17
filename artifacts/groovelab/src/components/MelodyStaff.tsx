import React, { useRef, useEffect } from 'react';
import abcjs from 'abcjs';

interface MelodyStaffProps {
  abc: string;
  currentNoteIdx: number;
  isVisible: boolean;
  transposition?: number; // semitones to transpose
}

// ABC key names for transposition
const ABC_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_TO_IDX: Record<string, number> = {};
ABC_KEYS.forEach((k, i) => { KEY_TO_IDX[k] = i; });
// Handle sharps too
const SHARP_MAP: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

function transposeAbc(abc: string, semitones: number): string {
  if (semitones === 0) return abc;

  // Find and replace the K: field
  return abc.replace(/^K:(.+)$/m, (match, keyStr) => {
    const key = keyStr.trim();
    // Extract root and mode (e.g., "Gm" → root="G", mode="m")
    const rootMatch = key.match(/^([A-G][b#]?)(.*)/);
    if (!rootMatch) return match;

    let [, root, mode] = rootMatch;
    const normalized = SHARP_MAP[root] || root;
    const idx = KEY_TO_IDX[normalized];
    if (idx === undefined) return match;

    const newIdx = ((idx + semitones) % 12 + 12) % 12;
    const newRoot = ABC_KEYS[newIdx];
    return `K:${newRoot}${mode}`;
  });
}

export function MelodyStaff({ abc, currentNoteIdx, isVisible, transposition = 0 }: MelodyStaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  // Render the ABC notation
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const transposedAbc = transposeAbc(abc, transposition);

    abcjs.renderAbc(containerRef.current, transposedAbc, {
      responsive: 'resize',
      staffwidth: 700,
      paddingtop: 10,
      paddingbottom: 10,
      paddingright: 10,
      paddingleft: 10,
      add_classes: true,
      scale: 1.1,
    } as any);

    renderedRef.current = true;

    return () => {
      renderedRef.current = false;
    };
  }, [abc, isVisible, transposition]);

  // Highlight current note during playback
  useEffect(() => {
    if (!containerRef.current || !renderedRef.current) return;

    // Remove all previous highlights
    const highlighted = containerRef.current.querySelectorAll('.abcjs-melody-highlight');
    highlighted.forEach(el => el.classList.remove('abcjs-melody-highlight'));

    if (currentNoteIdx < 0) return;

    // abcjs adds class "abcjs-n{index}" to each note group
    const noteEl = containerRef.current.querySelector(`.abcjs-n${currentNoteIdx}`);
    if (noteEl) {
      noteEl.classList.add('abcjs-melody-highlight');
      // Scroll note into view if needed
      noteEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentNoteIdx]);

  if (!isVisible) return null;

  return (
    <div className="melody-staff-container">
      <div
        ref={containerRef}
        className="melody-staff"
      />
      <style>{`
        .melody-staff-container {
          background: #f5f0e1;
          border: 1px solid #d4c9a8;
          border-radius: 8px;
          padding: 8px 4px;
          overflow-x: auto;
          margin-bottom: 0;
        }

        .dark .melody-staff-container {
          background: #2a2520;
          border-color: #4a3f30;
        }

        .melody-staff svg {
          width: 100%;
          max-width: 100%;
        }

        /* Staff lines */
        .melody-staff .abcjs-staff {
          stroke: #8a7a60;
        }
        .dark .melody-staff .abcjs-staff {
          stroke: #6a5a48;
        }

        /* Note heads and stems */
        .melody-staff .abcjs-note {
          fill: #2c1810;
          stroke: #2c1810;
        }
        .dark .melody-staff .abcjs-note {
          fill: #e0ccaa;
          stroke: #e0ccaa;
        }

        /* Highlighted note during playback */
        .melody-staff .abcjs-melody-highlight,
        .melody-staff .abcjs-melody-highlight * {
          fill: #d4a017 !important;
          stroke: #d4a017 !important;
          transition: fill 0.1s ease;
        }

        /* Title and key signature */
        .melody-staff text {
          fill: #5a4a30;
        }
        .dark .melody-staff text {
          fill: #b8a080;
        }

        /* Bar lines */
        .melody-staff .abcjs-bar {
          stroke: #8a7a60;
        }
        .dark .melody-staff .abcjs-bar {
          stroke: #5a4a38;
        }

        /* Rests */
        .melody-staff .abcjs-rest {
          fill: #6b5744;
        }
        .dark .melody-staff .abcjs-rest {
          fill: #8a7a60;
        }

        /* Beams */
        .melody-staff .abcjs-beam-elem {
          fill: #2c1810;
          stroke: #2c1810;
        }
        .dark .melody-staff .abcjs-beam-elem {
          fill: #e0ccaa;
          stroke: #e0ccaa;
        }
      `}</style>
    </div>
  );
}

export default MelodyStaff;
