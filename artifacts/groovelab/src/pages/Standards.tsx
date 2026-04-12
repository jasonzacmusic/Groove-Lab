import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import type { ChordProgression, ChordEntry } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { BookOpen, Search, Play, Square, ChevronRight, ArrowUp, ArrowDown, ExternalLink, Music } from 'lucide-react';
import * as Tone from 'tone';

// ── Transposition Logic ─────────────────────────────────────────────────────────
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const SHARP_TO_FLAT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

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

// ── Jazz Voicings ───────────────────────────────────────────────────────────────
function chordToVoicing(symbol: string): string[] {
  const match = symbol.match(/^([A-G][#b]?)(.*)/);
  if (!match) return ['C3', 'E3', 'G3', 'B3'];
  const [, root, quality] = match;
  const r = rootToIndex(root);
  const q = quality.toLowerCase().replace(/\s/g, '');

  // Intervals from root (in semitones)
  let intervals: number[];
  if (q.includes('m7b5') || q.includes('half') || q.includes('\u00f8')) {
    intervals = [0, 3, 6, 10]; // half-diminished
  } else if (q.includes('dim7') || q.includes('\u00b07')) {
    intervals = [0, 3, 6, 9]; // fully diminished
  } else if (q.includes('dim') || q.includes('\u00b0')) {
    intervals = [0, 3, 6];
  } else if (q.includes('aug') || q === '+') {
    intervals = [0, 4, 8];
  } else if (q.includes('maj7') || q.includes('\u0394')) {
    intervals = [0, 4, 7, 11]; // major 7
  } else if (q.includes('m7') || q.includes('min7') || q.includes('-7')) {
    intervals = [0, 3, 7, 10]; // minor 7
  } else if (q.includes('7sus4') || q.includes('7sus')) {
    intervals = [0, 5, 7, 10];
  } else if (q.includes('7')) {
    intervals = [0, 4, 7, 10]; // dominant 7
  } else if (q.includes('m') || q.includes('min') || q.startsWith('-')) {
    intervals = [0, 3, 7];
  } else if (q.includes('sus4')) {
    intervals = [0, 5, 7];
  } else if (q.includes('sus2')) {
    intervals = [0, 2, 7];
  } else if (q.includes('6')) {
    intervals = [0, 4, 7, 9];
  } else {
    intervals = [0, 4, 7]; // major triad
  }

  // Jazz voicing: spread across octaves 3-4 for a close rootless-ish voicing
  return intervals.map((interval, i) => {
    const noteIdx = (r + interval) % 12;
    const noteName = CHROMATIC[noteIdx];
    // Put root in octave 3, upper notes in 3 or 4
    const octave = i === 0 ? 3 : (r + interval >= 12 ? 4 : (interval > 6 ? 4 : 3));
    const displayNote = SHARP_TO_FLAT[noteName] || noteName;
    return displayNote + octave;
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
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

function styleFromTags(std: ChordProgression): string {
  const type = std.progressionType?.toLowerCase() || '';
  const name = std.name.toLowerCase();
  // Try to infer style from progression type or name hints
  if (type.includes('blues') || type.includes('12-bar')) return 'Blues';
  if (type.includes('modal') || name.includes('modal')) return 'Modal';
  return 'Swing'; // default
}

/** Determine form section labels (A, B, etc.) for an AABA-like form */
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

// ── Transposition Presets ───────────────────────────────────────────────────────
const TRANSPOSITION_PRESETS = [
  { label: 'Concert Pitch (C)', semitones: 0 },
  { label: 'Bb Instruments (+2)', semitones: 2 },
  { label: 'Eb Instruments (+9)', semitones: 9 },
];

// ── Component ───────────────────────────────────────────────────────────────────
export default function Standards() {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transposition, setTransposition] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIdx, setCurrentChordIdx] = useState<number>(-1);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const transportStartedRef = useRef(false);

  const { data: standards, isLoading } = useGetChordProgressions({
    isJazzStandard: true,
  });

  // ── Filtering ───────────────────────────────────────────────────────────────
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
        const ptype = s.progressionType?.toLowerCase() || '';
        const tags = s.genre?.name?.toLowerCase() || '';
        if (styleFilter === 'blues') matchStyle = ptype.includes('blues') || ptype.includes('12-bar');
        else if (styleFilter === 'bossa') matchStyle = tags.includes('bossa') || tags.includes('latin');
        else if (styleFilter === 'ballad') matchStyle = tags.includes('ballad');
        else if (styleFilter === 'modal') matchStyle = tags.includes('modal');
        else if (styleFilter === 'swing') matchStyle = tags.includes('swing') || tags.includes('jazz');
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

  // ── Transposed chords ───────────────────────────────────────────────────────
  const transposedChords = useMemo(() => {
    if (!selectedStandard) return [];
    if (transposition === 0) return selectedStandard.chords;
    return selectedStandard.chords.map(c => ({
      ...c,
      chord: transposeChord(c.chord, transposition),
    }));
  }, [selectedStandard, transposition]);

  // ── Group chords into bars, then rows of 4 bars ─────────────────────────────
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

  // ── Flat chord index mapping (for highlighting current chord during playback)
  const chordFlatIndex = useMemo(() => {
    // Map each bar+chord position to a flat index into transposedChords
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

  // ── Playback ────────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    scheduledEventsRef.current = [];
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    transportStartedRef.current = false;
    setIsPlaying(false);
    setCurrentChordIdx(-1);
  }, []);

  const playChords = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    stopPlayback();
    await Tone.start();

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.6 },
      volume: -10,
    }).toDestination();
    synthRef.current = synth;

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    let beatOffset = 0;
    transposedChords.forEach((chord, chordIdx) => {
      const startTime = `0:0:${beatOffset}`;
      const durationBeats = chord.beats;
      const durationStr = `0:${durationBeats}:0`;

      transport.schedule((time) => {
        const notes = chordToVoicing(chord.chord);
        synth.triggerAttackRelease(notes, durationStr, time, 0.5);
        Tone.getDraw().schedule(() => {
          setCurrentChordIdx(chordIdx);
        }, time);
      }, `0:${beatOffset}:0`);

      beatOffset += durationBeats;
    });

    // Schedule stop at end
    transport.schedule(() => {
      Tone.getDraw().schedule(() => {
        stopPlayback();
      }, Tone.now());
    }, `0:${beatOffset}:0`);

    setIsPlaying(true);
    transport.start();
    transportStartedRef.current = true;
  }, [isPlaying, stopPlayback, transposedChords, bpm]);

  // Cleanup on unmount or standard change
  useEffect(() => {
    return () => {
      if (transportStartedRef.current) {
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
      }
      if (synthRef.current) {
        synthRef.current.releaseAll();
        synthRef.current.dispose();
        synthRef.current = null;
      }
    };
  }, []);

  // Stop playback when changing standard
  useEffect(() => {
    stopPlayback();
  }, [selectedId, stopPlayback]);

  const totalBars = bars.length;
  const displayKey = selectedStandard
    ? transposition !== 0
      ? transposeChord(selectedStandard.keySignature || 'C', transposition)
      : (selectedStandard.keySignature || 'C')
    : '';

  const youtubeSearchUrl = selectedStandard
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedStandard.name + ' ' + (selectedStandard.keySignature || '') + ' backing track jazz')}`
    : '';

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
          <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
            {/* Header */}
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground leading-tight">
                {selectedStandard.name}
              </h1>
              {selectedStandard.composer && (
                <p className="text-base text-muted-foreground mt-1 font-serif italic">
                  {selectedStandard.composer}
                </p>
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono text-sm bg-amber-500/10 text-amber-400 border-amber-500/20">
                Key: {displayKey}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">4/4</Badge>
              {selectedStandard.progressionType && (
                <Badge variant="outline" className="font-mono text-xs uppercase">
                  {selectedStandard.progressionType}
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                {totalBars} bars
              </Badge>
              <Badge className={`${difficultyColor(selectedStandard.difficultyLevel)} border-0 text-xs`}>
                {difficultyLabel(selectedStandard.difficultyLevel)} ({selectedStandard.difficultyLevel || '?'}/10)
              </Badge>
            </div>

            {/* Transposition Controls */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground mr-1">Transpose:</span>
              <Select
                value={String(transposition)}
                onValueChange={(val) => setTransposition(Number(val))}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPOSITION_PRESETS.map(p => (
                    <SelectItem key={p.semitones} value={String(p.semitones)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setTransposition(prev => ((prev - 1) + 12) % 12)}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setTransposition(prev => (prev + 1) % 12)}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
              </div>
              {transposition !== 0 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {transposition > 0 ? '+' : ''}{transposition} semitones
                </Badge>
              )}
            </div>

            {/* Play controls */}
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
              <Button
                size="sm"
                className={`h-9 ${isPlaying ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                onClick={playChords}
              >
                {isPlaying ? (
                  <><Square className="w-3.5 h-3.5 mr-1.5" fill="currentColor" /> Stop</>
                ) : (
                  <><Play className="w-3.5 h-3.5 mr-1.5" fill="currentColor" /> Play Changes</>
                )}
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[300px]">
                <span className="text-xs text-muted-foreground whitespace-nowrap">BPM:</span>
                <Slider
                  value={[bpm]}
                  onValueChange={([v]) => setBpm(v)}
                  min={40}
                  max={240}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-foreground w-8 text-right">{bpm}</span>
              </div>
            </div>

            {/* ── Chord Chart ──────────────────────────────────────────────────── */}
            <div className="rounded-lg border border-amber-500/10 overflow-hidden">
              <div className="p-3 border-b border-amber-500/10 bg-amber-50/[0.03] flex justify-between items-center">
                <h3 className="font-serif text-lg text-foreground flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-500" />
                  Chord Chart
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {transposedChords.length} changes
                </span>
              </div>

              <div className="p-4 md:p-6 bg-amber-50/[0.02]">
                {rows.map((row, rowIdx) => {
                  const firstBarIdx = rowIdx * 4;
                  const measureNum = firstBarIdx + 1;
                  const sectionLabel = getSectionLabel(firstBarIdx, totalBars, selectedStandard.progressionType);

                  return (
                    <div key={rowIdx} className="flex items-stretch mb-0">
                      {/* Section label / measure number gutter */}
                      <div className="w-10 flex-shrink-0 flex flex-col justify-center items-end pr-2 border-r border-border/30">
                        {sectionLabel && (
                          <span className="text-xs font-bold text-amber-500 leading-none mb-0.5">
                            {sectionLabel}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {measureNum}
                        </span>
                      </div>

                      {/* Bars */}
                      <div className="flex-1 grid grid-cols-4">
                        {row.map((bar, barIdxInRow) => {
                          const globalBarIdx = firstBarIdx + barIdxInRow;
                          return (
                            <div
                              key={barIdxInRow}
                              className={`border-r border-b border-border/30 py-3 px-2 flex items-center justify-center min-h-[52px]
                                ${barIdxInRow === 0 ? 'border-l border-border/30' : ''}
                                ${rowIdx === 0 ? 'border-t border-border/30' : ''}
                              `}
                            >
                              <div className="flex items-center justify-center gap-1.5 font-mono text-base md:text-lg">
                                {bar.chords.map((chord, chordIdxInBar) => {
                                  const flatIdx = chordFlatIndex[globalBarIdx]?.[chordIdxInBar] ?? -1;
                                  const isHighlighted = isPlaying && flatIdx === currentChordIdx;
                                  return (
                                    <React.Fragment key={chordIdxInBar}>
                                      {chordIdxInBar > 0 && (
                                        <span className="text-muted-foreground text-xs mx-0.5">/</span>
                                      )}
                                      <span
                                        className={`transition-colors duration-150 rounded px-1 ${
                                          isHighlighted
                                            ? 'bg-amber-500/30 text-amber-300'
                                            : 'text-foreground'
                                        }`}
                                      >
                                        {chord.chord}
                                      </span>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {/* Fill empty cells */}
                        {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className={`border-r border-b border-border/30 py-3 px-2 min-h-[52px] bg-muted/10
                              ${rowIdx === 0 ? 'border-t border-border/30' : ''}
                            `}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── YouTube Backing Tracks ────────────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="font-serif text-xl text-foreground">Practice Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-amber-500/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-red-500" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-amber-400 transition-colors">
                      Backing Tracks
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Search YouTube for {selectedStandard.name} play-alongs
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </a>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedStandard.name + ' jazz tutorial how to play')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-amber-500/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-amber-400 transition-colors">
                      Tutorials
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Learn how to play {selectedStandard.name}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </a>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedStandard.name + ' ' + (selectedStandard.composer || '') + ' original recording')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-amber-500/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Music className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-amber-400 transition-colors">
                      Original Recording
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Listen to {selectedStandard.composer || 'the original'}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </a>
              </div>
            </div>
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
