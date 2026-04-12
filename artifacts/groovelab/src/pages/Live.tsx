import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Radio, Users, Play, Music, Settings, Link2 } from 'lucide-react';

export default function Live() {
  const [role, setRole] = useState<'selection' | 'student' | 'teacher'>('selection');
  const [roomCode, setRoomCode] = useState('');

  if (role === 'selection') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-144px)] p-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8 border border-primary/20 shadow-[0_0_30px_rgba(226,168,50,0.2)]">
          <Radio className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-serif text-4xl mb-4 text-center">Live Sessions</h2>
        <p className="text-muted-foreground mb-12 text-center max-w-md">Join a synchronized playback room to practice together, or host a session for your students.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Card className="bg-card border-border hover:border-primary/50 cursor-pointer transition-all hover:translate-y-[-2px]" onClick={() => setRole('student')}>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                <Link2 className="w-6 h-6 text-foreground" />
              </div>
              <CardTitle className="font-serif text-2xl">Join a Session</CardTitle>
              <CardDescription>I have a room code</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border hover:border-primary/50 cursor-pointer transition-all hover:translate-y-[-2px]" onClick={() => setRole('teacher')}>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="font-serif text-2xl">Host a Session</CardTitle>
              <CardDescription>Create a room and control playback</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (role === 'student') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-144px)] p-6">
        <Button variant="ghost" className="absolute top-24 left-6" onClick={() => setRole('selection')}>
           &larr; Back
        </Button>
        <Card className="w-full max-w-md bg-card border-border shadow-xl">
          <CardHeader className="text-center pb-2">
            <Radio className="w-8 h-8 text-primary mx-auto mb-4" />
            <CardTitle className="font-serif text-3xl">Enter Room Code</CardTitle>
            <CardDescription>Ask your teacher for the 6-character code</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Input 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().substring(0, 6))}
                placeholder="ABCDEF"
                className="text-center font-mono text-4xl tracking-[0.5em] h-20 uppercase bg-muted border-border focus-visible:ring-primary uppercase"
              />
              <Button className="w-full h-12 text-lg font-medium" disabled={roomCode.length !== 6}>
                Connect to Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Teacher View
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 min-h-[calc(100vh-144px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setRole('selection')}>&larr;</Button>
          <h2 className="font-serif text-3xl flex items-center gap-2">
             Host Session
          </h2>
        </div>
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-lg border border-border">
          <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Room Code</span>
          <span className="font-mono text-3xl text-primary tracking-widest font-bold">X7B9K2</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Player */}
          <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 bg-black/90 flex items-center justify-center relative">
               <div className="w-32 h-32 rounded-full border border-primary/30 flex items-center justify-center vinyl-texture animate-[spin_4s_linear_infinite]">
                 <div className="w-10 h-10 bg-black rounded-full" />
               </div>
               <div className="absolute top-4 left-4 flex gap-2">
                 <div className="bg-coral text-white px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
                 </div>
               </div>
            </div>
            <div className="p-6 bg-card">
               <h3 className="font-medium text-2xl mb-1 text-foreground">Jazz Standard Backing Track</h3>
               <p className="text-muted-foreground mb-6">Currently playing for 4 students</p>
               
               <div className="flex items-center justify-center gap-6">
                  <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-border">
                    <Music className="w-5 h-5" />
                  </Button>
                  <Button className="w-20 h-20 rounded-full bg-coral hover:bg-coral/90 shadow-[0_0_20px_rgba(231,76,60,0.4)]">
                    <Play className="w-8 h-8 ml-2 text-white" fill="currentColor" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-border">
                    <Settings className="w-5 h-5" />
                  </Button>
               </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between font-serif text-xl">
                Queue <Button variant="ghost" size="sm" className="text-primary hover:text-primary">Add</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer group">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center group-hover:bg-primary/20">
                    <Music className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">Loop #{i}</p>
                    <p className="text-xs text-muted-foreground font-mono">120 BPM</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Users className="w-5 h-5" /> Participants (4)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Alex', 'Sarah', 'Mike', 'Emma'].map((name) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {name[0]}
                    </div>
                    <span className="text-sm text-foreground">{name}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-sage shadow-[0_0_5px_rgba(127,176,105,0.5)]" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}