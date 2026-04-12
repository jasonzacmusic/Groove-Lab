import React, { useState } from 'react';
import { useGetChordProgressions } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Piano, Play, Music, ArrowUp, ArrowDown, Star } from 'lucide-react';
import * as Tone from 'tone';

const CHORD_TABS = ['All', 'ii-V-I', 'I-vi-ii-V', 'Blues', 'Rhythm Changes', 'Modal', 'Standards'];
const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export default function Chords() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedKey, setSelectedKey] = useState('C');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { data: progressions, isLoading } = useGetChordProgressions({
    type: activeTab !== 'All' ? activeTab : undefined,
    key: selectedKey !== 'All' ? selectedKey : undefined,
  });

  const playChord = async (id: string, chords: any[]) => {
    await Tone.start();
    setPlayingId(id);
    
    // Simple placeholder playback
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
    }).toDestination();

    const now = Tone.now();
    let timeOffset = 0;

    chords.forEach((chord, i) => {
      // Super basic root note extraction just for effect
      const noteStr = chord.chord.replace(/[^A-G#b]/g, '') + '4';
      synth.triggerAttackRelease([noteStr], '2n', now + timeOffset);
      timeOffset += 1;
    });

    setTimeout(() => {
      setPlayingId(null);
    }, timeOffset * 1000);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-serif text-3xl flex items-center gap-2">
          <Piano className="w-8 h-8 text-primary" /> Chord Lab
        </h2>
        
        <div className="flex items-center gap-4">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-[120px] bg-card border-border">
              <SelectValue placeholder="Key" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Keys</SelectItem>
              {KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Difficulty</SelectItem>
              <SelectItem value="beginner">Beginner (1-3)</SelectItem>
              <SelectItem value="intermediate">Intermediate (4-7)</SelectItem>
              <SelectItem value="advanced">Advanced (8-10)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex w-max space-x-2">
          {CHORD_TABS.map(tab => (
            <Badge 
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              className={`cursor-pointer px-4 py-1.5 text-sm ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
           Array.from({ length: 6 }).map((_, i) => (
             <Card key={i} className="border-border bg-card">
               <CardContent className="p-6">
                 <Skeleton className="h-8 w-1/3 mb-6" />
                 <div className="flex gap-4">
                   <Skeleton className="h-16 w-16 rounded-md" />
                   <Skeleton className="h-16 w-16 rounded-md" />
                   <Skeleton className="h-16 w-16 rounded-md" />
                 </div>
               </CardContent>
             </Card>
           ))
        ) : (
          progressions?.map((prog) => (
            <Card key={prog.id} className="overflow-hidden border-border bg-card hover:border-primary/30 transition-colors group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-serif text-xl text-foreground mb-2">{prog.name}</h3>
                    <div className="flex gap-2 items-center">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-xs">{prog.keySignature || 'C'}</Badge>
                      {prog.genre && <Badge variant="outline" className="text-xs">{prog.genre.name}</Badge>}
                      <div className="flex text-amber-500 ml-2">
                        {Array.from({length: 3}).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < (prog.difficultyLevel || 1)/3 ? 'fill-current' : 'opacity-30'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={`rounded-full ${playingId === prog.id ? 'bg-coral text-white border-coral shadow-[0_0_10px_rgba(231,76,60,0.5)]' : 'border-primary text-primary hover:bg-primary hover:text-white'}`}
                      onClick={() => playChord(prog.id, prog.chords)}
                    >
                      <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-4 flex flex-wrap gap-3 items-center border border-border/50 font-serif text-2xl text-foreground">
                  {prog.chords.map((c, i) => (
                    <div key={i} className="flex items-center">
                      <div className="bg-background px-4 py-2 rounded-lg border border-border shadow-sm text-center min-w-[60px]">
                        {c.chord}
                        <div className="text-[10px] font-mono text-muted-foreground mt-1 opacity-60 font-sans tracking-widest">
                          {Array.from({length: c.beats}).map(() => '·').join(' ')}
                        </div>
                      </div>
                      {i < prog.chords.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                      <ArrowDown className="w-4 h-4 mr-1" /> Transpose
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                      <ArrowUp className="w-4 h-4 mr-1" />
                    </Button>
                  </div>
                  <Button variant="secondary" size="sm" className="h-8 bg-primary/10 text-primary hover:bg-primary hover:text-white">
                    <Music className="w-4 h-4 mr-2" /> Find Loops
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}