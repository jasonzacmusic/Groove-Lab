import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Volume2 } from 'lucide-react';
import { MelodyStaff } from './MelodyStaff';
import { generateScaleAbc, generateArpeggioAbc, scaleToNotes, arpeggioToNotes } from '@/data/exam-syllabus/abc-generators';
import * as Tone from 'tone';

interface ScalePlayerProps {
  scaleKey: string;
  type: string;
  octaves: number;
  mode: 'scale' | 'arpeggio';
  label?: string;
  clef?: string;
}

export function ScalePlayer({ scaleKey, type, octaves, mode, label, clef }: ScalePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIdx, setCurrentNoteIdx] = useState(-1);
  const [bpm, setBpm] = useState(72);
  const [showNotation, setShowNotation] = useState(true);

  const synthRef = useRef<Tone.Synth | null>(null);
  const metronomeRef = useRef<Tone.MetalSynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);

  // Generate ABC and notes
  const abc = mode === 'scale'
    ? generateScaleAbc(scaleKey, type, octaves, clef)
    : generateArpeggioAbc(scaleKey, type, octaves, clef);

  const notes = mode === 'scale'
    ? scaleToNotes(scaleKey, type, octaves)
    : arpeggioToNotes(scaleKey, type, octaves);

  const displayName = label || `${scaleKey} ${type.replace(/_/g, ' ')} ${mode} (${octaves} oct.)`;

  const stop = useCallback(() => {
    partRef.current?.stop();
    partRef.current?.dispose();
    partRef.current = null;
    synthRef.current?.dispose();
    synthRef.current = null;
    metronomeRef.current?.dispose();
    metronomeRef.current = null;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setIsPlaying(false);
    setCurrentNoteIdx(-1);
  }, []);

  const play = useCallback(async () => {
    if (isPlaying) { stop(); return; }
    stop();

    try {
      await Tone.start();

      const transport = Tone.getTransport();
      transport.bpm.value = bpm;

      // Create synth
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
        volume: -4,
      }).toDestination();
      synthRef.current = synth;

      // Create metronome click
      const metro = new Tone.MetalSynth({
        harmonicity: 5.1,
        modulationIndex: 16,
        resonance: 3000,
        octaves: 1.5,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
        volume: -22,
      }).toDestination();
      metronomeRef.current = metro;

      // Schedule notes
      notes.forEach((note, idx) => {
        transport.schedule((time) => {
          synth.triggerAttackRelease(note.pitch, note.duration, time, 0.8);
          Tone.getDraw().schedule(() => {
            setCurrentNoteIdx(idx);
          }, time);
        }, `0:${note.beat}:0`);
      });

      // Schedule metronome on every beat
      const totalBeats = notes.length > 0 ? notes[notes.length - 1].beat + 2 : 4;
      for (let b = 0; b < totalBeats; b++) {
        transport.schedule((time) => {
          if (metronomeRef.current) {
            metronomeRef.current.triggerAttackRelease('C6', '32n', time, 0.1);
          }
        }, `0:${b}:0`);
      }

      // Schedule end
      transport.schedule(() => {
        Tone.getDraw().schedule(() => {
          stop();
        }, Tone.now());
      }, `0:${totalBeats}:0`);

      setIsPlaying(true);
      transport.start();
    } catch (err) {
      console.error('Scale playback failed:', err);
      stop();
    }
  }, [isPlaying, bpm, notes, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlaying ? 'destructive' : 'default'}
            className="h-8 px-3 gap-1.5"
            onClick={play}
          >
            {isPlaying ? (
              <><Square className="w-3.5 h-3.5" fill="currentColor" /> Stop</>
            ) : (
              <><Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" /> Play</>
            )}
          </Button>
          <span className="text-sm font-medium truncate">{displayName}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground w-12">{bpm} BPM</span>
            <Slider
              value={[bpm]}
              min={40}
              max={180}
              step={4}
              onValueChange={([v]) => setBpm(v)}
              className="w-24"
            />
          </div>
          <Badge variant="outline" className="text-[10px]">
            {octaves} oct.
          </Badge>
        </div>
      </div>

      {/* Notation */}
      {showNotation && (
        <div className="px-2 py-1">
          <MelodyStaff
            abc={abc}
            currentNoteIdx={currentNoteIdx}
            isVisible={true}
          />
        </div>
      )}
    </div>
  );
}

export default ScalePlayer;
