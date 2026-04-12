import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import type { ChordEntry } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Piano, Play, Square, ArrowUp, ArrowDown, Star, ChevronUp, ExternalLink, Youtube } from 'lucide-react';
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

// Convert chord symbol to jazz voicing note names for playback
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
  // Rootless voicings (3rd, 5th, 7th, 9th) — more jazzy
  if (q.includes('maj7') || q === 'maj7' || q === 'Δ7') return [note(4, 3), note(7, 3), note(11, 3), note(2, 4)];
  if (q.includes('m7b5') || q.includes('ø')) return [note(3, 3), note(6, 3), note(10, 3), note(2, 4)];
  if (q.includes('dim7') || q.includes('°7')) return [note(3, 3), note(6, 3), note(9, 3)];
  if (q.includes('m7') || q === 'min7' || q === '-7') return [note(3, 3), note(7, 3), note(10, 3), note(2, 4)];
  if (q.includes('7') && !q.includes('maj')) return [note(4, 3), note(7, 3), note(10, 3), note(2, 4)];
  if (q.includes('m') || q.includes('min') || q === '-') return [note(3, 3), note(7, 3), note(0, 4)];
  if (q.includes('aug') || q === '+') return [note(4, 3), note(8, 3), note(0, 4)];
  if (q.includes('sus4')) return [note(5, 3), note(7, 3), note(0, 4)];
  if (q.includes('sus2')) return [note(2, 3), note(7, 3), note(0, 4)];
  if (q.includes('6')) return [note(4, 3), note(7, 3), note(9, 3)];
  // Default major
  return [note(4, 3), note(7, 3), note(0, 4)];
}

export default function Chords() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedKey, setSelectedKey] = useState('All');
  const [difficulty, setDifficulty] = useState('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingChordIndex, setPlayingChordIndex] = useState<number>(-1);
  const [transpositions, setTranspositions] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [backingTracks, setBackingTracks] = useState<any[]>([]);
  const [backingTracksLoading, setBackingTracksLoading] = useState(false);
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

  // Fetch backing tracks when a progression card is expanded
  useEffect(() => {
    if (!expandedId || !progressions) return;
    const prog = progressions.find(p => p.id === expandedId);
    if (!prog) return;

    let cancelled = false;
    setBackingTracksLoading(true);
    setBackingTracks([]);

    const searchTerm = `${prog.name} ${prog.keySignature || ''}`.trim();
    const genreTerm = prog.genre?.name || '';

    // Try specific search first, then fallback to genre-based search
    const doSearch = async () => {
      try {
        // First try: search by progression name
        let res = await fetch(`/api/loops?search=${encodeURIComponent(searchTerm)}&limit=3`);
        let data = await res.json();
        let loops = (data.loops || []).filter((l: any) => l.youtubeVideoId);

        // Second try: search by genre + "backing track"
        if (loops.length === 0 && genreTerm) {
          res = await fetch(`/api/loops?search=${encodeURIComponent(genreTerm + ' backing track')}&limit=3`);
          data = await res.json();
          loops = (data.loops || []).filter((l: any) => l.youtubeVideoId);
        }

        // Third try: search by genre + key
        if (loops.length === 0 && genreTerm) {
          const keyTerm = prog.keySignature || 'C';
          res = await fetch(`/api/loops?search=${encodeURIComponent(genreTerm + ' ' + keyTerm)}&limit=3`);
          data = await res.json();
          loops = (data.loops || []).filter((l: any) => l.youtubeVideoId);
        }

        // Last resort: just get featured loops
        if (loops.length === 0) {
          res = await fetch(`/api/loops?featured=true&limit=3`);
          data = await res.json();
          loops = (data.loops || []).filter((l: any) => l.youtubeVideoId);
        }

        if (!cancelled) {
          setBackingTracks(loops);
          setBackingTracksLoading(false);
        }
      } catch {
        if (!cancelled) {
          setBackingTracks([]);
          setBackingTracksLoading(false);
        }
      }
    };

    doSearch();
    return () => { cancelled = true; };
  }, [expandedId, progressions]);

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
      oscillator: { type: 'triangle' as const },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
    }).toDestination();
    synth.volume.value = -8;
    synthRef.current = synth;

    const now = Tone.now();
    let timeOffset = 0;
    const beatDuration = 0.5; // seconds per beat

    chordTimersRef.current = [];
    transposed.forEach((chord, idx) => {
      const notes = chordToNotes(chord.chord);
      const duration = chord.beats * beatDuration;
      // Schedule highlight update
      const timer = setTimeout(() => {
        setPlayingChordIndex(idx);
      }, timeOffset * 1000);
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

                <div className="bg-muted rounded-xl p-4 flex flex-wrap gap-3 items-center border border-border/50">
                  {getTransposedChords(prog.id, prog.chords).map((c, i) => {
                    const isCurrentlyPlaying = playingId === prog.id && playingChordIndex === i;
                    return (
                      <div key={i} className="flex items-center">
                        <div
                          className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 font-mono text-base ${
                            isCurrentlyPlaying ? 'bg-primary/20 border-primary text-primary' : 'bg-card border-border'
                          }`}
                          style={{ minWidth: `${c.beats * 40}px` }}
                        >
                          {c.chord}
                        </div>
                        {i < prog.chords.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                      </div>
                    );
                  })}
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
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    onClick={() => setExpandedId(expandedId === prog.id ? null : prog.id)}
                  >
                    {expandedId === prog.id ? (
                      <><ChevronUp className="w-4 h-4 mr-2" /> Hide Tracks</>
                    ) : (
                      <><Youtube className="w-4 h-4 mr-2" /> Backing Tracks</>
                    )}
                  </Button>
                </div>

                {/* Backing Tracks Section */}
                {expandedId === prog.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Youtube className="w-4 h-4" /> Backing Tracks
                    </h4>
                    {backingTracksLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="w-full aspect-video rounded-lg" />
                        <Skeleton className="w-full aspect-video rounded-lg" />
                      </div>
                    ) : backingTracks.length > 0 ? (
                      <div className="space-y-3">
                        {backingTracks.map((loop: any) => (
                          <div key={loop.id} className="space-y-1">
                            <iframe
                              src={`https://www.youtube.com/embed/${loop.youtubeVideoId}`}
                              className="w-full aspect-video rounded-lg"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title={loop.title || 'Backing Track'}
                            />
                            {loop.title && (
                              <p className="text-xs text-muted-foreground truncate">{loop.title}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-sm text-muted-foreground">No matching backing tracks found in our library.</p>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                            `${prog.name} ${prog.keySignature || ''} backing track`.trim()
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Search YouTube for Backing Tracks
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}