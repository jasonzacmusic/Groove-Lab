import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
  cdn_url?: string;
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
  sectionNumber?: number | null;
  collection?: string;
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
  autoPlay?: boolean;
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Stem player type (per-stem audio state)                            */
/* ------------------------------------------------------------------ */

interface StemPlayerState {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  muted: boolean;
  soloed: boolean;
  volume: number; // 0-1
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
/*  Waveform drawing                                                   */
/* ------------------------------------------------------------------ */

function drawWaveform(
  buffer: AudioBuffer,
  canvas: HTMLCanvasElement,
  progress: number,
  duration: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / w));

  ctx.clearRect(0, 0, w, h);

  const progressPct = duration > 0 ? progress / duration : 0;

  for (let i = 0; i < w; i++) {
    let min = 1;
    let max = -1;
    const base = i * step;
    for (let j = 0; j < step; j++) {
      const idx = base + j;
      if (idx >= data.length) break;
      const val = data[idx];
      if (val < min) min = val;
      if (val > max) max = val;
    }

    const isPast = i / w < progressPct;
    ctx.fillStyle = isPast ? '#e2a832' : 'rgba(226, 168, 50, 0.25)';
    const barH = Math.max((max - min) * h * 0.4, dpr);
    ctx.fillRect(i, (h - barH) / 2, 1, barH);
  }

  // Playhead line
  const px = progressPct * w;
  ctx.strokeStyle = '#e2a832';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(px, 0);
  ctx.lineTo(px, h);
  ctx.stroke();
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

export function LoopPlayer({ loop, autoPlay = false, onClose }: LoopPlayerProps) {
  /* -- Audio engine refs (not state, for performance) --------------- */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const tempoRatioRef = useRef(1);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /* -- Stem audio refs --------------------------------------------- */
  const stemPlayersRef = useRef<Map<string, StemPlayerState>>(new Map());

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

  /* -- Refs that track latest state for use in non-reactive code ---- */
  const isLoopingRef = useRef(isLooping);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const volumeRef = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  /* -- derived ----------------------------------------------------- */
  const originalBpm = loop.bpm ?? 120;
  const adjustedBpm = Math.round(originalBpm * tempoRatio);
  const semitones = semitonesFromRate(tempoRatio);
  const transposed = transposedKey(loop.keySignature, semitones);
  const audioUrl = loop.previewUrl || loop.wavUrl;

  const sections = useMemo(() => {
    if (loop.sections && loop.sections.length > 0) return loop.sections;
    if (loop.sectionType) {
      return [{ name: loop.sectionType, startTime: 0, endTime: duration }];
    }
    return [];
  }, [loop.sections, loop.sectionType, duration]);

  /* ================================================================ */
  /*  Audio Context + Buffer Loading                                   */
  /* ================================================================ */

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // Load main audio buffer
  useEffect(() => {
    let cancelled = false;

    setLoadingState('loading');
    setErrorMsg('');
    setCurrentTime(0);
    offsetRef.current = 0;

    const ctx = getAudioContext();

    // Create master gain if not exists
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.connect(ctx.destination);
    }

    async function loadAudio() {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        bufferRef.current = audioBuffer;
        setDuration(audioBuffer.duration);
        setLoadingState('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Audio load error:', err);
        setLoadingState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load audio');
      }
    }

    loadAudio();

    return () => {
      cancelled = true;
      // Stop any playing source
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* already stopped */ }
        sourceRef.current = null;
      }
      setIsPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  /* ================================================================ */
  /*  Load stem buffers when stems panel opens                         */
  /* ================================================================ */

  useEffect(() => {
    if (!showStems || !loop.isMultitrack || !loop.stems || loop.stems.length === 0) return;
    let cancelled = false;
    const ctx = getAudioContext();

    async function loadStems() {
      if (!loop.stems) return;

      const promises = loop.stems.map(async (stem) => {
        if (stemPlayersRef.current.has(stem.name)) return; // already loaded

        const stemUrl = stem.cdn_url || stem.filename;
        try {
          const response = await fetch(stemUrl);
          if (!response.ok) throw new Error(`Stem ${stem.name}: HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          if (cancelled) return;

          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          if (cancelled) return;

          const stemGain = ctx.createGain();
          stemGain.connect(gainRef.current || ctx.destination);

          stemPlayersRef.current.set(stem.name, {
            buffer: audioBuffer,
            source: null,
            gain: stemGain,
            muted: false,
            soloed: false,
            volume: 0.8,
          });
        } catch (err) {
          console.error(`Failed to load stem ${stem.name}:`, err);
        }
      });

      await Promise.all(promises);
    }

    loadStems();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStems, loop.isMultitrack, loop.stems]);

  /* ================================================================ */
  /*  Play / Pause                                                     */
  /* ================================================================ */

  const play = useCallback(() => {
    const buf = bufferRef.current;
    const ctx = audioCtxRef.current;
    if (!buf || !ctx) return;

    // Resume AudioContext if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create a new source (AudioBufferSourceNode is single-use)
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = isLoopingRef.current;
    source.playbackRate.value = tempoRatioRef.current;
    source.connect(gainRef.current!);

    // Handle non-looping end
    source.onended = () => {
      if (!isLoopingRef.current) {
        setIsPlaying(false);
        offsetRef.current = 0;
      }
    };

    startTimeRef.current = ctx.currentTime;
    source.start(0, offsetRef.current);
    sourceRef.current = source;

    // Start all loaded stem sources in sync
    stemPlayersRef.current.forEach((sp) => {
      if (sp.source) {
        try { sp.source.stop(); } catch { /* ok */ }
      }
      const stemSource = ctx.createBufferSource();
      stemSource.buffer = sp.buffer;
      stemSource.loop = isLoopingRef.current;
      stemSource.playbackRate.value = tempoRatioRef.current;
      stemSource.connect(sp.gain);
      stemSource.start(0, offsetRef.current);
      sp.source = stemSource;
    });

    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    const ctx = audioCtxRef.current;
    const src = sourceRef.current;
    const buf = bufferRef.current;
    if (!ctx || !src || !buf) return;

    // Calculate where we are in the buffer
    const elapsed = ctx.currentTime - startTimeRef.current;
    const rawOffset = offsetRef.current + elapsed * src.playbackRate.value;
    offsetRef.current = rawOffset % buf.duration;

    src.stop();
    sourceRef.current = null;

    // Stop all stem sources
    stemPlayersRef.current.forEach((sp) => {
      if (sp.source) {
        try { sp.source.stop(); } catch { /* ok */ }
        sp.source = null;
      }
    });

    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (loadingState !== 'ready') return;
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, loadingState, play, pause]);

  /* -- Auto-play when buffer is ready and autoPlay prop is set ------- */
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (!autoPlay || loadingState !== 'ready' || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const timer = setTimeout(() => play(), 50);
    return () => clearTimeout(timer);
  }, [autoPlay, loadingState, play]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      // Update running source's loop property in real-time
      if (sourceRef.current) {
        sourceRef.current.loop = next;
      }
      stemPlayersRef.current.forEach((sp) => {
        if (sp.source) sp.source.loop = next;
      });
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (gainRef.current) {
        gainRef.current.gain.value = next ? 0 : volumeRef.current / 100;
      }
      return next;
    });
  }, []);

  /* ================================================================ */
  /*  Volume sync                                                      */
  /* ================================================================ */

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  /* ================================================================ */
  /*  Tempo control (real-time, no re-scheduling)                      */
  /* ================================================================ */

  useEffect(() => {
    tempoRatioRef.current = tempoRatio;
    if (sourceRef.current) {
      sourceRef.current.playbackRate.value = tempoRatio;
    }
    stemPlayersRef.current.forEach((sp) => {
      if (sp.source) {
        sp.source.playbackRate.value = tempoRatio;
      }
    });
  }, [tempoRatio]);

  /* ================================================================ */
  /*  Progress tracking via requestAnimationFrame                      */
  /* ================================================================ */

  useEffect(() => {
    if (!isPlaying) return;

    const update = () => {
      const ctx = audioCtxRef.current;
      const src = sourceRef.current;
      const buf = bufferRef.current;
      if (ctx && src && buf) {
        const elapsed = ctx.currentTime - startTimeRef.current;
        const pos = (offsetRef.current + elapsed * src.playbackRate.value) % buf.duration;
        setCurrentTime(pos);

        // Draw waveform on canvas
        if (canvasRef.current) {
          drawWaveform(buf, canvasRef.current, pos, buf.duration);
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // Draw initial static waveform when buffer is loaded (not playing)
  useEffect(() => {
    if (loadingState === 'ready' && !isPlaying && bufferRef.current && canvasRef.current) {
      drawWaveform(bufferRef.current, canvasRef.current, currentTime, bufferRef.current.duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState, isPlaying]);

  /* ================================================================ */
  /*  Seek by clicking on the waveform canvas                          */
  /* ================================================================ */

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const buf = bufferRef.current;
      if (!canvas || !buf || loadingState !== 'ready') return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      const newOffset = pct * buf.duration;

      if (isPlaying) {
        // Stop current source, update offset, restart
        pause();
        offsetRef.current = newOffset;
        play();
      } else {
        offsetRef.current = newOffset;
        setCurrentTime(newOffset);
        if (canvasRef.current) {
          drawWaveform(buf, canvasRef.current, newOffset, buf.duration);
        }
      }
    },
    [isPlaying, loadingState, pause, play],
  );

  /* ================================================================ */
  /*  Seek by arrow keys                                               */
  /* ================================================================ */

  const seekBy = useCallback(
    (seconds: number) => {
      const buf = bufferRef.current;
      if (!buf || duration <= 0) return;

      const curPos = isPlaying
        ? (() => {
            const ctx = audioCtxRef.current;
            const src = sourceRef.current;
            if (!ctx || !src) return offsetRef.current;
            const elapsed = ctx.currentTime - startTimeRef.current;
            return (offsetRef.current + elapsed * src.playbackRate.value) % buf.duration;
          })()
        : offsetRef.current;

      const newOffset = Math.max(0, Math.min(buf.duration, curPos + seconds));

      if (isPlaying) {
        pause();
        offsetRef.current = newOffset;
        play();
      } else {
        offsetRef.current = newOffset;
        setCurrentTime(newOffset);
        if (canvasRef.current) {
          drawWaveform(buf, canvasRef.current, newOffset, buf.duration);
        }
      }
    },
    [duration, isPlaying, pause, play],
  );

  /* ================================================================ */
  /*  Volume / Tempo handlers                                          */
  /* ================================================================ */

  const handleVolumeChange = useCallback((v: number[]) => {
    setVolume(v[0]);
    if (v[0] > 0) setIsMuted(false);
  }, []);

  const handleTempoChange = useCallback((v: number[]) => {
    setTempoRatio(v[0] / 100);
  }, []);

  /* ================================================================ */
  /*  Stem mixer actions                                               */
  /* ================================================================ */

  const updateStemGains = useCallback((muted: Set<string>, soloed: Set<string>, volumes: Record<string, number>) => {
    const anySoloed = soloed.size > 0;
    stemPlayersRef.current.forEach((sp, name) => {
      const vol = (volumes[name] ?? 80) / 100;
      const isStemMuted = muted.has(name);
      const isStemSoloed = soloed.has(name);

      let effectiveGain: number;
      if (isStemMuted) {
        effectiveGain = 0;
      } else if (anySoloed && !isStemSoloed) {
        effectiveGain = 0;
      } else {
        effectiveGain = vol;
      }

      sp.gain.gain.setValueAtTime(effectiveGain, audioCtxRef.current?.currentTime ?? 0);
    });
  }, []);

  const toggleStemMute = useCallback((name: string) => {
    setMutedStems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      // Use a microtask so soloedStems is resolved
      setTimeout(() => {
        updateStemGains(next, soloedStems, stemVolumes);
      }, 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStemGains, soloedStems, stemVolumes]);

  const toggleStemSolo = useCallback((name: string) => {
    setSoloedStems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      setTimeout(() => {
        updateStemGains(mutedStems, next, stemVolumes);
      }, 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStemGains, mutedStems, stemVolumes]);

  const handleStemVolume = useCallback((name: string, v: number) => {
    setStemVolumes((prev) => {
      const next = { ...prev, [name]: v };
      setTimeout(() => {
        updateStemGains(mutedStems, soloedStems, next);
      }, 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStemGains, mutedStems, soloedStems]);

  /* ================================================================ */
  /*  Section playback                                                 */
  /* ================================================================ */

  const playSection = useCallback(
    (section: { startTime: number; endTime: number }, index: number) => {
      const buf = bufferRef.current;
      if (!buf || duration <= 0) return;
      setActiveSection(index);

      if (isPlaying) pause();
      offsetRef.current = section.startTime;
      play();
    },
    [duration, isPlaying, pause, play],
  );

  /* ================================================================ */
  /*  Keyboard shortcuts                                               */
  /* ================================================================ */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'IFRAME' ||
        target.isContentEditable
      ) return;
      if (document.activeElement?.tagName === 'IFRAME') return;

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

  /* ================================================================ */
  /*  Increment play count                                             */
  /* ================================================================ */

  useEffect(() => {
    if (isPlaying) {
      fetch(`/api/audio-loops/${loop.id}`, { method: 'POST' }).catch(() => {});
    }
  }, [isPlaying, loop.id]);

  /* ================================================================ */
  /*  Cleanup on unmount                                               */
  /* ================================================================ */

  useEffect(() => {
    return () => {
      // Cancel animation frame
      cancelAnimationFrame(rafRef.current);

      // Stop main source
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* ok */ }
        sourceRef.current = null;
      }

      // Stop all stem sources
      stemPlayersRef.current.forEach((sp) => {
        if (sp.source) {
          try { sp.source.stop(); } catch { /* ok */ }
        }
        sp.gain.disconnect();
      });
      stemPlayersRef.current.clear();

      // Disconnect gain and close context
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }

      bufferRef.current = null;
    };
  }, []);

  /* ================================================================ */
  /*  Drum element badges                                              */
  /* ================================================================ */

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
      {/* -- Header -------------------------------------------------- */}
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

      {/* -- Waveform (canvas-based) --------------------------------- */}
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
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full rounded cursor-pointer"
          style={{ height: 80, width: '100%' }}
        />
        <div className="flex justify-between mt-1.5 text-xs font-mono text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* -- Transport Controls -------------------------------------- */}
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

      {/* -- Keyboard shortcuts panel -------------------------------- */}
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

      {/* -- Section buttons ----------------------------------------- */}
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

      {/* -- Stem mixer ---------------------------------------------- */}
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

      {/* -- Download bar -------------------------------------------- */}
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
