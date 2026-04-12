import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import type { ChordProgression, ChordEntry } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Play, Square, Target, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Tone from 'tone';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
const SHARP_TO_FLAT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

function rootToIndex(root: string): number {
  const normalized = FLAT_TO_SHARP[root] || root;
  const idx = CHROMATIC.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

function transposeChordSymbol(symbol: string, semitones: number): string {
  const match = symbol.match(/^([A-G][#b]?)(.*)/);
  if (!match) return symbol;
  const [, root, quality] = match;
  const idx = rootToIndex(root);
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = CHROMATIC[newIdx];
  const useFlat = root.includes('b') || ['Db', 'Eb', 'Gb', 'Ab', 'Bb'].includes(root);
  const display = useFlat && SHARP_TO_FLAT[newRoot] ? SHARP_TO_FLAT[newRoot] : newRoot;
  return display + quality;
}

function chordToNotes(symbol: string): string[] {
  const match = symbol.match(/^([A-G][#b]?)(.*)/);
  if (!match) return ['C4'];
  const [, root, quality] = match;
  const r = rootToIndex(root);
  const q = quality.toLowerCase().replace(/\s/g, '');
  let intervals = [0, 4, 7];
  if (q.includes('m7b5') || q.includes('ø') || q.includes('half')) {
    intervals = [0, 3, 6, 10];
  } else if (q.includes('dim') || q.includes('°')) {
    intervals = [0, 3, 6, q.includes('7') ? 9 : 6];
  } else if (q.includes('aug') || q.includes('+')) {
    intervals = [0, 4, 8];
  } else if (q.includes('maj7') || q.includes('Δ')) {
    intervals = [0, 4, 7, 11];
  } else if (q.includes('m7') || q.includes('min7') || q.includes('-7')) {
    intervals = [0, 3, 7, 10];
  } else if (q.includes('7')) {
    intervals = [0, 4, 7, 10];
  } else if (q.includes('m') || q.includes('min') || q.startsWith('-')) {
    intervals = [0, 3, 7];
  } else if (q.includes('sus4')) {
    intervals = [0, 5, 7];
  } else if (q.includes('sus2')) {
    intervals = [0, 2, 7];
  }
  return intervals.map(i => {
    const noteIdx = (r + i) % 12;
    return CHROMATIC[noteIdx] + '4';
  });
}

function difficultyLabel(level: number | null | undefined): string {
  if (!level) return 'Unknown';
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Advanced';
}

function difficultyColor(level: number | null | undefined): string {
  if (!level) return 'bg-muted text-muted-foreground';
  if (level <= 3) return 'bg-green-500/10 text-green-600';
  if (level <= 6) return 'bg-amber-500/10 text-amber-600';
  return 'bg-red-500/10 text-red-600';
}

export default function Standards() {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transposition, setTransposition] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: standards, isLoading } = useGetChordProgressions({
    isJazzStandard: true,
  });

  const filtered = useMemo(() => {
    if (!standards) return [];
    return standards.filter(s => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.composer && s.composer.toLowerCase().includes(search.toLowerCase()));
      let matchDifficulty = true;
      if (difficultyFilter === 'beginner') matchDifficulty = (s.difficultyLevel || 0) <= 3;
      else if (difficultyFilter === 'intermediate') matchDifficulty = (s.difficultyLevel || 0) >= 4 && (s.difficultyLevel || 0) <= 6;
      else if (difficultyFilter === 'advanced') matchDifficulty = (s.difficultyLevel || 0) >= 7;
      return matchSearch && matchDifficulty;
    });
  }, [standards, search, difficultyFilter]);

  const selectedStandard = useMemo(() => {
    if (!selectedId && filtered.length > 0) return filtered[0];
    return filtered.find(s => s.id === selectedId) || (filtered.length > 0 ? filtered[0] : null);
  }, [selectedId, filtered]);

  const transposedChords = useMemo(() => {
    if (!selectedStandard) return [];
    if (transposition === 0) return selectedStandard.chords;
    return selectedStandard.chords.map(c => ({
      ...c,
      chord: transposeChordSymbol(c.chord, transposition),
    }));
  }, [selectedStandard, transposition]);

  // Group chords into measures of 4 beats for display in rows of 4 bars
  const chordRows = useMemo(() => {
    const bars: ChordEntry[][] = [];
    let currentBar: ChordEntry[] = [];
    let beatsInBar = 0;
    for (const chord of transposedChords) {
      currentBar.push(chord);
      beatsInBar += chord.beats;
      if (beatsInBar >= 4) {
        bars.push(currentBar);
        currentBar = [];
        beatsInBar = 0;
      }
    }
    if (currentBar.length > 0) bars.push(currentBar);

    // Group bars into rows of 4
    const rows: ChordEntry[][][] = [];
    for (let i = 0; i < bars.length; i += 4) {
      rows.push(bars.slice(i, i + 4));
    }
    return rows;
  }, [transposedChords]);

  const stopPlayback = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const playChords = async (standard: ChordProgression) => {
    if (playingId === standard.id) {
      stopPlayback();
      return;
    }
    stopPlayback();
    await Tone.start();
    setPlayingId(standard.id);

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
      volume: -8,
    }).toDestination();
    synthRef.current = synth;

    const now = Tone.now();
    let timeOffset = 0;
    const beatDuration = 0.45;

    transposedChords.forEach((chord) => {
      const notes = chordToNotes(chord.chord);
      const duration = chord.beats * beatDuration;
      synth.triggerAttackRelease(notes, duration - 0.05, now + timeOffset);
      timeOffset += duration;
    });

    playTimeoutRef.current = setTimeout(() => {
      synth.dispose();
      synthRef.current = null;
      setPlayingId(null);
    }, timeOffset * 1000 + 200);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* Sidebar List */}
      <aside className="w-full md:w-80 border-r border-border bg-sidebar flex flex-col h-full">
        <div className="p-4 border-b border-border space-y-3">
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> The Real Book
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search standards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full bg-background border-border text-sm">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">{filtered.length} standard{filtered.length !== 1 ? 's' : ''} found</p>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-border">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : (
              filtered.map(std => (
                <div
                  key={std.id}
                  className={`p-4 border-b border-border cursor-pointer transition-colors flex items-center justify-between group ${selectedStandard?.id === std.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted border-l-4 border-l-transparent'}`}
                  onClick={() => { setSelectedId(std.id); setTransposition(0); }}
                >
                  <div className="min-w-0">
                    <h4 className={`font-serif text-lg truncate ${selectedStandard?.id === std.id ? 'text-primary' : 'text-foreground'}`}>{std.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{std.composer || 'Unknown'}</p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColor(std.difficultyLevel)}`}>
                        {difficultyLabel(std.difficultyLevel)}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${selectedStandard?.id === std.id ? 'text-primary translate-x-1' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content Detail */}
      <div className="flex-1 bg-background overflow-y-auto p-6 md:p-10">
        {selectedStandard ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="font-serif text-5xl text-foreground mb-4">{selectedStandard.name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6 items-center">
                {selectedStandard.composer && (
                  <Badge variant="outline" className="text-sm font-normal">
                    By {selectedStandard.composer}
                  </Badge>
                )}
                <Badge variant="secondary" className="font-mono text-primary bg-primary/10">
                  Key: {transposition !== 0 ? transposeChordSymbol(selectedStandard.keySignature || 'C', transposition) : (selectedStandard.keySignature || 'C')}
                </Badge>
                {selectedStandard.genre && (
                  <Badge variant="outline">{selectedStandard.genre.name}</Badge>
                )}
                <Badge className={`${difficultyColor(selectedStandard.difficultyLevel)} border-0`}>
                  {difficultyLabel(selectedStandard.difficultyLevel)} ({selectedStandard.difficultyLevel || '?'}/10)
                </Badge>
                {selectedStandard.progressionType && (
                  <Badge variant="outline" className="font-mono text-xs">{selectedStandard.progressionType}</Badge>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  className={playingId === selectedStandard.id ? 'bg-coral text-white hover:bg-coral/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}
                  onClick={() => playChords(selectedStandard)}
                >
                  {playingId === selectedStandard.id ? (
                    <><Square className="w-4 h-4 mr-2" fill="currentColor" /> Stop</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" fill="currentColor" /> Play Chords</>
                  )}
                </Button>
                <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground" onClick={() => setTransposition(prev => ((prev - 1) + 12) % 12)}>
                  <ArrowDown className="w-4 h-4 mr-1" /> Down
                </Button>
                <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground" onClick={() => setTransposition(prev => (prev + 1) % 12)}>
                  <ArrowUp className="w-4 h-4 mr-1" /> Up
                </Button>
                {transposition !== 0 && (
                  <Badge variant="secondary" className="font-mono self-center">
                    Transpose: {transposition > 0 ? '+' : ''}{transposition}
                  </Badge>
                )}
              </div>
            </div>

            <Card className="bg-card border-border overflow-hidden vinyl-texture">
              <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                <h3 className="font-medium text-foreground">Chord Chart</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono bg-background">
                    {transposedChords.length} chord{transposedChords.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-8">
                <div className="font-serif text-2xl text-foreground space-y-6">
                  {chordRows.map((row, rowIdx) => (
                    <div key={rowIdx}>
                      {rowIdx === 0 && (
                        <div className="text-sm font-sans font-bold text-muted-foreground mb-4 tracking-widest border-b border-border pb-1">
                          {selectedStandard.progressionType ? selectedStandard.progressionType.toUpperCase() : 'CHORD CHART'}
                        </div>
                      )}
                      <div className="grid grid-cols-4 gap-4 text-center mb-4">
                        {row.map((bar, barIdx) => (
                          <div key={barIdx} className="py-4 px-2 border border-border/50 rounded bg-background shadow-sm">
                            <div className="flex items-center justify-center gap-2">
                              {bar.map((chord, chordIdx) => (
                                <span key={chordIdx} className={bar.length > 1 ? 'text-lg' : ''}>
                                  {chord.chord}
                                  {chordIdx < bar.length - 1 && <span className="text-muted-foreground mx-1 text-sm">|</span>}
                                </span>
                              ))}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground mt-1 opacity-60 font-sans tracking-widest">
                              {bar.map(c => Array.from({length: c.beats}).map(() => '·').join(' ')).join('  ')}
                            </div>
                          </div>
                        ))}
                        {/* Fill empty cells in last row */}
                        {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="py-4 border border-border/20 rounded bg-background/50" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="font-serif text-2xl mb-4">Curated Backing Tracks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2].map(i => (
                  <Card key={i} className="flex flex-row overflow-hidden border-border bg-card group cursor-pointer hover:border-primary/50">
                    <div className="w-1/3 bg-muted flex items-center justify-center relative">
                      <Play className="w-8 h-8 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4 flex-1">
                      <h4 className="font-medium text-foreground mb-1">{selectedStandard.name} - Backing Track</h4>
                      <p className="text-xs text-muted-foreground mb-2">GrooveLab Official</p>
                      <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">120 BPM</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="font-serif text-2xl">{isLoading ? 'Loading standards...' : 'No standards found'}</h3>
            {!isLoading && search && <p className="text-sm mt-2">Try adjusting your search or filters</p>}
          </div>
        )}
      </div>
    </div>
  );
}
