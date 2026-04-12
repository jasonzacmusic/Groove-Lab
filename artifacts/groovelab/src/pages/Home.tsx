import React from 'react';
import { Link } from 'wouter';
import { useGetLoops, useGetTaxonomy } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/context/PlayerContext';
import {
  Compass, Play, Music, Timer, Cpu, Piano, BookOpen,
  GraduationCap, Radio, Star, ExternalLink,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const TOOLS = [
  { name: 'Rhythm Circles', desc: 'Beat sequencer with 8 preset grooves', icon: Music, path: '/sequencer', color: 'text-amber-400' },
  { name: 'Pro Metronome', desc: 'Tempo ramp, rhythm trainer, 12 presets', icon: Timer, path: '/metronome', color: 'text-green-400' },
  { name: 'MIDI Library', desc: '8 starter patterns, upload your own', icon: Cpu, path: '/midi', color: 'text-blue-400' },
  { name: 'Chord Lab', desc: '44 progressions with playback', icon: Piano, path: '/chords', color: 'text-purple-400' },
  { name: 'Jazz Standards', desc: '99 standards with Real Book charts', icon: BookOpen, path: '/standards', color: 'text-pink-400' },
  { name: 'Play-Alongs', desc: 'Trinity & ABRSM exam content', icon: GraduationCap, path: '/play-along', color: 'text-cyan-400' },
];

const FEATURED_SEARCHES = [
  { label: 'Jazz Drum Loops', query: 'jazz drum loop backing track BPM', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Blues Backing Tracks', query: 'blues backing track 12 bar', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { label: 'Funk Grooves', query: 'funk drum loop groove backing track', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { label: 'Bossa Nova', query: 'bossa nova backing track jazz', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Rock Drum Loops', query: 'rock drum loop 120 BPM', color: 'text-red-400', bg: 'bg-red-500/10' },
  { label: 'Neo Soul', query: 'neo soul drum loop backing track', color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

function YouTubeSearchCard({ label, query, color, bg }: { label: string; query: string; color: string; bg: string }) {
  return (
    <Card className="overflow-hidden hover:border-primary/40 transition-colors group">
      <div className={`aspect-video ${bg} flex flex-col items-center justify-center gap-3 relative`}>
        <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <p className={`text-sm font-medium ${color}`}>{label}</p>
      </div>
      <CardContent className="p-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground font-mono truncate">"{query}"</p>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md px-2.5 py-1.5 font-medium transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Search
        </a>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: taxonomy } = useGetTaxonomy();
  const { data: loopsData, isLoading } = useGetLoops({ limit: 8 });
  const { playLoop } = usePlayer();

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="text-center py-6 md:py-10">
        <h1 className="font-serif text-4xl md:text-5xl mb-3">
          Welcome to <span className="text-primary">GrooveLab</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Music education platform with drum loops, backing tracks, chord progressions, and practice tools.
        </p>
      </section>

      {/* Quick Tools */}
      <section>
        <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" /> Practice Tools
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOOLS.map((tool) => (
            <Link key={tool.path} href={tool.path}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full group">
                <CardContent className="p-4 text-center">
                  <tool.icon className={`w-8 h-8 mx-auto mb-2 ${tool.color} group-hover:scale-110 transition-transform`} />
                  <h3 className="font-medium text-sm">{tool.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{tool.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Drum Loops from Database */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" /> Drum Loops & Backing Tracks
          </h2>
          <Link href="/explore">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {/* Genre pills */}
        <ScrollArea className="w-full whitespace-nowrap pb-3">
          <div className="flex w-max space-x-2">
            {taxonomy?.genres?.slice(0, 12).map((g) => (
              <Link key={g.id} href={`/explore`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary/50">
                  {g.name}
                </Badge>
              </Link>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : (
            loopsData?.loops?.map((loop) => (
              <Card key={loop.id} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => playLoop(loop)}>
                <div className="aspect-video relative bg-muted">
                  {loop.youtubeVideoId ? (
                    <img src={`https://img.youtube.com/vi/${loop.youtubeVideoId}/mqdefault.jpg`}
                      alt={loop.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white" fill="currentColor" />
                  </div>
                </div>
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm truncate">{loop.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {loop.bpm && <Badge variant="secondary" className="font-mono text-[10px]">{loop.bpm} BPM</Badge>}
                    {loop.timeSignatures?.[0] && <Badge variant="outline" className="font-mono text-[10px]">{loop.timeSignatures[0].displayName}</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Avatar className="w-4 h-4">
                      <AvatarFallback className="text-[8px]">{loop.creator?.channelName?.substring(0, 2).toUpperCase() || 'GL'}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{loop.creator?.channelName || 'Unknown'}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Featured Practice Content — YouTube search links */}
      <section>
        <h2 className="font-serif text-2xl mb-2 flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" /> Featured Practice Content
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Search YouTube directly for the best backing tracks in each genre.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_SEARCHES.map((fs) => (
            <YouTubeSearchCard key={fs.label} label={fs.label} query={fs.query} color={fs.color} bg={fs.bg} />
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
        <Link href="/live">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Radio className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-serif text-lg">Live Sessions</h3>
                <p className="text-sm text-muted-foreground">Host or join a synchronized practice room</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/explore">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Compass className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-serif text-lg">Explore Loops</h3>
                <p className="text-sm text-muted-foreground">Browse by genre, BPM, time signature</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/creators">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Music className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-serif text-lg">Creators</h3>
                <p className="text-sm text-muted-foreground">Discover drum loop creators</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
