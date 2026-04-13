import React, { useState, useCallback, useRef } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import type { ChordEntry } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Piano, Play, Square, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import * as Tone from 'tone';

// Curated backing track video IDs for common progression types.
// When a video ID is present, the embed uses /embed/{id}; otherwise falls back to search_query.
const CURATED_CHORD_VIDEOS: Record<string, string> = {
  'ii-V-I':          'RnHBi8R0CAw',
  'Blues':           'yxTOFJVHBiQ',
  'Rhythm Changes':  'KYM-bDOJPr8',
  'Modal':           'FsijyBivMgg',
  'I-vi-ii-V':       '7qvZpIKa5aA',
};

const CHORD_TABS = ['All', 'ii-V-I', 'I-vi-ii-V', 'Blues', 'Rhythm Changes', 'Modal'];
const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
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
  if (!match) return ['C4', 'E4', 'G4'];
  const [, root, quality] = match;
  const FLAT_MAP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const rootIdx = CHROMATIC.indexOf(FLAT_MAP[root] || root);
  if (rootIdx < 0) return ['C4', 'E4', 'G4'];
  const note = (semitones: number, octave: number) => {
    const idx = (rootIdx + semitones) % 12;
    return CHROMATIC[idx] + octave;
  };
  const q = quality.toLowerCase();
  if (q.includes('maj7') || q === 'Δ7') return [note(4, 3), note(7, 3), note(11, 3), note(2, 4)];
  if (q.includes('m7b5') || q.includes('ø')) return [note(3, 3), note(6, 3), note(10, 3), note(2, 4)];
  if (q.includes('dim7') || q.includes('°7')) return [note(3, 3), note(6, 3), note(9, 3)];
  if (q.includes('m7') || q === 'min7' || q === '-7') return [note(3, 3), note(7, 3), note(10, 3), note(2, 4)];
  if (q.includes('7') && !q.includes('maj')) return [note(4, 3), note(7, 3), note(10, 3), note(2, 4)];
  if (q.includes('m') || q.includes('min') || q === '-') return [note(3, 3), note(7, 3), note(0, 4)];
  if (q.includes('aug') || q === '+') return [note(4, 3), note(8, 3), note(0, 4)];
  if (q.includes('sus4')) return [note(5, 3), note(7, 3), note(0, 4)];
  if (q.includes('sus2')) return [note(2, 3), note(7, 3), note(0, 4)];
  if (q.includes('6')) return [note(4, 3), note(7, 3), note(9, 3)];
  return [note(4, 3), note(7, 3), note(0, 4)];
}


export default function Chords() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedKey, setSelectedKey] = useState('All');
  const [difficulty, setDifficulty] = useState('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingChordIndex, setPlayingChordIndex] = useState<number>(-1);
  const [transpositions, setTranspositions] = useState<Record<string, number>>({});
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chordTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    chordTimersRef.current.forEach(t => clearTimeout(t));
    chordTimersRef.current = [];
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setPlayingId(null);
    setPlayingChordIndex(-1);
  }, []);

  const playChord = async (id: string, chords: ChordEntry[]) => {
    if (playingId === id) { stopPlayback(); return; }
    stopPlayback();
    await Tone.start();
    setPlayingId(id);

    const transposed = getTransposedChords(id, chords);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' as const },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
    }).toDestination();
    synth.volume.value = -8;
    synthRef.current = synth;

    const now = Tone.now();
    let timeOffset = 0;
    const beatDuration = 0.5;

    chordTimersRef.current = [];
    transposed.forEach((chord, idx) => {
      const notes = chordToNotes(chord.chord);
      const duration = chord.beats * beatDuration;
      const timer = setTimeout(() => setPlayingChordIndex(idx), timeOffset * 1000);
      chordTimersRef.current.push(timer);
      synth.triggerAttackRelease(notes, duration - 0.05, now + timeOffset);
      timeOffset += duration;
    });

    playTimeoutRef.current = setTimeout(() => {
      synth.dispose();
      synthRef.current = null;
      setPlayingId(null);
      setPlayingChordIndex(-1);
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
          progressions?.map((prog) => {
            const transAmt = transpositions[prog.id] || 0;
            const origKey = prog.keySignature || 'C';
            const displayKey = transAmt !== 0 ? transposeChordSymbol(origKey, transAmt) : origKey;
            const genre = prog.genre?.name ?? 'jazz';
            const progName = prog.name;
            const curatedVideoId = CURATED_CHORD_VIDEOS[prog.progressionType ?? ''];

            return (
              <Card key={prog.id} className="overflow-hidden border-border bg-card hover:border-primary/30 transition-colors group">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-serif text-xl text-foreground mb-2">{progName}</h3>
                      <div className="flex gap-2 items-center">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-xs">{displayKey}</Badge>
                        {prog.genre && <Badge variant="outline" className="text-xs">{prog.genre.name}</Badge>}
                        <div className="flex text-amber-500 ml-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < (prog.difficultyLevel || 1) / 3 ? 'fill-current' : 'opacity-30'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className={`rounded-full ${playingId === prog.id ? 'bg-coral text-white border-coral shadow-[0_0_10px_rgba(231,76,60,0.5)]' : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'}`}
                      onClick={() => playChord(prog.id, prog.chords)}
                    >
                      {playingId === prog.id
                        ? <Square className="w-4 h-4" fill="currentColor" />
                        : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                    </Button>
                  </div>

                  <div className="bg-muted rounded-xl p-4 flex flex-wrap gap-3 items-center border border-border/50">
                    {getTransposedChords(prog.id, prog.chords).map((c, i) => {
                      const isCurrentlyPlaying = playingId === prog.id && playingChordIndex === i;
                      return (
                        <div key={i} className="flex items-center">
                          <div
                            className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 font-mono text-base ${isCurrentlyPlaying ? 'bg-primary/20 border-primary text-primary' : 'bg-card border-border'}`}
                            style={{ minWidth: `${c.beats * 40}px` }}
                          >
                            {c.chord}
                          </div>
                          {i < prog.chords.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Transpose controls */}
                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => transpose(prog.id, -1)}>
                      <ArrowDown className="w-4 h-4 mr-1" /> Transpose
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => transpose(prog.id, 1)}>
                      <ArrowUp className="w-4 h-4 mr-1" />
                    </Button>
                    {transAmt !== 0 && (
                      <Badge variant="secondary" className="font-mono text-xs">{transAmt > 0 ? '+' : ''}{transAmt}</Badge>
                    )}
                  </div>

                  {/* Backing Tracks — embedded iframes, always visible */}
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Backing Tracks in {displayKey}
                    </h4>
                    <div className="grid grid-cols-1 gap-3" onClick={(e) => e.stopPropagation()}>
                      {curatedVideoId ? (
                        <YouTubeInline
                          videoId={curatedVideoId}
                          title={`${progName} in ${displayKey}`}
                        />
                      ) : (
                        <YouTubeInline
                          searchQuery={`${progName} ${displayKey} backing track`}
                          title={`${progName} in ${displayKey}`}
                        />
                      )}
                      <YouTubeInline
                        searchQuery={`${displayKey} ${genre} backing track`}
                        title={`${displayKey} ${genre}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
