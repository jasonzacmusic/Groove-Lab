import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { useSequencerStore, Kit, Instrument } from '../store/sequencer';

interface AudioEngineContextType {
  isInitialized: boolean;
  isPlaying: boolean;
  midiConnected: boolean;
  startEngine: () => Promise<void>;
  togglePlayback: () => void;
  playPreview: (instrument: Instrument) => void;
}

const AudioEngineContext = createContext<AudioEngineContextType | null>(null);

export const useAudioEngine = () => {
  const context = useContext(AudioEngineContext);
  if (!context) throw new Error('useAudioEngine must be used within AudioEngineProvider');
  return context;
};

// ---------- Kit-specific synth configs ----------

function createSynthsForKit(kit: Kit): Record<string, any> {
  switch (kit) {
    case 'jazz':
      return {
        kick: new Tone.MembraneSynth({ volume: -8, pitchDecay: 0.08, octaves: 6, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.4 } }).toDestination(),
        snare: new Tone.NoiseSynth({ volume: -10, noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.18, sustain: 0, release: 0.15 } }).toDestination(),
        hihatClosed: new Tone.MetalSynth({ volume: -14, envelope: { attack: 0.001, decay: 0.08, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
        hihatOpen: new Tone.MetalSynth({ volume: -14, envelope: { attack: 0.001, decay: 0.4, release: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
        ride: new Tone.MetalSynth({ volume: -12, envelope: { attack: 0.001, decay: 2.0, release: 0.3 }, harmonicity: 5.1, modulationIndex: 40, resonance: 5000, octaves: 1.5 }).toDestination(),
        crash: new Tone.MetalSynth({ volume: -10, envelope: { decay: 2.5 } }).toDestination(),
        tomHigh: new Tone.MembraneSynth({ volume: -8, pitchDecay: 0.05, octaves: 4 }).toDestination(),
        tomMid: new Tone.MembraneSynth({ volume: -8, pitchDecay: 0.05, octaves: 3 }).toDestination(),
        tomLow: new Tone.MembraneSynth({ volume: -8, pitchDecay: 0.05, octaves: 2 }).toDestination(),
        cowbell: new Tone.MetalSynth({ volume: -12, envelope: { decay: 0.2 } }).toDestination(),
        clap: new Tone.NoiseSynth({ volume: -10, envelope: { attack: 0.001, decay: 0.2 } }).toDestination(),
      };

    case 'rock':
      return {
        kick: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.03, octaves: 8, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 } }).toDestination(),
        snare: new Tone.NoiseSynth({ volume: -4, noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 } }).toDestination(),
        hihatClosed: new Tone.MetalSynth({ volume: -10, envelope: { attack: 0.001, decay: 0.06, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
        hihatOpen: new Tone.MetalSynth({ volume: -10, envelope: { attack: 0.001, decay: 0.35, release: 0.08 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
        ride: new Tone.MetalSynth({ volume: -8, envelope: { decay: 1.2 } }).toDestination(),
        crash: new Tone.MetalSynth({ volume: -6, envelope: { decay: 2.5 } }).toDestination(),
        tomHigh: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.03, octaves: 5 }).toDestination(),
        tomMid: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.03, octaves: 4 }).toDestination(),
        tomLow: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.03, octaves: 3 }).toDestination(),
        cowbell: new Tone.MetalSynth({ volume: -8, envelope: { decay: 0.15 } }).toDestination(),
        clap: new Tone.NoiseSynth({ volume: -6, envelope: { attack: 0.001, decay: 0.15 } }).toDestination(),
      };

    case '808':
      return {
        kick: new Tone.MembraneSynth({ volume: -2, pitchDecay: 0.12, octaves: 10, envelope: { attack: 0.001, decay: 0.6, sustain: 0.1, release: 0.5 } }).toDestination(),
        snare: new Tone.NoiseSynth({ volume: -4, noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination(),
        hihatClosed: new Tone.MetalSynth({ volume: -12, envelope: { attack: 0.001, decay: 0.04, release: 0.005 }, harmonicity: 5.1, modulationIndex: 40, resonance: 6000, octaves: 2 }).toDestination(),
        hihatOpen: new Tone.MetalSynth({ volume: -12, envelope: { attack: 0.001, decay: 0.25, release: 0.05 }, harmonicity: 5.1, modulationIndex: 40, resonance: 6000, octaves: 2 }).toDestination(),
        ride: new Tone.MetalSynth({ volume: -10, envelope: { decay: 1.0 } }).toDestination(),
        crash: new Tone.MetalSynth({ volume: -8, envelope: { decay: 2 } }).toDestination(),
        tomHigh: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.05, octaves: 4 }).toDestination(),
        tomMid: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.05, octaves: 3 }).toDestination(),
        tomLow: new Tone.MembraneSynth({ volume: -4, pitchDecay: 0.05, octaves: 2 }).toDestination(),
        cowbell: new Tone.MetalSynth({ volume: -10, envelope: { decay: 0.2 } }).toDestination(),
        clap: new Tone.NoiseSynth({ volume: -4, noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 } }).toDestination(),
      };

    case 'latin':
      return {
        kick: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.06, octaves: 6 }).toDestination(),
        snare: new Tone.NoiseSynth({ volume: -8, noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.14, sustain: 0, release: 0.1 } }).toDestination(),
        hihatClosed: new Tone.MetalSynth({ volume: -14, envelope: { attack: 0.001, decay: 0.06, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
        hihatOpen: new Tone.MetalSynth({ volume: -14, envelope: { attack: 0.001, decay: 0.35, release: 0.08 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
        ride: new Tone.MetalSynth({ volume: -10, envelope: { decay: 1.5 } }).toDestination(),
        crash: new Tone.MetalSynth({ volume: -8, envelope: { decay: 2 } }).toDestination(),
        // Latin toms tuned to simulate congas/bongos with distinct pitches
        tomHigh: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 } }).toDestination(),
        tomMid: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.02, octaves: 2.5, envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.25 } }).toDestination(),
        tomLow: new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.02, octaves: 3, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 } }).toDestination(),
        cowbell: new Tone.MetalSynth({ volume: -8, envelope: { decay: 0.12 }, harmonicity: 3, modulationIndex: 20 }).toDestination(),
        clap: new Tone.NoiseSynth({ volume: -8, envelope: { attack: 0.001, decay: 0.18 } }).toDestination(),
      };
  }
}

// Per-kit pitch mapping for membrane / metal synths
function getPitch(instrument: Instrument, kit: Kit): string {
  if (kit === '808') {
    if (instrument === 'kick') return 'C1';
    if (instrument === 'tomLow') return 'G1';
    if (instrument === 'tomMid') return 'C2';
    if (instrument === 'tomHigh') return 'E2';
  }
  if (kit === 'latin') {
    if (instrument === 'kick') return 'C2';
    if (instrument === 'tomLow') return 'C3';   // low conga
    if (instrument === 'tomMid') return 'E3';   // mid conga
    if (instrument === 'tomHigh') return 'G3';  // bongo
  }
  // jazz / rock defaults
  if (instrument === 'kick') return 'C2';
  if (instrument === 'tomLow') return 'E2';
  if (instrument === 'tomMid') return 'A2';
  if (instrument === 'tomHigh') return 'C3';
  return 'C4'; // fallback for metal synths
}

// ---------- Keyboard-to-instrument map ----------

// ---------- MIDI note-to-instrument map ----------

const MIDI_NOTE_MAP: Record<number, Instrument> = {
  36: 'kick',
  38: 'snare',
  42: 'hihatClosed',
  46: 'hihatOpen',
  51: 'ride',
  49: 'crash',
  48: 'tomHigh',
  45: 'tomMid',
  41: 'tomLow',
  39: 'clap',
  56: 'cowbell',
};

const KEY_MAP: Record<string, Instrument> = {
  q: 'kick',
  w: 'snare',
  e: 'hihatClosed',
  r: 'hihatOpen',
  t: 'ride',
  a: 'tomHigh',
  s: 'tomMid',
  d: 'tomLow',
  f: 'clap',
  g: 'cowbell',
};

// ---------- Provider ----------

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [midiConnected, setMidiConnected] = useState(false);

  const synths = useRef<Record<string, any>>({});
  const scheduledEventId = useRef<number | null>(null);

  const store = useSequencerStore();
  const storeRef = useRef(store);

  // Keep storeRef fresh and sync BPM
  useEffect(() => {
    storeRef.current = store;
    if (isInitialized) {
      Tone.Transport.bpm.value = store.bpm;
    }
  }, [store, isInitialized]);

  // Rebuild synths when kit changes
  const currentKitRef = useRef<Kit | null>(null);

  useEffect(() => {
    if (!isInitialized) return;
    if (currentKitRef.current === store.selectedKit) return;
    // Dispose old synths
    Object.values(synths.current).forEach((s: any) => {
      try { s.dispose(); } catch (_) { /* already disposed */ }
    });
    synths.current = createSynthsForKit(store.selectedKit);
    currentKitRef.current = store.selectedKit;
  }, [store.selectedKit, isInitialized]);

  // ---------- handleMIDIMessage ----------

  const handleMIDIMessage = useCallback((event: any) => {
    const [status, note, velocity] = event.data;
    // Note-on message with velocity > 0
    if ((status & 0xf0) === 0x90 && velocity > 0) {
      const instrument = MIDI_NOTE_MAP[note];
      if (instrument) {
        // Play preview sound
        const kit = storeRef.current.selectedKit;
        const synth = synths.current[instrument];
        if (synth) {
          if (synth instanceof Tone.MembraneSynth) {
            synth.triggerAttackRelease(getPitch(instrument, kit), '8n');
          } else if (synth instanceof Tone.NoiseSynth) {
            synth.triggerAttackRelease('16n');
          } else if (synth instanceof Tone.MetalSynth) {
            synth.triggerAttackRelease(getPitch(instrument, kit), '16n');
          }
        }

        // If playing, record the hit at the current step position
        const currentState = storeRef.current;
        if (Tone.Transport.state === 'started' && currentState.currentStep >= 0) {
          // Find beat and slice from global step
          let globalIdx = 0;
          for (let b = 0; b < currentState.beats.length; b++) {
            for (let s = 0; s < currentState.beats[b].length; s++) {
              if (globalIdx === currentState.currentStep) {
                currentState.setSelectedInstrument(instrument);
                currentState.toggleHit(b, s);
                return;
              }
              globalIdx++;
            }
          }
        }
      }
    }
  }, []);

  // ---------- startEngine ----------

  const startEngine = async () => {
    await Tone.start();
    if (!isInitialized) {
      Tone.Transport.bpm.value = store.bpm;
      synths.current = createSynthsForKit(store.selectedKit);
      currentKitRef.current = store.selectedKit;
      setIsInitialized(true);
    }
  };

  // ---------- Web MIDI Access ----------

  useEffect(() => {
    if (!isInitialized) return;
    if (!(navigator as any).requestMIDIAccess) return;

    (navigator as any).requestMIDIAccess().then((midi: any) => {
      midi.inputs.forEach((input: any) => {
        input.onmidimessage = handleMIDIMessage;
      });
      midi.onstatechange = () => {
        setMidiConnected(Array.from(midi.inputs.values()).some((i: any) => (i as any).state === 'connected'));
      };
      setMidiConnected(midi.inputs.size > 0);
    }).catch(() => {
      console.log('MIDI not available');
    });
  }, [isInitialized, handleMIDIMessage]);

  // ---------- setupSequence ----------

  const setupSequence = useCallback(() => {
    // Clear any previously scheduled events
    Tone.Transport.cancel();
    scheduledEventId.current = null;

    const state = storeRef.current;
    const { numerator, denominator } = state.timeSignature;

    // Total slices across all beats
    const totalSlices = state.subdivisions.reduce((sum, n) => sum + n, 0);

    // Duration of one beat in Tone.Transport notation
    // denominator tells us the note value that gets one beat (4 = quarter, 8 = eighth, etc.)
    const beatDurationSeconds = () => (60 / Tone.Transport.bpm.value) * (4 / denominator);

    // We schedule a repeating callback at the interval of the smallest slice
    // Because subdivisions can differ per beat, we compute time per slice dynamically
    // Strategy: schedule once per the finest resolution, derive beat/slice from a running counter

    let globalStep = 0;

    // Build a lookup: for each globalStep, which beat and slice does it correspond to?
    // Also precompute cumulative slice counts for quick lookup
    const buildLookup = () => {
      const st = storeRef.current;
      const lookup: { beat: number; slice: number }[] = [];
      for (let b = 0; b < st.timeSignature.numerator; b++) {
        const numSlices = st.subdivisions[b] || 4;
        for (let s = 0; s < numSlices; s++) {
          lookup.push({ beat: b, slice: s });
        }
      }
      return lookup;
    };

    // The repeat interval: we use the smallest common subdivision interval.
    // For simplicity, schedule a repeating event at a very fine resolution isn't ideal.
    // Instead we use Tone.Transport.schedule to place each slice precisely for one measure,
    // and then loop the transport.

    // Calculate measure duration
    const measureDuration = () => numerator * beatDurationSeconds();

    // Set transport to loop one measure
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    // We set loopEnd dynamically and schedule all events within the measure

    const scheduleAllEvents = () => {
      Tone.Transport.cancel();
      const st = storeRef.current;
      const beatDur = beatDurationSeconds();
      const measDur = numerator * beatDur;
      Tone.Transport.loopEnd = measDur;

      let globalIdx = 0;
      let timeOffset = 0;

      for (let b = 0; b < st.timeSignature.numerator; b++) {
        const numSlices = st.subdivisions[b] || 4;
        const sliceDur = beatDur / numSlices;

        for (let s = 0; s < numSlices; s++) {
          const capturedGlobalIdx = globalIdx;
          const capturedBeat = b;
          const capturedSlice = s;

          // Swing: offset even-indexed slices (0-based; "even" here means the off-beat,
          // i.e. slices 1, 3, 5... within each beat)
          let swingOffset = 0;
          if (capturedSlice % 2 !== 0) {
            const swingVal = storeRef.current.swing;
            // Max swing offset is half a slice duration
            swingOffset = (swingVal / 100) * (sliceDur * 0.5);
          }

          const eventTime = timeOffset + swingOffset;

          Tone.Transport.schedule((time) => {
            const currentState = storeRef.current;
            const sliceData = currentState.beats[capturedBeat]?.[capturedSlice];

            // Update playhead
            currentState.setCurrentStep(capturedGlobalIdx);

            if (sliceData && sliceData.instrument) {
              triggerInstrument(sliceData.instrument, time, currentState.selectedKit);
            }
          }, eventTime);

          globalIdx++;
          timeOffset += sliceDur;
        }
      }
    };

    scheduleAllEvents();
  }, []);

  // Re-schedule when beats, subdivisions, swing, or time signature change during playback
  useEffect(() => {
    if (isPlaying) {
      setupSequence();
    }
  }, [store.beats, store.swing, store.subdivisions, store.timeSignature, setupSequence, isPlaying]);

  // ---------- triggerInstrument ----------

  const triggerInstrument = (instrument: Instrument, time: number, kit: Kit) => {
    const synth = synths.current[instrument];
    if (!synth) return;

    if (synth instanceof Tone.MembraneSynth) {
      synth.triggerAttackRelease(getPitch(instrument, kit), '8n', time);
    } else if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('16n', time);
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease(getPitch(instrument, kit), '16n', time);
    }
  };

  // ---------- togglePlayback ----------

  const togglePlayback = () => {
    if (!isInitialized) return;

    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      storeRef.current.setCurrentStep(-1);
      setIsPlaying(false);
    } else {
      setupSequence();
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  // ---------- playPreview ----------

  const playPreview = (instrument: Instrument) => {
    if (!isInitialized || !synths.current[instrument]) return;
    const kit = storeRef.current.selectedKit;
    const synth = synths.current[instrument];

    if (synth instanceof Tone.MembraneSynth) {
      synth.triggerAttackRelease(getPitch(instrument, kit), '8n');
    } else if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('16n');
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease(getPitch(instrument, kit), '16n');
    }
  };

  // ---------- Keyboard input ----------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input / textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const instrument = KEY_MAP[e.key.toLowerCase()];
      if (instrument) {
        playPreview(instrument);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInitialized]);

  return (
    <AudioEngineContext.Provider value={{ isInitialized, isPlaying, midiConnected, startEngine, togglePlayback, playPreview }}>
      {children}
    </AudioEngineContext.Provider>
  );
};
