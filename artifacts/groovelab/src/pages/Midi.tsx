import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Cpu, Play, Pause, Square, SkipBack, RefreshCw, Volume2, VolumeX, Scissors, Undo2, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// ---- helpers ----

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TRACK_COLORS = [
  '#6366f1', // indigo
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
];

interface TrackMixState {
  muted: boolean;
  solo: boolean;
}

// MIDI note number to General MIDI drum name (channel 9)
const GM_DRUM_MAP: Record<number, string> = {
  35: 'kick', 36: 'kick',
  38: 'snare', 40: 'snare',
  42: 'hihatClosed', 44: 'hihatClosed',
  46: 'hihatOpen',
  49: 'crash', 57: 'crash',
  51: 'ride', 59: 'ride',
  50: 'tomHigh', 48: 'tomHigh',
  47: 'tomMid', 45: 'tomMid',
  43: 'tomLow', 41: 'tomLow',
  39: 'clap',
  56: 'cowbell',
};

export default function MidiPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [trackMix, setTrackMix] = useState<TrackMixState[]>([]);
  const [deletedNotes, setDeletedNotes] = useState<Set<string>>(new Set());
  const [surgeryMode, setSurgeryMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pianoRollContainerRef = useRef<HTMLDivElement>(null);
  const synthsRef = useRef<(Tone.PolySynth | null)[]>([]);
  const drumSynthsRef = useRef<Record<string, any> | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);
  const baseBpmRef = useRef(120);

  // ---- derived data from parsed MIDI ----
  const bpm = parsedMidi?.header?.tempos?.[0]?.bpm ?? 120;
  const timeSig = parsedMidi?.header?.timeSignatures?.[0]?.timeSignature;
  const timeSigStr = timeSig ? `${timeSig[0]}/${timeSig[1]}` : '4/4';
  const duration = parsedMidi?.duration ?? 0;
  const tracks = parsedMidi?.tracks ?? [];

  // ---- note range for piano roll ----
  const allNotes = tracks.flatMap(t => t.notes);
  const minNote = allNotes.length > 0 ? Math.max(0, Math.min(...allNotes.map(n => n.midi)) - 2) : 48;
  const maxNote = allNotes.length > 0 ? Math.min(127, Math.max(...allNotes.map(n => n.midi)) + 2) : 72;
  const noteRange = maxNote - minNote + 1;

  // ---- file handling ----

  const parseMidiFile = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);
    setParsedMidi(midi);
    setTrackMix(midi.tracks.map(() => ({ muted: false, solo: false })));
    setPlayheadTime(0);
    baseBpmRef.current = midi.header?.tempos?.[0]?.bpm ?? 120;
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
        setUploadedFile(file);
        parseMidiFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedFile(file);
      parseMidiFile(file);
    }
  };

  const handleClear = () => {
    handleStop();
    setUploadedFile(null);
    setParsedMidi(null);
    setTrackMix([]);
    setPlayheadTime(0);
    setDeletedNotes(new Set());
    setSurgeryMode(false);
  };

  // ---- determine which tracks are audible based on mute/solo ----

  const getAudibleTracks = useCallback((): boolean[] => {
    const hasSolo = trackMix.some(t => t.solo);
    return trackMix.map(t => {
      if (t.muted) return false;
      if (hasSolo) return t.solo;
      return true;
    });
  }, [trackMix]);

  // ---- drum synths (reuse pattern from sequencer) ----

  const getOrCreateDrumSynths = useCallback(() => {
    if (drumSynthsRef.current) return drumSynthsRef.current;
    const ds: Record<string, any> = {
      kick: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.4 } }).toDestination(),
      snare: new Tone.NoiseSynth({ volume: -8, noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.12 } }).toDestination(),
      hihatClosed: new Tone.MetalSynth({ volume: -14, envelope: { attack: 0.001, decay: 0.06, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
      hihatOpen: new Tone.MetalSynth({ volume: -14, envelope: { attack: 0.001, decay: 0.35, release: 0.08 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
      ride: new Tone.MetalSynth({ volume: -12, envelope: { attack: 0.001, decay: 1.5, release: 0.2 }, harmonicity: 5.1, modulationIndex: 40, resonance: 5000, octaves: 1.5 }).toDestination(),
      crash: new Tone.MetalSynth({ volume: -10, envelope: { decay: 2.0 } }).toDestination(),
      tomHigh: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.05, octaves: 4 }).toDestination(),
      tomMid: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.05, octaves: 3 }).toDestination(),
      tomLow: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.05, octaves: 2 }).toDestination(),
      cowbell: new Tone.MetalSynth({ volume: -12, envelope: { decay: 0.2 } }).toDestination(),
      clap: new Tone.NoiseSynth({ volume: -8, envelope: { attack: 0.001, decay: 0.18 } }).toDestination(),
    };
    drumSynthsRef.current = ds;
    return ds;
  }, []);

  const triggerDrumNote = useCallback((midiNote: number, time: number) => {
    const ds = getOrCreateDrumSynths();
    const name = GM_DRUM_MAP[midiNote] || 'snare';
    const synth = ds[name];
    if (!synth) return;
    if (synth instanceof Tone.MembraneSynth) {
      const pitchMap: Record<string, string> = { kick: 'C2', tomLow: 'E2', tomMid: 'A2', tomHigh: 'C3' };
      synth.triggerAttackRelease(pitchMap[name] || 'C2', '8n', time);
    } else if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('16n', time);
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease('C4', '16n', time);
    }
  }, [getOrCreateDrumSynths]);

  // ---- playback ----

  const schedulePlayback = useCallback(() => {
    // Clear previous
    scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
    scheduledEventsRef.current = [];

    // Dispose old melodic synths
    synthsRef.current.forEach(s => { try { s?.dispose(); } catch (_) {} });
    synthsRef.current = [];

    if (!parsedMidi) return;

    const audible = getAudibleTracks();

    tracks.forEach((track, ti) => {
      if (!audible[ti]) {
        synthsRef.current.push(null);
        return;
      }

      const isDrum = track.channel === 9;

      if (isDrum) {
        synthsRef.current.push(null);
        track.notes.forEach((note, ni) => {
          const noteId = `${ti}-${ni}`;
          if (deletedNotes.has(noteId)) return; // skip deleted
          const id = Tone.Transport.schedule((time) => {
            triggerDrumNote(note.midi, time);
          }, note.time);
          scheduledEventsRef.current.push(id);
        });
      } else {
        const synth = new Tone.PolySynth(Tone.Synth, {
          volume: -8,
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.3 },
        }).toDestination();
        synthsRef.current.push(synth);

        track.notes.forEach((note, ni) => {
          const noteId = `${ti}-${ni}`;
          if (deletedNotes.has(noteId)) return; // skip deleted
          const noteName = midiNoteName(note.midi);
          const dur = Math.max(note.duration, 0.01);
          const id = Tone.Transport.schedule((time) => {
            synth.triggerAttackRelease(noteName, dur, time, note.velocity);
          }, note.time);
          scheduledEventsRef.current.push(id);
        });
      }
    });
  }, [parsedMidi, tracks, getAudibleTracks, triggerDrumNote, deletedNotes]);

  const handlePlay = async () => {
    if (!parsedMidi) return;
    await Tone.start();

    if (isPlaying) {
      // pause
      Tone.Transport.pause();
      setIsPlaying(false);
      return;
    }

    // Set BPM
    Tone.Transport.bpm.value = baseBpmRef.current * speed;

    // Configure loop
    if (isLooping) {
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = duration;
    } else {
      Tone.Transport.loop = false;
    }

    schedulePlayback();

    // Schedule a stop event at end (if not looping)
    if (!isLooping) {
      const stopId = Tone.Transport.schedule(() => {
        Tone.Transport.stop();
        setIsPlaying(false);
        setPlayheadTime(0);
      }, duration + 0.1);
      scheduledEventsRef.current.push(stopId);
    }

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    scheduledEventsRef.current = [];
    synthsRef.current.forEach(s => { try { s?.dispose(); } catch (_) {} });
    synthsRef.current = [];
    setIsPlaying(false);
    setPlayheadTime(0);
  };

  const handleRestart = () => {
    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      scheduledEventsRef.current = [];
      synthsRef.current.forEach(s => { try { s?.dispose(); } catch (_) {} });
      synthsRef.current = [];
      setPlayheadTime(0);
      // Re-start
      Tone.Transport.bpm.value = baseBpmRef.current * speed;
      if (isLooping) {
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = 0;
        Tone.Transport.loopEnd = duration;
      }
      schedulePlayback();
      if (!isLooping) {
        const stopId = Tone.Transport.schedule(() => {
          Tone.Transport.stop();
          setIsPlaying(false);
          setPlayheadTime(0);
        }, duration + 0.1);
        scheduledEventsRef.current.push(stopId);
      }
      Tone.Transport.start();
    } else {
      setPlayheadTime(0);
      Tone.Transport.position = 0;
    }
  };

  // Speed changes
  useEffect(() => {
    if (isPlaying) {
      Tone.Transport.bpm.value = baseBpmRef.current * speed;
    }
  }, [speed, isPlaying]);

  // Re-schedule when mute/solo changes during playback
  useEffect(() => {
    if (isPlaying && parsedMidi) {
      const currentPos = Tone.Transport.seconds;
      Tone.Transport.cancel();
      scheduledEventsRef.current = [];
      synthsRef.current.forEach(s => { try { s?.dispose(); } catch (_) {} });
      synthsRef.current = [];
      schedulePlayback();
      if (!isLooping) {
        const remaining = duration - currentPos;
        if (remaining > 0) {
          const stopId = Tone.Transport.schedule(() => {
            Tone.Transport.stop();
            setIsPlaying(false);
            setPlayheadTime(0);
          }, duration + 0.1);
          scheduledEventsRef.current.push(stopId);
        }
      }
    }
  }, [trackMix, isPlaying, parsedMidi, schedulePlayback, isLooping, duration]);

  // Loop toggle
  useEffect(() => {
    if (isPlaying) {
      Tone.Transport.loop = isLooping;
      if (isLooping) {
        Tone.Transport.loopStart = 0;
        Tone.Transport.loopEnd = duration;
      }
    }
  }, [isLooping, isPlaying, duration]);

  // ---- playhead animation ----

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const tick = () => {
      setPlayheadTime(Tone.Transport.seconds);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  // ---- piano roll drawing ----

  useEffect(() => {
    if (!parsedMidi || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = pianoRollContainerRef.current;
    const containerWidth = container ? container.clientWidth : 800;

    const PIANO_KEY_WIDTH = 48;
    const ROW_HEIGHT = Math.max(6, Math.min(18, Math.floor(280 / noteRange)));
    const CANVAS_HEIGHT = noteRange * ROW_HEIGHT;
    const PIXELS_PER_SECOND = Math.max(80, Math.min(200, containerWidth / Math.max(duration, 1)));
    const CANVAS_WIDTH = Math.max(containerWidth, Math.ceil(duration * PIXELS_PER_SECOND) + PIANO_KEY_WIDTH + 20);

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid rows
    for (let i = 0; i <= noteRange; i++) {
      const y = i * ROW_HEIGHT;
      const noteNum = maxNote - i;
      const isBlackKey = [1, 3, 6, 8, 10].includes(noteNum % 12);

      // Alternating row backgrounds
      ctx.fillStyle = isBlackKey ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(PIANO_KEY_WIDTH, y, CANVAS_WIDTH - PIANO_KEY_WIDTH, ROW_HEIGHT);

      // Horizontal grid line
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PIANO_KEY_WIDTH, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();

      // C note highlight
      if (noteNum % 12 === 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(PIANO_KEY_WIDTH, y + ROW_HEIGHT);
        ctx.lineTo(CANVAS_WIDTH, y + ROW_HEIGHT);
        ctx.stroke();
      }
    }

    // Vertical grid lines (every beat)
    const beatsPerSecond = (baseBpmRef.current / 60);
    const beatPixels = PIXELS_PER_SECOND / beatsPerSecond;
    for (let x = PIANO_KEY_WIDTH; x < CANVAS_WIDTH; x += beatPixels) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Piano keys column
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, PIANO_KEY_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PIANO_KEY_WIDTH, 0);
    ctx.lineTo(PIANO_KEY_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();

    for (let i = 0; i < noteRange; i++) {
      const noteNum = maxNote - i;
      const y = i * ROW_HEIGHT;
      const name = midiNoteName(noteNum);
      const isC = noteNum % 12 === 0;

      ctx.fillStyle = isC ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)';
      ctx.font = `${Math.min(10, ROW_HEIGHT - 1)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, PIANO_KEY_WIDTH / 2, y + ROW_HEIGHT / 2);
    }

    // Draw notes
    tracks.forEach((track, ti) => {
      const color = TRACK_COLORS[ti % TRACK_COLORS.length];
      track.notes.forEach((note, ni) => {
        const noteId = `${ti}-${ni}`;
        const isDeleted = deletedNotes.has(noteId);
        const row = maxNote - note.midi;
        if (row < 0 || row >= noteRange) return;
        const x = PIANO_KEY_WIDTH + note.time * PIXELS_PER_SECOND;
        const w = Math.max(2, note.duration * PIXELS_PER_SECOND);
        const y = row * ROW_HEIGHT;

        if (isDeleted) {
          // Draw dimmed with strikethrough
          ctx.fillStyle = 'rgba(120,120,120,0.2)';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, y + 1, w, ROW_HEIGHT - 2);
          ctx.globalAlpha = 1;
          // Strikethrough line
          ctx.strokeStyle = 'rgba(239,68,68,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + ROW_HEIGHT / 2);
          ctx.lineTo(x + w, y + ROW_HEIGHT / 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.5 + note.velocity * 0.5;
          ctx.fillRect(x, y + 1, w, ROW_HEIGHT - 2);
          ctx.globalAlpha = 1;

          // Subtle border
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y + 1, w, ROW_HEIGHT - 2);
        }
      });
    });

    // Playhead
    const pxPos = PIANO_KEY_WIDTH + playheadTime * PIXELS_PER_SECOND;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(239,68,68,0.8)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(pxPos, 0);
    ctx.lineTo(pxPos, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Auto-scroll container to keep playhead visible
    if (container && isPlaying) {
      const scrollLeft = container.scrollLeft;
      const visibleRight = scrollLeft + containerWidth;
      if (pxPos > visibleRight - 60 || pxPos < scrollLeft + PIANO_KEY_WIDTH) {
        container.scrollLeft = Math.max(0, pxPos - containerWidth / 3);
      }
    }
  }, [parsedMidi, tracks, playheadTime, minNote, maxNote, noteRange, duration, isPlaying, deletedNotes]);

  // ---- canvas click handler for surgery mode ----

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!surgeryMode || !parsedMidi || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const container = pianoRollContainerRef.current;
    const containerWidth = container ? container.clientWidth : 800;
    const PIANO_KEY_WIDTH = 48;
    const ROW_HEIGHT = Math.max(6, Math.min(18, Math.floor(280 / noteRange)));
    const PIXELS_PER_SECOND = Math.max(80, Math.min(200, containerWidth / Math.max(duration, 1)));

    // Find which note was clicked
    for (let ti = 0; ti < tracks.length; ti++) {
      const track = tracks[ti];
      for (let ni = 0; ni < track.notes.length; ni++) {
        const note = track.notes[ni];
        const noteId = `${ti}-${ni}`;
        if (deletedNotes.has(noteId)) continue;
        const row = maxNote - note.midi;
        if (row < 0 || row >= noteRange) continue;
        const x = PIANO_KEY_WIDTH + note.time * PIXELS_PER_SECOND;
        const w = Math.max(2, note.duration * PIXELS_PER_SECOND);
        const y = row * ROW_HEIGHT;

        if (clickX >= x && clickX <= x + w && clickY >= y + 1 && clickY <= y + ROW_HEIGHT - 1) {
          setDeletedNotes(prev => {
            const next = new Set(prev);
            next.add(noteId);
            return next;
          });
          return;
        }
      }
    }
  }, [surgeryMode, parsedMidi, tracks, deletedNotes, maxNote, noteRange, duration]);

  // ---- export simplified MIDI (without deleted notes) ----

  const exportSimplified = useCallback(() => {
    if (!parsedMidi) return;
    const midi = new Midi();
    midi.header.setTempo(bpm);

    tracks.forEach((track, ti) => {
      const newTrack = midi.addTrack();
      newTrack.name = track.name;
      newTrack.channel = track.channel;
      track.notes.forEach((note, ni) => {
        const noteId = `${ti}-${ni}`;
        if (deletedNotes.has(noteId)) return;
        newTrack.addNote({
          midi: note.midi,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
        });
      });
    });

    const blob = new Blob([midi.toArray() as unknown as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groovelab-simplified.mid`;
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedMidi, tracks, deletedNotes, bpm]);

  // ---- track mixer ----

  const toggleMute = (index: number) => {
    setTrackMix(prev => prev.map((t, i) => i === index ? { ...t, muted: !t.muted } : t));
  };

  const toggleSolo = (index: number) => {
    setTrackMix(prev => prev.map((t, i) => i === index ? { ...t, solo: !t.solo } : t));
  };

  // ---- cleanup on unmount ----

  useEffect(() => {
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      synthsRef.current.forEach(s => { try { s?.dispose(); } catch (_) {} });
      if (drumSynthsRef.current) {
        Object.values(drumSynthsRef.current).forEach((s: any) => { try { s.dispose(); } catch (_) {} });
        drumSynthsRef.current = null;
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl flex items-center gap-2">
          <Cpu className="w-8 h-8 text-primary" /> MIDI Library
        </h2>
        <Button variant="outline" className="bg-card text-foreground border-border hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Upload .MID
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".mid,.midi" onChange={handleFileSelect} />
      </div>

      {/* Upload Zone */}
      {!uploadedFile && (
        <div
          className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 vinyl-texture cursor-pointer">
            <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <h3 className="font-serif text-xl mb-2 text-foreground">Drop MIDI files here</h3>
          <p className="text-sm text-muted-foreground mb-4">or click to browse from your device</p>
          <Badge variant="outline" className="font-mono text-xs">Supports Format 0 and 1 (.mid)</Badge>
        </div>
      )}

      {/* Uploaded File Player */}
      {uploadedFile && parsedMidi && (
        <Card className="border-primary/50 bg-card overflow-hidden">
          {/* Header with metadata */}
          <div className="bg-muted p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg text-foreground">{uploadedFile.name}</h3>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">
                  {Math.round(bpm)} BPM
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">{timeSigStr}</Badge>
                <Badge variant="outline" className="text-xs">
                  {tracks.length} Track{tracks.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatDuration(duration)}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
          </div>

          <CardContent className="p-0">
            {/* Piano Roll */}
            <div
              ref={pianoRollContainerRef}
              className="h-72 w-full bg-black/20 border-b border-border overflow-x-auto overflow-y-auto relative"
            >
              <canvas
                ref={canvasRef}
                className="block min-w-full"
                style={{ imageRendering: 'pixelated', cursor: surgeryMode ? 'crosshair' : 'default' }}
                onClick={handleCanvasClick}
              />
            </div>

            {/* Surgery Toolbar */}
            <div className="px-4 py-2 flex items-center gap-3 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <Scissors className={`w-4 h-4 ${surgeryMode ? 'text-red-400' : 'text-muted-foreground'}`} />
                <label className="text-xs font-mono text-muted-foreground uppercase" htmlFor="surgery-toggle">Surgery Mode</label>
                <Switch
                  id="surgery-toggle"
                  checked={surgeryMode}
                  onCheckedChange={setSurgeryMode}
                />
              </div>
              {deletedNotes.size > 0 && (
                <>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {deletedNotes.size} note{deletedNotes.size !== 1 ? 's' : ''} removed
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setDeletedNotes(new Set())}
                  >
                    <Undo2 className="w-3 h-3 mr-1" /> Undo All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={exportSimplified}
                  >
                    <Download className="w-3 h-3 mr-1" /> Export Simplified
                  </Button>
                </>
              )}
            </div>

            {/* Transport */}
            <div className="p-4 flex items-center justify-between bg-card flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 rounded-full border-border"
                  onClick={handleRestart}
                >
                  <SkipBack className="w-4 h-4 text-foreground" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className={`w-12 h-12 rounded-full ${isPlaying ? 'bg-coral hover:bg-coral/80 shadow-[0_0_10px_rgba(231,76,60,0.5)]' : 'bg-primary hover:bg-primary/90'}`}
                  onClick={handlePlay}
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 ml-1 text-white" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 rounded-full border-border"
                  onClick={handleStop}
                >
                  <Square className="w-4 h-4 text-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-full ml-2 ${isLooping ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                  onClick={() => setIsLooping(!isLooping)}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  {formatDuration(playheadTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3 w-64">
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {speed.toFixed(1)}x
                </span>
                <Slider
                  value={[speed]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="flex-1"
                  onValueChange={(v) => setSpeed(v[0])}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Track Mixer */}
      {uploadedFile && parsedMidi && tracks.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-serif text-lg mb-3">Track Mixer</h3>
            {tracks.map((track, i) => {
              const color = TRACK_COLORS[i % TRACK_COLORS.length];
              const mix = trackMix[i] || { muted: false, solo: false };
              const isDrum = track.channel === 9;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {track.name || `Track ${i + 1}`}
                      {isDrum && <span className="ml-1 text-xs text-muted-foreground">(Drums)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {track.notes.length} notes
                      {track.instrument && !isDrum && ` - ${track.instrument.name}`}
                    </span>
                  </div>
                  <Button
                    variant={mix.muted ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs px-2 h-7 ${mix.muted ? 'bg-red-500/80 hover:bg-red-500/60 text-white border-red-500' : 'border-border'}`}
                    onClick={() => toggleMute(i)}
                  >
                    {mix.muted ? <VolumeX className="w-3 h-3 mr-1" /> : <Volume2 className="w-3 h-3 mr-1" />}
                    {mix.muted ? 'M' : 'M'}
                  </Button>
                  <Button
                    variant={mix.solo ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs px-2 h-7 ${mix.solo ? 'bg-amber-500/80 hover:bg-amber-500/60 text-white border-amber-500' : 'border-border'}`}
                    onClick={() => toggleSolo(i)}
                  >
                    S
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Library Grid */}
      <div>
        <h3 className="font-serif text-2xl mb-4">Community Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border bg-card hover:border-primary/50 transition-colors cursor-pointer group vinyl-hover">
              <CardContent className="p-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                  <Cpu className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-lg truncate mb-2">Groove Pattern #{i + 1}</h4>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">{(100 + i * 5)} BPM</Badge>
                  <Badge variant="outline" className="font-mono text-xs">4/4</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border flex justify-between">
                  <span>2 Tracks</span>
                  <span>0:14</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
