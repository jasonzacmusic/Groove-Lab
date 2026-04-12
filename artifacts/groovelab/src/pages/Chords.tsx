import React, { useState, useCallback, useRef } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import type { ChordEntry } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Piano, Play, Square, Music, ArrowUp, ArrowDown, Star } from 'lucide-react';
import * as Tone from 'tone';

const CHORD_TABS = ['All', 'ii-V-I', 'I-vi-ii-V', 'Blues', 'Rhythm Changes', 'Modal'];
const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
const SHARP_TO_FLAT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

// Map chord symbol root to a chromatic index
function rootToIndex(root: string): number {
  const normalized = FLAT_TO_SHARP[root] || root;
  const idx = CHROMATIC.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

// Transpose a chord symbol by semitones
function transposeChordSymbol(symbol: string, semitones: number): string {
  const match = symbol.match(/^([A-G][#b]?)(.*)/);
  if (!match) return symbol;
  const [, root, quality] = match;
  const idx = rootToIndex(root);
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = CHROMATIC[newIdx];
  // Use flat spelling if original used flats
  const useFlat = root.includes('b') || ['Db', 'Eb', 'Gb', 'Ab', 'Bb'].includes(root);
  const display = useFlat && SHARP_TO_FLAT[newRoot] ? SHARP_TO_FLAT[newRoot] : newRoot;
  return display + quality;
}

// Convert chord symbol to an array of MIDI note names for playback
function chordToNotes(symbol: string): string[] {
  const match = symbol.match(/^([A-G][#b]?)(.*)/);
  if (!match) return ['C4'];
  const [, root, quality] = match;
  const r = rootToIndex(root);
  const q = quality.toLowerCase().replace(/\s/g, '');
  // intervals in semitones from root
  let intervals = [0, 4, 7]; // major triad default
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
    intervals = [0, 4, 7, 10]; // dominant 7
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

export default function Chords() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedKey, setSelectedKey] = useState('All');
  const [difficulty, setDifficulty] = useState('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [transpositions, setTranspositions] = useState<Record<string, number>>({});
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const difficultyFilter = difficulty === 'beginner' ? 3 : difficulty === 'intermediate' ? 6 : difficulty === 'advanced' ? 9 : undefined;

  const { data: progressions, isLoading } = useGetChordProgressions({
    type: activeTab !== 'All' ? activeTab : undefined,
    key: selectedKey !== 'All' ? selectedKey : undefined,
    difficulty: difficultyFilter,
    isJazzStandard: false,
  });

  const transpose = useCallback((progId: string, direction: 1 | -1) => {
    setTranspositions(prev => ({
      ...prev,
      [progId]: ((prev[progId] || 0) + direction + 12) % 12,
    }));
  }, []);

  const getTransposedChords = useCallback((progId: string, chords: ChordEntry[]): ChordEntry[] => {
    const semi = transpositions[progId] || 0;
    if (semi === 0) return chords;
    return chords.map(c => ({
      ...c,
      chord: transposeChordSymbol(c.chord, semi),
    }));
  }, [transpositions]);

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
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setPlayingId(null);
  }, []);

  const playChord = async (id: string, chords: ChordEntry[]) => {
    // If already playing this one, stop it
    if (playingId === id) {
      stopPlayback();
      return;
    }
    stopPlayback();

    await Tone.start();
    setPlayingId(id);

    const transposed = getTransposedChords(id, chords);

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
      volume: -8,
    }).toDestination();
    synthRef.current = synth;

    const now = Tone.now();
    let timeOffset = 0;
    const beatDuration = 0.5; // seconds per beat

    transposed.forEach((chord) => {
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-serif text-3xl flex items-center gap-2">
          <Piano className="w-8 h-8 text-primary" /> Chord Lab
        </h2>
        
        <div className="flex items-center gap-4">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-[120px] bg-card border-border">
              <SelectValue placeholder="Key" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Keys</SelectItem>
              {KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Difficulty</SelectItem>
              <SelectItem value="beginner">Beginner (1-3)</SelectItem>
              <SelectItem value="intermediate">Intermediate (4-7)</SelectItem>
              <SelectItem value="advanced">Advanced (8-10)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex w-max space-x-2">
          {CHORD_TABS.map(tab => (
            <Badge 
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              className={`cursor-pointer px-4 py-1.5 text-sm ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
           Array.from({ length: 6 }).map((_, i) => (
             <Card key={i} className="border-border bg-card">
               <CardContent className="p-6">
                 <Skeleton className="h-8 w-1/3 mb-6" />
                 <div className="flex gap-4">
                   <Skeleton className="h-16 w-16 rounded-md" />
                   <Skeleton className="h-16 w-16 rounded-md" />
                   <Skeleton className="h-16 w-16 rounded-md" />
                 </div>
               </CardContent>
             </Card>
           ))
        ) : (
          progressions?.map((prog) => (
            <Card key={prog.id} className="overflow-hidden border-border bg-card hover:border-primary/30 transition-colors group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-serif text-xl text-foreground mb-2">{prog.name}</h3>
                    <div className="flex gap-2 items-center">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-xs">{prog.keySignature || 'C'}</Badge>
                      {prog.genre && <Badge variant="outline" className="text-xs">{prog.genre.name}</Badge>}
                      <div className="flex text-amber-500 ml-2">
                        {Array.from({length: 3}).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < (prog.difficultyLevel || 1)/3 ? 'fill-current' : 'opacity-30'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className={`rounded-full ${playingId === prog.id ? 'bg-coral text-white border-coral shadow-[0_0_10px_rgba(231,76,60,0.5)]' : 'border-primary text-primary hover:bg-primary hover:text-white'}`}
                      onClick={() => playChord(prog.id, prog.chords)}
                    >
                      {playingId === prog.id ? (
                        <Square className="w-4 h-4" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-4 flex flex-wrap gap-3 items-center border border-border/50 font-serif text-2xl text-foreground">
                  {getTransposedChords(prog.id, prog.chords).map((c, i) => (
                    <div key={i} className="flex items-center">
                      <div className="bg-background px-4 py-2 rounded-lg border border-border shadow-sm text-center min-w-[60px]">
                        {c.chord}
                        <div className="text-[10px] font-mono text-muted-foreground mt-1 opacity-60 font-sans tracking-widest">
                          {Array.from({length: c.beats}).map(() => '·').join(' ')}
                        </div>
                      </div>
                      {i < prog.chords.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex gap-2 items-center">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => transpose(prog.id, -1)}>
                      <ArrowDown className="w-4 h-4 mr-1" /> Transpose
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => transpose(prog.id, 1)}>
                      <ArrowUp className="w-4 h-4 mr-1" />
                    </Button>
                    {(transpositions[prog.id] || 0) !== 0 && (
                      <Badge variant="secondary" className="font-mono text-xs">{transpositions[prog.id] > 0 ? '+' : ''}{transpositions[prog.id]}</Badge>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" className="h-8 bg-primary/10 text-primary hover:bg-primary hover:text-white">
                    <Music className="w-4 h-4 mr-2" /> Find Loops
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}