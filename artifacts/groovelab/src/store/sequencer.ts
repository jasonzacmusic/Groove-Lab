import { create } from 'zustand';

export type Instrument = 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen' | 'ride' | 'crash' | 'tomHigh' | 'tomMid' | 'tomLow' | 'crossStick' | 'cowbell' | 'clap' | 'congaHigh' | 'congaLow' | 'bongo' | 'timbale' | 'clave' | 'shaker';
export type Kit = 'jazz' | 'rock' | '808' | 'latin';

// Velocity levels (Beat Scholar style):
// 0 = ghost / soft, 1 = normal, 2 = accent (loudest)
// `null` velocity means no hit on that slice for that instrument.
export type Velocity = 0 | 1 | 2;

export interface Hit {
  instrument: Instrument | null;
  velocity?: Velocity; // undefined = legacy/normal hit (treated as 1)
}

// Convert Velocity 0/1/2 to a Tone.js velocity multiplier 0-1
export const velocityToGain = (v: Velocity | undefined): number => {
  if (v === 0) return 0.35;   // ghost note
  if (v === 2) return 1.0;    // accent
  return 0.65;                 // normal (default)
};

interface SequencerState {
  beats: Hit[][]; // [beatIndex][sliceIndex]
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  swing: number; // -100 to 100
  selectedKit: Kit;
  selectedInstrument: Instrument;
  subdivisions: number[]; // e.g. [4, 4, 4, 4] for 4/4 with 4 slices per beat
  currentStep: number; // global slice index currently playing (-1 when stopped)
  setBpm: (bpm: number) => void;
  setTimeSignature: (numerator: number, denominator: number) => void;
  setSwing: (swing: number) => void;
  setSelectedKit: (kit: Kit) => void;
  setSelectedInstrument: (instrument: Instrument) => void;
  setSubdivision: (beatIndex: number, slices: number) => void;
  /**
   * Cycles a slice's hit state through:
   *   off → normal → accent → ghost → off
   * If the slice has a *different* instrument than the selected one, it is
   * replaced (set to normal). This mimics Beat Scholar / iReal Pro behavior
   * where repeated taps sculpt dynamics in place.
   */
  toggleHit: (beatIndex: number, sliceIndex: number) => void;
  setCurrentStep: (step: number) => void;
  clearAll: () => void;
}

export const useSequencerStore = create<SequencerState>((set) => ({
  beats: Array.from({ length: 4 }, () => Array(4).fill({ instrument: null })),
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  swing: 0,
  selectedKit: 'jazz',
  selectedInstrument: 'kick',
  subdivisions: [4, 4, 4, 4],
  currentStep: -1,
  setBpm: (bpm) => set({ bpm }),
  setTimeSignature: (numerator, denominator) => set((state) => {
    const newBeats = Array.from({ length: numerator }, (_, i) =>
      state.beats[i] ? state.beats[i] : Array(state.subdivisions[i] || 4).fill({ instrument: null })
    );
    const newSubdivisions = Array.from({ length: numerator }, (_, i) => state.subdivisions[i] || 4);
    return { timeSignature: { numerator, denominator }, beats: newBeats, subdivisions: newSubdivisions };
  }),
  setSwing: (swing) => set({ swing }),
  setSelectedKit: (selectedKit) => set({ selectedKit }),
  setSelectedInstrument: (selectedInstrument) => set({ selectedInstrument }),
  setSubdivision: (beatIndex, slices) => set((state) => {
    const newBeats = [...state.beats];
    const oldSlices = newBeats[beatIndex];
    newBeats[beatIndex] = Array.from({ length: slices }, (_, i) => oldSlices[i] ? oldSlices[i] : { instrument: null });
    const newSubdivisions = [...state.subdivisions];
    newSubdivisions[beatIndex] = slices;
    return { beats: newBeats, subdivisions: newSubdivisions };
  }),
  toggleHit: (beatIndex, sliceIndex) => set((state) => {
    const newBeats = [...state.beats];
    newBeats[beatIndex] = [...newBeats[beatIndex]];
    const cur = newBeats[beatIndex][sliceIndex];
    const curVel: Velocity | undefined = cur.velocity;

    // Different instrument? Replace with NORMAL hit of selected instrument.
    if (cur.instrument && cur.instrument !== state.selectedInstrument) {
      newBeats[beatIndex][sliceIndex] = { instrument: state.selectedInstrument, velocity: 1 };
      return { beats: newBeats };
    }

    // Same instrument (or empty): cycle off → normal → accent → ghost → off
    if (!cur.instrument) {
      newBeats[beatIndex][sliceIndex] = { instrument: state.selectedInstrument, velocity: 1 };
    } else if (curVel === undefined || curVel === 1) {
      newBeats[beatIndex][sliceIndex] = { instrument: state.selectedInstrument, velocity: 2 }; // → accent
    } else if (curVel === 2) {
      newBeats[beatIndex][sliceIndex] = { instrument: state.selectedInstrument, velocity: 0 }; // → ghost
    } else {
      newBeats[beatIndex][sliceIndex] = { instrument: null }; // → off
    }
    return { beats: newBeats };
  }),
  setCurrentStep: (step) => set({ currentStep: step }),
  clearAll: () => set((state) => ({
    beats: Array.from({ length: state.timeSignature.numerator }, (_, i) => Array(state.subdivisions[i] || 4).fill({ instrument: null }))
  }))
}));