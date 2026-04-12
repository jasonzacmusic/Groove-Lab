import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Play, Target, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const MOCK_STANDARDS = [
  { id: 1, title: 'Autumn Leaves', composer: 'Joseph Kosma', year: 1945, key: 'Gm', timeSig: '4/4', form: 'AABC' },
  { id: 2, title: 'All The Things You Are', composer: 'Jerome Kern', year: 1939, key: 'Ab', timeSig: '4/4', form: 'ABCD' },
  { id: 3, title: 'Blue Bossa', composer: 'Kenny Dorham', year: 1963, key: 'Cm', timeSig: '4/4', form: 'A' },
  { id: 4, title: 'Take Five', composer: 'Paul Desmond', year: 1959, key: 'Ebm', timeSig: '5/4', form: 'ABA' },
  { id: 5, title: 'So What', composer: 'Miles Davis', year: 1959, key: 'Dm', timeSig: '4/4', form: 'AABA' },
];

export default function Standards() {
  const [search, setSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<any>(MOCK_STANDARDS[0]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* Sidebar List */}
      <aside className="w-full md:w-80 border-r border-border bg-sidebar flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <h2 className="font-serif text-2xl flex items-center gap-2 mb-4">
            <BookOpen className="w-6 h-6 text-primary" /> The Real Book
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search standards..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border" 
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {MOCK_STANDARDS.map(std => (
              <div 
                key={std.id}
                className={`p-4 border-b border-border cursor-pointer transition-colors flex items-center justify-between group ${selectedStandard?.id === std.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted border-l-4 border-l-transparent'}`}
                onClick={() => setSelectedStandard(std)}
              >
                <div>
                  <h4 className={`font-serif text-lg ${selectedStandard?.id === std.id ? 'text-primary' : 'text-foreground'}`}>{std.title}</h4>
                  <p className="text-xs text-muted-foreground">{std.composer}</p>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedStandard?.id === std.id ? 'text-primary translate-x-1' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content Detail */}
      <div className="flex-1 bg-background overflow-y-auto p-6 md:p-10">
        {selectedStandard ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="font-serif text-5xl text-foreground mb-4">{selectedStandard.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                <span>By {selectedStandard.composer} ({selectedStandard.year})</span>
                <span>•</span>
                <span className="font-mono text-primary bg-primary/10 px-2 rounded">Key: {selectedStandard.key}</span>
                <span>•</span>
                <span className="font-mono">{selectedStandard.timeSig}</span>
                <span>•</span>
                <span>Form: {selectedStandard.form}</span>
              </div>
              
              <div className="flex gap-3">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Play className="w-4 h-4 mr-2" fill="currentColor" /> Play Backing Track
                </Button>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <Target className="w-4 h-4 mr-2" /> Start Practice Session
                </Button>
              </div>
            </div>

            <Card className="bg-card border-border overflow-hidden vinyl-texture">
              <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                <h3 className="font-medium text-foreground">Chord Chart</h3>
                <Badge variant="outline" className="font-mono bg-background">Transpose: 0</Badge>
              </div>
              <CardContent className="p-8">
                {/* Clean Typography Chart Simulation */}
                <div className="font-serif text-2xl text-foreground space-y-8">
                  {/* A Section */}
                  <div>
                    <div className="text-sm font-sans font-bold text-muted-foreground mb-4 tracking-widest border-b border-border pb-1">A SECTION</div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Am7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">D7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Gmaj7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Cmaj7</div>
                      
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">F#m7b5</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">B7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Em</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">%</div>
                    </div>
                  </div>
                  
                  {/* B Section */}
                  <div>
                    <div className="text-sm font-sans font-bold text-muted-foreground mb-4 tracking-widest border-b border-border pb-1">B SECTION</div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">F#m7b5</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">B7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Em</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">%</div>
                      
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Am7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">D7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Gmaj7</div>
                      <div className="py-4 border border-border/50 rounded bg-background shadow-sm">Cmaj7</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="font-serif text-2xl mb-4">Curated Backing Tracks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2].map(i => (
                  <Card key={i} className="flex flex-row overflow-hidden border-border bg-card group cursor-pointer hover:border-primary/50">
                    <div className="w-1/3 bg-muted flex items-center justify-center relative">
                      <Play className="w-8 h-8 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4 flex-1">
                      <h4 className="font-medium text-foreground mb-1">{selectedStandard.title} - Backing Track</h4>
                      <p className="text-xs text-muted-foreground mb-2">GrooveLab Official</p>
                      <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">120 BPM</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="font-serif text-2xl">Select a standard</h3>
          </div>
        )}
      </div>
    </div>
  );
}