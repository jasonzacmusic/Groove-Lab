import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { usePracticeTracker } from '@/hooks/use-practice-tracker';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Timer,
  TrendingUp,
  Music2,
  Zap,
  Settings2,
} from 'lucide-react';

// --- Types ---
type AccentLevel = 'f' | 'mf' | 'p' | 'mute';
type BeatSound = 'click' | 'woodblock' | 'rimshot' | 'cowbell' | 'clave';
type Subdivision = 'none' | '8th' | '16th' | 'triplet' | 'quintuplet' | 'septuplet';

const ACCENT_CYCLE: AccentLevel[] = ['f', 'mf', 'p', 'mute'];
const ACCENT_LABELS: Record<AccentLevel, string> = { f: 'F', mf: 'MF', p: 'P', mute: '--' };
const ACCENT_VOLUME: Record<AccentLevel, number> = { f: 0, mf: -8, p: -16, mute: -Infinity };

const SOUND_FREQS: Record<BeatSound, { accent: number; normal: number; sub: number }> = {
  click:     { accent: 1000, normal: 800, sub: 600 },
  woodblock: { accent: 900,  normal: 700, sub: 500 },
  rimshot:   { accent: 1100, normal: 850, sub: 650 },
  cowbell:   { accent: 800,  normal: 650, sub: 480 },
  clave:     { accent: 2500, normal: 2000, sub: 1500 },
};

const SOUND_ENVELOPES: Record<BeatSound, Partial<Tone.EnvelopeOptions>> = {
  click:     { attack: 0.001, decay: 0.05,  sustain: 0, release: 0.05 },
  woodblock: { attack: 0.001, decay: 0.08,  sustain: 0, release: 0.06 },
  rimshot:   { attack: 0.001, decay: 0.04,  sustain: 0, release: 0.03 },
  cowbell:   { attack: 0.001, decay: 0.15,  sustain: 0.02, release: 0.1 },
  clave:     { attack: 0.001, decay: 0.03,  sustain: 0, release: 0.02 },
};

const SUBDIVISION_COUNTS: Record<Subdivision, number> = {
  none: 1, '8th': 2, '16th': 4, triplet: 3, quintuplet: 5, septuplet: 7,
};

const TEMPO_PRESETS = [
  { label: 'Largo', bpm: 50 },
  { label: 'Adagio', bpm: 72 },
  { label: 'Andante', bpm: 92 },
  { label: 'Moderato', bpm: 108 },
  { label: 'Allegro', bpm: 132 },
  { label: 'Vivace', bpm: 168 },
  { label: 'Presto', bpm: 190 },
];

const METRONOME_PRESETS = [
  { name: 'Basic 4/4', bpm: 120, timeSig: [4, 4] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','mf','mf','mf'] as AccentLevel[] },
  { name: 'Waltz 3/4', bpm: 108, timeSig: [3, 4] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','p','p'] as AccentLevel[] },
  { name: 'Jazz Swing', bpm: 140, timeSig: [4, 4] as [number, number], subdivision: 'triplet' as Subdivision, swing: 40, accents: ['f','mf','mf','mf'] as AccentLevel[] },
  { name: 'March 2/4', bpm: 120, timeSig: [2, 4] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','mf'] as AccentLevel[] },
  { name: '6/8 Compound', bpm: 80, timeSig: [6, 8] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','p','p','mf','p','p'] as AccentLevel[] },
  { name: '5/4 Odd Meter', bpm: 160, timeSig: [5, 4] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','mf','mf','mf','mf'] as AccentLevel[] },
  { name: '7/8 Balkan', bpm: 140, timeSig: [7, 8] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','mf','mf','mf','p','mf','p'] as AccentLevel[] },
  { name: 'Blues Shuffle', bpm: 100, timeSig: [4, 4] as [number, number], subdivision: 'triplet' as Subdivision, swing: 60, accents: ['f','mf','mf','mf'] as AccentLevel[] },
  { name: 'Bossa 2-feel', bpm: 130, timeSig: [4, 4] as [number, number], subdivision: '8th' as Subdivision, swing: 0, accents: ['f','p','mf','p'] as AccentLevel[] },
  { name: 'Fast Bebop', bpm: 220, timeSig: [4, 4] as [number, number], subdivision: 'none' as Subdivision, swing: 30, accents: ['f','p','mf','p'] as AccentLevel[] },
  { name: '12/8 Slow Blues', bpm: 60, timeSig: [12, 8] as [number, number], subdivision: 'none' as Subdivision, swing: 0, accents: ['f','p','p','mf','p','p','mf','p','p','mf','p','p'] as AccentLevel[] },
  { name: 'Samba', bpm: 100, timeSig: [2, 4] as [number, number], subdivision: '16th' as Subdivision, swing: 0, accents: ['f','mf'] as AccentLevel[] },
];

function buildAccents(numerator: number): AccentLevel[] {
  return Array.from({ length: numerator }, (_, i) => (i === 0 ? 'f' : 'mf'));
}

// ---------- Pendulum Component ----------

interface PendulumProps {
  bpm: number;
  isPlaying: boolean;
}

function PendulumVisual({ bpm, isPlaying }: PendulumProps) {
  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) { setAngle(0); return; }
    startTimeRef.current = performance.now();
    const beatDuration = 60000 / bpm; // ms per beat

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const phase = (elapsed % (beatDuration * 2)) / (beatDuration * 2);
      const swing = Math.sin(phase * Math.PI * 2) * 30;
      setAngle(swing);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, bpm]);

  return (
    <svg width="120" height="200" viewBox="0 0 120 200" className="mx-auto">
      <circle cx="60" cy="20" r="6" fill="hsl(38 76% 54%)" />
      <line
        x1="60" y1="20"
        x2={60 + Math.sin(angle * Math.PI / 180) * 140}
        y2={20 + Math.cos(angle * Math.PI / 180) * 140}
        stroke="hsl(38 76% 54% / 0.6)" strokeWidth="2"
      />
      <circle
        cx={60 + Math.sin(angle * Math.PI / 180) * 140}
        cy={20 + Math.cos(angle * Math.PI / 180) * 140}
        r="10" fill="hsl(38 76% 54%)"
      />
    </svg>
  );
}

export default function Metronome() {
  usePracticeTracker('metronome');
  // --- Core state ---
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSignature, setTimeSignature] = useState({ numerator: 4, denominator: 4 });
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatSound, setBeatSound] = useState<BeatSound>('click');
  const [accents, setAccents] = useState<AccentLevel[]>(buildAccents(4));
  const [subdivision, setSubdivision] = useState<Subdivision>('none');
  const [swing, setSwing] = useState(0);

  // --- Ramp state ---
  const [isRamping, setIsRamping] = useState(false);
  const [rampStartBpm, setRampStartBpm] = useState(80);
  const [rampEndBpm, setRampEndBpm] = useState(160);
  const [rampDurationBars, setRampDurationBars] = useState(8);
  const [rampLooping, setRampLooping] = useState(false);
  const [rampProgress, setRampProgress] = useState<{ bar: number; currentBpm: number } | null>(null);

  // --- Trainer state ---
  const [trainerPlay, setTrainerPlay] = useState(2);
  const [trainerMute, setTrainerMute] = useState(2);
  const [isTrainerMode, setIsTrainerMode] = useState(false);
  const [trainerPhase, setTrainerPhase] = useState<'playing' | 'muted'>('playing');

  // --- Bar counter ---
  const [barCount, setBarCount] = useState(0);

  // --- Practice timer ---
  const [practiceSeconds, setPracticeSeconds] = useState(0);
  const [targetMinutes, setTargetMinutes] = useState(5);

  // --- Pendulum state ---
  const [pendulumMode, setPendulumMode] = useState(false);

  // --- UI state ---
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [toneStarted, setToneStarted] = useState(false);

  // --- Refs ---
  const synthRef = useRef<Tone.Synth | null>(null);
  const scheduleIdRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const barCountRef = useRef(0);
  const trainerMutedRef = useRef(false);
  const rampIntervalRef = useRef<number | null>(null);
  const practiceIntervalRef = useRef<number | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const accentsRef = useRef(accents);
  const subdivisionRef = useRef(subdivision);
  const swingRef = useRef(swing);
  const beatSoundRef = useRef(beatSound);
  const timeSignatureRef = useRef(timeSignature);
  const bpmRef = useRef(bpm);
  const isTrainerModeRef = useRef(isTrainerMode);
  const trainerPlayRef = useRef(trainerPlay);
  const trainerMuteRef = useRef(trainerMute);
  const rampLoopingRef = useRef(rampLooping);
  const isRampingRef = useRef(isRamping);

  // Keep refs in sync
  useEffect(() => { accentsRef.current = accents; }, [accents]);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { beatSoundRef.current = beatSound; }, [beatSound]);
  useEffect(() => { timeSignatureRef.current = timeSignature; }, [timeSignature]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { isTrainerModeRef.current = isTrainerMode; }, [isTrainerMode]);
  useEffect(() => { trainerPlayRef.current = trainerPlay; }, [trainerPlay]);
  useEffect(() => { trainerMuteRef.current = trainerMute; }, [trainerMute]);
  useEffect(() => { rampLoopingRef.current = rampLooping; }, [rampLooping]);
  useEffect(() => { isRampingRef.current = isRamping; }, [isRamping]);

  // Sync accents when numerator changes
  useEffect(() => {
    setAccents((prev) => {
      const n = timeSignature.numerator;
      if (prev.length === n) return prev;
      const next = buildAccents(n);
      for (let i = 0; i < Math.min(prev.length, n); i++) {
        next[i] = prev[i];
      }
      if (next[0] !== 'f' && next[0] !== 'mute') next[0] = 'f';
      return next;
    });
  }, [timeSignature.numerator]);

  // --- Pre-create synth pool for instant playback ---
  const ensureSynth = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.dispose();
    }
    const env = SOUND_ENVELOPES[beatSoundRef.current];
    synthRef.current = new Tone.Synth({
      oscillator: { type: beatSoundRef.current === 'cowbell' ? 'square' : 'sine' },
      envelope: env as any,
    }).toDestination();
    // Warm up the synth with a silent trigger to avoid first-note latency
    synthRef.current.triggerAttackRelease(1, '128n', Tone.now(), 0);
  }, []);

  // Pre-init synth on first Tone.start so it's ready instantly
  useEffect(() => {
    if (toneStarted && !synthRef.current) {
      ensureSynth();
    }
  }, [toneStarted, ensureSynth]);

  // --- Play a click ---
  const playClick = useCallback(
    (time: number, freq: number, vol: number) => {
      if (!synthRef.current || vol === -Infinity) return;
      try {
        synthRef.current.triggerAttackRelease(freq, '32n', time, Tone.dbToGain(vol));
      } catch {
        // Ignore errors from rapid triggers
      }
    },
    []
  );

  // --- Schedule the main loop ---
  const scheduleLoop = useCallback(() => {
    const subCount = SUBDIVISION_COUNTS[subdivisionRef.current];

    const id = Tone.getTransport().scheduleRepeat((time) => {
      const beat = beatRef.current;
      const ts = timeSignatureRef.current;
      const accs = accentsRef.current;
      const sound = beatSoundRef.current;
      const freqs = SOUND_FREQS[sound];
      const sw = swingRef.current;

      // Trainer logic
      let muted = false;
      if (isTrainerModeRef.current) {
        const totalCycle = trainerPlayRef.current + trainerMuteRef.current;
        const barInCycle = barCountRef.current % totalCycle;
        muted = barInCycle >= trainerPlayRef.current;
        trainerMutedRef.current = muted;
        if (beat === 0) {
          const phase = muted ? 'muted' as const : 'playing' as const;
          Tone.Draw.schedule(() => {
            setTrainerPhase(phase);
          }, time);
        }
      }

      // Main beat
      const accentLevel = accs[beat] ?? 'mf';
      const isAccent = beat === 0;
      const freq = isAccent ? freqs.accent : freqs.normal;
      const vol = ACCENT_VOLUME[accentLevel];
      if (!muted) {
        playClick(time, freq, vol);
      }

      // Subdivisions
      if (subCount > 1 && !muted) {
        const beatDuration = 60 / bpmRef.current;
        for (let s = 1; s < subCount; s++) {
          let offset = (beatDuration / subCount) * s;
          // Apply swing to even subdivisions
          if (sw !== 0 && s % 2 === 1 && subCount === 2) {
            offset += (sw / 100) * (beatDuration / 6);
          }
          playClick(time + offset, freqs.sub, vol - 6);
        }
      }

      // Update visual beat
      setCurrentBeat(beat);

      // Advance
      beatRef.current = (beat + 1) % ts.numerator;
      if (beatRef.current === 0) {
        barCountRef.current++;
        const bc = barCountRef.current;
        Tone.Draw.schedule(() => {
          setBarCount(bc);
        }, time);
      }
    }, `${timeSignatureRef.current.denominator}n`);

    scheduleIdRef.current = id;
  }, [playClick]);

  // --- Ramp cycle helper ---
  const startRampCycle = useCallback((transport: ReturnType<typeof Tone.getTransport>, startBpm: number, endBpm: number, durationBars: number, numerator: number) => {
    const totalBeats = durationBars * numerator;
    const beatDuration = 60 / startBpm;
    const totalTime = totalBeats * beatDuration;
    transport.bpm.value = startBpm;
    setBpm(startBpm);
    transport.bpm.rampTo(endBpm, totalTime);
    setRampProgress({ bar: 1, currentBpm: startBpm });

    const startTime = Date.now();
    if (rampIntervalRef.current) clearInterval(rampIntervalRef.current);
    rampIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / totalTime, 1);
      const currentBpmVal = startBpm + (endBpm - startBpm) * progress;
      const currentBar = Math.min(Math.floor(progress * durationBars) + 1, durationBars);
      setBpm(Math.round(currentBpmVal));
      setRampProgress({ bar: currentBar, currentBpm: Math.round(currentBpmVal) });
      if (progress >= 1) {
        if (rampIntervalRef.current) clearInterval(rampIntervalRef.current);
        if (rampLoopingRef.current) {
          // Restart
          startRampCycle(transport, startBpm, endBpm, durationBars, numerator);
        } else {
          setBpm(endBpm);
          setIsRamping(false);
          setRampProgress(null);
        }
      }
    }, 200);
  }, []);

  // Pre-initialize Tone.js on first click anywhere on the page
  useEffect(() => {
    const initTone = () => {
      if (!toneStarted) {
        Tone.start().then(() => {
          setToneStarted(true);
          ensureSynth();
          Tone.getContext().lookAhead = 0.01; // minimal latency
        });
      }
      document.removeEventListener('click', initTone);
      document.removeEventListener('keydown', initTone);
    };
    document.addEventListener('click', initTone);
    document.addEventListener('keydown', initTone);
    return () => {
      document.removeEventListener('click', initTone);
      document.removeEventListener('keydown', initTone);
    };
  }, [toneStarted, ensureSynth]);

  // --- Start / Stop ---
  const startMetronome = useCallback(async () => {
    if (!toneStarted) {
      await Tone.start();
      setToneStarted(true);
    }
    ensureSynth();
    beatRef.current = 0;
    barCountRef.current = 0;
    trainerMutedRef.current = false;
    setCurrentBeat(-1);

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    transport.timeSignature = timeSignature.numerator;
    transport.cancel();
    transport.position = 0;

    scheduleLoop();

    // Start with minimal lookahead for instant playback
    Tone.getContext().lookAhead = 0.01;
    transport.start('+0.01');
    setIsPlaying(true);
    setPracticeSeconds(0);

    // Practice timer
    practiceIntervalRef.current = window.setInterval(() => {
      setPracticeSeconds((s) => s + 1);
    }, 1000);

    // Ramp logic
    if (isRampingRef.current) {
      startRampCycle(transport, rampStartBpm, rampEndBpm, rampDurationBars, timeSignature.numerator);
    }
  }, [bpm, toneStarted, ensureSynth, scheduleLoop, timeSignature, rampStartBpm, rampEndBpm, rampDurationBars, startRampCycle]);

  const stopMetronome = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    if (scheduleIdRef.current !== null) {
      scheduleIdRef.current = null;
    }
    if (practiceIntervalRef.current) {
      clearInterval(practiceIntervalRef.current);
      practiceIntervalRef.current = null;
    }
    if (rampIntervalRef.current) {
      clearInterval(rampIntervalRef.current);
      rampIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
    setBarCount(0);
    setRampProgress(null);
    setTrainerPhase('playing');
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  }, [isPlaying, startMetronome, stopMetronome]);

  // Update transport BPM live
  useEffect(() => {
    if (isPlaying && !isRamping) {
      Tone.getTransport().bpm.value = bpm;
    }
  }, [bpm, isPlaying, isRamping]);

  // Reschedule when subdivision or time signature changes while playing
  useEffect(() => {
    if (isPlaying) {
      const transport = Tone.getTransport();
      transport.cancel();
      beatRef.current = 0;
      barCountRef.current = 0;
      transport.timeSignature = timeSignature.numerator;
      scheduleLoop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdivision, timeSignature.numerator, timeSignature.denominator]);

  // Recreate synth when sound changes
  useEffect(() => {
    if (isPlaying) {
      ensureSynth();
    }
  }, [beatSound, isPlaying, ensureSynth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      if (synthRef.current) synthRef.current.dispose();
      if (practiceIntervalRef.current) clearInterval(practiceIntervalRef.current);
      if (rampIntervalRef.current) clearInterval(rampIntervalRef.current);
    };
  }, []);

  // --- Tap tempo ---
  const [tapInfo, setTapInfo] = useState<{ count: number; avgBpm: number | null }>({ count: 0, avgBpm: null });
  const [tapSoundOn, setTapSoundOn] = useState(false); // OFF by default
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ZERO LATENCY tap tempo — pure performance.now(), no audio by default
  const handleTapTempo = useCallback(() => {
    // Record the tap FIRST — before any audio processing
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Reset after 2.5s gap
    if (taps.length > 0 && now - taps[taps.length - 1] > 2500) {
      tapTimesRef.current = [now];
      setTapInfo({ count: 1, avgBpm: null });
      // Optional click AFTER recording (non-blocking)
      if (tapSoundOn && synthRef.current) {
        try { synthRef.current.triggerAttackRelease(SOUND_FREQS[beatSoundRef.current].accent, '32n', Tone.now(), 0.3); } catch {}
      }
      return;
    }

    taps.push(now);
    if (taps.length > 12) taps.shift();

    // Auto-clear after 3s
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    tapResetTimerRef.current = setTimeout(() => setTapInfo({ count: 0, avgBpm: null }), 3000);

    // Optional click sound AFTER recording tap time
    if (tapSoundOn && synthRef.current) {
      try { synthRef.current.triggerAttackRelease(SOUND_FREQS[beatSoundRef.current].accent, '32n', Tone.now(), 0.3); } catch {}
    }

    // Init Tone in background only if needed (for when user starts metronome later)
    if (!toneStarted) {
      Tone.start().then(() => { setToneStarted(true); ensureSynth(); });
    }

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tapBpm = Math.round(60000 / avg);
      if (tapBpm >= 20 && tapBpm <= 300) {
        // IMMEDIATELY set the BPM — the average IS the decision
        setBpm(tapBpm);
        setTapInfo({ count: taps.length, avgBpm: tapBpm });
        // If playing, update transport BPM in real-time
        if (isPlaying && !isRamping) {
          Tone.getTransport().bpm.value = tapBpm;
        }
      }
    } else {
      setTapInfo({ count: 1, avgBpm: null });
    }
  }, [toneStarted, ensureSynth, isPlaying, isRamping, tapSoundOn]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (document.activeElement?.tagName === 'IFRAME') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setBpm((b) => Math.min(300, b + 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setBpm((b) => Math.max(20, b - 1));
      } else if (e.key === 't' || e.key === 'T') {
        handleTapTempo();
      } else if (e.key === 'r' || e.key === 'R') {
        setSwing(0);
      } else if (e.code === 'Escape') {
        stopMetronome();
      } else if (e.key === '[') {
        e.preventDefault();
        setBpm((b) => Math.max(20, b - 5));
      } else if (e.key === ']') {
        e.preventDefault();
        setBpm((b) => Math.min(300, b + 5));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, handleTapTempo, stopMetronome]);

  // --- Accent cycling ---
  const cycleAccent = useCallback((index: number) => {
    setAccents((prev) => {
      const next = [...prev];
      const curr = next[index];
      const idx = ACCENT_CYCLE.indexOf(curr);
      next[index] = ACCENT_CYCLE[(idx + 1) % ACCENT_CYCLE.length];
      return next;
    });
  }, []);

  // --- BPM helpers ---
  const adjustBpm = useCallback((delta: number) => {
    setBpm((b) => {
      const next = Math.round((b + delta) * 10) / 10;
      return Math.max(20, Math.min(300, next));
    });
  }, []);

  // --- Load metronome preset ---
  const loadPreset = useCallback((preset: typeof METRONOME_PRESETS[0]) => {
    if (isPlaying) stopMetronome();
    setBpm(preset.bpm);
    setTimeSignature({ numerator: preset.timeSig[0], denominator: preset.timeSig[1] });
    setSubdivision(preset.subdivision);
    setSwing(preset.swing);
    setAccents(preset.accents);
  }, [isPlaying, stopMetronome]);

  // --- Format time ---
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- Tempo marking ---
  const getTempoMarking = (b: number) => {
    if (b < 40) return 'Grave';
    if (b < 55) return 'Largo';
    if (b < 65) return 'Larghetto';
    if (b < 73) return 'Adagio';
    if (b < 85) return 'Andante';
    if (b < 98) return 'Moderato';
    if (b < 109) return 'Andante moderato';
    if (b < 120) return 'Allegretto';
    if (b < 156) return 'Allegro';
    if (b < 176) return 'Vivace';
    if (b < 200) return 'Presto';
    return 'Prestissimo';
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="font-serif text-3xl md:text-4xl flex items-center justify-center gap-2">
          <Music2 className="w-7 h-7 text-primary" /> Pro Metronome
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Precision practice tool
        </p>
        {/* Metronome Presets */}
        <div className="mt-3">
          <Select onValueChange={(v) => loadPreset(METRONOME_PRESETS[Number(v)])}>
            <SelectTrigger className="w-56 mx-auto font-mono text-xs">
              <SelectValue placeholder="Load Preset..." />
            </SelectTrigger>
            <SelectContent>
              {METRONOME_PRESETS.map((p, i) => (
                <SelectItem key={p.name} value={String(i)}>
                  {p.name} ({p.bpm} BPM)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ====== BPM DISPLAY ====== */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              {getTempoMarking(bpm)}
            </p>
            <div className="flex items-center justify-center gap-3">
              {/* Decrement buttons: -10, -5, -3, -1 */}
              <div className="flex flex-col gap-1">
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="sm" className="h-7 w-8 text-[10px] font-mono text-muted-foreground" onClick={() => adjustBpm(-10)}>-10</Button>
                  <Button variant="ghost" size="sm" className="h-7 w-8 text-[10px] font-mono text-muted-foreground" onClick={() => adjustBpm(-5)}>-5</Button>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="outline" size="sm" className="h-8 w-8 text-xs font-mono" onClick={() => adjustBpm(-3)}>-3</Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 text-xs font-mono" onClick={() => adjustBpm(-1)}>-1</Button>
                </div>
              </div>

              {/* Large BPM — click to type */}
              <div>
                <input
                  type="number"
                  value={Math.round(bpm)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 20 && v <= 300) setBpm(v);
                  }}
                  className="font-mono text-7xl md:text-8xl font-bold text-primary tabular-nums leading-none bg-transparent text-center w-48 border-none outline-none focus:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={20}
                  max={300}
                />
                <p className="text-xs text-muted-foreground mt-1 font-mono">BPM (click to type)</p>
              </div>

              {/* +1 / +0.1 buttons */}
              {/* Increment buttons: +1, +3, +5, +10 */}
              <div className="flex flex-col gap-1">
                <div className="flex gap-0.5">
                  <Button variant="outline" size="sm" className="h-8 w-8 text-xs font-mono" onClick={() => adjustBpm(1)}>+1</Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 text-xs font-mono" onClick={() => adjustBpm(3)}>+3</Button>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="sm" className="h-7 w-8 text-[10px] font-mono text-muted-foreground" onClick={() => adjustBpm(5)}>+5</Button>
                  <Button variant="ghost" size="sm" className="h-7 w-8 text-[10px] font-mono text-muted-foreground" onClick={() => adjustBpm(10)}>+10</Button>
                </div>
              </div>
            </div>

            {/* BPM Slider */}
            <div className="mt-4 px-4">
              <Slider
                value={[bpm]}
                min={20}
                max={300}
                step={1}
                onValueChange={([v]) => setBpm(v)}
              />
            </div>

            {/* Tap Tempo */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                className="font-mono text-sm tracking-wide border-primary/40 hover:bg-primary/10 px-6"
                onClick={handleTapTempo}
              >
                TAP TEMPO {tapInfo.count > 0 && <span className="ml-1 opacity-70">({tapInfo.count}{tapInfo.avgBpm ? ` = ${tapInfo.avgBpm}` : ''})</span>}
              </Button>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="tap-sound"
                  checked={tapSoundOn}
                  onCheckedChange={setTapSoundOn}
                  className="scale-75"
                />
                <label htmlFor="tap-sound" className="text-[10px] text-muted-foreground cursor-pointer">
                  Sound
                </label>
              </div>
            </div>
            {tapInfo.count >= 2 && tapInfo.avgBpm && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Average of {tapInfo.count} taps: {tapInfo.avgBpm} BPM
              </p>
            )}

            {/* Tempo Presets */}
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {TEMPO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setBpm(p.bpm)}
                  className={`
                    px-2.5 py-1 rounded-full text-[10px] font-mono font-medium transition-colors
                    ${Math.abs(bpm - p.bpm) < 5
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  {p.label} {p.bpm}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== BEAT INDICATORS ====== */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {accents.map((acc, i) => {
              const isActive = currentBeat === i;
              const isBeatOne = i === 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`
                      rounded-full border-2 transition-all duration-100 flex items-center justify-center
                      ${isBeatOne ? 'w-12 h-12 md:w-14 md:h-14' : 'w-10 h-10 md:w-12 md:h-12'}
                      ${isActive
                        ? 'bg-primary border-primary shadow-[0_0_20px_rgba(226,168,50,0.5)] scale-110'
                        : 'bg-card border-border hover:border-primary/40'
                      }
                      ${acc === 'mute' ? 'opacity-40' : ''}
                    `}
                  >
                    <span
                      className={`font-mono text-sm font-bold ${
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <button
                    onClick={() => cycleAccent(i)}
                    className={`
                      text-[10px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer
                      transition-colors select-none
                      ${acc === 'f'
                        ? 'bg-primary/20 text-primary'
                        : acc === 'mf'
                        ? 'bg-muted text-muted-foreground'
                        : acc === 'p'
                        ? 'bg-muted/50 text-muted-foreground/60'
                        : 'bg-transparent text-muted-foreground/30'
                      }
                    `}
                  >
                    {ACCENT_LABELS[acc]}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bar counter */}
          {isPlaying && (
            <div className="text-center mt-3">
              <span className="font-mono text-xs text-muted-foreground">Bar: </span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">{barCount + 1}</span>
            </div>
          )}

          {/* Trainer status */}
          {isTrainerMode && isPlaying && (
            <div className={`text-center mt-3 py-2 rounded-md transition-colors ${
              trainerPhase === 'muted'
                ? 'bg-destructive/15'
                : 'bg-green-500/15'
            }`}>
              <Badge variant={trainerPhase === 'muted' ? 'destructive' : 'secondary'} className="font-mono text-sm px-4 py-1">
                {trainerPhase === 'muted' ? 'MUTED' : 'PLAYING'}
              </Badge>
            </div>
          )}
          {/* Pendulum toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wide font-mono" htmlFor="pendulum-toggle">
              Pendulum
            </label>
            <Switch
              id="pendulum-toggle"
              checked={pendulumMode}
              onCheckedChange={setPendulumMode}
            />
          </div>

          {/* Pendulum visual */}
          {pendulumMode && (
            <div className="mt-4">
              <PendulumVisual bpm={bpm} isPlaying={isPlaying} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== TIME SIGNATURE ====== */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
            Beats
          </label>
          <Select
            value={String(timeSignature.numerator)}
            onValueChange={(v) =>
              setTimeSignature((ts) => ({ ...ts, numerator: Number(v) }))
            }
          >
            <SelectTrigger className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
            Note Value
          </label>
          <Select
            value={String(timeSignature.denominator)}
            onValueChange={(v) =>
              setTimeSignature((ts) => ({ ...ts, denominator: Number(v) }))
            }
          >
            <SelectTrigger className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 4, 8, 16].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ====== SOUND & SUBDIVISION ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Sound selector */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> Sound
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {(['click', 'woodblock', 'rimshot', 'cowbell', 'clave'] as BeatSound[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setBeatSound(s)}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                      ${beatSound === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }
                    `}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subdivision selector */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-primary" /> Subdivision
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['none', 'None'],
                  ['8th', '8th'],
                  ['16th', '16th'],
                  ['triplet', '3-let'],
                  ['quintuplet', '5-let'],
                  ['septuplet', '7-let'],
                ] as [Subdivision, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSubdivision(val)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${subdivision === val
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swing slider */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Swing</span>
            <span className="font-mono text-xs text-muted-foreground">{swing}%</span>
          </div>
          <Slider
            value={[swing]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([v]) => setSwing(v)}
          />
        </CardContent>
      </Card>

      {/* ====== ADVANCED PANEL ====== */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" /> Advanced
            </span>
            {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Tempo Ramp */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Tempo Ramp
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1">
                    Start BPM
                  </label>
                  <input
                    type="number"
                    value={rampStartBpm}
                    onChange={(e) => setRampStartBpm(Math.max(20, Math.min(300, Number(e.target.value))))}
                    className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1">
                    End BPM
                  </label>
                  <input
                    type="number"
                    value={rampEndBpm}
                    onChange={(e) => setRampEndBpm(Math.max(20, Math.min(300, Number(e.target.value))))}
                    className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1">
                    Bars
                  </label>
                  <input
                    type="number"
                    value={rampDurationBars}
                    onChange={(e) => setRampDurationBars(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {/* Loop Ramp checkbox */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="ramp-loop"
                  checked={rampLooping}
                  onChange={(e) => setRampLooping(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="ramp-loop" className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Loop Ramp
                </label>
              </div>
              {/* Ramp progress indicator */}
              {isRamping && rampProgress && (
                <div className="mb-3 text-center">
                  <p className="font-mono text-xs text-primary font-medium">
                    Bar {rampProgress.bar}/{rampDurationBars} &mdash; {rampProgress.currentBpm} BPM &rarr; {rampEndBpm} BPM
                  </p>
                  <div className="mt-1.5 w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${(rampProgress.bar / rampDurationBars) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                variant={isRamping ? 'destructive' : 'default'}
                size="sm"
                className="w-full font-mono text-xs"
                onClick={() => {
                  if (isRamping) {
                    // Stop ramp
                    if (rampIntervalRef.current) clearInterval(rampIntervalRef.current);
                    setIsRamping(false);
                    isRampingRef.current = false;
                    setRampProgress(null);
                  } else {
                    // Start ramp (immediately starts the metronome)
                    setIsRamping(true);
                    isRampingRef.current = true;
                    if (!isPlaying) {
                      startMetronome();
                    } else {
                      // Already playing, just start the ramp on the existing transport
                      const transport = Tone.getTransport();
                      startRampCycle(transport, rampStartBpm, rampEndBpm, rampDurationBars, timeSignature.numerator);
                    }
                  }
                }}
              >
                {isRamping ? 'Stop Ramp' : 'Start Ramp'}
              </Button>
            </CardContent>
          </Card>

          {/* Rhythm Trainer */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" /> Rhythm Trainer
                </CardTitle>
                <Switch
                  checked={isTrainerMode}
                  onCheckedChange={setIsTrainerMode}
                />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1">
                    Play (bars)
                  </label>
                  <input
                    type="number"
                    value={trainerPlay}
                    onChange={(e) => setTrainerPlay(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1">
                    Mute (bars)
                  </label>
                  <input
                    type="number"
                    value={trainerMute}
                    onChange={(e) => setTrainerMute(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Alternates between audible and silent bars to test your internal pulse.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                Cycle: Play {trainerPlay} &rarr; Mute {trainerMute} &rarr; Play {trainerPlay} &rarr; Mute {trainerMute}...
              </p>
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: trainerPlay + trainerMute }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-sm ${
                      i < trainerPlay ? 'bg-green-500/60' : 'bg-destructive/40'
                    }`}
                    title={i < trainerPlay ? `Play bar ${i + 1}` : `Mute bar ${i - trainerPlay + 1}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Practice Timer */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-primary" /> Practice Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                    {formatTime(practiceSeconds)}
                  </span>
                  {targetMinutes > 0 && (
                    <span className="text-muted-foreground font-mono text-sm ml-2">
                      / {formatTime(targetMinutes * 60)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground uppercase">
                    Target (min)
                  </label>
                  <input
                    type="number"
                    value={targetMinutes}
                    onChange={(e) => setTargetMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-muted/50 border border-border rounded-md px-2 py-1 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {targetMinutes > 0 && (
                <div className="mt-2 w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (practiceSeconds / (targetMinutes * 60)) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ====== TRANSPORT ====== */}
      <div className="flex justify-center pt-2">
        <button
          onClick={togglePlay}
          className={`
            w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center
            transition-all duration-150 shadow-lg active:scale-95
            ${isPlaying
              ? 'bg-coral hover:bg-coral/90 shadow-coral/30'
              : 'bg-primary hover:bg-primary/90 shadow-primary/30'
            }
          `}
        >
          {isPlaying ? (
            <Square className="w-8 h-8 md:w-10 md:h-10 text-white" fill="white" />
          ) : (
            <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="white" />
          )}
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-[10px] text-muted-foreground/50 font-mono space-y-0.5">
        <p>Space = Play/Stop | T = Tap Tempo | R = Reset Swing</p>
        <p>&uarr;/&darr; = BPM &plusmn;1 | [/] = BPM &plusmn;5 | Esc = Stop</p>
      </div>
    </div>
  );
}
