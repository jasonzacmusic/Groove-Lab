import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { useSequencerStore, Kit, Instrument } from '../store/sequencer';

interface AudioEngineContextType {
  isInitialized: boolean;
  isPlaying: boolean;
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

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const synths = useRef<Record<string, any>>({});
  const sequence = useRef<Tone.Sequence | null>(null);
  
  const store = useSequencerStore();
  const storeRef = useRef(store);
  
  useEffect(() => {
    storeRef.current = store;
    if (isInitialized) {
      Tone.Transport.bpm.value = store.bpm;
    }
  }, [store, isInitialized]);

  const startEngine = async () => {
    await Tone.start();
    if (!isInitialized) {
      Tone.Transport.bpm.value = store.bpm;
      // Init synths (robust Tone.js setup)
      synths.current = {
        kick: new Tone.MembraneSynth().toDestination(),
        snare: new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination(),
        hihatClosed: new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
        }).toDestination(),
        hihatOpen: new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.5, release: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
        }).toDestination(),
        ride: new Tone.MetalSynth({ envelope: { decay: 1.5 } }).toDestination(),
        crash: new Tone.MetalSynth({ envelope: { decay: 2 } }).toDestination(),
        tomHigh: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4 }).toDestination(),
        tomMid: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 3 }).toDestination(),
        tomLow: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2 }).toDestination(),
        cowbell: new Tone.MetalSynth({ envelope: { decay: 0.2 } }).toDestination(),
        clap: new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.2 } }).toDestination()
      };
      setIsInitialized(true);
    }
  };

  const togglePlayback = () => {
    if (!isInitialized) return;
    
    if (isPlaying) {
      Tone.Transport.stop();
      if (sequence.current) sequence.current.stop();
      setIsPlaying(false);
    } else {
      setupSequence();
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  const setupSequence = useCallback(() => {
    if (sequence.current) {
      sequence.current.dispose();
    }
    
    const currentState = storeRef.current;
    
    // Create a flat array of events from the beats structure
    // This is a simplified version; handling complex subdivisions requires mapping Tone.Transport.schedule
    // For now we map a simple 16-step sequence assuming 4/4 with 4 slices
    
    const events = [];
    for (let b = 0; b < currentState.timeSignature.numerator; b++) {
      const slices = currentState.beats[b] || [];
      for (let s = 0; s < slices.length; s++) {
        events.push({ beat: b, slice: s, data: slices[s] });
      }
    }

    // 16n sequence
    sequence.current = new Tone.Sequence((time, event) => {
       if (event && event.data && event.data.instrument) {
         const synth = synths.current[event.data.instrument];
         if (synth) {
            // Apply swing on offbeats
            const isOffbeat = event.slice % 2 !== 0;
            const swingOffset = isOffbeat ? (currentState.swing / 100) * 0.1 : 0;
            
            if (synth instanceof Tone.MembraneSynth) {
              synth.triggerAttackRelease(event.data.instrument === 'kick' ? 'C2' : 'C3', '8n', time + swingOffset);
            } else if (synth instanceof Tone.NoiseSynth) {
              synth.triggerAttackRelease('16n', time + swingOffset);
            } else if (synth instanceof Tone.MetalSynth) {
              synth.triggerAttackRelease('C4', '16n', time + swingOffset);
            }
         }
       }
    }, events, "16n").start(0);
    
  }, []);

  // Update sequence if it's playing and state changes
  useEffect(() => {
    if (isPlaying) {
      setupSequence();
    }
  }, [store.beats, store.swing, setupSequence, isPlaying]);

  const playPreview = (instrument: Instrument) => {
    if (!isInitialized || !synths.current[instrument]) return;
    const synth = synths.current[instrument];
    if (synth instanceof Tone.MembraneSynth) {
      synth.triggerAttackRelease(instrument === 'kick' ? 'C2' : 'C3', '8n');
    } else if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('16n');
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease('C4', '16n');
    }
  };

  return (
    <AudioEngineContext.Provider value={{ isInitialized, isPlaying, startEngine, togglePlayback, playPreview }}>
      {children}
    </AudioEngineContext.Provider>
  );
};