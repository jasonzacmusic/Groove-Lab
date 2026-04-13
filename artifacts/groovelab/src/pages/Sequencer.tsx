import React, { useCallback, useEffect, useState } from 'react';
import { useSequencerStore, Instrument } from '../store/sequencer';
import { useAudioEngine } from '../context/AudioEngineContext';
import { usePracticeTracker } from '@/hooks/use-practice-tracker';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Download, Plus, Minus, Trash2, Circle, Disc } from 'lucide-react';
import { Midi } from '@tonejs/midi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSTRUMENT_COLORS: Record<string, string> = {
  kick:        '#e2a832',
  snare:       '#e74c3c',
  hihatClosed: '#7fb069',
  hihatOpen:   '#4ecdc4',
  ride:        '#a78bfa',
  crash:       '#f59e0b',
  tomHigh:     '#fb923c',
  tomMid:      '#34d399',
  tomLow:      '#60a5fa',
  cowbell:     '#f472b6',
  clap:        '#c084fc',
  crossStick:  '#facc15',
};

const KIT_INSTRUMENTS: Record<string, string[]> = {
  jazz:  ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'ride', 'crash'],
  rock:  ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'tomHigh', 'tomMid', 'tomLow', 'crash'],
  '808': ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'cowbell', 'clap'],
  latin: ['kick', 'snare', 'hihatClosed', 'tomHigh', 'tomMid', 'cowbell', 'crossStick'],
};

const INSTRUMENT_LABELS: Record<string, string> = {
  kick:        'Kick',
  snare:       'Snare',
  hihatClosed: 'HH Closed',
  hihatOpen:   'HH Open',
  ride:        'Ride',
  crash:       'Crash',
  tomHigh:     'Tom Hi',
  tomMid:      'Tom Mid',
  tomLow:      'Tom Low',
  cowbell:     'Cowbell',
  clap:        'Clap',
  crossStick:  'X-Stick',
};

const INSTRUMENT_SHORTCUTS: Record<string, string> = {
  kick:        'K',
  snare:       'S',
  hihatClosed: 'H',
  hihatOpen:   'O',
  ride:        'R',
  crash:       'C',
  tomHigh:     '1',
  tomMid:      '2',
  tomLow:      '3',
  cowbell:     'B',
  clap:        'P',
  crossStick:  'X',
};

const KEY_TO_INSTRUMENT: Record<string, Instrument> = {
  k: 'kick',
  s: 'snare',
  h: 'hihatClosed',
  o: 'hihatOpen',
  r: 'ride',
  c: 'crash',
  '1': 'tomHigh',
  '2': 'tomMid',
  '3': 'tomLow',
  b: 'cowbell',
  p: 'clap',
  x: 'crossStick',
};

// ---------------------------------------------------------------------------
// Groove Presets
// ---------------------------------------------------------------------------

interface GroovePreset {
  name: string;
  kit: 'jazz' | 'rock' | '808' | 'latin';
  bpm: number;
  timeSig: [number, number];
  subdivisions: number[];
  pattern: (string | null)[][];
}

const GROOVE_PRESETS: GroovePreset[] = [
  // ── ROCK ──
  {
    name: 'Basic Rock',
    kit: 'rock',
    bpm: 120,
    timeSig: [4, 4],
    subdivisions: [2, 2, 2, 2], // 8th notes
    pattern: [
      ['kick', 'hihatClosed'],      // Beat 1: kick + hihat
      ['snare', 'hihatClosed'],     // Beat 2: snare + hihat
      ['kick', 'hihatClosed'],      // Beat 3: kick + hihat
      ['snare', 'hihatClosed'],     // Beat 4: snare + hihat
    ],
  },
  {
    name: 'Hard Rock',
    kit: 'rock',
    bpm: 130,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4], // 16th notes
    pattern: [
      ['kick', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', 'hihatClosed', 'kick'],
      ['kick', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', 'kick', 'hihatClosed'],
    ],
  },
  // ── POP ──
  {
    name: 'Pop Beat',
    kit: 'rock',
    bpm: 110,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      ['kick', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['kick', 'hihatClosed', 'kick', 'hihatClosed'],
      ['snare', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
    ],
  },
  // ── JAZZ ──
  {
    name: 'Jazz Swing',
    kit: 'jazz',
    bpm: 140,
    timeSig: [4, 4],
    subdivisions: [3, 3, 3, 3], // triplets (swing feel)
    pattern: [
      // Standard jazz ride pattern: ding-da-ding with kick on 1, snare on 4
      ['kick', null, 'ride'],       // Beat 1: kick + ride skip
      ['ride', null, 'ride'],       // Beat 2: ride pattern
      ['ride', null, 'ride'],       // Beat 3: ride pattern
      ['snare', null, 'ride'],      // Beat 4: snare + ride
    ],
  },
  {
    name: 'Jazz Waltz',
    kit: 'jazz',
    bpm: 160,
    timeSig: [3, 4],
    subdivisions: [3, 3, 3], // triplets
    pattern: [
      ['kick', null, 'ride'],       // Beat 1: kick
      ['ride', null, 'hihatClosed'], // Beat 2: ride + hihat
      ['ride', null, 'ride'],       // Beat 3: ride
    ],
  },
  // ── BLUES ──
  {
    name: 'Blues Shuffle',
    kit: 'jazz',
    bpm: 100,
    timeSig: [4, 4],
    subdivisions: [3, 3, 3, 3], // triplet shuffle
    pattern: [
      ['kick', null, 'hihatClosed'],   // Beat 1: kick + shuffle hat
      ['snare', null, 'hihatClosed'],  // Beat 2: snare + shuffle hat
      ['kick', null, 'hihatClosed'],   // Beat 3: kick + shuffle hat
      ['snare', null, 'hihatClosed'],  // Beat 4: snare + shuffle hat
    ],
  },
  {
    name: 'Slow Blues',
    kit: 'jazz',
    bpm: 65,
    timeSig: [4, 4],
    subdivisions: [3, 3, 3, 3],
    pattern: [
      ['kick', null, 'ride'],
      ['snare', null, 'ride'],
      ['kick', null, 'ride'],
      ['snare', null, 'ride'],
    ],
  },
  // ── FUNK ──
  {
    name: 'Funk Groove',
    kit: 'rock',
    bpm: 100,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4], // 16th note funk
    pattern: [
      ['kick', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', null, 'kick'],
      ['hihatClosed', 'kick', 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', 'hihatClosed', 'kick'],
    ],
  },
  // ── REGGAE ──
  {
    name: 'Reggae One Drop',
    kit: 'rock',
    bpm: 76,
    timeSig: [4, 4],
    subdivisions: [2, 2, 2, 2], // 8th notes
    pattern: [
      // Classic one drop: nothing on 1, cross-stick on 2&4, kick+snare on 3
      [null, 'hihatClosed'],        // Beat 1: hihat only (no kick!)
      ['crossStick', 'hihatClosed'], // Beat 2: cross-stick + hihat
      ['kick', 'snare'],            // Beat 3: KICK + SNARE together (the "drop")
      ['crossStick', 'hihatClosed'], // Beat 4: cross-stick + hihat
    ],
  },
  // ── BOSSA NOVA ──
  {
    name: 'Bossa Nova',
    kit: 'jazz',
    bpm: 130,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4], // 16th notes for the bossa pattern
    pattern: [
      // Classic bossa: kick on 1, cross-stick on rim pattern
      ['kick', null, null, 'hihatClosed'],
      ['crossStick', null, 'kick', 'hihatClosed'],
      [null, null, 'crossStick', 'hihatClosed'],
      ['kick', null, null, 'hihatClosed'],
    ],
  },
  // ── HIP HOP ──
  {
    name: 'Hip-Hop Boom Bap',
    kit: '808',
    bpm: 90,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      ['kick', null, 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', null, 'hihatClosed'],
      ['kick', 'hihatClosed', 'kick', 'hihatClosed'],
      ['snare', 'hihatClosed', null, 'hihatClosed'],
    ],
  },
  {
    name: '808 Trap',
    kit: '808',
    bpm: 140,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      ['kick', null, null, 'hihatClosed'],
      ['hihatClosed', 'hihatClosed', 'clap', 'hihatClosed'],
      ['hihatClosed', 'hihatClosed', null, 'hihatClosed'],
      ['kick', 'hihatClosed', 'clap', 'hihatClosed'],
    ],
  },
  // ── COUNTRY ──
  {
    name: 'Country Train Beat',
    kit: 'rock',
    bpm: 115,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      // Train beat: kick on 1&3, snare on 2&4, cross-stick 16th shuffle
      ['kick', 'crossStick', 'hihatClosed', 'crossStick'],
      ['snare', 'crossStick', 'hihatClosed', 'crossStick'],
      ['kick', 'crossStick', 'hihatClosed', 'crossStick'],
      ['snare', 'crossStick', 'hihatClosed', 'crossStick'],
    ],
  },
  // ── MOTOWN / SOUL ──
  {
    name: 'Motown',
    kit: 'rock',
    bpm: 118,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      ['kick', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
      ['kick', 'hihatClosed', 'kick', 'hihatClosed'],
      ['snare', 'hihatClosed', 'hihatClosed', 'hihatClosed'],
    ],
  },
  // ── DISCO ──
  {
    name: 'Disco',
    kit: 'rock',
    bpm: 120,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      // Four on the floor kick, open hihat on offbeats
      ['kick', 'hihatClosed', 'hihatOpen', 'hihatClosed'],
      ['kick', 'snare', 'hihatOpen', 'hihatClosed'],
      ['kick', 'hihatClosed', 'hihatOpen', 'hihatClosed'],
      ['kick', 'snare', 'hihatOpen', 'hihatClosed'],
    ],
  },
  // ── LATIN ──
  {
    name: 'Latin Salsa',
    kit: 'latin',
    bpm: 180,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      // Son clave-inspired with timbale and cowbell
      ['cowbell', null, 'cowbell', null],
      ['cowbell', 'crossStick', null, 'cowbell'],
      [null, 'cowbell', null, 'cowbell'],
      ['crossStick', null, 'cowbell', null],
    ],
  },
  // ── AFROBEAT ──
  {
    name: 'Afrobeat',
    kit: 'rock',
    bpm: 115,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      // Tony Allen-inspired: kick on 1, open hihat, syncopated snare
      ['kick', 'hihatOpen', 'hihatClosed', 'hihatClosed'],
      ['hihatClosed', 'hihatClosed', 'snare', 'hihatClosed'],
      ['kick', 'hihatOpen', 'hihatClosed', 'hihatClosed'],
      ['hihatClosed', 'snare', 'hihatClosed', 'hihatClosed'],
    ],
  },
  // ── 6/8 ──
  {
    name: '6/8 Afro-Cuban',
    kit: 'latin',
    bpm: 100,
    timeSig: [6, 8],
    subdivisions: [2, 2, 2, 2, 2, 2],
    pattern: [
      ['kick', 'hihatClosed'],
      [null, 'hihatClosed'],
      ['crossStick', 'hihatClosed'],
      ['kick', 'hihatClosed'],
      ['crossStick', 'hihatClosed'],
      [null, 'hihatClosed'],
    ],
  },
  // ── ODD METERS ──
  {
    name: '5/4 Take Five',
    kit: 'jazz',
    bpm: 174,
    timeSig: [5, 4],
    subdivisions: [2, 2, 2, 2, 2],
    pattern: [
      ['kick', 'ride'],        // 1
      ['hihatClosed', 'ride'], // 2
      ['snare', 'ride'],      // 3
      ['hihatClosed', 'ride'], // 4
      ['kick', 'ride'],       // 5
    ],
  },
  {
    name: '7/8 Progressive',
    kit: 'rock',
    bpm: 150,
    timeSig: [7, 8],
    subdivisions: [2, 2, 2, 2, 2, 2, 2],
    pattern: [
      ['kick', 'hihatClosed'],
      ['hihatClosed', 'hihatClosed'],
      ['snare', 'hihatClosed'],
      ['hihatClosed', 'hihatClosed'],
      ['kick', 'hihatClosed'],
      ['snare', 'hihatClosed'],
      ['hihatClosed', 'hihatClosed'],
    ],
  },
  // ── NEO SOUL ──
  {
    name: 'Neo Soul',
    kit: 'jazz',
    bpm: 72,
    timeSig: [4, 4],
    subdivisions: [4, 4, 4, 4],
    pattern: [
      ['kick', null, 'hihatClosed', null],
      ['snare', null, 'hihatClosed', 'kick'],
      [null, 'hihatClosed', null, 'hihatClosed'],
      ['snare', null, 'hihatClosed', null],
    ],
  },
  // ── GOSPEL ──
  {
    name: 'Gospel Shuffle',
    kit: 'rock',
    bpm: 108,
    timeSig: [4, 4],
    subdivisions: [3, 3, 3, 3], // triplet shuffle
    pattern: [
      ['kick', null, 'hihatClosed'],
      ['snare', null, 'hihatClosed'],
      ['kick', 'kick', 'hihatClosed'],
      ['snare', null, 'hihatClosed'],
    ],
  },
];

// ---------------------------------------------------------------------------
// PizzaBeat - horizontal circles view (one circle per beat)
// ---------------------------------------------------------------------------

interface PizzaBeatProps {
  beatIndex: number;
  slices: { instrument: Instrument | null }[];
  subdivisionCount: number;
  currentStep: number;
  globalStartIndex: number;
  onSliceClick: (beatIndex: number, sliceIndex: number) => void;
  size: number;
}

function PizzaBeat({
  beatIndex,
  slices,
  subdivisionCount,
  currentStep,
  globalStartIndex,
  onSliceClick,
  size,
}: PizzaBeatProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-mono text-xs font-bold text-primary/70 select-none">
        {beatIndex + 1}
      </span>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="rgba(22,33,62,0.4)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {[r * 0.3, r * 0.5, r * 0.7, r * 0.85].map((gr, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={gr}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}
        <circle cx={cx} cy={cy} r={2} fill="rgba(226,168,50,0.3)" />

        {slices.map((slice, i) => {
          const startAngle = (i / subdivisionCount) * 360 - 90;
          const endAngle = ((i + 1) / subdivisionCount) * 360 - 90;
          const globalIdx = globalStartIndex + i;
          const isPlaying = currentStep === globalIdx;
          const color = slice.instrument
            ? INSTRUMENT_COLORS[slice.instrument] || '#888'
            : null;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          let fill = 'transparent';
          if (isPlaying && color) {
            fill = color;
          } else if (isPlaying) {
            fill = 'rgba(226,168,50,0.25)';
          } else if (color) {
            fill = color + 'cc';
          }

          return (
            <path
              key={i}
              d={d}
              fill={fill}
              stroke={isPlaying ? '#e2a832' : 'rgba(255,255,255,0.15)'}
              strokeWidth={isPlaying ? 2 : 0.5}
              style={{
                cursor: 'pointer',
                transition: 'fill 0.06s ease',
                filter: isPlaying
                  ? 'drop-shadow(0 0 8px rgba(226,168,50,0.6))'
                  : color
                    ? `drop-shadow(0 0 3px ${color}66)`
                    : undefined,
              }}
              onClick={() => onSliceClick(beatIndex, i)}
            />
          );
        })}

        {Array.from({ length: subdivisionCount }).map((_, i) => {
          const angle = (i / subdivisionCount) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={`div-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + r * Math.cos(rad)}
              y2={cy + r * Math.sin(rad)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.5"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
      </svg>

      <Select
        value={subdivisionCount.toString()}
        onValueChange={(v) => {
          const s = useSequencerStore.getState();
          s.setSubdivision(beatIndex, parseInt(v));
        }}
      >
        <SelectTrigger className="w-14 h-6 text-[10px] px-1 font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[2, 3, 4, 5, 6, 8].map((n) => (
            <SelectItem key={n} value={n.toString()} className="text-xs font-mono">
              /{n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadialView - concentric rings (one ring per instrument)
// ---------------------------------------------------------------------------

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, ringW: number) {
  const outerR = r;
  const innerR = r - ringW;
  const start = polarToXY(cx, cy, outerR, startDeg);
  const end = polarToXY(cx, cy, outerR, endDeg);
  const iStart = polarToXY(cx, cy, innerR, startDeg);
  const iEnd = polarToXY(cx, cy, innerR, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${end.x} ${end.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${iStart.x} ${iStart.y}`,
    'Z',
  ].join(' ');
}

interface RadialViewProps {
  instruments: string[];
  beats: { instrument: Instrument | null }[][];
  subdivisions: number[];
  currentStep: number;
  onSliceClick: (beatIndex: number, sliceIndex: number, instrument: string) => void;
}

function RadialView({ instruments, beats, subdivisions, currentStep, onSliceClick }: RadialViewProps) {
  const SIZE = 480;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const RING_W = 24;
  const RING_GAP = 3;
  const CORE_R = 36;

  // Total number of steps (all slices across all beats)
  const totalSteps = subdivisions.reduce((sum, n) => sum + n, 0);

  // Build a flat list of { beatIndex, sliceIndex } for each global step
  const stepLookup: { beatIndex: number; sliceIndex: number }[] = [];
  for (let b = 0; b < beats.length; b++) {
    for (let s = 0; s < beats[b].length; s++) {
      stepLookup.push({ beatIndex: b, sliceIndex: s });
    }
  }

  // Compute beat boundary global indices (start index of each beat)
  const beatBoundaries: number[] = [];
  let idx = 0;
  for (let b = 0; b < beats.length; b++) {
    beatBoundaries.push(idx);
    idx += beats[b].length;
  }

  return (
    <div className="flex justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="select-none"
      >
        {/* Background */}
        <circle cx={cx} cy={cy} r={SIZE / 2 - 2} fill="rgba(22,33,62,0.3)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Instrument rings (outermost = first instrument) */}
        {instruments.map((inst, ringIdx) => {
          const outerR = SIZE / 2 - 12 - ringIdx * (RING_W + RING_GAP);
          const color = INSTRUMENT_COLORS[inst] || '#888';

          return (
            <g key={inst}>
              {/* Ring background */}
              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={RING_W} />

              {/* Arc segments for each step */}
              {stepLookup.map((step, globalIdx) => {
                const startDeg = (globalIdx / totalSteps) * 360;
                const endDeg = ((globalIdx + 1) / totalSteps) * 360;
                const sliceData = beats[step.beatIndex]?.[step.sliceIndex];
                const hasHit = sliceData?.instrument === inst;
                const isPlaying = currentStep === globalIdx;

                let fill = 'transparent';
                if (hasHit && isPlaying) {
                  fill = color;
                } else if (hasHit) {
                  fill = color + 'bb';
                } else if (isPlaying) {
                  fill = 'rgba(226,168,50,0.18)';
                }

                return (
                  <path
                    key={`${inst}-${globalIdx}`}
                    d={arcPath(cx, cy, outerR, startDeg, endDeg, RING_W)}
                    fill={fill}
                    stroke={isPlaying && hasHit ? '#e2a832' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isPlaying && hasHit ? 1.5 : 0.5}
                    style={{
                      cursor: 'pointer',
                      transition: 'fill 0.06s ease',
                      filter: isPlaying && hasHit
                        ? 'drop-shadow(0 0 6px rgba(226,168,50,0.5))'
                        : hasHit
                          ? `drop-shadow(0 0 2px ${color}44)`
                          : undefined,
                    }}
                    onClick={() => onSliceClick(step.beatIndex, step.sliceIndex, inst)}
                  />
                );
              })}

              {/* Instrument label on the left side of the ring */}
              <text
                x={cx - outerR + RING_W / 2}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground/60"
                style={{ fontSize: '7px', fontFamily: 'monospace', pointerEvents: 'none' }}
              >
                {INSTRUMENT_LABELS[inst]}
              </text>
            </g>
          );
        })}

        {/* Beat separator lines */}
        {beatBoundaries.map((globalIdx, b) => {
          const angleDeg = (globalIdx / totalSteps) * 360;
          const outerR = SIZE / 2 - 12;
          const innerR = SIZE / 2 - 12 - instruments.length * (RING_W + RING_GAP) + RING_GAP;
          const outerPt = polarToXY(cx, cy, outerR + 6, angleDeg);
          const innerPt = polarToXY(cx, cy, Math.max(innerR, CORE_R + 4), angleDeg);

          return (
            <line
              key={`beat-sep-${b}`}
              x1={outerPt.x}
              y1={outerPt.y}
              x2={innerPt.x}
              y2={innerPt.y}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {/* Beat number labels around the outside */}
        {beatBoundaries.map((globalIdx, b) => {
          const midStepIdx = globalIdx + beats[b].length / 2;
          const angleDeg = (midStepIdx / totalSteps) * 360;
          const labelR = SIZE / 2 - 2;
          const pt = polarToXY(cx, cy, labelR, angleDeg);

          return (
            <text
              key={`beat-label-${b}`}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-primary/70"
              style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', pointerEvents: 'none' }}
            >
              {b + 1}
            </text>
          );
        })}

        {/* Playhead glow line across all rings */}
        {currentStep >= 0 && currentStep < totalSteps && (() => {
          const midDeg = ((currentStep + 0.5) / totalSteps) * 360;
          const outerR = SIZE / 2 - 12;
          const innerR = SIZE / 2 - 12 - instruments.length * (RING_W + RING_GAP) + RING_GAP;
          const outerPt = polarToXY(cx, cy, outerR + 2, midDeg);
          const innerPt = polarToXY(cx, cy, Math.max(innerR, CORE_R + 2), midDeg);
          return (
            <line
              x1={outerPt.x}
              y1={outerPt.y}
              x2={innerPt.x}
              y2={innerPt.y}
              stroke="rgba(226,168,50,0.6)"
              strokeWidth="2"
              style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(226,168,50,0.4))' }}
            />
          );
        })()}

        {/* Core circle with vinyl grooves */}
        <circle cx={cx} cy={cy} r={CORE_R} fill="rgba(22,33,62,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {[CORE_R * 0.4, CORE_R * 0.6, CORE_R * 0.8].map((gr, i) => (
          <circle key={`groove-${i}`} cx={cx} cy={cy} r={gr} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-primary/60"
          style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', letterSpacing: '2px' }}
        >
          RC
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sequencer page (default export)
// ---------------------------------------------------------------------------

type ViewMode = 'circles' | 'radial';

export default function Sequencer() {
  usePracticeTracker('sequencer');
  const store = useSequencerStore();
  const {
    isInitialized,
    isPlaying,
    midiConnected,
    startEngine,
    togglePlayback,
    playPreview,
  } = useAudioEngine();

  const [viewMode, setViewMode] = useState<ViewMode>('circles');

  const instruments = KIT_INSTRUMENTS[store.selectedKit];

  // Compute global start indices per beat
  const globalStartIndices: number[] = [];
  let runningIdx = 0;
  for (let b = 0; b < store.beats.length; b++) {
    globalStartIndices.push(runningIdx);
    runningIdx += store.beats[b].length;
  }

  // Handle start / play
  const handleStart = useCallback(async () => {
    if (!isInitialized) {
      await startEngine();
    }
    togglePlayback();
  }, [isInitialized, startEngine, togglePlayback]);

  // Handle slice click (circles view)
  const handleSliceClick = useCallback(
    (beatIndex: number, sliceIndex: number) => {
      store.toggleHit(beatIndex, sliceIndex);
      // Preview the sound when placing a hit
      const sliceAfter = useSequencerStore.getState().beats[beatIndex][sliceIndex];
      if (sliceAfter?.instrument) {
        playPreview(sliceAfter.instrument);
      }
    },
    [store, playPreview]
  );

  // Handle slice click (radial view) - needs to set instrument first
  const handleRadialSliceClick = useCallback(
    (beatIndex: number, sliceIndex: number, instrument: string) => {
      const currentSlice = store.beats[beatIndex]?.[sliceIndex];
      if (currentSlice?.instrument === instrument) {
        // Remove the hit - set instrument to match so toggleHit removes it
        store.setSelectedInstrument(instrument as Instrument);
        store.toggleHit(beatIndex, sliceIndex);
      } else {
        // Place hit for this specific instrument
        store.setSelectedInstrument(instrument as Instrument);
        store.toggleHit(beatIndex, sliceIndex);
        playPreview(instrument as Instrument);
      }
    },
    [store, playPreview]
  );

  // Add / remove beat
  const addBeat = () => {
    const newNum = store.timeSignature.numerator + 1;
    if (newNum <= 16) {
      store.setTimeSignature(newNum, store.timeSignature.denominator);
    }
  };

  const removeBeat = () => {
    const newNum = store.timeSignature.numerator - 1;
    if (newNum >= 1) {
      store.setTimeSignature(newNum, store.timeSignature.denominator);
    }
  };

  // Load a groove preset
  const loadPreset = useCallback((preset: GroovePreset) => {
    store.setSelectedKit(preset.kit);
    store.setBpm(preset.bpm);
    store.setTimeSignature(preset.timeSig[0], preset.timeSig[1]);

    // Need to wait for time signature to take effect, then set subdivisions and pattern
    setTimeout(() => {
      const s = useSequencerStore.getState();
      for (let b = 0; b < preset.subdivisions.length; b++) {
        s.setSubdivision(b, preset.subdivisions[b]);
      }

      // Clear and set pattern
      setTimeout(() => {
        const s2 = useSequencerStore.getState();
        s2.clearAll();

        setTimeout(() => {
          for (let b = 0; b < preset.pattern.length; b++) {
            for (let sl = 0; sl < preset.pattern[b].length; sl++) {
              const inst = preset.pattern[b][sl];
              if (inst) {
                const s3 = useSequencerStore.getState();
                s3.setSelectedInstrument(inst as Instrument);
                s3.toggleHit(b, sl);
              }
            }
          }
        }, 10);
      }, 10);
    }, 10);
  }, [store]);

  // Keyboard shortcuts
  // Keyboard shortcuts — only active on sequencer page, not when
  // focus is in inputs or when other audio players are active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Don't capture if an iframe (YouTube) or audio player has focus
      if (document.activeElement?.tagName === 'IFRAME') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleStart();
        return;
      }

      const key = e.key.toLowerCase();
      const instrument = KEY_TO_INSTRUMENT[key];
      if (instrument) {
        e.preventDefault();
        store.setSelectedInstrument(instrument);
        playPreview(instrument);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart, store, playPreview]);

  // MIDI export
  const exportMidi = () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.channel = 9;

    const currentBpm = store.bpm;
    const secondsPerBeat = 60 / currentBpm;

    const INST_TO_MIDI: Record<string, number> = {
      kick: 36, snare: 38, hihatClosed: 42, hihatOpen: 46, ride: 51,
      crash: 49, tomHigh: 48, tomMid: 45, tomLow: 41, clap: 39, cowbell: 56,
      crossStick: 37, clave: 75, shaker: 70,
    };

    let globalTime = 0;
    for (let b = 0; b < store.beats.length; b++) {
      const slices = store.beats[b];
      const sliceDur = secondsPerBeat / slices.length;
      for (let s = 0; s < slices.length; s++) {
        const hit = slices[s];
        if (hit.instrument) {
          const note = INST_TO_MIDI[hit.instrument] || 36;
          track.addNote({
            midi: note,
            time: globalTime,
            duration: 0.1,
            velocity: 0.8,
          });
        }
        globalTime += sliceDur;
      }
    }

    midi.header.setTempo(currentBpm);
    const blob = new Blob(
      [midi.toArray() as unknown as ArrayBuffer],
      { type: 'audio/midi' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groovelab-pattern-${currentBpm}bpm.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Responsive pizza size
  const pizzaSize = store.beats.length <= 4 ? 120 : store.beats.length <= 8 ? 100 : 80;

  return (
    <div className="flex flex-col h-[calc(100vh-144px)] max-w-7xl mx-auto w-full">
      {/* ---- Header ---- */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-serif text-2xl md:text-3xl">Rhythm Circles</h2>

        <div className="flex items-center gap-3">
          {/* Preset selector */}
          <Select onValueChange={(v) => loadPreset(GROOVE_PRESETS[parseInt(v)])}>
            <SelectTrigger className="w-[180px] h-8 text-xs font-mono">
              <SelectValue placeholder="Load Groove..." />
            </SelectTrigger>
            <SelectContent>
              {GROOVE_PRESETS.map((p, i) => (
                <SelectItem key={i} value={i.toString()} className="text-xs font-mono">
                  {p.name} ({p.bpm} BPM)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('circles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                viewMode === 'circles'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              Circles
            </button>
            <button
              onClick={() => setViewMode('radial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                viewMode === 'radial'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              Radial
            </button>
          </div>
        </div>
      </div>

      {/* ---- Main content (scrollable) ---- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-5">
        {/* Measure label + beat add/remove */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg text-foreground/80">
              Measure 1
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {store.timeSignature.numerator}/{store.timeSignature.denominator}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={removeBeat}
              disabled={store.timeSignature.numerator <= 1}
              title="Remove Beat"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="font-mono text-xs text-muted-foreground w-16 text-center">
              {store.timeSignature.numerator} beats
            </span>
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={addBeat}
              disabled={store.timeSignature.numerator >= 16}
              title="Add Beat"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ---- Sequencer View ---- */}
        <div className="bg-card border border-border rounded-xl shadow-md p-4 md:p-6 overflow-x-auto vinyl-texture">
          {viewMode === 'circles' ? (
            /* Circles view: horizontal row of pizza beats */
            <div
              className="flex items-start justify-center gap-3 md:gap-5 min-w-min mx-auto"
              style={{ maxWidth: '100%' }}
            >
              {store.beats.map((beatSlices, b) => (
                <PizzaBeat
                  key={b}
                  beatIndex={b}
                  slices={beatSlices}
                  subdivisionCount={beatSlices.length}
                  currentStep={store.currentStep}
                  globalStartIndex={globalStartIndices[b]}
                  onSliceClick={handleSliceClick}
                  size={pizzaSize}
                />
              ))}
            </div>
          ) : (
            /* Radial view: concentric rings */
            <RadialView
              instruments={instruments}
              beats={store.beats}
              subdivisions={store.subdivisions}
              currentStep={store.currentStep}
              onSliceClick={handleRadialSliceClick}
            />
          )}
        </div>

        {/* ---- Subdivision selectors (for radial view) ---- */}
        {viewMode === 'radial' && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {store.beats.map((beatSlices, b) => (
              <div key={b} className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-muted-foreground">Beat {b + 1}:</span>
                <Select
                  value={beatSlices.length.toString()}
                  onValueChange={(v) => {
                    const s = useSequencerStore.getState();
                    s.setSubdivision(b, parseInt(v));
                  }}
                >
                  <SelectTrigger className="w-14 h-6 text-[10px] px-1 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 8].map((n) => (
                      <SelectItem key={n} value={n.toString()} className="text-xs font-mono">
                        /{n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {/* ---- Instrument Palette ---- */}
        <div className="bg-card border border-border rounded-xl shadow-md p-3 md:p-4">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 font-mono">
            Instrument
          </p>
          <div className="flex flex-wrap gap-2">
            {instruments.map((inst) => {
              const color = INSTRUMENT_COLORS[inst] || '#888';
              const isSelected = store.selectedInstrument === inst;
              const shortcut = INSTRUMENT_SHORTCUTS[inst];
              return (
                <button
                  key={inst}
                  onClick={() => {
                    store.setSelectedInstrument(inst as Instrument);
                    playPreview(inst as Instrument);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-mono ${
                    isSelected
                      ? 'bg-card text-foreground'
                      : 'hover:bg-muted/60 text-muted-foreground'
                  }`}
                  style={{
                    border: isSelected
                      ? `2px solid ${color}`
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isSelected
                      ? `0 0 12px ${color}44, inset 0 0 8px ${color}22`
                      : undefined,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: isSelected
                        ? `0 0 8px ${color}`
                        : `0 0 2px ${color}66`,
                    }}
                  />
                  <span className="whitespace-nowrap">
                    {INSTRUMENT_LABELS[inst]}
                  </span>
                  {shortcut && (
                    <span className="text-[9px] bg-muted rounded px-1 ml-auto opacity-60">
                      {shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Keyboard shortcut legend */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5 font-mono">
              Keyboard Shortcuts
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground/70">
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">K</kbd> Kick</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">S</kbd> Snare</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">H</kbd> HH Closed</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">O</kbd> HH Open</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">R</kbd> Ride</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">C</kbd> Crash</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">1</kbd> Tom Hi</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">2</kbd> Tom Mid</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">3</kbd> Tom Low</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">B</kbd> Cowbell</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">P</kbd> Clap</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">X</kbd> X-Stick</span>
              <span><kbd className="bg-muted px-1 rounded text-foreground/60">Space</kbd> Play/Stop</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Transport Bar (sticky bottom) ---- */}
      <div className="flex-shrink-0 px-4 md:px-6 pb-4 md:pb-6">
        <div className="bg-card border border-border rounded-xl shadow-md flex items-center px-4 md:px-6 py-3 gap-3 md:gap-5 flex-wrap">
          {/* Play / Stop */}
          <Button
            size="icon"
            className={`w-12 h-12 rounded-full flex-shrink-0 ${
              isPlaying
                ? 'bg-coral hover:bg-coral/80 shadow-[0_0_15px_rgba(231,76,60,0.5)]'
                : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={handleStart}
          >
            {isPlaying ? (
              <Square className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            )}
          </Button>

          {/* BPM */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => store.setBpm(Math.max(20, store.bpm - 1))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <div className="flex flex-col items-center w-16">
              <input
                type="number"
                className="font-mono text-2xl font-bold tracking-tighter text-foreground bg-transparent w-full text-center border-none outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={store.bpm}
                min={20}
                max={400}
                onChange={(e) => store.setBpm(Number(e.target.value))}
              />
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                BPM
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => store.setBpm(Math.min(400, store.bpm + 1))}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Time Signature */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 font-mono text-lg">
              <span className="font-bold">{store.timeSignature.numerator}</span>
              <span className="text-muted-foreground">/</span>
              <Select
                value={store.timeSignature.denominator.toString()}
                onValueChange={(v) =>
                  store.setTimeSignature(
                    store.timeSignature.numerator,
                    parseInt(v)
                  )
                }
              >
                <SelectTrigger className="w-12 h-7 text-center px-1 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 8, 16].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground">
              SIG
            </span>
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Swing */}
          <div className="flex-1 max-w-[160px] min-w-[100px] flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                Swing
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {store.swing > 0 ? '+' : ''}
                {store.swing}%
              </span>
            </div>
            <Slider
              value={[store.swing]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([v]) => store.setSwing(v)}
            />
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Kit Selector */}
          <Select
            value={store.selectedKit}
            onValueChange={store.setSelectedKit as any}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs font-mono">
              <SelectValue placeholder="Kit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jazz">Jazz Acoustic</SelectItem>
              <SelectItem value="rock">Rock Studio</SelectItem>
              <SelectItem value="808">808 Electronic</SelectItem>
              <SelectItem value="latin">Latin Perc</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8"
              onClick={store.clearAll}
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8"
              onClick={exportMidi}
              title="Export MIDI"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* MIDI indicator */}
          {midiConnected && (
            <div
              className="flex items-center gap-1.5 ml-auto"
              title="MIDI Controller Connected"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              <span className="text-[10px] font-mono text-green-400 uppercase">
                MIDI
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
