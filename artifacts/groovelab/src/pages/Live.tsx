import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Radio, Users, Play, Pause, Music, Settings, Link2, Copy, Check, ArrowLeft, Square, Loader2 } from 'lucide-react';

interface LiveSession {
  id: string;
  roomCode: string;
  teacherId: string | null;
  title: string | null;
  isActive: boolean;
  currentLoopId: string | null;
  currentTempo: number | null;
  participantCount: number;
  createdAt: string;
}

interface SessionState {
  currentLoopId: string | null;
  currentTempo: number | null;
  isActive: boolean;
}

export default function Live() {
  const [role, setRole] = useState<'selection' | 'student' | 'teacher'>('selection');
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Polling state for student
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  // Teacher controls
  const [teacherTempo, setTeacherTempo] = useState(120);
  const [teacherPlaying, setTeacherPlaying] = useState(false);
  const [showContentBrowser, setShowContentBrowser] = useState(false);
  const [loops, setLoops] = useState<Array<{ id: string; title: string; bpm: number }>>([]);
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/live/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Live Practice Session' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSession(data);
      setTeacherTempo(data.currentTempo || 120);
    } catch (e: any) {
      setError(e.message || 'Failed to create session');
    }
    setLoading(false);
  };

  const joinSession = async () => {
    if (roomCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/live/sessions/${roomCode}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSession(data);
    } catch (e: any) {
      setError(e.message || 'Session not found');
    }
    setLoading(false);
  };

  const copyRoomCode = useCallback(() => {
    if (session?.roomCode) {
      navigator.clipboard.writeText(session.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [session]);

  // Student polling: poll session state every 2 seconds
  useEffect(() => {
    if (role !== 'student' || !session) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/live/sessions/${session.roomCode}/state`);
        if (res.ok) {
          const data: SessionState = await res.json();
          setSessionState(data);
        }
      } catch {}
    };

    poll(); // initial fetch
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [role, session]);

  // Teacher: update session state on the server
  const updateSessionState = useCallback(async (updates: Partial<SessionState>) => {
    if (!session) return;
    try {
      await fetch(`/api/live/sessions/${session.roomCode}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.log('Failed to update session state');
    }
  }, [session]);

  // Teacher: sync tempo changes to server
  const handleTeacherTempoChange = useCallback((value: number[]) => {
    const newTempo = value[0];
    setTeacherTempo(newTempo);
    updateSessionState({ currentTempo: newTempo });
  }, [updateSessionState]);

  // Teacher: toggle play state
  const handleTeacherPlayToggle = useCallback(() => {
    const newPlaying = !teacherPlaying;
    setTeacherPlaying(newPlaying);
    updateSessionState({ isActive: newPlaying });
  }, [teacherPlaying, updateSessionState]);

  // Teacher: select a loop
  const handleSelectLoop = useCallback((loopId: string) => {
    setSelectedLoopId(loopId);
    updateSessionState({ currentLoopId: loopId });
    setShowContentBrowser(false);
  }, [updateSessionState]);

  // Fetch available loops when content browser is opened
  useEffect(() => {
    if (!showContentBrowser) return;
    fetch('/api/loops?limit=20')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLoops(data.map((l: any) => ({ id: l.id, title: l.title, bpm: l.bpm })));
        } else if (data.loops) {
          setLoops(data.loops.map((l: any) => ({ id: l.id, title: l.title, bpm: l.bpm })));
        }
      })
      .catch(() => {});
  }, [showContentBrowser]);

  // Selection screen
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

  // Student join screen
  if (role === 'student' && !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-144px)] p-6">
        <Button variant="ghost" className="absolute top-24 left-6" onClick={() => setRole('selection')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
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
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))}
                placeholder="ABC123"
                className="text-center font-mono text-4xl tracking-[0.5em] h-20 uppercase bg-muted border-border focus-visible:ring-primary"
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button className="w-full h-12 text-lg font-medium" disabled={roomCode.length !== 6 || loading} onClick={joinSession}>
                {loading ? 'Connecting...' : 'Connect to Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student connected view with polling
  if (role === 'student' && session) {
    const state = sessionState;
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-144px)] p-6 max-w-2xl mx-auto">
        <Button variant="ghost" className="absolute top-24 left-6" onClick={() => { setSession(null); setRoomCode(''); setSessionState(null); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Leave
        </Button>

        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 text-sage border-sage/30">
            <span className="w-2 h-2 rounded-full bg-sage mr-2 animate-pulse" />
            Connected
          </Badge>
          <h2 className="font-serif text-3xl mb-2">{session.title || 'Live Session'}</h2>
          <p className="text-muted-foreground font-mono text-sm">Room: {session.roomCode}</p>
        </div>

        <Card className="w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <div className={`w-32 h-32 rounded-full border flex items-center justify-center mx-auto mb-6 vinyl-texture ${state?.isActive ? 'border-primary/50 animate-[spin_4s_linear_infinite]' : 'border-primary/30'}`}>
              <div className="w-10 h-10 bg-background rounded-full border border-border" />
            </div>

            {state?.isActive ? (
              <div className="space-y-4">
                <Badge className="bg-coral text-white border-none">
                  <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  PLAYING
                </Badge>
                <p className="text-muted-foreground">Teacher is leading the session</p>
              </div>
            ) : (
              <p className="text-muted-foreground mb-4">Waiting for teacher to start playback...</p>
            )}

            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {session.participantCount} connected
              </span>
              {state?.currentTempo && (
                <span className="font-mono text-lg text-primary font-bold">{state.currentTempo} BPM</span>
              )}
            </div>

            {state?.currentLoopId && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Current Loop</p>
                <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1">
                  <Music className="w-4 h-4" /> Loop loaded
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Teacher view
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 min-h-[calc(100vh-144px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setRole('selection'); setSession(null); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-serif text-3xl">Host Session</h2>
        </div>

        {session ? (
          <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-lg border border-border">
            <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Room Code</span>
            <span className="font-mono text-3xl text-primary tracking-widest font-bold">{session.roomCode}</span>
            <Button variant="ghost" size="icon" onClick={copyRoomCode}>
              {copied ? <Check className="w-4 h-4 text-sage" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        ) : (
          <Button onClick={createSession} disabled={loading} className="h-12 px-6">
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!session ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center p-12">
            <Radio className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-2xl mb-2">Create a Session</h3>
            <p className="text-muted-foreground mb-6 max-w-md">Click the button above to generate a room code that your students can use to join.</p>
            <Button onClick={createSession} disabled={loading} size="lg">
              {loading ? 'Creating...' : 'Create Session'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 bg-black/90 flex items-center justify-center relative min-h-[300px]">
                <div className={`w-32 h-32 rounded-full border border-primary/30 flex items-center justify-center vinyl-texture ${teacherPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <div className="w-10 h-10 bg-black rounded-full" />
                </div>
                <div className="absolute top-4 left-4">
                  {teacherPlaying ? (
                    <Badge className="bg-coral text-white border-none">
                      <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                      LIVE
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">PAUSED</Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4 text-sm text-white/60 font-mono">
                  {session.participantCount} connected
                </div>
              </div>
              <div className="p-6 bg-card">
                <h3 className="font-medium text-2xl mb-1">{session.title || 'Live Session'}</h3>
                <p className="text-muted-foreground mb-6">
                  Share code <span className="font-mono text-primary font-bold">{session.roomCode}</span> with your students
                </p>
                <div className="flex items-center justify-center gap-6">
                  <Button variant="outline" size="icon" className="w-12 h-12 rounded-full" onClick={() => setShowContentBrowser(!showContentBrowser)} title="Browse Content">
                    <Music className="w-5 h-5" />
                  </Button>
                  <Button
                    className={`w-20 h-20 rounded-full ${teacherPlaying ? 'bg-coral hover:bg-coral/80 shadow-[0_0_20px_rgba(231,76,60,0.4)]' : 'bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(226,168,50,0.4)]'}`}
                    onClick={handleTeacherPlayToggle}
                  >
                    {teacherPlaying ? <Square className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-2" fill="currentColor" />}
                  </Button>
                  <Button variant="outline" size="icon" className="w-12 h-12 rounded-full">
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Content Browser */}
            {showContentBrowser && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-serif text-xl flex items-center gap-2">
                    <Music className="w-5 h-5" /> Content Browser
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loops.length === 0 ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading loops...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {loops.map((loop) => (
                        <button
                          key={loop.id}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                            selectedLoopId === loop.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted border border-transparent'
                          }`}
                          onClick={() => handleSelectLoop(loop.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Music className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{loop.title}</span>
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs">{loop.bpm} BPM</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Tempo Control */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Tempo Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <span className="font-mono text-5xl font-bold text-primary">{teacherTempo}</span>
                  <span className="text-sm text-muted-foreground ml-2">BPM</span>
                </div>
                <Slider
                  value={[teacherTempo]}
                  min={40}
                  max={240}
                  step={1}
                  onValueChange={handleTeacherTempoChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>40</span>
                  <span>240</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleTeacherTempoChange([Math.max(40, teacherTempo - 5)])}>-5</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleTeacherTempoChange([Math.min(240, teacherTempo + 5)])}>+5</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-serif text-xl">
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room Code</span>
                  <span className="font-mono font-bold text-primary">{session.roomCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={`text-xs ${teacherPlaying ? 'text-coral border-coral/30' : 'text-sage border-sage/30'}`}>
                    {teacherPlaying ? 'Playing' : 'Paused'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants</span>
                  <span className="font-mono">{session.participantCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-mono text-xs">{new Date(session.createdAt).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Users className="w-5 h-5" /> Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {session.participantCount === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No students connected yet. Share the room code to get started.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {session.participantCount} student(s) connected
                  </p>
                )}
              </CardContent>
            </Card>

            <Button variant="destructive" className="w-full" onClick={() => { updateSessionState({ isActive: false }); setSession(null); setRole('selection'); }}>
              End Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
