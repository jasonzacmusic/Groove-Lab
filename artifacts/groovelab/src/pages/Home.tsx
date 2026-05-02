import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { useGetTaxonomy } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlayer } from '@/context/PlayerContext';
import {
  Compass, Play, Music, Timer, Cpu, Piano, BookOpen,
  GraduationCap, Radio, Star,
} from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import {
  GENRES, TEMPO_BUCKETS, GENRE_VIDEO_LIBRARY_BY_TEMPO,
  tempoLabel, type TempoBucket,
} from '@/data/genre-videos';
import { KEY_BACKING_TRACKS } from '@/data/chord-videos';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Build key tracks from the chord-videos KEY_BACKING_TRACKS
const KEY_TRACKS = Object.entries(KEY_BACKING_TRACKS)
  .filter(([, videos]) => videos.length > 0)
  .map(([key, videos]) => ({ key, video: videos[0] }));

const TOOLS = [
  { name: 'Rhythm Circles', desc: 'Beat sequencer with 8 preset grooves', icon: Music, path: '/sequencer', color: 'text-amber-400' },
  { name: 'Pro Metronome', desc: 'Tempo ramp, rhythm trainer, 12 presets', icon: Timer, path: '/metronome', color: 'text-green-400' },
  { name: 'MIDI Library', desc: '8 starter patterns, upload your own', icon: Cpu, path: '/midi', color: 'text-blue-400' },
  { name: 'Chord Lab', desc: '44 progressions with playback', icon: Piano, path: '/chords', color: 'text-purple-400' },
  { name: 'Jazz Standards', desc: '99 standards with Real Book charts', icon: BookOpen, path: '/standards', color: 'text-pink-400' },
  { name: 'Play-Alongs', desc: 'Trinity & ABRSM exam content', icon: GraduationCap, path: '/play-along', color: 'text-cyan-400' },
];

// KEY_TRACKS built above from KEY_BACKING_TRACKS

// ── Backing-track browser (genre dropdown × tempo tabs) ─────────────────────
function BackingTrackBrowser() {
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [bucket, setBucket] = useState<TempoBucket>('medium');

  // Counts per bucket for the current genre — used to disable empty tabs.
  const counts = useMemo(() => {
    const buckets = GENRE_VIDEO_LIBRARY_BY_TEMPO[genre];
    if (!buckets) return { slow: 0, medium: 0, fast: 0, veryFast: 0 } as Record<TempoBucket, number>;
    return {
      slow: buckets.slow.length,
      medium: buckets.medium.length,
      fast: buckets.fast.length,
      veryFast: buckets.veryFast.length,
    } as Record<TempoBucket, number>;
  }, [genre]);

  // Videos to render — first 9 from the active bucket.
  const videos = useMemo(() => {
    const buckets = GENRE_VIDEO_LIBRARY_BY_TEMPO[genre];
    if (!buckets) return [];
    return buckets[bucket].slice(0, 9);
  }, [genre, bucket]);

  return (
    <section>
      <h2 className="font-serif text-2xl mb-2 flex items-center gap-2">
        <Star className="w-5 h-5 text-primary" /> Backing Tracks by Genre & Tempo
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Curated YouTube backing tracks across {GENRES.length} genres, organized by tempo. Plays inline.
      </p>

      {/* Genre dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Genre</label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tempo tabs */}
        <div className="flex flex-wrap gap-1.5">
          {TEMPO_BUCKETS.map((b) => {
            const n = counts[b];
            const active = bucket === b;
            return (
              <button
                key={b}
                onClick={() => setBucket(b)}
                disabled={n === 0}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${active ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
                  ${n === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {tempoLabel(b)} <span className="opacity-70">· {n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id}>
              <YouTubeInline videoId={v.id} title={v.title} channel={v.channel} />
              <p className="text-xs font-medium mt-1.5 px-1 truncate text-muted-foreground">{v.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No {tempoLabel(bucket).toLowerCase()} tracks for {genre} yet — try another tempo bucket.
          </p>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { data: taxonomy } = useGetTaxonomy();
  // Fetch from the REAL audio loops endpoint (5,429 loops), not the old YouTube loops
  const { data: loopsData, isLoading } = useQuery({
    queryKey: ['audio-loops-home'],
    queryFn: async () => {
      const res = await fetch('/api/audio-loops?limit=8&sort=most_played');
      return res.json();
    },
  });
  const { playLoop } = usePlayer();

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="text-center py-6 md:py-10">
        <h1 className="font-serif text-4xl md:text-5xl mb-3">
          Welcome to <span className="text-primary">The Groove Kit</span>
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
                  <h3 className="font-serif font-medium text-sm">{tool.name}</h3>
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
          <Link href="/loop-library">
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
            loopsData?.loops?.map((loop: any) => (
              <Link key={loop.id} href="/loop-library">
              <Card className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="aspect-video relative bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Music className="w-10 h-10 text-primary/40 group-hover:text-primary/60 transition-colors" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white" fill="currentColor" />
                  </div>
                  {loop.genre && (
                    <Badge className="absolute top-2 left-2 text-[9px] bg-primary/80">{loop.genre}</Badge>
                  )}
                  {loop.feel && (
                    <Badge variant="outline" className="absolute top-2 right-2 text-[9px] bg-background/80">{loop.feel}</Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Avatar className="w-5 h-5 flex-shrink-0">
                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">{loop.artist?.substring(0, 2).toUpperCase() || 'GK'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{loop.artist || 'Unknown Artist'}</span>
                  </div>
                  <h4 className="font-medium text-sm truncate">{loop.grooveName || loop.title}</h4>
                  {loop.collection && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      📁 {loop.collection.replace(/_/g, ' ')}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    {loop.bpm && <Badge variant="secondary" className="font-mono text-[9px]">{loop.bpm} BPM</Badge>}
                    {loop.timeSignature && <Badge variant="outline" className="font-mono text-[9px]">{loop.timeSignature}</Badge>}
                    {loop.sectionType && loop.sectionType !== 'full_loop' && <Badge variant="outline" className="text-[9px] text-primary border-primary/30">{loop.sectionType}</Badge>}
                  </div>
                </CardContent>
              </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Backing Tracks by Genre & Tempo — curated inline YouTube embeds */}
      <BackingTrackBrowser />

      {/* Backing Tracks by Key — show only keys with curated videos */}
      {KEY_TRACKS.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl mb-2 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" /> Backing Tracks by Key
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Practice in any key — {KEY_TRACKS.length} of 24 keys available, more coming soon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {KEY_TRACKS.map(({ key, video }) => (
              <div key={key}>
                <YouTubeInline videoId={video.id} title={video.title} channel={video.channel} />
                <p className="text-xs font-medium mt-1.5 px-1 truncate text-primary">{key}</p>
              </div>
            ))}
          </div>
        </section>
      )}

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
