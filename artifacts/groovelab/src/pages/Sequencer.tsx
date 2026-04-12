import React, { useCallback, useState } from 'react';
import { useSequencerStore, Instrument } from '../store/sequencer';
import { useAudioEngine } from '../context/AudioEngineContext';
import { usePracticeTracker } from '@/hooks/use-practice-tracker';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Download, Plus, Minus, Trash2 } from 'lucide-react';
import { Midi } from '@tonejs/midi';

// Instrument color map
const INSTRUMENT_COLORS: Record<string, string> = {
  kick:        '#e2a832',
  snare:       '#e74c3c',
  hihatClosed: '#7fb069',
  hihatOpen:   '#4ecdc4',
  ride:        '#a78bfa',
  crash:       '#f59e0b',
  tomHigh:     '#fb923c',
  tomMid:      '#34d399',
  tomLow:      '#60a5fa',
  cowbell:     '#f472b6',
  clap:        '#c084fc',
  crossStick:  '#facc15',
};

const KIT_INSTRUMENTS: Record<string, string[]> = {
  jazz:  ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'ride', 'crash'],
  rock:  ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'tomHigh', 'tomMid', 'tomLow', 'crash'],
  '808': ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'cowbell', 'clap'],
  latin: ['kick', 'snare', 'hihatClosed', 'tomHigh', 'tomMid', 'cowbell', 'crossStick'],
};

const INSTRUMENT_LABELS: Record<string, string> = {
  kick:        'Kick',
  snare:       'Snare',
  hihatClosed: 'HH Closed',
  hihatOpen:   'HH Open',
  ride:        'Ride',
  crash:       'Crash',
  tomHigh:     'Tom Hi',
  tomMid:      'Tom Mid',
  tomLow:      'Tom Low',
  cowbell:     'Cowbell',
  clap:        'Clap',
  crossStick:  'X-Stick',
};

// ---------------------------------------------------------------------------
// PizzaBeat - a single pizza-circle representing one beat
// ---------------------------------------------------------------------------

interface PizzaBeatProps {
  beatIndex: number;
  slices: { instrument: Instrument | null }[];
  subdivisionCount: number;
  currentStep: number;
  globalStartIndex: number;
  onSliceClick: (beatIndex: number, sliceIndex: number) => void;
  size: number;
}

function PizzaBeat({
  beatIndex,
  slices,
  subdivisionCount,
  currentStep,
  globalStartIndex,
  onSliceClick,
  size,
}: PizzaBeatProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Beat number label */}
      <span className="font-mono text-xs font-bold text-primary/70 select-none">
        {beatIndex + 1}
      </span>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none"
      >
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="rgba(22,33,62,0.4)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {/* Vinyl groove rings */}
        {[r * 0.3, r * 0.5, r * 0.7, r * 0.85].map((gr, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={gr}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2} fill="rgba(226,168,50,0.3)" />

        {/* Pie slices */}
        {slices.map((slice, i) => {
          const startAngle = (i / subdivisionCount) * 360 - 90;
          const endAngle = ((i + 1) / subdivisionCount) * 360 - 90;
          const globalIdx = globalStartIndex + i;
          const isPlaying = currentStep === globalIdx;
          const color = slice.instrument
            ? INSTRUMENT_COLORS[slice.instrument] || '#888'
            : null;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          let fill = 'transparent';
          if (isPlaying && color) {
            fill = color;
          } else if (isPlaying) {
            fill = 'rgba(226,168,50,0.25)';
          } else if (color) {
            fill = color + 'cc'; // slight transparency
          }

          return (
            <path
              key={i}
              d={d}
              fill={fill}
              stroke={isPlaying ? '#e2a832' : 'rgba(255,255,255,0.15)'}
              strokeWidth={isPlaying ? 2 : 0.5}
              style={{
                cursor: 'pointer',
                transition: 'fill 0.06s ease',
                filter: isPlaying
                  ? 'drop-shadow(0 0 8px rgba(226,168,50,0.6))'
                  : color
                    ? `drop-shadow(0 0 3px ${color}66)`
                    : undefined,
              }}
              onClick={() => onSliceClick(beatIndex, i)}
            />
          );
        })}

        {/* Slice divider lines (on top, for clarity) */}
        {Array.from({ length: subdivisionCount }).map((_, i) => {
          const angle = (i / subdivisionCount) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={`div-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + r * Math.cos(rad)}
              y2={cy + r * Math.sin(rad)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.5"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
      </svg>

      {/* Subdivision selector */}
      <Select
        value={subdivisionCount.toString()}
        onValueChange={(v) => {
          const store = useSequencerStore.getState();
          store.setSubdivision(beatIndex, parseInt(v));
        }}
      >
        <SelectTrigger className="w-14 h-6 text-[10px] px-1 font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[2, 3, 4, 5, 6, 8].map((n) => (
            <SelectItem
              key={n}
              value={n.toString()}
              className="text-xs font-mono"
            >
              /{n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sequencer page (default export)
// ---------------------------------------------------------------------------

export default function Sequencer() {
  usePracticeTracker('sequencer');
  const store = useSequencerStore();
  const {
    isInitialized,
    isPlaying,
    midiConnected,
    startEngine,
    togglePlayback,
    playPreview,
  } = useAudioEngine();

  const [measures, setMeasures] = useState(1);

  const instruments = KIT_INSTRUMENTS[store.selectedKit];

  // Compute global start indices per beat
  const globalStartIndices: number[] = [];
  let runningIdx = 0;
  for (let b = 0; b < store.beats.length; b++) {
    globalStartIndices.push(runningIdx);
    runningIdx += store.beats[b].length;
  }

  // Handle start / play
  const handleStart = async () => {
    if (!isInitialized) {
      await startEngine();
    }
    togglePlayback();
  };

  // Handle slice click
  const handleSliceClick = useCallback(
    (beatIndex: number, sliceIndex: number) => {
      store.toggleHit(beatIndex, sliceIndex);
      if (store.beats[beatIndex][sliceIndex]?.instrument !== store.selectedInstrument) {
        // We just placed a hit; preview the sound
        playPreview(store.selectedInstrument);
      }
    },
    [store, playPreview]
  );

  // Add / remove beat
  const addBeat = () => {
    const newNum = store.timeSignature.numerator + 1;
    if (newNum <= 16) {
      store.setTimeSignature(newNum, store.timeSignature.denominator);
    }
  };

  const removeBeat = () => {
    const newNum = store.timeSignature.numerator - 1;
    if (newNum >= 1) {
      store.setTimeSignature(newNum, store.timeSignature.denominator);
    }
  };

  // MIDI export
  const exportMidi = () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.channel = 9;

    const currentBpm = store.bpm;
    const secondsPerBeat = 60 / currentBpm;

    const INST_TO_MIDI: Record<string, number> = {
      kick: 36, snare: 38, hihatClosed: 42, hihatOpen: 46, ride: 51,
      crash: 49, tomHigh: 48, tomMid: 45, tomLow: 41, clap: 39, cowbell: 56,
      crossStick: 37, clave: 75, shaker: 70,
    };

    let globalTime = 0;
    for (let b = 0; b < store.beats.length; b++) {
      const slices = store.beats[b];
      const sliceDur = secondsPerBeat / slices.length;
      for (let s = 0; s < slices.length; s++) {
        const hit = slices[s];
        if (hit.instrument) {
          const note = INST_TO_MIDI[hit.instrument] || 36;
          track.addNote({
            midi: note,
            time: globalTime,
            duration: 0.1,
            velocity: 0.8,
          });
        }
        globalTime += sliceDur;
      }
    }

    midi.header.setTempo(currentBpm);
    const blob = new Blob(
      [midi.toArray() as unknown as ArrayBuffer],
      { type: 'audio/midi' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groovelab-pattern-${currentBpm}bpm.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Responsive pizza size
  const pizzaSize = store.beats.length <= 4 ? 120 : store.beats.length <= 8 ? 100 : 80;

  return (
    <div className="flex flex-col h-[calc(100vh-144px)] max-w-7xl mx-auto w-full">
      {/* ---- Header ---- */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl md:text-3xl">The Pizza Lab</h2>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="hidden md:inline opacity-60">
            Q/W/E/R/T = instruments | Space = play
          </span>
        </div>
      </div>

      {/* ---- Main content (scrollable) ---- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-5">
        {/* Measure label + beat add/remove */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg text-foreground/80">
              Measure 1
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {store.timeSignature.numerator}/{store.timeSignature.denominator}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={removeBeat}
              disabled={store.timeSignature.numerator <= 1}
              title="Remove Beat"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="font-mono text-xs text-muted-foreground w-16 text-center">
              {store.timeSignature.numerator} beats
            </span>
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={addBeat}
              disabled={store.timeSignature.numerator >= 16}
              title="Add Beat"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ---- Pizza Row ---- */}
        <div className="bg-card border border-border rounded-xl shadow-md p-4 md:p-6 overflow-x-auto vinyl-texture">
          <div
            className="flex items-start justify-center gap-3 md:gap-5 min-w-min mx-auto"
            style={{ maxWidth: '100%' }}
          >
            {store.beats.map((beatSlices, b) => (
              <PizzaBeat
                key={b}
                beatIndex={b}
                slices={beatSlices}
                subdivisionCount={beatSlices.length}
                currentStep={store.currentStep}
                globalStartIndex={globalStartIndices[b]}
                onSliceClick={handleSliceClick}
                size={pizzaSize}
              />
            ))}
          </div>
        </div>

        {/* ---- Instrument Palette ---- */}
        <div className="bg-card border border-border rounded-xl shadow-md p-3 md:p-4">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 font-mono">
            Instrument
          </p>
          <div className="flex flex-wrap gap-2">
            {instruments.map((inst) => {
              const color = INSTRUMENT_COLORS[inst] || '#888';
              const isSelected = store.selectedInstrument === inst;
              return (
                <button
                  key={inst}
                  onClick={() => {
                    store.setSelectedInstrument(inst as Instrument);
                    playPreview(inst as Instrument);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-mono ${
                    isSelected
                      ? 'bg-card text-foreground'
                      : 'hover:bg-muted/60 text-muted-foreground'
                  }`}
                  style={{
                    border: isSelected
                      ? `2px solid ${color}`
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isSelected
                      ? `0 0 12px ${color}44, inset 0 0 8px ${color}22`
                      : undefined,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: isSelected
                        ? `0 0 8px ${color}`
                        : `0 0 2px ${color}66`,
                    }}
                  />
                  <span className="whitespace-nowrap">
                    {INSTRUMENT_LABELS[inst]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Transport Bar (sticky bottom) ---- */}
      <div className="flex-shrink-0 px-4 md:px-6 pb-4 md:pb-6">
        <div className="bg-card border border-border rounded-xl shadow-md flex items-center px-4 md:px-6 py-3 gap-3 md:gap-5 flex-wrap">
          {/* Play / Stop */}
          <Button
            size="icon"
            className={`w-12 h-12 rounded-full flex-shrink-0 ${
              isPlaying
                ? 'bg-coral hover:bg-coral/80 shadow-[0_0_15px_rgba(231,76,60,0.5)]'
                : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={handleStart}
          >
            {isPlaying ? (
              <Square className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            )}
          </Button>

          {/* BPM */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => store.setBpm(Math.max(20, store.bpm - 1))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <div className="flex flex-col items-center w-16">
              <input
                type="number"
                className="font-mono text-2xl font-bold tracking-tighter text-foreground bg-transparent w-full text-center border-none outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={store.bpm}
                min={20}
                max={400}
                onChange={(e) => store.setBpm(Number(e.target.value))}
              />
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                BPM
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => store.setBpm(Math.min(400, store.bpm + 1))}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Time Signature */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 font-mono text-lg">
              <span className="font-bold">{store.timeSignature.numerator}</span>
              <span className="text-muted-foreground">/</span>
              <Select
                value={store.timeSignature.denominator.toString()}
                onValueChange={(v) =>
                  store.setTimeSignature(
                    store.timeSignature.numerator,
                    parseInt(v)
                  )
                }
              >
                <SelectTrigger className="w-12 h-7 text-center px-1 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 8, 16].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground">
              SIG
            </span>
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Swing */}
          <div className="flex-1 max-w-[160px] min-w-[100px] flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                Swing
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {store.swing > 0 ? '+' : ''}
                {store.swing}%
              </span>
            </div>
            <Slider
              value={[store.swing]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([v]) => store.setSwing(v)}
            />
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Kit Selector */}
          <Select
            value={store.selectedKit}
            onValueChange={store.setSelectedKit as any}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs font-mono">
              <SelectValue placeholder="Kit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jazz">Jazz Acoustic</SelectItem>
              <SelectItem value="rock">Rock Studio</SelectItem>
              <SelectItem value="808">808 Electronic</SelectItem>
              <SelectItem value="latin">Latin Perc</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-10 bg-border hidden md:block" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8"
              onClick={store.clearAll}
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8"
              onClick={exportMidi}
              title="Export MIDI"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* MIDI indicator */}
          {midiConnected && (
            <div
              className="flex items-center gap-1.5 ml-auto"
              title="MIDI Controller Connected"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              <span className="text-[10px] font-mono text-green-400 uppercase">
                MIDI
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
