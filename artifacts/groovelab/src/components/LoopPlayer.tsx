import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Download,
  Repeat,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Music,
  Gauge,
  Keyboard,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Stem {
  name: string;
  filename: string;
  type: string;
}

export interface AudioLoopData {
  id: string;
  title: string;
  artist: string;
  grooveName: string;
  genre: string;
  subGenre?: string;
  bpm?: number;
  keySignature?: string;
  timeSignature?: string;
  feel?: string;
  intensity?: string;
  sectionType?: string;
  instrumentCategory: string;
  isMultitrack?: boolean;
  stems?: Stem[];
  wavUrl: string;
  previewUrl?: string;
  waveformPeaks?: number[];
  durationSeconds?: number;
  sections?: { name: string; startTime: number; endTime: number }[];
  hasKick?: boolean;
  hasSnare?: boolean;
  hasHihat?: boolean;
  hasToms?: boolean;
  hasCymbals?: boolean;
}

interface LoopPlayerProps {
  loop: AudioLoopData;
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function semitonesFromRate(rate: number): number {
  return Math.round(12 * Math.log2(rate));
}

function transposedKey(original: string | undefined, semitones: number): string | null {
  if (!original) return null;
  const match = original.match(/^([A-G]#?)(.*)$/);
  if (!match) return null;
  const noteIdx = NOTES.indexOf(match[1] as (typeof NOTES)[number]);
  if (noteIdx === -1) return null;
  const newIdx = ((noteIdx + semitones) % 12 + 12) % 12;
  return `${NOTES[newIdx]}${match[2]}`;
}

/* ------------------------------------------------------------------ */
/*  Stem Mixer Row                                                     */
/* ------------------------------------------------------------------ */

interface StemRowProps {
  stem: Stem;
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeChange: (v: number) => void;
}

function StemRow({ stem, isMuted, isSoloed, volume, onToggleMute, onToggleSolo, onVolumeChange }: StemRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-200 ${
        isMuted
          ? 'border-destructive/30 bg-destructive/5 opacity-60'
          : isSoloed
            ? 'border-primary/50 bg-primary/5'
            : 'border-border bg-card/50'
      }`}
    >
      <span className="text-xs font-mono truncate min-w-[80px] flex-shrink-0">{stem.name}</span>
      <Slider
        value={[isMuted ? 0 : volume]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => onVolumeChange(v[0])}
        className="flex-1 min-w-[60px]"
        disabled={isMuted}
      />
      <button
        onClick={onToggleMute}
        className={`w-8 h-8 rounded-md text-[10px] font-bold flex items-center justify-center transition-colors ${
          isMuted ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        M
      </button>
      <button
        onClick={onToggleSolo}
        className={`w-8 h-8 rounded-md text-[10px] font-bold flex items-center justify-center transition-colors ${
          isSoloed ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        }`}
        title={isSoloed ? 'Unsolo' : 'Solo'}
      >
        S
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LoopPlayer({ loop, onClose }: LoopPlayerProps) {
  /* -- refs -------------------------------------------------------- */
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  /* -- state ------------------------------------------------------- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(loop.durationSeconds ?? 0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [tempoRatio, setTempoRatio] = useState(1);
  const [showStems, setShowStems] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Loading / error
  const [loadingState, setLoadingState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Stem mixer state
  const [mutedStems, setMutedStems] = useState<Set<string>>(new Set());
  const [soloedStems, setSoloedStems] = useState<Set<string>>(new Set());
  const [stemVolumes, setStemVolumes] = useState<Record<string, number>>({});

  // Sections
  const [activeSection, setActiveSection] = useState<number | null>(null);

  /* -- derived ----------------------------------------------------- */
  const originalBpm = loop.bpm ?? 120;
  const adjustedBpm = Math.round(originalBpm * tempoRatio);
  const semitones = semitonesFromRate(tempoRatio);
  const transposed = transposedKey(loop.keySignature, semitones);
  const audioUrl = loop.previewUrl || loop.wavUrl;

  // Sections: use provided or derive from sectionType
  const sections = useMemo(() => {
    if (loop.sections && loop.sections.length > 0) return loop.sections;
    if (loop.sectionType) {
      return [{ name: loop.sectionType, startTime: 0, endTime: duration }];
    }
    return [];
  }, [loop.sections, loop.sectionType, duration]);

  /* -- WaveSurfer init --------------------------------------------- */
  useEffect(() => {
    if (!waveformContainerRef.current) return;

    setLoadingState('loading');
    setErrorMsg('');

    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: 'rgba(226, 168, 50, 0.35)',
      progressColor: '#e2a832',
      cursorColor: '#e2a832',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      hideScrollbar: true,
      fillParent: true,
      mediaControls: false,
      autoplay: false,
      interact: true,
    });

    wavesurferRef.current = ws;

    ws.load(audioUrl);

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setLoadingState('ready');
      ws.setVolume(volume / 100);
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('seeking', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    ws.on('finish', () => {
      if (isLoopingRef.current) {
        ws.seekTo(0);
        ws.play();
      } else {
        setIsPlaying(false);
      }
    });

    ws.on('error', (msg) => {
      console.error('WaveSurfer error:', msg);
      setLoadingState('error');
      setErrorMsg(typeof msg === 'string' ? msg : 'Failed to load audio');
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
    // Only re-init on URL change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  /* Keep loop ref in sync so the finish handler always has the latest */
  const isLoopingRef = useRef(isLooping);
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  /* -- Sync volume to wavesurfer ---------------------------------- */
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.setVolume(isMuted ? 0 : volume / 100);
  }, [volume, isMuted]);

  /* -- Sync playbackRate to wavesurfer ---------------------------- */
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.setPlaybackRate(tempoRatio);
  }, [tempoRatio]);

  /* -- Actions ---------------------------------------------------- */
  const togglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws || loadingState !== 'ready') return;
    ws.playPause();
  }, [loadingState]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleVolumeChange = useCallback((v: number[]) => {
    setVolume(v[0]);
    if (v[0] > 0) setIsMuted(false);
  }, []);

  const handleTempoChange = useCallback((v: number[]) => {
    setTempoRatio(v[0] / 100);
  }, []);

  const seekBy = useCallback(
    (seconds: number) => {
      const ws = wavesurferRef.current;
      if (!ws || duration <= 0) return;
      const target = Math.max(0, Math.min(duration, ws.getCurrentTime() + seconds));
      ws.seekTo(target / duration);
    },
    [duration],
  );

  const playSection = useCallback(
    (section: { startTime: number; endTime: number }, index: number) => {
      const ws = wavesurferRef.current;
      if (!ws || duration <= 0) return;
      setActiveSection(index);
      ws.seekTo(section.startTime / duration);
      if (!isPlaying) ws.play();
    },
    [duration, isPlaying],
  );

  /* -- Stem mixer actions ----------------------------------------- */
  const toggleStemMute = useCallback((name: string) => {
    setMutedStems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleStemSolo = useCallback((name: string) => {
    setSoloedStems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleStemVolume = useCallback((name: string, v: number) => {
    setStemVolumes((prev) => ({ ...prev, [name]: v }));
  }, []);

  /* -- Keyboard shortcuts ----------------------------------------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyL':
          e.preventDefault();
          toggleLoop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setTempoRatio((prev) => Math.min(2, prev + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setTempoRatio((prev) => Math.max(0.25, prev - 0.05));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, toggleLoop, seekBy, toggleMute]);

  /* -- Increment play count --------------------------------------- */
  useEffect(() => {
    if (isPlaying) {
      fetch(`/api/audio-loops/${loop.id}`, { method: 'POST' }).catch(() => {});
    }
  }, [isPlaying, loop.id]);

  /* -- Drum element badges ---------------------------------------- */
  const drumElements = useMemo(() => {
    if (loop.instrumentCategory !== 'drums') return [];
    const items: string[] = [];
    if (loop.hasKick) items.push('Kick');
    if (loop.hasSnare) items.push('Snare');
    if (loop.hasHihat) items.push('Hi-hat');
    if (loop.hasToms) items.push('Toms');
    if (loop.hasCymbals) items.push('Cymbals');
    return items;
  }, [loop]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg select-none">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="p-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg leading-tight truncate">{loop.grooveName || loop.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{loop.artist}</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8 flex-shrink-0">
              <span className="sr-only">Close</span>
              <span className="text-lg leading-none">&times;</span>
            </Button>
          )}
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {loop.bpm && (
            <Badge variant="secondary" className="font-mono text-xs">
              {loop.bpm} BPM
            </Badge>
          )}
          {loop.keySignature && (
            <Badge variant="outline" className="font-mono text-xs">
              {loop.keySignature}
            </Badge>
          )}
          {loop.timeSignature && (
            <Badge variant="outline" className="font-mono text-xs">
              {loop.timeSignature}
            </Badge>
          )}
          <Badge className="bg-primary/20 text-primary border-0 text-xs">{loop.genre}</Badge>
          {loop.subGenre && (
            <Badge variant="outline" className="text-xs">
              {loop.subGenre}
            </Badge>
          )}
          {loop.feel && (
            <Badge variant="outline" className="text-xs">
              {loop.feel}
            </Badge>
          )}
          {loop.intensity && (
            <Badge variant="outline" className="text-xs">
              {loop.intensity}
            </Badge>
          )}
          {drumElements.map((el) => (
            <Badge key={el} variant="secondary" className="text-[10px]">
              {el}
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Waveform ───────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-black/20 relative">
        {loadingState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 rounded">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading audio...</span>
          </div>
        )}
        {loadingState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 rounded">
            <AlertCircle className="w-5 h-5 text-destructive mr-2" />
            <span className="text-sm text-destructive">{errorMsg || 'Failed to load audio'}</span>
          </div>
        )}
        <div
          ref={waveformContainerRef}
          className="w-full rounded cursor-pointer"
          style={{ minHeight: 80 }}
        />
        <div className="flex justify-between mt-1.5 text-xs font-mono text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* ── Transport Controls ─────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {/* Row 1: Play, Loop, Volume */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Play / Pause */}
          <Button
            size="icon"
            onClick={togglePlay}
            disabled={loadingState !== 'ready'}
            className={`w-12 h-12 rounded-full transition-colors ${
              isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="white" stroke="white" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="white" stroke="white" />
            )}
          </Button>

          {/* Loop */}
          <Button
            variant={isLooping ? 'default' : 'outline'}
            size="icon"
            onClick={toggleLoop}
            className={`rounded-full w-10 h-10 transition-colors ${
              isLooping ? 'bg-primary/20 text-primary border-primary/40' : ''
            }`}
            title="Toggle loop (L)"
          >
            <Repeat className="w-4 h-4" />
          </Button>

          {/* Volume */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <button onClick={toggleMute} className="p-1 rounded hover:bg-muted transition-colors" title="Mute (M)">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{isMuted ? 0 : volume}</span>
          </div>

          {/* Shortcuts toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowShortcuts((s) => !s)}
            className="rounded-full w-9 h-9 ml-auto"
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>

        {/* Row 2: Tempo + Pitch */}
        <div className="flex items-center gap-4 flex-wrap bg-muted/30 rounded-lg px-3 py-2.5">
          <Gauge className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Tempo</span>
            <Slider
              value={[Math.round(tempoRatio * 100)]}
              min={25}
              max={200}
              step={5}
              onValueChange={handleTempoChange}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm tabular-nums">
              {tempoRatio !== 1 ? (
                <>
                  <span className="text-muted-foreground">{originalBpm}</span>
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="text-primary font-bold">{adjustedBpm}</span>
                  <span className="text-xs text-muted-foreground ml-0.5">BPM</span>
                </>
              ) : (
                <>
                  <span className="text-primary font-bold">{originalBpm}</span>
                  <span className="text-xs text-muted-foreground ml-0.5">BPM</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Pitch info */}
        {tempoRatio !== 1 && (
          <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
            <Music className="w-3 h-3" />
            <span>
              Pitch: {semitones > 0 ? `+${semitones}` : semitones} semitone{Math.abs(semitones) !== 1 ? 's' : ''}
              {transposed && loop.keySignature && transposed !== loop.keySignature && (
                <span className="ml-2">
                  ({loop.keySignature} &rarr; <span className="text-primary">{transposed}</span>)
                </span>
              )}
            </span>
            <span className="text-muted-foreground/60 ml-1 italic">(tempo affects pitch)</span>
          </div>
        )}
      </div>

      {/* ── Keyboard shortcuts panel ───────────────────────────────── */}
      {showShortcuts && (
        <div className="px-4 pb-3 border-t border-border pt-3">
          <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {[
              ['Space', 'Play / Pause'],
              ['L', 'Toggle loop'],
              ['M', 'Toggle mute'],
              ['Up', 'Tempo +5%'],
              ['Down', 'Tempo -5%'],
              ['Left', 'Seek -5s'],
              ['Right', 'Seek +5s'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">{key}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section buttons ────────────────────────────────────────── */}
      {sections.length > 1 && (
        <div className="px-4 pb-3 border-t border-border pt-3">
          <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Sections</p>
          <div className="flex flex-wrap gap-1.5">
            {sections.map((section, i) => (
              <button
                key={i}
                onClick={() => playSection(section, i)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  activeSection === i
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stem mixer ─────────────────────────────────────────────── */}
      {loop.isMultitrack && loop.stems && loop.stems.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowStems(!showStems)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
              Stems ({loop.stems.length})
            </span>
            {showStems ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showStems && (
            <div className="px-4 pb-4 space-y-1.5 max-h-[320px] overflow-y-auto">
              {loop.stems.map((stem) => (
                <StemRow
                  key={stem.name}
                  stem={stem}
                  isMuted={mutedStems.has(stem.name)}
                  isSoloed={soloedStems.has(stem.name)}
                  volume={stemVolumes[stem.name] ?? 80}
                  onToggleMute={() => toggleStemMute(stem.name)}
                  onToggleSolo={() => toggleStemSolo(stem.name)}
                  onVolumeChange={(v) => handleStemVolume(stem.name, v)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Download bar ───────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <a href={loop.wavUrl} download className="inline-flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Download WAV
          </a>
        </Button>
        {loop.isMultitrack && loop.stems && loop.stems.length > 0 && (
          <Button variant="outline" size="sm" asChild>
            <a href={loop.wavUrl.replace(/\/[^/]+$/, '')} download className="inline-flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              Download All Stems
            </a>
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto text-muted-foreground">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
