import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Shuffle,
  Wand2,
  Search,
  GripVertical,
  Library,
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
    description: 'Intro → Verse → Chorus → Verse → Chorus → Outro',
    pattern: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'],
  },
  {
    name: 'Pop Structure',
    description: 'Intro → Verse → Chorus → Verse → Chorus → Break → Chorus → Outro',
    pattern: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'break', 'chorus', 'outro'],
  },
  {
    name: 'Blues / Jazz',
    description: 'Intro → Verse → Verse → Break → Verse → Outro',
    pattern: ['intro', 'verse', 'verse', 'break', 'verse', 'outro'],
  },
  {
    name: 'Build & Drop',
    description: 'Intro → Build → Chorus → Break → Build → Chorus → Outro',
    pattern: ['intro', 'build', 'chorus', 'break', 'build', 'chorus', 'outro'],
  },
  {
    name: 'Extended Song',
    description: 'Full structure with fills between sections',
    pattern: ['intro', 'verse', 'fill', 'chorus', 'verse', 'fill', 'chorus', 'break', 'build', 'chorus', 'outro'],
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
/*  Auto-fill: insert fills between arrangement sections               */
/* ------------------------------------------------------------------ */

function autoInsertFills(arrangement: ArrangementEntry[], allSections: SongSection[]): ArrangementEntry[] {
  const fills = allSections.filter(s => s.sectionType.toLowerCase().replace(/\s+/g, '_') === 'fill');
  if (fills.length === 0 || arrangement.length < 2) return arrangement;

  const result: ArrangementEntry[] = [];
  for (let i = 0; i < arrangement.length; i++) {
    result.push(arrangement[i]);
    // Insert fill between sections (not after the last one)
    if (i < arrangement.length - 1) {
      const currentType = arrangement[i].section.sectionType.toLowerCase().replace(/\s+/g, '_');
      const nextType = arrangement[i + 1].section.sectionType.toLowerCase().replace(/\s+/g, '_');
      // Don't insert fills next to other fills or between identical types
      if (currentType !== 'fill' && nextType !== 'fill' && currentType !== nextType) {
        const fill = fills[i % fills.length];
        result.push({ uid: nextUid(), section: fill });
      }
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
  const [isLooping, setIsLooping] = useState(true);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(-1);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserResults, setBrowserResults] = useState<SongSection[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isLoopingRef = useRef(true);
  const playArrangementRef = useRef<(() => void) | null>(null);

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

  // Auto-fill: insert fill sections between existing arrangement entries
  const handleAutoFill = useCallback(() => {
    setArrangement(prev => autoInsertFills(prev, sections));
  }, [sections]);

  // Smart arrange: analyze available sections and build intelligent arrangement
  const handleSmartArrange = useCallback(() => {
    if (sections.length === 0) return;
    const byType = new Map<string, SongSection[]>();
    for (const s of sections) {
      const key = s.sectionType.toLowerCase().replace(/\s+/g, '_');
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(s);
    }

    const result: ArrangementEntry[] = [];
    const add = (type: string) => {
      const candidates = byType.get(type);
      if (!candidates || candidates.length === 0) return false;
      const usedCount = result.filter(e => e.section.sectionType.toLowerCase().replace(/\s+/g, '_') === type).length;
      result.push({ uid: nextUid(), section: candidates[usedCount % candidates.length] });
      return true;
    };

    // Build the best arrangement from what's available
    const hasIntro = byType.has('intro');
    const hasVerse = byType.has('verse');
    const hasChorus = byType.has('chorus');
    const hasFill = byType.has('fill');
    const hasBreak = byType.has('break');
    const hasBuild = byType.has('build');
    const hasOutro = byType.has('outro');
    const hasFullLoop = byType.has('full_loop');

    if (hasVerse || hasChorus) {
      // Full song structure
      if (hasIntro) add('intro');
      if (hasVerse) { add('verse'); if (hasFill) add('fill'); }
      if (hasChorus) add('chorus');
      if (hasVerse) { add('verse'); if (hasFill) add('fill'); }
      if (hasChorus) add('chorus');
      if (hasBreak) add('break');
      if (hasBuild) add('build');
      if (hasChorus) add('chorus');
      if (hasOutro) add('outro');
    } else if (hasFullLoop) {
      // Loop-based: repeat with fills
      add('full_loop');
      if (hasFill) add('fill');
      add('full_loop');
      add('full_loop');
      if (hasFill) add('fill');
      add('full_loop');
    } else {
      // Use whatever we have in logical order
      for (const type of SECTION_ORDER) {
        const candidates = byType.get(type);
        if (candidates) {
          for (const s of candidates) {
            result.push({ uid: nextUid(), section: s });
          }
        }
      }
    }

    setArrangement(result);
  }, [sections]);

  // Drag-and-drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setArrangement(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // Cross-collection browser search
  const searchOtherCollections = useCallback(async (query: string) => {
    if (!query.trim()) { setBrowserResults([]); return; }
    setBrowserLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('search', query);
      params.set('limit', '30');
      params.set('sort', 'collection');
      const res = await fetch(`/api/audio-loops?${params.toString()}`);
      const data = await res.json();
      const results: SongSection[] = (data.loops || []).map((l: any) => ({
        id: l.id,
        grooveName: l.grooveName || l.title,
        sectionType: l.sectionType || 'full_loop',
        sectionNumber: l.sectionNumber ?? null,
        bpm: l.bpm ?? null,
        wavUrl: l.wavUrl,
        artist: l.artist || '',
      }));
      setBrowserResults(results);

      // Load audio buffers for new results
      const ctx = audioCtxRef.current;
      if (ctx) {
        for (const s of results) {
          if (s.wavUrl && !buffersRef.current.has(s.id)) {
            fetch(s.wavUrl)
              .then(r => r.arrayBuffer())
              .then(ab => ctx.decodeAudioData(ab))
              .then(buf => { buffersRef.current.set(s.id, buf); })
              .catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Browser search failed:', err);
    } finally {
      setBrowserLoading(false);
    }
  }, []);

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

    // Last source: loop or stop
    if (newSources.length > 0) {
      newSources[newSources.length - 1].onended = () => {
        if (isLoopingRef.current && playArrangementRef.current) {
          // Restart the arrangement for seamless looping
          playArrangementRef.current();
        } else {
          setIsPlaying(false);
          setCurrentPlayingIndex(-1);
          cancelAnimationFrame(animFrameRef.current);
        }
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

  // Keep refs in sync
  playArrangementRef.current = playArrangement;
  isLoopingRef.current = isLooping;

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
    source.loop = true;
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

        {/* Presets & Actions */}
        <div className="px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
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
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              onClick={handleAutoFill}
              disabled={arrangement.length < 2}
              title="Insert fill sections between arrangement sections"
            >
              <Shuffle className="w-3 h-3" />
              Auto Fill
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
              onClick={handleSmartArrange}
              title="Intelligently arrange all available sections into a song"
            >
              <Wand2 className="w-3 h-3" />
              Smart Arrange
            </Button>
            <Button
              variant={showBrowser ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setShowBrowser(!showBrowser)}
              title="Browse loops from other collections"
            >
              <Library className="w-3 h-3" />
              Mix & Match
            </Button>
          </div>
        </div>

        {/* Main layout */}
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

          {/* Center: Arrangement (drag-and-drop) */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Your Arrangement
                {arrangement.length > 0 && (
                  <span className="font-normal normal-case ml-2 text-muted-foreground/60">
                    drag to reorder
                  </span>
                )}
              </h3>

              {arrangement.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Music className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">Add sections or use Smart Arrange</p>
                  <p className="text-xs mt-1">Try a preset, or Mix & Match across collections</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {arrangement.map((entry, index) => {
                    const buf = buffersRef.current.get(entry.section.id);
                    const dur = buf ? buf.duration : 0;
                    const isCurrent = isPlaying && currentPlayingIndex === index;
                    const isDragging = dragIndex === index;
                    const isDragOver = dragOverIndex === index;

                    return (
                      <div
                        key={entry.uid}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                          isCurrent
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                            : isDragOver
                            ? 'border-primary/60 bg-primary/5 border-dashed'
                            : isDragging
                            ? 'opacity-40 border-border bg-muted/30'
                            : 'border-border bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        {/* Drag handle */}
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing flex-shrink-0" />

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

                        {/* Groove name + artist if from different collection */}
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {entry.section.grooveName}
                          {entry.section.artist !== artist && (
                            <span className="text-primary/60 ml-1">({entry.section.artist})</span>
                          )}
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

                        {/* Move up/down (still available alongside drag) */}
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
                  variant={isLooping ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`gap-1.5 text-xs ${isLooping ? 'bg-primary/20 text-primary border-primary/40' : ''}`}
                  title="Loop arrangement"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Loop
                </Button>

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

          {/* Right: Cross-Collection Browser (toggled) */}
          {showBrowser && (
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border overflow-y-auto flex-shrink-0 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Mix & Match
                </h3>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowBrowser(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">
                Search across all collections to add loops from other artists and genres.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); searchOtherCollections(browserSearch); }}
                className="flex gap-1.5 mb-3"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Artist, genre, groove..."
                    value={browserSearch}
                    onChange={(e) => setBrowserSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-muted/50 border-none"
                  />
                </div>
                <Button type="submit" size="sm" className="h-8 text-xs px-3" disabled={browserLoading}>
                  {browserLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
                </Button>
              </form>

              {browserResults.length > 0 && (
                <div className="space-y-1">
                  {browserResults.map(section => (
                    <button
                      key={section.id}
                      onClick={() => addSection(section)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs transition-colors hover:brightness-125 cursor-pointer ${sectionColor(section.sectionType)}`}
                    >
                      <Plus className="w-3 h-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="truncate">{section.grooveName}</p>
                        <p className="text-[10px] opacity-60 truncate">{section.artist}</p>
                      </div>
                      <Badge variant="outline" className="text-[8px] capitalize flex-shrink-0">
                        {section.sectionType.replace(/_/g, ' ')}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
              {browserResults.length === 0 && !browserLoading && browserSearch && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No results. Try a different search.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default SongBuilder;
