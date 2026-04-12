import { create } from 'zustand';

export type Instrument = 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen' | 'ride' | 'crash' | 'tomHigh' | 'tomMid' | 'tomLow' | 'crossStick' | 'cowbell' | 'clap' | 'congaHigh' | 'congaLow' | 'bongo' | 'timbale' | 'clave' | 'shaker';
export type Kit = 'jazz' | 'rock' | '808' | 'latin';

interface SequencerState {
  beats: { instrument: Instrument | null }[][]; // [beatIndex][sliceIndex]
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  swing: number; // -100 to 100
  selectedKit: Kit;
  selectedInstrument: Instrument;
  subdivisions: number[]; // e.g. [4, 4, 4, 4] for 4/4 with 4 slices per beat
  setBpm: (bpm: number) => void;
  setTimeSignature: (numerator: number, denominator: number) => void;
  setSwing: (swing: number) => void;
  setSelectedKit: (kit: Kit) => void;
  setSelectedInstrument: (instrument: Instrument) => void;
  setSubdivision: (beatIndex: number, slices: number) => void;
  toggleHit: (beatIndex: number, sliceIndex: number) => void;
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
    const currentHit = newBeats[beatIndex][sliceIndex];
    newBeats[beatIndex] = [...newBeats[beatIndex]];
    if (currentHit.instrument === state.selectedInstrument) {
      newBeats[beatIndex][sliceIndex] = { instrument: null };
    } else {
      newBeats[beatIndex][sliceIndex] = { instrument: state.selectedInstrument };
    }
    return { beats: newBeats };
  }),
  clearAll: () => set((state) => ({
    beats: Array.from({ length: state.timeSignature.numerator }, (_, i) => Array(state.subdivisions[i] || 4).fill({ instrument: null }))
  }))
}));