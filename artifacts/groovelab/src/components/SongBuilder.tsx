import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Pause,
  Square,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Music,
  ListMusic,
  Repeat,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SongSection {
  id: string;
  grooveName: string;
  sectionType: string;
  sectionNumber: number | null;
  bpm: number | null;
  wavUrl: string;
  artist: string;
}

export interface SongBuilderProps {
  sections: SongSection[];
  artist: string;
  collection: string;
  bpm: number | null;
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface ArrangementEntry {
  uid: string; // unique per-slot id (allows same section multiple times)
  section: SongSection;
}

const SECTION_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  verse: 'bg-green-500/20 text-green-300 border-green-500/30',
  chorus: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  fill: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  break: 'bg-red-500/20 text-red-300 border-red-500/30',
  outro: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  full_loop: 'bg-primary/20 text-primary border-primary/30',
  build: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

const SECTION_ORDER = ['intro', 'verse', 'chorus', 'fill', 'break', 'build', 'outro', 'full_loop'];

function sectionColor(type: string): string {
  const key = type.toLowerCase().replace(/\s+/g, '_');
  return SECTION_COLORS[key] || 'bg-muted text-muted-foreground border-border';
}

function sectionLabel(s: SongSection): string {
  const type = s.sectionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return s.sectionNumber != null ? `${type} ${s.sectionNumber}` : type;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let uidCounter = 0;
function nextUid(): string {
  return `slot_${Date.now()}_${++uidCounter}`;
}

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */

interface Preset {
  name: string;
  description: string;
  pattern: string[]; // section types to try to match
}

const PRESETS: Preset[] = [
  {
    name: 'Standard Song',
    description: 'Intro, Verse, Chorus, Verse, Chorus, Outro',
    pattern: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'],
  },
  {
    name: 'Simple Loop',
    description: 'Full loop repeated 4 times',
    pattern: ['full_loop', 'full_loop', 'full_loop', 'full_loop'],
  },
  {
    name: 'Practice Section',
    description: 'First section looped 8 times',
    pattern: ['__first__', '__first__', '__first__', '__first__', '__first__', '__first__', '__first__', '__first__'],
  },
];

function buildPresetArrangement(preset: Preset, sections: SongSection[]): ArrangementEntry[] {
  const byType = new Map<string, SongSection[]>();
  for (const s of sections) {
    const key = s.sectionType.toLowerCase().replace(/\s+/g, '_');
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(s);
  }

  const firstSection = sections[0];

  const result: ArrangementEntry[] = [];
  for (const requested of preset.pattern) {
    let match: SongSection | undefined;
    if (requested === '__first__') {
      match = firstSection;
    } else {
      const candidates = byType.get(requested);
      if (candidates && candidates.length > 0) {
        // Cycle through available candidates
        const usedCount = result.filter(e => e.section.sectionType.toLowerCase().replace(/\s+/g, '_') === requested).length;
        match = candidates[usedCount % candidates.length];
      }
    }
    if (match) {
      result.push({ uid: nextUid(), section: match });
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SongBuilder({ sections, artist, collection, bpm, onClose }: SongBuilderProps) {
  const [arrangement, setArrangement] = useState<ArrangementEntry[]>([]);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(-1);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Group sections by type for the available panel
  const groupedSections = useMemo(() => {
    const groups = new Map<string, SongSection[]>();
    for (const s of sections) {
      const key = s.sectionType.toLowerCase().replace(/\s+/g, '_');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    // Sort groups by preferred order
    const sorted: [string, SongSection[]][] = [];
    for (const type of SECTION_ORDER) {
      if (groups.has(type)) {
        sorted.push([type, groups.get(type)!]);
        groups.delete(type);
      }
    }
    // Append any remaining types
    for (const [type, secs] of groups) {
      sorted.push([type, secs]);
    }
    return sorted;
  }, [sections]);

  // Initialize AudioContext and pre-load all buffers
  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gainRef.current = gain;

    const uniqueUrls = new Map<string, string>();
    for (const s of sections) {
      if (s.wavUrl && !uniqueUrls.has(s.id)) {
        uniqueUrls.set(s.id, s.wavUrl);
      }
    }

    const total = uniqueUrls.size;
    let loaded = 0;
    setLoadingProgress({ loaded: 0, total });

    const loadAll = async () => {
      const entries = Array.from(uniqueUrls.entries());
      // Load in batches of 4 for parallelism without overwhelming
      for (let i = 0; i < entries.length; i += 4) {
        const batch = entries.slice(i, i + 4);
        await Promise.all(
          batch.map(async ([id, url]) => {
            try {
              const response = await fetch(url);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              buffersRef.current.set(id, audioBuffer);
            } catch (err) {
              console.warn(`Failed to load section ${id}:`, err);
            }
            loaded++;
            setLoadingProgress({ loaded, total });
          })
        );
      }
    };

    loadAll();

    return () => {
      stopPlayback();
      ctx.close();
    };
  }, [sections]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    let dur = 0;
    for (const entry of arrangement) {
      const buf = buffersRef.current.get(entry.section.id);
      if (buf) dur += buf.duration;
    }
    return dur;
  }, [arrangement, loadingProgress.loaded]); // re-calc when buffers load

  // Add section to arrangement
  const addSection = useCallback((section: SongSection) => {
    setArrangement(prev => [...prev, { uid: nextUid(), section }]);
  }, []);

  // Remove section from arrangement
  const removeSection = useCallback((uid: string) => {
    setArrangement(prev => prev.filter(e => e.uid !== uid));
  }, []);

  // Move section up/down
  const moveSection = useCallback((uid: string, direction: 'up' | 'down') => {
    setArrangement(prev => {
      const idx = prev.findIndex(e => e.uid === uid);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: Preset) => {
    if (sections.length === 0) return;
    const built = buildPresetArrangement(preset, sections);
    setArrangement(built);
  }, [sections]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    for (const src of sourcesRef.current) {
      try { src.stop(); } catch {}
    }
    sourcesRef.current = [];
    if (previewSourceRef.current) {
      try { previewSourceRef.current.stop(); } catch {}
      previewSourceRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
    setCurrentPlayingIndex(-1);
    setPreviewingId(null);
  }, []);

  // Play entire arrangement gapless
  const playArrangement = useCallback(() => {
    if (arrangement.length === 0) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    stopPlayback();

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    setIsPlaying(true);
    const newSources: AudioBufferSourceNode[] = [];
    let startTime = ctx.currentTime + 0.05;
    playStartTimeRef.current = startTime;

    // Build schedule with section boundaries
    const sectionBounds: { start: number; end: number }[] = [];

    for (const entry of arrangement) {
      const buffer = buffersRef.current.get(entry.section.id);
      if (!buffer) continue;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainRef.current!);
      source.start(startTime);
      newSources.push(source);

      sectionBounds.push({ start: startTime, end: startTime + buffer.duration });
      startTime += buffer.duration;
    }

    sourcesRef.current = newSources;

    // Last source ends playback
    if (newSources.length > 0) {
      newSources[newSources.length - 1].onended = () => {
        setIsPlaying(false);
        setCurrentPlayingIndex(-1);
        cancelAnimationFrame(animFrameRef.current);
      };
    }

    // Track current section
    const trackSection = () => {
      if (!ctx) return;
      const now = ctx.currentTime;
      let idx = -1;
      for (let i = 0; i < sectionBounds.length; i++) {
        if (now >= sectionBounds[i].start && now < sectionBounds[i].end) {
          idx = i;
          break;
        }
      }
      setCurrentPlayingIndex(idx);
      animFrameRef.current = requestAnimationFrame(trackSection);
    };
    animFrameRef.current = requestAnimationFrame(trackSection);
  }, [arrangement, stopPlayback]);

  // Preview a single section
  const previewSection = useCallback((sectionId: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Stop any existing preview
    if (previewSourceRef.current) {
      try { previewSourceRef.current.stop(); } catch {}
      previewSourceRef.current = null;
    }

    if (previewingId === sectionId) {
      setPreviewingId(null);
      return;
    }

    if (ctx.state === 'suspended') ctx.resume();

    const buffer = buffersRef.current.get(sectionId);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainRef.current!);
    source.start();
    previewSourceRef.current = source;
    setPreviewingId(sectionId);

    source.onended = () => {
      setPreviewingId(null);
      previewSourceRef.current = null;
    };
  }, [previewingId]);

  const isLoaded = loadingProgress.total > 0 && loadingProgress.loaded >= loadingProgress.total;
  const loadPercent = loadingProgress.total > 0 ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-card border-border flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ListMusic className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-serif text-xl md:text-2xl truncate">
                Song Builder
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {artist} &middot; {collection.replace(/_/g, ' ')}
                {bpm ? ` ${bpm} BPM` : ''}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Loading bar */}
        {!isLoaded && (
          <div className="px-6 py-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${loadPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {loadingProgress.loaded}/{loadingProgress.total}
              </span>
            </div>
          </div>
        )}

        {/* Presets */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground mr-1">Presets:</span>
          {PRESETS.map(preset => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => applyPreset(preset)}
              title={preset.description}
            >
              {preset.name}
            </Button>
          ))}
        </div>

        {/* Main 2-panel layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left: Available Sections */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border overflow-y-auto flex-shrink-0 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Available Sections
            </h3>
            <div className="space-y-4">
              {groupedSections.map(([type, secs]) => (
                <div key={type}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    {type.replace(/_/g, ' ')}
                  </p>
                  <div className="space-y-1">
                    {secs.map(section => (
                      <button
                        key={section.id}
                        onClick={() => addSection(section)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors hover:brightness-125 cursor-pointer ${sectionColor(section.sectionType)}`}
                      >
                        <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate text-left flex-1">
                          {sectionLabel(section)}
                        </span>
                        {section.bpm && (
                          <span className="font-mono text-[10px] opacity-60">{section.bpm}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground">No sections available.</p>
              )}
            </div>
          </div>

          {/* Right: Arrangement */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Your Arrangement
              </h3>

              {arrangement.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Music className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">Add sections from the left panel</p>
                  <p className="text-xs mt-1">or choose a preset above</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {arrangement.map((entry, index) => {
                    const buf = buffersRef.current.get(entry.section.id);
                    const dur = buf ? buf.duration : 0;
                    const isCurrent = isPlaying && currentPlayingIndex === index;

                    return (
                      <div
                        key={entry.uid}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                          isCurrent
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                            : 'border-border bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        {/* Index */}
                        <span className="font-mono text-xs text-muted-foreground w-5 text-right flex-shrink-0">
                          {index + 1}.
                        </span>

                        {/* Section badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${sectionColor(entry.section.sectionType)}`}
                        >
                          {sectionLabel(entry.section)}
                        </Badge>

                        {/* Groove name if different */}
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {entry.section.grooveName}
                        </span>

                        {/* Duration */}
                        {dur > 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                            {formatDuration(dur)}
                          </span>
                        )}

                        {/* Preview button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 flex-shrink-0"
                          onClick={() => previewSection(entry.section.id)}
                          disabled={!buf}
                          title="Preview this section"
                        >
                          {previewingId === entry.section.id ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </Button>

                        {/* Move up/down */}
                        <div className="flex flex-col flex-shrink-0">
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                            onClick={() => moveSection(entry.uid, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                            onClick={() => moveSection(entry.uid, 'down')}
                            disabled={index === arrangement.length - 1}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Remove */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSection(entry.uid)}
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transport Controls */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/30">
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={stopPlayback}
                    className="gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" fill="currentColor" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={playArrangement}
                    disabled={arrangement.length === 0 || !isLoaded}
                    className="gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                    Play All
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArrangement([])}
                  disabled={arrangement.length === 0}
                  className="gap-1.5 text-xs"
                >
                  Clear
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {isPlaying && currentPlayingIndex >= 0 && (
                  <span className="text-xs text-primary font-medium">
                    Playing {currentPlayingIndex + 1}/{arrangement.length}
                  </span>
                )}
                <span className="font-mono text-sm text-muted-foreground">
                  {arrangement.length} section{arrangement.length !== 1 ? 's' : ''} &middot; {formatDuration(totalDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SongBuilder;
