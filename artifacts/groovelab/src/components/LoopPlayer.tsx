import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, Repeat, Volume2, ChevronDown, ChevronUp } from 'lucide-react';

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

export function LoopPlayer({ loop, onClose }: LoopPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [volume, setVolume] = useState(80);
  const [showStems, setShowStems] = useState(false);
  const [mutedStems, setMutedStems] = useState<Set<string>>(new Set());
  const rafRef = useRef<number>(0);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio(loop.previewUrl || loop.wavUrl);
    audio.loop = isLooping;
    audio.volume = volume / 100;
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => { if (!isLooping) setIsPlaying(false); });

    return () => {
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(rafRef.current);
    };
  }, [loop.wavUrl, loop.previewUrl]);

  // Update progress
  useEffect(() => {
    if (!isPlaying) return;
    const update = () => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Generate fake waveform if no peaks data
    const peaks = loop.waveformPeaks || Array.from({ length: 200 }, (_, i) => {
      // Deterministic pseudo-random based on loop id and index
      const seed = (loop.id.charCodeAt(i % loop.id.length) * 31 + i * 17) % 100;
      return seed / 100 * 0.7 + 0.15;
    });
    const barW = w / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const barH = peaks[i] * h * 0.8;
      const progressPct = duration > 0 ? progress / duration : 0;
      const isPast = i / peaks.length < progressPct;

      ctx.fillStyle = isPast ? '#e2a832' : 'rgba(226, 168, 50, 0.25)';
      ctx.fillRect(x, (h - barH) / 2, Math.max(barW - 1, 1), barH);
    }

    // Playhead line
    if (duration > 0) {
      const px = (progress / duration) * w;
      ctx.strokeStyle = '#e2a832';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
  }, [progress, duration, loop.waveformPeaks, loop.id]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
    setProgress(pct * duration);
  }, [duration]);

  const handleVolumeChange = useCallback((v: number[]) => {
    setVolume(v[0]);
    if (audioRef.current) audioRef.current.volume = v[0] / 100;
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping(!isLooping);
    if (audioRef.current) audioRef.current.loop = !isLooping;
  }, [isLooping]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Increment play count
  useEffect(() => {
    if (isPlaying) {
      fetch(`/api/audio-loops/${loop.id}`, { method: 'POST' }).catch(() => {});
    }
  }, [isPlaying, loop.id]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="font-serif text-lg truncate">{loop.grooveName || loop.title}</h3>
          <p className="text-sm text-muted-foreground">{loop.artist}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {loop.bpm && <Badge variant="secondary" className="font-mono">{loop.bpm} BPM</Badge>}
          {loop.keySignature && <Badge variant="outline" className="font-mono">{loop.keySignature}</Badge>}
          {loop.timeSignature && <Badge variant="outline" className="font-mono">{loop.timeSignature}</Badge>}
          <Badge className="bg-primary/20 text-primary">{loop.genre}</Badge>
          {loop.feel && <Badge variant="outline">{loop.feel}</Badge>}
        </div>
      </div>

      {/* Waveform */}
      <div className="px-4 py-3 bg-black/20">
        <canvas
          ref={canvasRef}
          width={800}
          height={80}
          className="w-full h-20 cursor-pointer rounded"
          onClick={handleSeek}
        />
        <div className="flex justify-between mt-1 text-xs font-mono text-muted-foreground">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center gap-4 flex-wrap">
        {/* Play/Stop */}
        <Button size="icon" onClick={togglePlay}
          className={`w-12 h-12 rounded-full ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}>
          {isPlaying ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5 ml-0.5" fill="white" />}
        </Button>

        {/* Loop toggle */}
        <Button variant={isLooping ? 'default' : 'outline'} size="icon" onClick={toggleLoop}
          className={`rounded-full w-9 h-9 ${isLooping ? 'bg-primary/20 text-primary' : ''}`}>
          <Repeat className="w-4 h-4" />
        </Button>

        {/* Volume */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Slider value={[volume]} min={0} max={100} step={1} onValueChange={handleVolumeChange} className="flex-1" />
        </div>

        {/* Download */}
        <Button variant="outline" size="sm" asChild className="ml-auto">
          <a href={loop.wavUrl} download>
            <Download className="w-4 h-4 mr-1" /> WAV
          </a>
        </Button>

        {/* Stems toggle */}
        {loop.isMultitrack && loop.stems && loop.stems.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowStems(!showStems)}>
            {showStems ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Stems ({loop.stems.length})
          </Button>
        )}
      </div>

      {/* Stem mixer */}
      {showStems && loop.stems && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Stem Mixer</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {loop.stems.map((stem) => (
              <div key={stem.name} className={`flex items-center gap-2 px-2 py-1.5 rounded border ${mutedStems.has(stem.name) ? 'border-destructive/50 opacity-50' : 'border-border'}`}>
                <button onClick={() => {
                  const next = new Set(mutedStems);
                  if (next.has(stem.name)) next.delete(stem.name); else next.add(stem.name);
                  setMutedStems(next);
                }} className="text-xs font-mono flex-1 text-left">
                  {stem.name}
                </button>
                <Badge variant="outline" className="text-[9px]">{stem.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drum elements */}
      {loop.instrumentCategory === 'drums' && (
        <div className="px-4 pb-3 flex gap-1.5">
          {loop.hasKick && <Badge variant="secondary" className="text-[10px]">Kick</Badge>}
          {loop.hasSnare && <Badge variant="secondary" className="text-[10px]">Snare</Badge>}
          {loop.hasHihat && <Badge variant="secondary" className="text-[10px]">Hi-hat</Badge>}
          {loop.hasToms && <Badge variant="secondary" className="text-[10px]">Toms</Badge>}
          {loop.hasCymbals && <Badge variant="secondary" className="text-[10px]">Cymbals</Badge>}
        </div>
      )}
    </div>
  );
}
