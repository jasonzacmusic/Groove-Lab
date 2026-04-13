import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Cpu, Play, Pause, Square, SkipBack, RefreshCw, Volume2, VolumeX, Scissors, Undo2, Download, Music } from 'lucide-react';
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

// ---- Starter Patterns ----

interface StarterPattern {
  name: string;
  genre: string;
  bpm: number;
  timeSig: string;
  description: string;
}

const STARTER_PATTERNS: StarterPattern[] = [
  { name: 'Basic Rock Beat', genre: 'Rock', bpm: 120, timeSig: '4/4', description: 'Kick on 1&3, snare on 2&4, hihats on 8ths' },
  { name: 'Jazz Swing', genre: 'Jazz', bpm: 140, timeSig: '4/4', description: 'Ride cymbal swing pattern with kick feathering and hihat on 2&4' },
  { name: 'Bossa Nova', genre: 'Latin', bpm: 130, timeSig: '4/4', description: 'Classic bossa kick + cross-stick pattern with soft hihats' },
  { name: 'Shuffle Blues', genre: 'Blues', bpm: 100, timeSig: '12/8', description: 'Triplet shuffle hihats with walking kick and backbeat snare' },
  { name: 'Funk Groove', genre: 'Funk', bpm: 110, timeSig: '4/4', description: 'Syncopated 16th note hihats with ghost snares and open hats' },
  { name: 'Reggae One Drop', genre: 'Reggae', bpm: 76, timeSig: '4/4', description: 'No kick on 1, cross-stick on 2&4, kick+snare on 3' },
  { name: 'Afrobeat 12/8', genre: 'Afrobeat', bpm: 115, timeSig: '12/8', description: 'Tony Allen-style bell pattern with syncopated kick and snare' },
  { name: '5/4 Odd Meter', genre: 'Progressive', bpm: 174, timeSig: '5/4', description: 'Take Five-inspired ride pattern with kick on 1&4, snare on 3&5' },
  { name: 'Hip-Hop Boom Bap', genre: 'Hip-Hop', bpm: 90, timeSig: '4/4', description: 'Classic boom bap with punchy kick, snappy snare, and hihats' },
  { name: 'Disco', genre: 'Disco', bpm: 120, timeSig: '4/4', description: 'Four on the floor kick with open hihat on offbeats' },
  { name: 'Neo Soul', genre: 'Soul', bpm: 72, timeSig: '4/4', description: 'Laid-back groove with sparse hihats and ghosted snare' },
  { name: 'Gospel Shuffle', genre: 'Gospel', bpm: 108, timeSig: '12/8', description: 'Triplet shuffle with double kick on beat 3' },
];

function generateMidiPattern(pattern: StarterPattern): Midi {
  const midi = new Midi();
  midi.header.setTempo(pattern.bpm);
  const track = midi.addTrack();
  track.channel = 9; // drums

  const beat = 60 / pattern.bpm; // seconds per beat

  // GM drum map note numbers
  const KICK = 36, SNARE = 38, HIHAT = 42, HIHAT_OPEN = 46, RIDE = 51, CROSS = 37, COWBELL = 56;

  switch (pattern.name) {
    case 'Basic Rock Beat': {
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Kick on 1, 3
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: KICK, time: o + 2 * beat, duration: 0.1, velocity: 0.9 });
        // Snare on 2, 4
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.8 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.8 });
        // Hihats on 8ths
        for (let i = 0; i < 8; i++) {
          track.addNote({ midi: HIHAT, time: o + i * beat / 2, duration: 0.05, velocity: 0.6 });
        }
      }
      break;
    }
    case 'Jazz Swing': {
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        for (let b = 0; b < 4; b++) {
          const t = o + b * beat;
          // Ride on beat and swung "and" (triplet feel)
          track.addNote({ midi: RIDE, time: t, duration: 0.05, velocity: 0.7 });
          track.addNote({ midi: RIDE, time: t + beat * 2 / 3, duration: 0.05, velocity: 0.5 });
        }
        // Kick feathering on all 4 beats (soft)
        for (let b = 0; b < 4; b++) {
          track.addNote({ midi: KICK, time: o + b * beat, duration: 0.1, velocity: 0.3 });
        }
        // Snare comping on 4-and (swung)
        track.addNote({ midi: SNARE, time: o + 3 * beat + beat * 2 / 3, duration: 0.1, velocity: 0.45 });
        // Hihat foot on 2 and 4
        track.addNote({ midi: HIHAT, time: o + beat, duration: 0.05, velocity: 0.4 });
        track.addNote({ midi: HIHAT, time: o + 3 * beat, duration: 0.05, velocity: 0.4 });
      }
      break;
    }
    case 'Bossa Nova': {
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Cross-stick pattern: classic bossa rim pattern
        track.addNote({ midi: CROSS, time: o, duration: 0.05, velocity: 0.7 });
        track.addNote({ midi: CROSS, time: o + beat * 1.5, duration: 0.05, velocity: 0.6 });
        track.addNote({ midi: CROSS, time: o + 2 * beat, duration: 0.05, velocity: 0.5 });
        track.addNote({ midi: CROSS, time: o + beat * 3.5, duration: 0.05, velocity: 0.6 });
        // Kick: bossa bass drum pattern
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.8 });
        track.addNote({ midi: KICK, time: o + beat * 1.5, duration: 0.1, velocity: 0.6 });
        track.addNote({ midi: KICK, time: o + 3 * beat, duration: 0.1, velocity: 0.7 });
        // Hihats on 8ths, soft
        for (let i = 0; i < 8; i++) {
          track.addNote({ midi: HIHAT, time: o + i * beat / 2, duration: 0.04, velocity: 0.35 });
        }
      }
      break;
    }
    case 'Shuffle Blues': {
      // 12/8 feel: triplet subdivision, 4 bars
      const triplet = beat / 3;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        for (let b = 0; b < 4; b++) {
          const t = o + b * beat;
          // Hihats on triplets (shuffle = accent 1st and 3rd)
          track.addNote({ midi: HIHAT, time: t, duration: 0.04, velocity: 0.6 });
          track.addNote({ midi: HIHAT, time: t + triplet, duration: 0.04, velocity: 0.3 });
          track.addNote({ midi: HIHAT, time: t + 2 * triplet, duration: 0.04, velocity: 0.5 });
        }
        // Walking kick: 1, 2-and (triplet), 3, 4-and (triplet)
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: KICK, time: o + beat + 2 * triplet, duration: 0.1, velocity: 0.6 });
        track.addNote({ midi: KICK, time: o + 2 * beat, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: KICK, time: o + 3 * beat + 2 * triplet, duration: 0.1, velocity: 0.6 });
        // Snare on 2, 4
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.8 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.8 });
      }
      break;
    }
    case 'Funk Groove': {
      const sixteenth = beat / 4;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Hihats on 16ths with accents
        for (let i = 0; i < 16; i++) {
          const vel = (i % 2 === 0) ? 0.6 : 0.35;
          track.addNote({ midi: HIHAT, time: o + i * sixteenth, duration: 0.03, velocity: vel });
        }
        // Open hihat on the "and" of 2 and "and" of 4
        track.addNote({ midi: HIHAT_OPEN, time: o + beat + 2 * sixteenth, duration: 0.08, velocity: 0.65 });
        track.addNote({ midi: HIHAT_OPEN, time: o + 3 * beat + 2 * sixteenth, duration: 0.08, velocity: 0.65 });
        // Syncopated kick
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: KICK, time: o + beat * 0.75, duration: 0.1, velocity: 0.7 });
        track.addNote({ midi: KICK, time: o + 2 * beat + sixteenth, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: KICK, time: o + 3 * beat, duration: 0.1, velocity: 0.7 });
        // Snare on 2 and 4 with ghost notes
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.85 });
        // Ghost notes
        track.addNote({ midi: SNARE, time: o + beat * 0.5, duration: 0.05, velocity: 0.25 });
        track.addNote({ midi: SNARE, time: o + beat * 1.75, duration: 0.05, velocity: 0.2 });
        track.addNote({ midi: SNARE, time: o + beat * 2.5, duration: 0.05, velocity: 0.25 });
        track.addNote({ midi: SNARE, time: o + beat * 3.75, duration: 0.05, velocity: 0.2 });
      }
      break;
    }
    case 'Reggae One Drop': {
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // NO kick on beat 1 (the defining feature of one drop)
        // Kick and snare together on beat 3 (the "drop")
        track.addNote({ midi: KICK, time: o + 2 * beat, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: SNARE, time: o + 2 * beat, duration: 0.1, velocity: 0.8 });
        // Cross-stick on 2 and 4
        track.addNote({ midi: CROSS, time: o + beat, duration: 0.05, velocity: 0.7 });
        track.addNote({ midi: CROSS, time: o + 3 * beat, duration: 0.05, velocity: 0.7 });
        // Hihats on 8ths
        for (let i = 0; i < 8; i++) {
          track.addNote({ midi: HIHAT, time: o + i * beat / 2, duration: 0.04, velocity: 0.5 });
        }
      }
      break;
    }
    case 'Afrobeat 12/8': {
      // 12/8 feel with bell pattern (Tony Allen style)
      const triplet = beat / 3;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Bell pattern (standard 12/8 timeline): x.x.xx.x.x.x
        const bellPattern = [0, 2, 4, 5, 7, 9, 10];
        bellPattern.forEach(pos => {
          track.addNote({ midi: COWBELL, time: o + pos * triplet, duration: 0.04, velocity: 0.7 });
        });
        // Kick pattern - syncopated Tony Allen style
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: KICK, time: o + 3 * triplet, duration: 0.1, velocity: 0.6 });
        track.addNote({ midi: KICK, time: o + 6 * triplet, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: KICK, time: o + 10 * triplet, duration: 0.1, velocity: 0.6 });
        // Snare on beats 2 and 4
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.75 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.75 });
        // Hihats on triplets, soft
        for (let i = 0; i < 12; i++) {
          track.addNote({ midi: HIHAT, time: o + i * triplet, duration: 0.03, velocity: 0.3 });
        }
      }
      break;
    }
    case '5/4 Odd Meter': {
      // 5/4 time, 4 bars - Take Five inspired
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 5 * beat;
        // Ride on all 5 beats plus "and" of each
        for (let b = 0; b < 5; b++) {
          track.addNote({ midi: RIDE, time: o + b * beat, duration: 0.05, velocity: 0.65 });
          track.addNote({ midi: RIDE, time: o + b * beat + beat / 2, duration: 0.05, velocity: 0.45 });
        }
        // Kick on 1 and 5
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: KICK, time: o + 4 * beat, duration: 0.1, velocity: 0.75 });
        // Snare on 3
        track.addNote({ midi: SNARE, time: o + 2 * beat, duration: 0.1, velocity: 0.75 });
        // Hihat foot on 2 and 4
        track.addNote({ midi: HIHAT, time: o + beat, duration: 0.04, velocity: 0.4 });
        track.addNote({ midi: HIHAT, time: o + 3 * beat, duration: 0.04, velocity: 0.4 });
      }
      break;
    }
    case 'Hip-Hop Boom Bap': {
      const sixteenth = beat / 4;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Kick pattern: beat 1, "and" of 2, beat 3, "and" of 3
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.95 });
        track.addNote({ midi: KICK, time: o + 2 * beat, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: KICK, time: o + 2 * beat + 2 * sixteenth, duration: 0.1, velocity: 0.7 });
        // Snare on 2 and 4
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.85 });
        // Hihats on 8ths
        for (let i = 0; i < 8; i++) {
          track.addNote({ midi: HIHAT, time: o + i * beat / 2, duration: 0.04, velocity: i % 2 === 0 ? 0.6 : 0.45 });
        }
      }
      break;
    }
    case 'Disco': {
      const sixteenth = beat / 4;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Four on the floor kick
        for (let b = 0; b < 4; b++) {
          track.addNote({ midi: KICK, time: o + b * beat, duration: 0.1, velocity: 0.9 });
        }
        // Snare on 2 and 4
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.8 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.8 });
        // Open hihat on offbeats, closed on beats
        for (let b = 0; b < 4; b++) {
          track.addNote({ midi: HIHAT, time: o + b * beat, duration: 0.04, velocity: 0.55 });
          track.addNote({ midi: HIHAT_OPEN, time: o + b * beat + beat / 2, duration: 0.08, velocity: 0.65 });
        }
      }
      break;
    }
    case 'Neo Soul': {
      const sixteenth = beat / 4;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        // Sparse, laid-back kick
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.8 });
        track.addNote({ midi: KICK, time: o + beat + 3 * sixteenth, duration: 0.1, velocity: 0.6 });
        // Snare on 2 and 4 (soft, ghosted feel)
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.5 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.5 });
        // Ghost snare notes
        track.addNote({ midi: SNARE, time: o + 2 * beat + 2 * sixteenth, duration: 0.05, velocity: 0.2 });
        // Hihats sparse, on some 8ths
        track.addNote({ midi: HIHAT, time: o + beat / 2, duration: 0.04, velocity: 0.4 });
        track.addNote({ midi: HIHAT, time: o + beat + beat / 2, duration: 0.04, velocity: 0.4 });
        track.addNote({ midi: HIHAT, time: o + 2 * beat + beat / 2, duration: 0.04, velocity: 0.35 });
        track.addNote({ midi: HIHAT, time: o + 3 * beat + beat / 2, duration: 0.04, velocity: 0.35 });
      }
      break;
    }
    case 'Gospel Shuffle': {
      // Triplet shuffle with double kick on beat 3
      const triplet = beat / 3;
      for (let bar = 0; bar < 4; bar++) {
        const o = bar * 4 * beat;
        for (let b = 0; b < 4; b++) {
          const t = o + b * beat;
          // Hihat shuffle: hit on 1st and 3rd triplet
          track.addNote({ midi: HIHAT, time: t, duration: 0.04, velocity: 0.6 });
          track.addNote({ midi: HIHAT, time: t + 2 * triplet, duration: 0.04, velocity: 0.5 });
        }
        // Kick on 1 and 3, double kick on 3
        track.addNote({ midi: KICK, time: o, duration: 0.1, velocity: 0.9 });
        track.addNote({ midi: KICK, time: o + 2 * beat, duration: 0.1, velocity: 0.85 });
        track.addNote({ midi: KICK, time: o + 2 * beat + triplet, duration: 0.1, velocity: 0.7 });
        // Snare on 2 and 4
        track.addNote({ midi: SNARE, time: o + beat, duration: 0.1, velocity: 0.8 });
        track.addNote({ midi: SNARE, time: o + 3 * beat, duration: 0.1, velocity: 0.8 });
      }
      break;
    }
  }

  return midi;
}

function downloadMidi(pattern: StarterPattern) {
  const midi = generateMidiPattern(pattern);
  const blob = new Blob([midi.toArray() as unknown as BlobPart], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `groovelab-${pattern.name.toLowerCase().replace(/\s+/g, '-')}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}

const GENRE_COLORS: Record<string, string> = {
  Rock: 'bg-red-500/15 text-red-400 border-red-500/30',
  Jazz: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Latin: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Blues: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  Funk: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Reggae: 'bg-green-500/15 text-green-400 border-green-500/30',
  Afrobeat: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Progressive: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Hip-Hop': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Disco: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  Soul: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  Gospel: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
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

    const blob = new Blob([midi.toArray() as unknown as BlobPart], { type: 'audio/midi' });
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
              <h3 className="font-serif font-medium text-lg text-foreground">{uploadedFile.name}</h3>
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

      {/* Starter Patterns */}
      <div>
        <h3 className="font-serif text-2xl mb-2">Starter Patterns</h3>
        <p className="text-sm text-muted-foreground mb-4">Real MIDI drum patterns you can download or load into the editor above.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {STARTER_PATTERNS.map((pat, i) => (
            <Card key={i} className="overflow-hidden border-border bg-card hover:border-primary/50 transition-colors group">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                  <Music className="w-5 h-5" />
                </div>
                <h4 className="font-medium text-lg mb-2">{pat.name}</h4>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Badge variant="outline" className={`text-xs border ${GENRE_COLORS[pat.genre] || ''}`}>{pat.genre}</Badge>
                  <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">{pat.bpm} BPM</Badge>
                  <Badge variant="outline" className="font-mono text-xs">{pat.timeSig}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4 flex-1">{pat.description}</p>
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => {
                      const midi = generateMidiPattern(pat);
                      setParsedMidi(midi);
                      setUploadedFile(new File([midi.toArray() as unknown as BlobPart], `${pat.name}.mid`, { type: 'audio/midi' }));
                      setTrackMix(midi.tracks.map(() => ({ muted: false, solo: false })));
                      setPlayheadTime(0);
                      setDeletedNotes(new Set());
                      baseBpmRef.current = pat.bpm;
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <Play className="w-3 h-3 mr-1" /> Load in Editor
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2"
                    onClick={() => downloadMidi(pat)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
