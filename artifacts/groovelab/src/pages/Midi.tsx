import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Cpu, Play, Pause, FastForward, SkipBack, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

export default function Midi() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
        setUploadedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl flex items-center gap-2">
          <Cpu className="w-8 h-8 text-primary" /> MIDI Library
        </h2>
        <Button variant="outline" className="bg-card text-foreground border-border hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Upload .MID
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".mid,.midi" onChange={handleFileSelect} />
      </div>

      {/* Upload Zone (conditionally shown or always at top) */}
      {!uploadedFile && (
        <div 
          className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 vinyl-texture cursor-pointer">
            <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <h3 className="font-serif text-xl mb-2 text-foreground">Drop MIDI files here</h3>
          <p className="text-sm text-muted-foreground mb-4">or click to browse from your device</p>
          <Badge variant="outline" className="font-mono text-xs">Supports Format 0 and 1 (.mid)</Badge>
        </div>
      )}

      {/* Uploaded File Player */}
      {uploadedFile && (
        <Card className="border-primary/50 bg-card overflow-hidden">
          <div className="bg-muted p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg text-foreground">{uploadedFile.name}</h3>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">120 BPM</Badge>
                <Badge variant="outline" className="font-mono text-xs">4/4</Badge>
                <Badge variant="outline" className="text-xs">4 Tracks</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>Clear</Button>
          </div>
          
          <CardContent className="p-0">
            {/* Piano Roll Placeholder */}
            <div className="h-64 w-full bg-black/20 border-b border-border relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-muted border-r border-border flex flex-col items-center py-2 z-10 shadow-md">
                {['C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3'].map(note => (
                  <div key={note} className="flex-1 flex items-center justify-center w-full text-[10px] font-mono text-muted-foreground border-b border-border/50">
                    {note}
                  </div>
                ))}
              </div>
              
              {/* Fake Notes */}
              <div className="absolute inset-0 ml-16 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zOS41IDB2NDBNMCAzOS41aDQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')]">
                <div className="absolute top-[10%] left-[10%] w-[15%] h-[8%] bg-primary rounded-sm opacity-80" />
                <div className="absolute top-[30%] left-[30%] w-[10%] h-[8%] bg-coral rounded-sm opacity-80" />
                <div className="absolute top-[50%] left-[45%] w-[20%] h-[8%] bg-sage rounded-sm opacity-80" />
                <div className="absolute top-[20%] left-[70%] w-[15%] h-[8%] bg-primary rounded-sm opacity-80" />
              </div>

              {/* Playhead */}
              <div className="absolute top-0 bottom-0 w-px bg-coral left-[40%] z-20 shadow-[0_0_8px_rgba(231,76,60,0.8)]" />
            </div>

            {/* Transport */}
            <div className="p-4 flex items-center justify-between bg-card">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="w-10 h-10 rounded-full border-border">
                  <SkipBack className="w-4 h-4 text-foreground" />
                </Button>
                <Button 
                  variant="default" 
                  size="icon" 
                  className={`w-12 h-12 rounded-full ${isPlaying ? 'bg-coral hover:bg-coral/80 shadow-[0_0_10px_rgba(231,76,60,0.5)]' : 'bg-primary hover:bg-primary/90'}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 ml-1 text-white" />}
                </Button>
                <Button variant="outline" size="icon" className="w-10 h-10 rounded-full border-border">
                  <FastForward className="w-4 h-4 text-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className={`w-10 h-10 rounded-full ml-2 ${isPlaying ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4 w-1/3">
                <span className="font-mono text-xs text-muted-foreground w-12">0.5x</span>
                <Slider defaultValue={[1]} min={0.5} max={2} step={0.1} className="flex-1" />
                <span className="font-mono text-xs text-muted-foreground w-12">2.0x</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Library Grid */}
      <div>
        <h3 className="font-serif text-2xl mb-4">Community Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
             <Card key={i} className="overflow-hidden border-border bg-card hover:border-primary/50 transition-colors cursor-pointer group vinyl-hover">
               <CardContent className="p-4">
                 <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                   <Cpu className="w-6 h-6" />
                 </div>
                 <h4 className="font-medium text-lg truncate mb-2">Groove Pattern #{i + 1}</h4>
                 <div className="flex flex-wrap items-center gap-2 mb-3">
                   <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">{(100 + i * 5)} BPM</Badge>
                   <Badge variant="outline" className="font-mono text-xs">4/4</Badge>
                 </div>
                 <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border flex justify-between">
                   <span>2 Tracks</span>
                   <span>0:14</span>
                 </div>
               </CardContent>
             </Card>
          ))}
        </div>
      </div>
    </div>
  );
}