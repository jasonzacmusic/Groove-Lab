import React, { useRef, useCallback } from 'react';
import { useSequencerStore } from '../store/sequencer';
import { useAudioEngine } from '../context/AudioEngineContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Settings2, Volume2 } from 'lucide-react';

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
  kick:        'KICK',
  snare:       'SNARE',
  hihatClosed: 'HH CL',
  hihatOpen:   'HH OP',
  ride:        'RIDE',
  crash:       'CRASH',
  tomHigh:     'TOM H',
  tomMid:      'TOM M',
  tomLow:      'TOM L',
  cowbell:     'COWBL',
  clap:        'CLAP',
  crossStick:  'X-STK',
};

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, ringW: number) {
  const outerR = r;
  const innerR = r - ringW;
  const start = polarToXY(cx, cy, outerR, startDeg);
  const end   = polarToXY(cx, cy, outerR, endDeg);
  const iStart = polarToXY(cx, cy, innerR, startDeg);
  const iEnd   = polarToXY(cx, cy, innerR, endDeg);
  const large  = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${end.x} ${end.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${iStart.x} ${iStart.y}`,
    'Z'
  ].join(' ');
}

interface PizzaSequencerProps {
  size?: number;
}

export function PizzaSequencer({ size = 480 }: PizzaSequencerProps) {
  const store = useSequencerStore();
  const { playPreview } = useAudioEngine();
  const svgRef = useRef<SVGSVGElement>(null);

  const cx = size / 2;
  const cy = size / 2;
  const ringW = 26;
  const ringGap = 4;
  const coreR = 38;

  const instruments = KIT_INSTRUMENTS[store.selectedKit];
  const totalBeats = store.timeSignature.numerator;
  const totalSlices = store.beats.reduce((acc, b) => acc + b.length, 0);

  // Build flat slice list with beat/slice indices
  const sliceList: { beat: number; slice: number; globalIdx: number }[] = [];
  for (let b = 0; b < store.beats.length; b++) {
    for (let s = 0; s < store.beats[b].length; s++) {
      sliceList.push({ beat: b, slice: s, globalIdx: sliceList.length });
    }
  }

  const sliceDeg = 360 / totalSlices;

  // Gap between arcs in degrees
  const arcGap = totalSlices <= 16 ? 1.5 : 0.8;

  const handleArcClick = useCallback((instrumentName: string, beat: number, slice: number) => {
    store.setSelectedInstrument(instrumentName as any);
    store.toggleHit(beat, slice);
    playPreview(instrumentName as any);
  }, [store, playPreview]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    >
      {/* Dotted grid background */}
      <defs>
        <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.04)" />
        </pattern>
        <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a2a4e" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx={cx} cy={cy} r={size / 2 - 4} fill="url(#dot-grid)" />
      <circle cx={cx} cy={cy} r={size / 2 - 4} fill="rgba(22,33,62,0.6)" />

      {/* Beat separator lines */}
      {Array.from({ length: totalBeats }).map((_, b) => {
        const angle = b * (360 / totalBeats) - 90;
        const rad = (angle * Math.PI) / 180;
        const outerR = coreR + instruments.length * (ringW + ringGap) + ringGap + 8;
        return (
          <line
            key={`beat-line-${b}`}
            x1={cx + coreR * Math.cos(rad)}
            y1={cy + coreR * Math.sin(rad)}
            x2={cx + outerR * Math.cos(rad)}
            y2={cy + outerR * Math.sin(rad)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        );
      })}

      {/* Instrument rings (outer = first in list) */}
      {instruments.map((instrumentName, ringIdx) => {
        const r = coreR + (instruments.length - ringIdx) * (ringW + ringGap);
        const color = INSTRUMENT_COLORS[instrumentName] || '#888';
        const isSelected = store.selectedInstrument === instrumentName;

        return (
          <g key={instrumentName}>
            {sliceList.map(({ beat, slice, globalIdx }) => {
              const startDeg = globalIdx * sliceDeg + arcGap / 2;
              const endDeg = (globalIdx + 1) * sliceDeg - arcGap / 2;
              const hit = store.beats[beat]?.[slice];
              const isActive = hit?.instrument === instrumentName;
              const isBeatStart = slice === 0;

              return (
                <path
                  key={`${instrumentName}-${beat}-${slice}`}
                  d={arcPath(cx, cy, r, startDeg, endDeg, ringW - 2)}
                  fill={isActive ? color : 'rgba(255,255,255,0.04)'}
                  stroke={isSelected && isBeatStart ? color : 'rgba(255,255,255,0.08)'}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill 0.1s ease',
                    filter: isActive ? `drop-shadow(0 0 4px ${color}88)` : undefined,
                  }}
                  onClick={() => handleArcClick(instrumentName, beat, slice)}
                />
              );
            })}

            {/* Ring label */}
            {(() => {
              const labelAngle = -85;
              const labelR = r - ringW / 2;
              const pos = polarToXY(cx, cy, labelR, labelAngle);
              return (
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="7"
                  fontFamily="'IBM Plex Mono', monospace"
                  fill={isSelected ? color : 'rgba(255,255,255,0.35)'}
                  style={{ pointerEvents: 'none', letterSpacing: '0.05em' }}
                >
                  {INSTRUMENT_LABELS[instrumentName] || instrumentName.toUpperCase()}
                </text>
              );
            })()}
          </g>
        );
      })}

      {/* Beat number labels on outer ring */}
      {Array.from({ length: totalBeats }).map((_, b) => {
        const slicesInBeat = store.beats[b]?.length || 4;
        const globalStart = sliceList.findIndex(s => s.beat === b);
        const midGlobalIdx = globalStart + Math.floor(slicesInBeat / 2) - (slicesInBeat % 2 === 0 ? 0.5 : 0);
        const midAngle = midGlobalIdx * sliceDeg + sliceDeg / 2;
        const outerR = coreR + instruments.length * (ringW + ringGap) + ringGap + 16;
        const pos = polarToXY(cx, cy, outerR, midAngle);
        return (
          <text
            key={`beat-num-${b}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="bold"
            fill="rgba(226,168,50,0.6)"
            style={{ pointerEvents: 'none' }}
          >
            {b + 1}
          </text>
        );
      })}

      {/* Core vinyl circle */}
      <circle cx={cx} cy={cy} r={coreR} fill="url(#core-gradient)" stroke="rgba(226,168,50,0.3)" strokeWidth="1.5" />
      {/* Vinyl grooves */}
      {[coreR - 6, coreR - 12, coreR - 18].map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" fontSize="9" fontFamily="'IBM Plex Mono', monospace" fill="rgba(226,168,50,0.8)" fontWeight="bold">
        PIZZA
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle" dominantBaseline="central" fontSize="7" fontFamily="'IBM Plex Mono', monospace" fill="rgba(255,255,255,0.4)">
        LAB
      </text>
    </svg>
  );
}

export default function Sequencer() {
  const store = useSequencerStore();
  const { isInitialized, isPlaying, startEngine, togglePlayback, playPreview } = useAudioEngine();

  const handleStart = async () => {
    if (!isInitialized) {
      await startEngine();
    }
    togglePlayback();
  };

  const instruments = KIT_INSTRUMENTS[store.selectedKit];

  return (
    <div className="p-4 md:p-6 flex flex-col h-[calc(100vh-144px)] max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-3xl">The Pizza Lab</h2>
        <div className="flex items-center gap-3">
          <Select value={store.selectedKit} onValueChange={store.setSelectedKit as any}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Kit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jazz">Jazz Acoustic</SelectItem>
              <SelectItem value="rock">Rock Studio</SelectItem>
              <SelectItem value="808">808 Electronic</SelectItem>
              <SelectItem value="latin">Latin Percussion</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={store.clearAll} title="Clear All">
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Pizza sequencer canvas */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-md flex items-center justify-center relative overflow-hidden vinyl-texture min-h-[320px]">
          <PizzaSequencer size={Math.min(500, 500)} />
        </div>

        {/* Instrument selector panel */}
        <div className="w-44 bg-card border border-border rounded-xl p-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 font-mono">Instrument</p>
          {instruments.map((inst) => {
            const color = INSTRUMENT_COLORS[inst] || '#888';
            const isSelected = store.selectedInstrument === inst;
            return (
              <button
                key={inst}
                onClick={() => {
                  store.setSelectedInstrument(inst as any);
                  playPreview(inst as any);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all text-xs font-mono ${
                  isSelected
                    ? 'bg-card border border-[var(--sel-color)] text-foreground'
                    : 'hover:bg-muted/60 text-muted-foreground'
                }`}
                style={{ '--sel-color': color } as React.CSSProperties}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isSelected ? color : 'rgba(255,255,255,0.15)', boxShadow: isSelected ? `0 0 6px ${color}` : undefined }}
                />
                {INSTRUMENT_LABELS[inst]}
              </button>
            );
          })}

          <div className="mt-auto pt-3 border-t border-border">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 font-mono">Volume</p>
            <Slider defaultValue={[80]} min={0} max={100} step={1} className="mb-1" />
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
              <span>0</span><span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transport */}
      <div className="h-20 mt-4 bg-card border border-border rounded-xl shadow-md flex items-center px-6 gap-6 flex-shrink-0">
        <Button
          size="icon"
          className={`w-12 h-12 rounded-full ${isPlaying ? 'bg-coral hover:bg-coral/80 shadow-[0_0_15px_rgba(231,76,60,0.5)]' : 'bg-primary hover:bg-primary/90'}`}
          onClick={handleStart}
        >
          {isPlaying ? <Square className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
        </Button>

        <div className="flex flex-col items-center w-20">
          <input
            type="number"
            className="font-mono text-3xl font-bold tracking-tighter text-foreground bg-transparent w-full text-center border-none outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={store.bpm}
            min={20}
            max={400}
            onChange={(e) => store.setBpm(Number(e.target.value))}
          />
          <span className="text-[10px] uppercase font-bold text-muted-foreground">BPM</span>
        </div>

        <div className="w-px h-10 bg-border" />

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 font-mono text-xl">
            <Select value={store.timeSignature.numerator.toString()} onValueChange={(v) => store.setTimeSignature(parseInt(v), store.timeSignature.denominator)}>
              <SelectTrigger className="w-14 h-8 text-center px-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2,3,4,5,6,7,8,9,10,11,12].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">/</span>
            <Select value={store.timeSignature.denominator.toString()} onValueChange={(v) => store.setTimeSignature(store.timeSignature.numerator, parseInt(v))}>
              <SelectTrigger className="w-14 h-8 text-center px-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2,4,8,16].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground">SIG</span>
        </div>

        <div className="w-px h-10 bg-border" />

        <div className="flex-1 max-w-[180px] flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">SWING</span>
            <span className="text-[10px] font-mono text-muted-foreground">{store.swing > 0 ? '+' : ''}{store.swing}%</span>
          </div>
          <Slider
            value={[store.swing]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([v]) => store.setSwing(v)}
          />
        </div>

        <div className="w-px h-10 bg-border" />

        {/* Subdivision controls */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">SUBDIVISIONS</span>
          <div className="flex gap-1">
            {store.beats.map((beat, b) => (
              <Select key={b} value={beat.length.toString()} onValueChange={(v) => store.setSubdivision(b, parseInt(v))}>
                <SelectTrigger className="w-12 h-7 text-[10px] px-1 font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 6, 8].map(n => <SelectItem key={n} value={n.toString()} className="text-xs font-mono">{n}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
