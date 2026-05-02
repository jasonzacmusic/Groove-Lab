import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import type { ChordProgression, ChordEntry } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen, Search, Play, Square, ChevronRight, ArrowUp, ArrowDown,
  Music, Repeat, Minus, Plus, Music2,
} from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import { MelodyStaff } from '@/components/MelodyStaff';
import { STANDARDS_BACKING_TRACKS, STANDARDS_ORIGINAL_RECORDINGS } from '@/data/standards-videos';
import { getMelody, hasMelody, type MelodyNote } from '@/data/standard-melodies';
import * as Tone from 'tone';

// ── Constants ────────────────────────────────────────────────────────────────────
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const SHARP_TO_FLAT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

const TRANSPOSITION_PRESETS = [
  { label: 'Concert Pitch (C) \u2014 Piano, Guitar, Bass, Flute, Violin, Cello, Trombone', semitones: 0 },
  { label: 'Bb Instruments (+2) \u2014 Trumpet, Tenor Sax, Clarinet, Soprano Sax', semitones: 2 },
  { label: 'Eb Instruments (+9) \u2014 Alto Sax, Baritone Sax', semitones: 9 },
  { label: 'F Instruments (+7) \u2014 French Horn, English Horn', semitones: 7 },
  { label: 'Bass Clef (Concert) \u2014 Bass, Trombone, Tuba, Cello', semitones: 0 },
];


const GROOVES = [
  { name: 'Swing', description: 'Medium swing feel', swing: 60 },
  { name: 'Bossa Nova', description: 'Latin bossa feel', swing: 0 },
  { name: 'Latin', description: 'Straight Latin feel', swing: 0 },
  { name: 'Ballad', description: 'Slow ballad feel', swing: 30 },
  { name: 'Even 8ths', description: 'Straight rock/pop feel', swing: 0 },
  { name: 'Medium Up', description: 'Up-tempo swing', swing: 50 },
  { name: 'Fast Swing', description: 'Burning tempo', swing: 40 },
  { name: 'Funk', description: 'Funk groove', swing: 0 },
  { name: 'Waltz', description: '3/4 jazz waltz', swing: 50 },
];

// ── Transposition Logic ──────────────────────────────────────────────────────────
function rootToIndex(root: string): number {
  const normalized = FLAT_TO_SHARP[root] || root;
  return Math.max(CHROMATIC.indexOf(normalized), 0);
}

function transposeChord(chord: string, semitones: number): string {
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;
  const [, root, quality] = match;
  const idx = rootToIndex(root);
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = CHROMATIC[newIdx];
  const useFlat = root.includes('b') || Object.values(FLAT_TO_SHARP).includes(FLAT_TO_SHARP[root] || root);
  return (useFlat && SHARP_TO_FLAT[newRoot] ? SHARP_TO_FLAT[newRoot] : newRoot) + quality;
}

// ── Jazz Voicings ────────────────────────────────────────────────────────────────
// Rootless "A/B" piano voicings (Bill Evans / Red Garland style).
// Bass plays the root, so the comping piano omits the root and stacks
// 3rds/7ths/9ths/13ths for that classic clustered jazz sound.
function chordToVoicing(symbol: string): string[] {
  const match = symbol.match(/^([A-G][#b]?)(.*)/);
  if (!match) return ['E3', 'G3', 'B3', 'D4'];
  const [, root, quality] = match;
  const r = rootToIndex(root);
  const q = quality.toLowerCase().replace(/\s/g, '');

  // Detect extensions for richer voicings
  const has9 = q.includes('9') || q.includes('add9');
  const has11 = q.includes('11');
  const has13 = q.includes('13') || q.includes('6/9');
  const hasFlat9 = q.includes('b9');
  const hasSharp9 = q.includes('#9');
  const hasSharp11 = q.includes('#11');
  const hasFlat13 = q.includes('b13') || q.includes('alt');
  const hasFlat5 = q.includes('b5') && !q.includes('m7b5');

  // Pick chord type and rootless intervals (3rd, 5th/7th, 9th, 13th territory)
  let intervals: number[];

  if (q.includes('m7b5') || q.includes('half') || q.includes('\u00f8')) {
    // Half-diminished: b3, b5, b7, 9 (or 11)
    intervals = [3, 6, 10, 14];
  } else if (q.includes('dim7') || q.includes('\u00b07')) {
    intervals = [3, 6, 9, 14];
  } else if (q.includes('dim') || q.includes('\u00b0')) {
    intervals = [3, 6, 11]; // dim with maj7 cluster
  } else if (q.includes('aug') || q === '+' || q === '7+5' || q.includes('+5')) {
    intervals = [4, 8, 10, 14];
  } else if (q.includes('maj7') || q.includes('\u0394') || q.includes('M7')) {
    // Major 7: 3, 7, 9 (Type A: 3-5-7-9 or Type B: 7-9-3-5)
    intervals = has13 ? [4, 11, 14, 21] : [4, 11, 14, 17];
  } else if (q.includes('m7') || q.includes('min7') || q.includes('-7')) {
    // Minor 7: b3, 5, b7, 9
    intervals = has13 ? [3, 10, 14, 21] : [3, 10, 14, 17];
  } else if (q.includes('7sus4') || q.includes('7sus')) {
    // Sus7: 4, 5, b7, 9
    intervals = [5, 10, 14, 17];
  } else if (q.includes('7')) {
    // Dominant 7: 3, b7, 9, 13 (with alterations)
    let third = 4;
    let fifth: number | null = null;
    let seventh = 10;
    let ninth = hasFlat9 ? 13 : hasSharp9 ? 15 : 14;
    let thirteenth = hasFlat13 ? 20 : 21;
    if (hasFlat5) fifth = 6;
    if (hasSharp11) intervals = [third, seventh, ninth, 18]; // 3-b7-9-#11
    else if (has13 || hasFlat13) intervals = [third, seventh, ninth, thirteenth];
    else intervals = fifth !== null ? [third, fifth, seventh, ninth] : [third, seventh, ninth, 17];
  } else if (q.includes('m') || q.includes('min') || q.startsWith('-')) {
    // Plain minor: b3, 5, 9
    intervals = [3, 7, 14];
  } else if (q.includes('sus4')) {
    intervals = [5, 7, 14];
  } else if (q.includes('sus2')) {
    intervals = [2, 7, 14];
  } else if (q.includes('6/9')) {
    intervals = [4, 9, 14, 17];
  } else if (q.includes('6')) {
    intervals = [4, 9, 14];
  } else {
    // Plain major triad → add 9 for color
    intervals = [4, 7, 14];
  }

  // Voicing register: cluster around middle C (octave 3-4)
  // Root virtual position is C3-Bb3 area; intervals up from there
  return intervals.map((interval) => {
    const totalSemis = r + interval;
    const noteIdx = ((totalSemis % 12) + 12) % 12;
    const noteName = CHROMATIC[noteIdx];
    const octave = 3 + Math.floor(totalSemis / 12);
    const displayNote = SHARP_TO_FLAT[noteName] || noteName;
    return displayNote + octave;
  });
}

/** Get the root note name for bass */
function chordRoot(symbol: string): string {
  const match = symbol.match(/^([A-G][#b]?)/);
  return match ? match[1] : 'C';
}

/** Walking bass line generator — musically correct for jazz standards.
 *  Uses chord tones (root, 3rd, 5th, 7th) and chromatic / dominant approaches.
 *  CRITICAL: minor chords get minor 3rd, major chords get major 3rd.
 *  Beat 4 always targets either the 3rd of the NEXT chord (strong voice-leading)
 *  or a chromatic approach to the next root, alternating bars for musicality. */
function walkingBassNotes(chordSymbol: string, nextChord: string, beats: number, barIndex: number): string[] {
  const match = chordSymbol.match(/^([A-G][#b]?)(.*)/);
  const currentRoot = match ? match[1] : 'C';
  const quality = match ? match[2].toLowerCase().replace(/\s/g, '') : '';
  const curIdx = rootToIndex(currentRoot);

  const nxtMatch = nextChord.match(/^([A-G][#b]?)(.*)/);
  const nextRoot = nxtMatch ? nxtMatch[1] : 'C';
  const nextQuality = nxtMatch ? nxtMatch[2].toLowerCase().replace(/\s/g, '') : '';
  const nxtIdx = rootToIndex(nextRoot);
  const nextIsMinor = nextQuality.includes('m') && !nextQuality.includes('maj');

  // Determine chord intervals based on quality
  const isMinor = (quality.includes('m') && !quality.includes('maj'))
    || quality.startsWith('-') || quality.includes('dim') || quality.includes('°') || quality.includes('ø');
  const isDim = quality.includes('dim') || quality.includes('°') || quality.includes('ø');

  const third = isMinor ? 3 : 4;
  const fifth = isDim ? 6 : 7;

  // Octave variation: alternate bars to keep the line moving
  // even bars stay around octave 2, odd bars push up to octave 3
  const oct = (barIndex % 2 === 0) ? '2' : '3';
  const altOct = oct === '2' ? '3' : '2';

  const note = (interval: number, useAltOctave = false) => {
    const idx = (curIdx + interval) % 12;
    return (SHARP_TO_FLAT[CHROMATIC[idx]] || CHROMATIC[idx]) + (useAltOctave ? altOct : oct);
  };

  if (beats <= 1) return [note(0)];

  if (beats === 2) {
    // Root + chromatic approach to next root
    const approach = ((nxtIdx - 1) + 12) % 12;
    return [note(0), (SHARP_TO_FLAT[CHROMATIC[approach]] || CHROMATIC[approach]) + oct];
  }

  if (beats === 3) {
    // Root → 5th → chromatic approach
    return [note(0), note(fifth), (SHARP_TO_FLAT[CHROMATIC[((nxtIdx - 1) + 12) % 12]] || CHROMATIC[((nxtIdx - 1) + 12) % 12]) + oct];
  }

  // 4 beats — the classic walking bass bar.
  // Beat 4 alternates between TARGETING the 3rd of the next chord (strong
  // voice-leading downbeat into the next bar) and a CHROMATIC APPROACH to
  // the next root.
  const targetThirdOfNext = (nxtIdx + (nextIsMinor ? 3 : 4)) % 12;
  const chromaticApproach = ((nxtIdx - 1) + 12) % 12;

  // Even bars → land on next chord's 3rd from a 5th-of-3rd a half-step above
  // Odd bars → traditional chromatic approach to next root
  const beat4 = barIndex % 2 === 0
    ? (SHARP_TO_FLAT[CHROMATIC[(targetThirdOfNext + 1) % 12]] || CHROMATIC[(targetThirdOfNext + 1) % 12]) + oct
    : (SHARP_TO_FLAT[CHROMATIC[chromaticApproach]] || CHROMATIC[chromaticApproach]) + oct;

  // Octave variation on the 5th beat slot to add melodic shape
  if (barIndex % 4 === 2) {
    // Descending pattern: Root → 7th → 5th → approach
    const seventh = quality.includes('maj7') ? 11 : 10;
    return [note(0), note(seventh, true), note(fifth), beat4];
  }

  // Ascending pattern: Root → 3rd → 5th → beat4 target
  return [note(0), note(third), note(fifth), beat4];
}

/** Bossa bass pattern: authentic surdo-style — dotted quarter + eighth tied,
 *  with the classic root-on-1, octave-up-on-3 pattern that drives bossa nova. */
function bossaBassNotes(root: string, beats: number): string[] {
  const idx = rootToIndex(root);
  const fifth = (idx + 7) % 12;
  const rootName = SHARP_TO_FLAT[CHROMATIC[idx]] || CHROMATIC[idx];
  const fifthName = SHARP_TO_FLAT[CHROMATIC[fifth]] || CHROMATIC[fifth];
  const rLow = rootName + '2';
  const rMid = rootName + '3';
  const fLow = fifthName + '2';
  if (beats <= 2) return [rLow, fLow].slice(0, beats);
  // Classic bossa: root(low) - rest - fifth(low) - rest pattern (per beat)
  // For 4 beats: root2 / fifth2 / root2 / fifth2 (driving bossa)
  if (beats >= 4) return [rLow, fLow, rMid, fLow];
  return [rLow, fLow, rLow];
}

// ── Helpers ──────────────────────────────────────────────────────────────────────
function difficultyLabel(level: number | null | undefined): string {
  if (!level) return 'Unknown';
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Advanced';
}

function difficultyColor(level: number | null | undefined): string {
  if (!level) return 'bg-muted text-muted-foreground';
  if (level <= 3) return 'bg-green-500/10 text-green-400';
  if (level <= 6) return 'bg-amber-500/10 text-amber-400';
  return 'bg-red-500/10 text-red-400';
}

function difficultyDots(level: number | null | undefined): React.ReactNode {
  const n = level || 0;
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < n ? (n <= 3 ? 'bg-green-400' : n <= 6 ? 'bg-amber-400' : 'bg-red-400') : 'bg-muted'}`}
        />
      ))}
    </span>
  );
}

/** Determine form section labels (A, B, etc.) */
function getSectionLabel(barIndex: number, totalBars: number, formType: string | null | undefined): string | null {
  const form = (formType || '').toUpperCase();
  if (totalBars === 32 && (form.includes('AABA') || form === 'JAZZ_STANDARD')) {
    if (barIndex === 0) return 'A';
    if (barIndex === 8) return 'A';
    if (barIndex === 16) return 'B';
    if (barIndex === 24) return 'A';
  } else if (totalBars === 32 && form.includes('ABAB')) {
    if (barIndex === 0) return 'A';
    if (barIndex === 8) return 'B';
    if (barIndex === 16) return 'A';
    if (barIndex === 24) return 'B';
  } else if (totalBars === 32 && form.includes('ABAC')) {
    if (barIndex === 0) return 'A';
    if (barIndex === 8) return 'B';
    if (barIndex === 16) return 'A';
    if (barIndex === 24) return 'C';
  } else if (totalBars === 12) {
    if (barIndex === 0) return 'I';
    if (barIndex === 4) return 'IV';
    if (barIndex === 8) return 'V';
  }
  return null;
}

/** Check if a bar is at a repeat boundary (AABA: start of first A, end of second A) */
function getRepeatSign(barIndex: number, totalBars: number, formType: string | null | undefined): 'open' | 'close' | null {
  const form = (formType || '').toUpperCase();
  if (totalBars === 32 && (form.includes('AABA') || form === 'JAZZ_STANDARD')) {
    if (barIndex === 0) return 'open';
    if (barIndex === 7) return 'close';
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────────
export default function Standards() {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transposition, setTransposition] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [groove, setGroove] = useState('Swing');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentChordIdx, setCurrentChordIdx] = useState<number>(-1);
  const [currentBarIdx, setCurrentBarIdx] = useState<number>(-1);
  const [chorusCount, setChorusCount] = useState(1);
  const [showMelody, setShowMelody] = useState(false);
  const [melodyEnabled, setMelodyEnabled] = useState(false);
  const [currentMelodyNoteIdx, setCurrentMelodyNoteIdx] = useState(-1);

  // Refs for instruments
  const pianoRef = useRef<Tone.Sampler | null>(null);
  const bassRef = useRef<Tone.MonoSynth | null>(null);
  const rideRef = useRef<Tone.MetalSynth | null>(null);
  const hihatRef = useRef<Tone.MetalSynth | null>(null);
  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const melodyRef = useRef<Tone.Synth | null>(null);
  const transportStartedRef = useRef(false);
  const isLoopingRef = useRef(false);
  const melodyEnabledRef = useRef(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Keep melody ref in sync
  useEffect(() => { melodyEnabledRef.current = melodyEnabled; }, [melodyEnabled]);

  // Keep looping ref in sync
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  const { data: standards, isLoading } = useGetChordProgressions({
    isJazzStandard: true,
  });

  // ── Filtering ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!standards) return [];
    return standards.filter(s => {
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.composer && s.composer.toLowerCase().includes(search.toLowerCase()));

      let matchDifficulty = true;
      if (difficultyFilter === 'beginner') matchDifficulty = (s.difficultyLevel || 0) >= 1 && (s.difficultyLevel || 0) <= 3;
      else if (difficultyFilter === 'intermediate') matchDifficulty = (s.difficultyLevel || 0) >= 4 && (s.difficultyLevel || 0) <= 6;
      else if (difficultyFilter === 'advanced') matchDifficulty = (s.difficultyLevel || 0) >= 7;

      let matchStyle = true;
      if (styleFilter !== 'all') {
        const name = s.name.toLowerCase();
        const composer = (s.composer || '').toLowerCase();
        const key = (s.keySignature || '').toLowerCase();
        // Classify by standard name and known musical characteristics
        const BLUES_STANDARDS = ['blues','c jam','freddie freeloader','now\'s the time','billie\'s bounce','blue monk','bags\' groove','straight no chaser','tenor madness','watermelon man','blue bossa','dig','oscar peterson blues','blues for alice'];
        const BOSSA_STANDARDS = ['bossa','ipanema','wave','desafinado','corcovado','meditation','triste','how insensitive','quiet nights','one note samba','once i loved','black orpheus','estate','brazil'];
        const BALLAD_STANDARDS = ['ballad','body and soul','misty','my funny valentine','round midnight','in a sentimental mood','lush life','darn that dream','my one and only','angel eyes','skylark','tenderly','prelude to a kiss','unforgettable','when i fall','nearness of you','star dust','emily','beautiful love','polka dots','never let me go','easy living','my foolish heart','here\'s that rainy day','but beautiful','everything happens','i fall in love','laura','lover man','smoke gets','willow weep','you don\'t know what love is','cry me a river'];
        const MODAL_STANDARDS = ['modal','so what','impressions','maiden voyage','footprints','cantaloupe','naima','blue in green','milestones','nefertiti','inner urge','night dreamer','speak no evil','search for peace','passion dance','freedom jazz dance'];
        if (styleFilter === 'blues') matchStyle = BLUES_STANDARDS.some(b => name.includes(b));
        else if (styleFilter === 'bossa') matchStyle = BOSSA_STANDARDS.some(b => name.includes(b));
        else if (styleFilter === 'ballad') matchStyle = BALLAD_STANDARDS.some(b => name.includes(b));
        else if (styleFilter === 'modal') matchStyle = MODAL_STANDARDS.some(b => name.includes(b));
        else if (styleFilter === 'swing') matchStyle = !BLUES_STANDARDS.some(b => name.includes(b)) && !BOSSA_STANDARDS.some(b => name.includes(b)) && !BALLAD_STANDARDS.some(b => name.includes(b)) && !MODAL_STANDARDS.some(b => name.includes(b));
      }

      return matchSearch && matchDifficulty && matchStyle;
    });
  }, [standards, search, difficultyFilter, styleFilter]);

  const selectedStandard = useMemo(() => {
    if (selectedId) {
      const found = filtered.find(s => s.id === selectedId);
      if (found) return found;
    }
    return filtered.length > 0 ? filtered[0] : null;
  }, [selectedId, filtered]);

  // ── Transposed chords ──────────────────────────────────────────────────────────
  const transposedChords = useMemo(() => {
    if (!selectedStandard?.chords) return [];
    if (transposition === 0) return selectedStandard.chords;
    return selectedStandard.chords.map(c => ({
      ...c,
      chord: transposeChord(c.chord, transposition),
    }));
  }, [selectedStandard, transposition]);

  // ── Group chords into bars, then rows of 4 bars ────────────────────────────────
  const { bars, rows } = useMemo(() => {
    const bars: { chords: ChordEntry[]; barIndex: number }[] = [];
    let currentBar: ChordEntry[] = [];
    let beatsInBar = 0;

    for (const chord of transposedChords) {
      currentBar.push(chord);
      beatsInBar += chord.beats;
      if (beatsInBar >= 4) {
        bars.push({ chords: currentBar, barIndex: bars.length });
        currentBar = [];
        beatsInBar = 0;
      }
    }
    if (currentBar.length > 0) {
      bars.push({ chords: currentBar, barIndex: bars.length });
    }

    const rows: typeof bars[] = [];
    for (let i = 0; i < bars.length; i += 4) {
      rows.push(bars.slice(i, i + 4));
    }
    return { bars, rows };
  }, [transposedChords]);

  // ── Flat chord index mapping ───────────────────────────────────────────────────
  const chordFlatIndex = useMemo(() => {
    let idx = 0;
    const map: number[][] = [];
    for (const bar of bars) {
      const barMap: number[] = [];
      for (const _ of bar.chords) {
        barMap.push(idx);
        idx++;
      }
      map.push(barMap);
    }
    return map;
  }, [bars]);

  const totalBars = bars.length;
  const selectedGroove = GROOVES.find(g => g.name === groove) || GROOVES[0];

  const displayKey = selectedStandard
    ? transposition !== 0
      ? transposeChord(selectedStandard.keySignature || 'C', transposition)
      : (selectedStandard.keySignature || 'C')
    : '';

  // ── Auto-scroll to current bar during playback ─────────────────────────────────
  useEffect(() => {
    if (currentBarIdx < 0 || !chartRef.current) return;
    const barEl = chartRef.current.querySelector(`[data-bar="${currentBarIdx}"]`);
    if (barEl) {
      barEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentBarIdx]);

  // ── Sampler loading state ──────────────────────────────────────────────────────
  const [samplerLoading, setSamplerLoading] = useState(false);
  const [samplerReady, setSamplerReady] = useState(false);

  // ── Create instruments (once) ──────────────────────────────────────────────────
  const createInstruments = useCallback(() => {
    // Dispose any existing
    pianoRef.current?.dispose();
    bassRef.current?.dispose();
    rideRef.current?.dispose();
    hihatRef.current?.dispose();
    kickRef.current?.dispose();

    setSamplerLoading(true);

    // Salamander Grand Piano sampler (hosted by Tone.js project)
    // Uses multi-sampled real piano with velocity layers
    // Longer release for natural sustain, gentle reverb for jazz hall feel
    const baseUrl = 'https://tonejs.github.io/audio/salamander/';
    const pianoReverb = new Tone.Reverb({ decay: 1.8, wet: 0.18 }).toDestination();
    pianoRef.current = new Tone.Sampler({
      urls: {
        A1: 'A1.mp3', A2: 'A2.mp3', A3: 'A3.mp3', A4: 'A4.mp3', A5: 'A5.mp3',
        C2: 'C2.mp3', C3: 'C3.mp3', C4: 'C4.mp3', C5: 'C5.mp3',
        'D#2': 'Ds2.mp3', 'D#3': 'Ds3.mp3', 'D#4': 'Ds4.mp3',
        'F#2': 'Fs2.mp3', 'F#3': 'Fs3.mp3', 'F#4': 'Fs4.mp3',
      },
      baseUrl,
      release: 2.4,
      volume: -7,
      onload: () => {
        setSamplerLoading(false);
        setSamplerReady(true);
      },
    }).connect(pianoReverb);

    // Upright jazz bass — warm, round, plucked acoustic character
    // Uses triangle wave (warm fundamental) with gentle low-pass filter
    // and a fast attack + medium decay to simulate finger plucking
    bassRef.current = new Tone.MonoSynth({
      oscillator: { type: 'triangle' }, // warm, round — closest to upright bass
      filter: { type: 'lowpass', frequency: 400, Q: 1, rolloff: -12 },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.15, release: 0.4 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.3, baseFrequency: 120, octaves: 1.8 },
      volume: -4,
    }).toDestination();

    // Jazz ride cymbal - metallic noise burst with long ring
    rideRef.current = new Tone.MetalSynth({
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 3000,
      octaves: 1.5,
      envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 0.6 },
      volume: -20,
    }).toDestination();

    // Jazz hihat / cross-stick - short metallic
    hihatRef.current = new Tone.MetalSynth({
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -24,
    }).toDestination();

    // Jazz kick - warm thump with MembraneSynth
    kickRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
      volume: -14,
    }).toDestination();

    // Melody synth — soft sine wave, distinct from piano comping
    melodyRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
      volume: -6,
    }).toDestination();

    // If sampler doesn't load in 5s, fall back to ready state anyway
    setTimeout(() => { setSamplerLoading(false); setSamplerReady(true); }, 5000);
  }, []);

  // ── Dispose instruments ────────────────────────────────────────────────────────
  const disposeInstruments = useCallback(() => {
    pianoRef.current?.dispose(); pianoRef.current = null;
    bassRef.current?.dispose(); bassRef.current = null;
    rideRef.current?.dispose(); rideRef.current = null;
    hihatRef.current?.dispose(); hihatRef.current = null;
    melodyRef.current?.dispose(); melodyRef.current = null;
    kickRef.current?.dispose(); kickRef.current = null;
  }, []);

  // ── Schedule one chorus of music ───────────────────────────────────────────────
  const scheduleChorus = useCallback((startBeat: number, chords: ChordEntry[], grooveName: string) => {
    const transport = Tone.getTransport();
    const isBossa = grooveName === 'Bossa Nova' || grooveName === 'Latin';
    const isBallad = grooveName === 'Ballad';
    const isSwing = grooveName === 'Swing' || grooveName === 'Medium Up' || grooveName === 'Fast Swing' || grooveName === 'Waltz';
    const isFunk = grooveName === 'Funk';

    let beatOffset = startBeat;

    // Track bar index for highlighting
    let cumBeats = 0;
    let barIdx = 0;

    chords.forEach((chord, chordIdx) => {
      const chordBeats = chord.beats;
      const chordStartBeat = beatOffset;

      // Determine current bar index
      if (cumBeats > 0 && cumBeats % 4 === 0) barIdx = Math.floor(cumBeats / 4);
      const thisBarIdx = Math.floor(cumBeats / 4);

      // ── Piano comping ──
      // Sustain notes longer than '8n' so chords actually ring under the soloist
      // instead of poking out as percussive stabs.
      if (isSwing || isFunk) {
        // Comp on beats 2 and 4 — let each voicing ring for a half-note ("Freddie Green"-ish sustain)
        for (let b = 0; b < chordBeats; b++) {
          const beatInBar = (cumBeats + b) % 4;
          if (beatInBar === 1 || beatInBar === 3) {
            transport.schedule((time) => {
              if (pianoRef.current) {
                const voicing = chordToVoicing(chord.chord);
                pianoRef.current.triggerAttackRelease(voicing, '2n', time, 0.35);
              }
            }, `0:${chordStartBeat + b}:0`);
          }
        }
      } else if (isBossa) {
        // Bossa: comp on 1 and 3 — sustained dotted-quarter feel
        for (let b = 0; b < chordBeats; b++) {
          const beatInBar = (cumBeats + b) % 4;
          if (beatInBar === 0 || beatInBar === 2) {
            transport.schedule((time) => {
              if (pianoRef.current) {
                const voicing = chordToVoicing(chord.chord);
                pianoRef.current.triggerAttackRelease(voicing, '4n.', time, 0.3);
              }
            }, `0:${chordStartBeat + b}:0`);
          }
        }
      } else if (isBallad) {
        // Ballad: whole chord at start
        transport.schedule((time) => {
          if (pianoRef.current) {
            const voicing = chordToVoicing(chord.chord);
            pianoRef.current.triggerAttackRelease(voicing, `0:${chordBeats}:0`, time, 0.25);
          }
        }, `0:${chordStartBeat}:0`);
      } else {
        // Even 8ths: comp on beat 1
        transport.schedule((time) => {
          if (pianoRef.current) {
            const voicing = chordToVoicing(chord.chord);
            pianoRef.current.triggerAttackRelease(voicing, '4n', time, 0.3);
          }
        }, `0:${chordStartBeat}:0`);
      }

      // ── Bass ──
      const nextChord = chords[(chordIdx + 1) % chords.length];
      const root = chordRoot(chord.chord);

      if (isBossa) {
        const bassNotes = bossaBassNotes(root, chordBeats);
        bassNotes.forEach((note, b) => {
          transport.schedule((time) => {
            if (bassRef.current) bassRef.current.triggerAttackRelease(note, '4n', time, 0.7);
          }, `0:${chordStartBeat + b}:0`);
        });
      } else if (isBallad) {
        // Whole note on root
        transport.schedule((time) => {
          const bassNote = (SHARP_TO_FLAT[CHROMATIC[rootToIndex(root)]] || CHROMATIC[rootToIndex(root)]) + '2';
          if (bassRef.current) bassRef.current.triggerAttackRelease(bassNote, `0:${chordBeats}:0`, time, 0.6);
        }, `0:${chordStartBeat}:0`);
      } else {
        // Walking bass — pass bar index so beat-4 voice-leading and octave
        // variation alternate for a more musical line.
        const bassNotes = walkingBassNotes(chord.chord, nextChord.chord, chordBeats, thisBarIdx);
        bassNotes.forEach((note, b) => {
          transport.schedule((time) => {
            if (bassRef.current) bassRef.current.triggerAttackRelease(note, '4n', time, 0.7);
          }, `0:${chordStartBeat + b}:0`);
        });
      }

      // ── Highlight current chord/bar ──
      transport.schedule((time) => {
        Tone.getDraw().schedule(() => {
          setCurrentChordIdx(chordIdx);
          setCurrentBarIdx(thisBarIdx);
        }, time);
      }, `0:${chordStartBeat}:0`);

      beatOffset += chordBeats;
      cumBeats += chordBeats;
    });

    // ── Drums: schedule per beat across the whole chorus ──
    const totalBeats = chords.reduce((sum, c) => sum + c.beats, 0);
    for (let b = 0; b < totalBeats; b++) {
      const beatInBar = b % 4;
      const beatTime = `0:${startBeat + b}:0`;

      if (isSwing || grooveName === 'Medium Up' || grooveName === 'Fast Swing') {
        // Ride on every beat
        transport.schedule((time) => {
          if (rideRef.current) rideRef.current.triggerAttackRelease('C6', '16n', time, 0.3);
        }, beatTime);
        // Hihat on 2 and 4
        if (beatInBar === 1 || beatInBar === 3) {
          transport.schedule((time) => {
            if (hihatRef.current) hihatRef.current.triggerAttackRelease('G5', '32n', time, 0.15);
          }, beatTime);
        }
      } else if (isBossa) {
        // Authentic bossa nova surdo + clave pattern:
        // - SURDO kick: 1, "&" of 2, 3, "&" of 4 (the iconic dotted heartbeat)
        // - Cross-stick (rim click) on the 2-3 clave: 1, "&" of 2, "&" of 3, 4
        // - Soft ride pulse on every beat
        // Surdo kick: downbeat 1
        if (beatInBar === 0 || beatInBar === 2) {
          transport.schedule((time) => {
            if (kickRef.current) kickRef.current.triggerAttackRelease('A1', '4n', time, 0.4);
          }, beatTime);
        }
        // Surdo accent on the "&" of 2 and "&" of 4 — the syncopated kick
        if (beatInBar === 1 || beatInBar === 3) {
          transport.schedule((time) => {
            if (kickRef.current) kickRef.current.triggerAttackRelease('A1', '8n', time, 0.28);
          }, `0:${startBeat + b}:2`);
        }
        // Cross-stick on 2 and 4
        if (beatInBar === 1 || beatInBar === 3) {
          transport.schedule((time) => {
            if (hihatRef.current) hihatRef.current.triggerAttackRelease('E5', '32n', time, 0.18);
          }, beatTime);
        }
        // Eighth-note "and" of beat 2 — clave accent (cross-stick)
        if (beatInBar === 1) {
          transport.schedule((time) => {
            if (hihatRef.current) hihatRef.current.triggerAttackRelease('D5', '32n', time, 0.1);
          }, `0:${startBeat + b}:2`);
        }
        // Soft ride pulse on every beat
        transport.schedule((time) => {
          if (rideRef.current) rideRef.current.triggerAttackRelease('C6', '16n', time, 0.08);
        }, beatTime);
      } else if (isBallad) {
        // Very soft brushes feel
        if (beatInBar === 0) {
          transport.schedule((time) => {
            if (rideRef.current) rideRef.current.triggerAttackRelease('C6', '8n', time, 0.1);
          }, beatTime);
        }
        if (beatInBar === 2) {
          transport.schedule((time) => {
            if (hihatRef.current) hihatRef.current.triggerAttackRelease('G5', '32n', time, 0.08);
          }, beatTime);
        }
      } else if (isFunk) {
        // Funk: hihat every beat, kick on 1 and the "and" of 2
        transport.schedule((time) => {
          if (hihatRef.current) hihatRef.current.triggerAttackRelease('G5', '32n', time, 0.2);
        }, beatTime);
        if (beatInBar === 0) {
          transport.schedule((time) => {
            if (kickRef.current) kickRef.current.triggerAttackRelease('C2', '16n', time, 0.25);
          }, beatTime);
        }
      } else {
        // Even 8ths: simple pattern
        transport.schedule((time) => {
          if (hihatRef.current) hihatRef.current.triggerAttackRelease('G5', '32n', time, 0.15);
        }, beatTime);
        if (beatInBar === 0 || beatInBar === 2) {
          transport.schedule((time) => {
            if (kickRef.current) kickRef.current.triggerAttackRelease('C2', '16n', time, 0.15);
          }, beatTime);
        }
      }
    }

    // Note: melody notes are scheduled directly from playChords because they
    // require the standard name (which scheduleChorus does not have).

    return { totalBeats, endBeat: beatOffset };
  }, []);

  // ── Playback ───────────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    disposeInstruments();
    transportStartedRef.current = false;
    setIsPlaying(false);
    setCurrentChordIdx(-1);
    setCurrentBarIdx(-1);
    setCurrentMelodyNoteIdx(-1);
    setChorusCount(1);
  }, [disposeInstruments]);

  const playChords = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    stopPlayback();
    try {
      await Tone.start();

      createInstruments();

      const transport = Tone.getTransport();
      transport.bpm.value = bpm;
      transport.swing = selectedGroove.swing / 100;
      transport.swingSubdivision = '8n';

      const { totalBeats } = scheduleChorus(0, transposedChords, groove);

      // Schedule melody if enabled
      if (melodyEnabledRef.current && selectedStandard) {
        const melodyData = getMelody(selectedStandard.name);
        if (melodyData) {
          melodyData.notes.forEach((note, noteIdx) => {
            // Transpose the pitch if needed
            let pitch = note.pitch;
            if (transposition !== 0) {
              const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
              const SHARP_TO_FLAT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
              const match = pitch.match(/^([A-G][b#]?)(\d)$/);
              if (match) {
                const [, noteName, octave] = match;
                const normalized = FLAT_TO_SHARP[noteName] || noteName;
                const idx = CHROMATIC.indexOf(normalized);
                if (idx >= 0) {
                  const newIdx = (idx + transposition + 12) % 12;
                  const newOctave = parseInt(octave) + Math.floor((idx + transposition) / 12);
                  const newNote = SHARP_TO_FLAT[CHROMATIC[newIdx]] || CHROMATIC[newIdx];
                  pitch = `${newNote}${newOctave}`;
                }
              }
            }

            transport.schedule((time) => {
              if (melodyRef.current) {
                melodyRef.current.triggerAttackRelease(pitch, note.duration, time, 0.7);
              }
              Tone.getDraw().schedule(() => {
                setCurrentMelodyNoteIdx(noteIdx);
              }, time);
            }, `0:${note.beat}:0`);
          });
        }
      }

      // Schedule end or loop
      transport.schedule((time) => {
        Tone.getDraw().schedule(() => {
          if (isLoopingRef.current) {
            // Stop, re-schedule, and restart
            transport.stop();
            transport.cancel();
            setChorusCount(prev => prev + 1);
            const { totalBeats: newTotal } = scheduleChorus(0, transposedChords, groove);
            transport.schedule((time2) => {
              Tone.getDraw().schedule(() => {
                if (isLoopingRef.current) {
                  // Keep looping by retriggering play
                  setIsPlaying(false);
                  setTimeout(() => {
                    // re-enter playChords would be complex, so just loop once more inline
                    transport.stop();
                    transport.cancel();
                    scheduleChorus(0, transposedChords, groove);
                    transport.start();
                  }, 50);
                  setIsPlaying(true);
                } else {
                  stopPlayback();
                }
              }, time2);
            }, `0:${newTotal}:0`);
            transport.start();
          } else {
            stopPlayback();
          }
        }, time);
      }, `0:${totalBeats}:0`);

      setIsPlaying(true);
      setChorusCount(1);
      transport.start();
      transportStartedRef.current = true;
    } catch (err) {
      console.error('Playback failed:', err);
      stopPlayback();
      return;
    }
  }, [isPlaying, stopPlayback, createInstruments, transposedChords, bpm, groove, selectedGroove, scheduleChorus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transportStartedRef.current) {
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
      }
      disposeInstruments();
    };
  }, [disposeInstruments]);

  // Stop playback when changing standard
  useEffect(() => {
    stopPlayback();
  }, [selectedId, stopPlayback]);

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-[300px] border-r border-border bg-sidebar flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            Jazz Standards
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search standards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="flex-1 bg-background border-border text-xs h-8">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner (1-3)</SelectItem>
                <SelectItem value="intermediate">Intermediate (4-6)</SelectItem>
                <SelectItem value="advanced">Advanced (7+)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={styleFilter} onValueChange={setStyleFilter}>
              <SelectTrigger className="flex-1 bg-background border-border text-xs h-8">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                <SelectItem value="swing">Swing</SelectItem>
                <SelectItem value="bossa">Bossa/Latin</SelectItem>
                <SelectItem value="ballad">Ballad</SelectItem>
                <SelectItem value="blues">Blues</SelectItem>
                <SelectItem value="modal">Modal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} standard{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="p-3 border-b border-border">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : (
              filtered.map(std => {
                const isSelected = selectedStandard?.id === std.id;
                return (
                  <div
                    key={std.id}
                    className={`px-3 py-2.5 border-b border-border cursor-pointer transition-colors flex items-center justify-between group
                      ${isSelected
                        ? 'bg-amber-500/10 border-l-[3px] border-l-amber-500'
                        : 'hover:bg-muted/50 border-l-[3px] border-l-transparent'
                      }`}
                    onClick={() => { setSelectedId(std.id); setTransposition(0); }}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className={`font-serif text-sm truncate leading-tight ${isSelected ? 'text-amber-400' : 'text-foreground'}`}>
                        {std.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                          {std.composer || 'Unknown'}
                        </p>
                        {difficultyDots(std.difficultyLevel)}
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${isSelected ? 'text-amber-500 opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Main Chord Chart Area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {selectedStandard ? (
          <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-0">

            {/* ── Transposition — top of detail pane ─────────────────────────── */}
            <div className="mb-4 p-4 bg-card border border-border rounded-xl flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-foreground">Concert / Bb / Eb key:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setTransposition(prev => ((prev - 1) + 12) % 12)}
                >
                  <ArrowDown className="w-3.5 h-3.5 mr-1" /> Down
                </Button>
                <span className="font-mono text-xl font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/30 min-w-[3rem] text-center">
                  {displayKey}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setTransposition(prev => (prev + 1) % 12)}
                >
                  <ArrowUp className="w-3.5 h-3.5 mr-1" /> Up
                </Button>
              </div>
              <Select
                value={String(transposition)}
                onValueChange={(val) => setTransposition(Number(val))}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPOSITION_PRESETS.map(p => (
                    <SelectItem key={p.label} value={String(p.semitones)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transposition !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground hover:text-foreground text-xs"
                  onClick={() => setTransposition(0)}
                >
                  Reset
                </Button>
              )}
            </div>

            {/* ── Real Book Title Area ─────────────────────────────────────────── */}
            <div className="bg-[#f5f0e1] dark:bg-[#2a2520] rounded-t-xl px-6 md:px-10 pt-8 pb-4 border border-b-0 border-[#d4c9a8] dark:border-[#4a3f30]">
              <h1 className="font-serif text-3xl md:text-5xl text-[#2c1810] dark:text-[#e8d5b5] text-center leading-tight tracking-tight">
                {selectedStandard.name}
              </h1>
              {selectedStandard.composer && (
                <p className="text-center text-base md:text-lg text-[#6b5744] dark:text-[#a89070] mt-2 font-serif italic">
                  {selectedStandard.composer}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="inline-block px-2.5 py-0.5 text-xs font-mono rounded bg-[#e6dcc6] dark:bg-[#3d3428] text-[#6b5744] dark:text-[#b8a080] border border-[#d4c9a8] dark:border-[#4a3f30]">
                  Key: {displayKey}
                </span>
                <span className="inline-block px-2.5 py-0.5 text-xs font-mono rounded bg-[#e6dcc6] dark:bg-[#3d3428] text-[#6b5744] dark:text-[#b8a080] border border-[#d4c9a8] dark:border-[#4a3f30]">
                  4/4
                </span>
                {selectedStandard.progressionType && (
                  <span className="inline-block px-2.5 py-0.5 text-xs font-mono rounded bg-[#e6dcc6] dark:bg-[#3d3428] text-[#6b5744] dark:text-[#b8a080] border border-[#d4c9a8] dark:border-[#4a3f30] uppercase">
                    {selectedStandard.progressionType}
                  </span>
                )}
                <span className="inline-block px-2.5 py-0.5 text-xs font-mono rounded bg-[#e6dcc6] dark:bg-[#3d3428] text-[#6b5744] dark:text-[#b8a080] border border-[#d4c9a8] dark:border-[#4a3f30]">
                  {totalBars} bars
                </span>
                <span className={`inline-block px-2.5 py-0.5 text-xs font-mono rounded border ${
                  (selectedStandard.difficultyLevel || 0) <= 3
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                    : (selectedStandard.difficultyLevel || 0) <= 6
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                }`}>
                  {difficultyLabel(selectedStandard.difficultyLevel)} ({selectedStandard.difficultyLevel || '?'}/10)
                </span>
              </div>
            </div>

            {/* ── iRealPro-style Control Bar ──────────────────────────────────── */}
            <div className="bg-[#3d3428] dark:bg-[#1a1510] border-x border-[#d4c9a8] dark:border-[#4a3f30] px-3 md:px-6 py-3 flex flex-wrap items-center gap-3">
              {/* Groove selector */}
              <div className="flex items-center gap-2">
                <Select value={groove} onValueChange={setGroove}>
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-[#2a2018] border-[#5a4a38] text-[#e8d5b5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROOVES.map(g => (
                      <SelectItem key={g.name} value={g.name}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tempo */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-[#b8a080] hover:text-[#e8d5b5] hover:bg-[#5a4a38]"
                  onClick={() => setBpm(prev => Math.max(40, prev - 5))}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-mono text-[#e8d5b5] w-10 text-center font-bold tabular-nums">
                  {bpm}
                </span>
                <span className="text-[10px] text-[#8a7a68] font-mono">BPM</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-[#b8a080] hover:text-[#e8d5b5] hover:bg-[#5a4a38]"
                  onClick={() => setBpm(prev => Math.min(300, prev + 5))}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="w-px h-6 bg-[#5a4a38] hidden md:block" />

              {/* Play / Stop */}
              <Button
                size="sm"
                className={`h-9 px-4 font-bold text-sm ${
                  isPlaying
                    ? 'bg-red-700 hover:bg-red-800 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
                onClick={playChords}
              >
                {isPlaying ? (
                  <><Square className="w-3.5 h-3.5 mr-1.5" fill="currentColor" /> Stop</>
                ) : (
                  <><Play className="w-3.5 h-3.5 mr-1.5" fill="currentColor" /> Play</>
                )}
              </Button>

              {/* Loop toggle */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 text-xs ${
                  isLooping
                    ? 'text-amber-400 bg-amber-900/30 hover:bg-amber-900/50'
                    : 'text-[#8a7a68] hover:text-[#e8d5b5] hover:bg-[#5a4a38]'
                }`}
                onClick={() => setIsLooping(prev => !prev)}
              >
                <Repeat className="w-3.5 h-3.5 mr-1" />
                Loop
              </Button>

              {/* Melody toggles */}
              <div className="w-px h-6 bg-[#5a4a38] hidden md:block" />

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 text-xs ${
                  showMelody
                    ? 'text-cyan-400 bg-cyan-900/30 hover:bg-cyan-900/50'
                    : 'text-[#8a7a68] hover:text-[#e8d5b5] hover:bg-[#5a4a38]'
                }`}
                onClick={() => setShowMelody(prev => !prev)}
                disabled={!selectedStandard || !hasMelody(selectedStandard.name)}
                title={selectedStandard && hasMelody(selectedStandard.name) ? 'Show/hide melody notation' : 'Melody not yet available for this standard'}
              >
                <Music2 className="w-3.5 h-3.5 mr-1" />
                Melody
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 text-xs ${
                  melodyEnabled
                    ? 'text-green-400 bg-green-900/30 hover:bg-green-900/50'
                    : 'text-[#8a7a68] hover:text-[#e8d5b5] hover:bg-[#5a4a38]'
                }`}
                onClick={() => setMelodyEnabled(prev => !prev)}
                disabled={!selectedStandard || !hasMelody(selectedStandard.name)}
                title={selectedStandard && hasMelody(selectedStandard.name) ? 'Play melody with backing track' : 'Melody not yet available'}
              >
                <Play className="w-3 h-3 mr-1" fill="currentColor" />
                {melodyEnabled ? 'Melody On' : 'Melody Off'}
              </Button>

              {/* Chorus counter */}
              {isPlaying && (
                <span className="text-[11px] text-[#8a7a68] font-mono ml-auto">
                  Chorus {chorusCount} / {isLooping ? '\u221e' : '1'}
                </span>
              )}
            </div>

            {/* ── Melody Staff Notation ──────────────────────────────────────── */}
            {selectedStandard && (() => {
              const melodyData = getMelody(selectedStandard.name);
              return melodyData ? (
                <MelodyStaff
                  abc={melodyData.abc}
                  currentNoteIdx={currentMelodyNoteIdx}
                  isVisible={showMelody}
                  transposition={transposition}
                />
              ) : null;
            })()}

            {/* ── Chord Chart (Real Book style) ──────────────────────────────── */}
            <div
              ref={chartRef}
              className="bg-[#f5f0e1] dark:bg-[#2a2520] border-x border-b border-[#d4c9a8] dark:border-[#4a3f30] rounded-b-xl px-2 md:px-6 py-6 md:py-8"
            >
              {rows.map((row, rowIdx) => {
                const firstBarIdx = rowIdx * 4;
                const measureNum = firstBarIdx + 1;
                const sectionLabel = getSectionLabel(firstBarIdx, totalBars, selectedStandard.progressionType);

                return (
                  <div key={rowIdx} className="flex items-stretch mb-0">
                    {/* ── Gutter: section label + measure number ── */}
                    <div className="w-10 md:w-14 flex-shrink-0 flex flex-col justify-center items-end pr-1.5 md:pr-3">
                      {sectionLabel && (
                        <span className="text-sm md:text-base font-serif font-bold text-[#8b6914] dark:text-amber-500 leading-none mb-0.5">
                          {sectionLabel}
                        </span>
                      )}
                      <span className="text-[10px] text-[#a09080] dark:text-[#6a5a48] font-mono">
                        {measureNum}
                      </span>
                    </div>

                    {/* ── Bars ── */}
                    <div className="flex-1 flex">
                      {/* Opening repeat sign for row */}
                      {row.some((_, i) => getRepeatSign(firstBarIdx + i, totalBars, selectedStandard.progressionType) === 'open') && (
                        <div className="flex items-center pr-0.5">
                          <div className="w-[3px] h-full bg-[#5a4a30] dark:bg-[#8a7a60] rounded-sm mr-[2px]" />
                          <div className="w-[1px] h-full bg-[#5a4a30] dark:bg-[#8a7a60]" />
                          <div className="flex flex-col justify-center gap-1.5 ml-[3px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5a4a30] dark:bg-[#8a7a60]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5a4a30] dark:bg-[#8a7a60]" />
                          </div>
                        </div>
                      )}

                      <div className="flex-1 grid grid-cols-4">
                        {row.map((bar, barIdxInRow) => {
                          const globalBarIdx = firstBarIdx + barIdxInRow;
                          const isCurrentBar = isPlaying && globalBarIdx === currentBarIdx;
                          const isLastBar = globalBarIdx === totalBars - 1;

                          return (
                            <div
                              key={barIdxInRow}
                              data-bar={globalBarIdx}
                              className={`relative py-3 md:py-4 px-1.5 md:px-3 flex items-center justify-center min-h-[56px] md:min-h-[64px] transition-colors duration-200
                                ${/* Left border (barline) */ ''}
                                border-l border-[#b8a888] dark:border-[#5a4a38]
                                ${/* Right border: double barline on last bar */ ''}
                                ${isLastBar ? 'border-r-[3px] border-r-[#5a4a30] dark:border-r-[#8a7a60]' : (barIdxInRow === row.length - 1 ? 'border-r border-[#b8a888] dark:border-[#5a4a38]' : '')}
                                ${/* Top/bottom borders for first/last row */ ''}
                                ${rowIdx === 0 ? 'border-t border-[#b8a888] dark:border-[#5a4a38]' : ''}
                                ${rowIdx === rows.length - 1 ? 'border-b border-[#b8a888] dark:border-[#5a4a38]' : ''}
                                ${/* Amber glow for current bar */ ''}
                                ${isCurrentBar ? 'bg-amber-400/20 dark:bg-amber-600/15' : ''}
                              `}
                              style={isCurrentBar ? { boxShadow: 'inset 0 0 20px rgba(217, 160, 50, 0.15)' } : undefined}
                            >
                              {/* Playhead indicator */}
                              {isCurrentBar && (
                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500/70 dark:bg-amber-400/60 animate-pulse" />
                              )}

                              <div className="flex items-baseline justify-center gap-1 md:gap-2 flex-wrap">
                                {bar.chords.map((chord, chordIdxInBar) => {
                                  const flatIdx = chordFlatIndex[globalBarIdx]?.[chordIdxInBar] ?? -1;
                                  const isHighlighted = isPlaying && flatIdx === currentChordIdx;

                                  // Parse chord for rendering
                                  const chordMatch = chord.chord.match(/^([A-G][#b]?)(.*)/);
                                  const rootDisplay = chordMatch ? chordMatch[1] : chord.chord;
                                  const qualityDisplay = chordMatch ? chordMatch[2] : '';

                                  return (
                                    <React.Fragment key={chordIdxInBar}>
                                      {chordIdxInBar > 0 && (
                                        <span className="text-[#b8a888] dark:text-[#5a4a38] text-xs select-none">/</span>
                                      )}
                                      <span
                                        className={`font-serif transition-all duration-150 px-0.5 ${
                                          isHighlighted
                                            ? 'text-[#8b5e14] dark:text-amber-300'
                                            : 'text-[#2c1810] dark:text-[#e0ccaa]'
                                        }`}
                                        style={isHighlighted ? {
                                          textShadow: '0 0 12px rgba(217, 160, 50, 0.5)',
                                        } : undefined}
                                      >
                                        <span className="text-xl md:text-2xl">{rootDisplay}</span>
                                        <span className="text-base md:text-lg">{qualityDisplay}</span>
                                      </span>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {/* Fill empty cells in last row */}
                        {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className={`border-l border-[#b8a888] dark:border-[#5a4a38] py-3 md:py-4 px-3 min-h-[56px] md:min-h-[64px]
                              ${i === 4 - row.length - 1 ? 'border-r border-[#b8a888] dark:border-[#5a4a38]' : ''}
                              ${rowIdx === 0 ? 'border-t border-[#b8a888] dark:border-[#5a4a38]' : ''}
                              ${rowIdx === rows.length - 1 ? 'border-b border-[#b8a888] dark:border-[#5a4a38]' : ''}
                              bg-[#ede5d0]/50 dark:bg-[#231e18]/50
                            `}
                          />
                        ))}
                      </div>

                      {/* Closing repeat sign */}
                      {row.some((_, i) => getRepeatSign(firstBarIdx + i, totalBars, selectedStandard.progressionType) === 'close') && (
                        <div className="flex items-center pl-0.5">
                          <div className="flex flex-col justify-center gap-1.5 mr-[3px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5a4a30] dark:bg-[#8a7a60]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5a4a30] dark:bg-[#8a7a60]" />
                          </div>
                          <div className="w-[1px] h-full bg-[#5a4a30] dark:bg-[#8a7a60]" />
                          <div className="w-[3px] h-full bg-[#5a4a30] dark:bg-[#8a7a60] rounded-sm ml-[2px]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Transposition indicator */}
              {transposition !== 0 && (
                <div className="mt-4 text-center">
                  <span className="text-xs font-mono text-[#8a7a60] dark:text-[#6a5a48]">
                    Transposed {transposition > 0 ? '+' : ''}{transposition} semitones from original key
                  </span>
                </div>
              )}
            </div>

            {/* ── Practice: Backing Tracks ─────────────────────────────────── */}
            {(() => {
              const name = selectedStandard.name;
              const knownTracks = STANDARDS_BACKING_TRACKS[name] || [];
              const greats = STANDARDS_ORIGINAL_RECORDINGS[name] || [];

              return (
                <>
                  <div className="space-y-4 mt-8">
                    <h3 className="font-serif text-xl text-foreground flex items-center gap-2">
                      <Play className="w-5 h-5 text-red-500" fill="currentColor" />
                      Practice — Backing Tracks
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Play along with "{name}" in {displayKey}. Use the transposer above for Bb/Eb instruments.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {knownTracks.length > 0 ? (
                        knownTracks.slice(0, 6).map((track) => (
                          <YouTubeInline key={track.id} videoId={track.id} title={track.title} channel={track.channel} />
                        ))
                      ) : (
                        <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                          <p className="text-xs text-muted-foreground">
                            No curated backing tracks yet for "{name}". Use the player above to practice with the built-in chord engine.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Inspiration: The Greats ──────────────────────────────────── */}
                  {greats.length > 0 && (
                    <div className="space-y-4 mt-8">
                      <h3 className="font-serif text-xl text-foreground flex items-center gap-2">
                        <Music className="w-5 h-5 text-amber-500" />
                        The Greats — Historic Recordings
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Study the masters. Listen to how the greats interpreted "{name}."
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {greats.slice(0, 6).map((rec) => (
                          <YouTubeInline key={rec.id} videoId={rec.id} title={rec.title} channel={rec.channel} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="font-serif text-2xl">
              {isLoading ? 'Loading standards...' : 'No standards found'}
            </h3>
            {!isLoading && search && (
              <p className="text-sm mt-2">Try adjusting your search or filters</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
