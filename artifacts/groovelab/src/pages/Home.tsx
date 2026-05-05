import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Compass, Music, Timer, Cpu, Piano, BookOpen,
  GraduationCap, Radio, Star, Search as SearchIcon, Headphones, Youtube,
  SlidersHorizontal, Drum, Layers,
} from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import {
  GENRES, TEMPO_BUCKETS, GENRE_VIDEO_LIBRARY_BY_TEMPO,
  tempoLabel, type GenreVideo, type TempoBucket,
} from '@/data/genre-videos';
import { KEY_BACKING_TRACKS } from '@/data/chord-videos';

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

type LoopMode = 'drums' | 'harmony';
type VideoWithMeta = GenreVideo & { genre: string; bucket: TempoBucket };

const DRUM_KEYWORDS = /\b(drum|drums|drummer|beat|beats|percussion|tabla|cajon|djembe|conga|bongo|metronome|rhythm)\b|drum loop|groove loop/i;
const DRUMLESS_KEYWORDS = /\b(no drums?|without drums?|drumless)\b/i;

function isDrumLoop(video: GenreVideo): boolean {
  const haystack = `${video.title} ${video.channel}`;
  return DRUM_KEYWORDS.test(haystack) && !DRUMLESS_KEYWORDS.test(haystack);
}

function useLoopCatalog() {
  return useMemo(() => {
    const allVideos: VideoWithMeta[] = [];
    for (const g of GENRES) {
      for (const b of TEMPO_BUCKETS) {
        for (const video of GENRE_VIDEO_LIBRARY_BY_TEMPO[g]?.[b] || []) {
          allVideos.push({ ...video, genre: g, bucket: b });
        }
      }
    }

    const seen = new Set<string>();
    const uniqueVideos = allVideos.filter((video) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });

    const drums = uniqueVideos.filter(isDrumLoop);
    const harmony = uniqueVideos.filter((video) => !isDrumLoop(video));

    const totalsByMode = { drums: drums.length, harmony: harmony.length };
    const totalsByGenre: Record<LoopMode, Record<string, number>> = { drums: {}, harmony: {} };
    const totalsByBucket: Record<LoopMode, Record<TempoBucket, number>> = {
      drums: { slow: 0, medium: 0, fast: 0, veryFast: 0 },
      harmony: { slow: 0, medium: 0, fast: 0, veryFast: 0 },
    };

    for (const mode of ['drums', 'harmony'] as const) {
      const list = mode === 'drums' ? drums : harmony;
      for (const video of list) {
        totalsByGenre[mode][video.genre] = (totalsByGenre[mode][video.genre] || 0) + 1;
        totalsByBucket[mode][video.bucket] += 1;
      }
    }

    return { drums, harmony, totalsByMode, totalsByGenre, totalsByBucket };
  }, []);
}

// ── Backing-track browser (genre pills + tempo tabs + search) ────────────
function BackingTrackBrowser() {
  const [mode, setMode] = useState<LoopMode>('drums');
  const [genre, setGenre] = useState<string>('All');
  const [bucket, setBucket] = useState<TempoBucket>('medium');
  const [query, setQuery] = useState('');

  const catalog = useLoopCatalog();
  const activeList = mode === 'drums' ? catalog.drums : catalog.harmony;
  const modeLabel = mode === 'drums' ? 'drum/percussion loops' : 'harmony/chord-progression loops';

  const availableGenres = useMemo(() => {
    const list = GENRES.filter((g) => (catalog.totalsByGenre[mode][g] || 0) > 0);
    return ['All', ...list];
  }, [catalog.totalsByGenre, mode]);

  const counts = useMemo(() => {
    const out: Record<TempoBucket, number> = { slow: 0, medium: 0, fast: 0, veryFast: 0 };
    for (const video of activeList) {
      if (genre !== 'All' && video.genre !== genre) continue;
      out[video.bucket] += 1;
    }
    return out;
  }, [activeList, genre]);

  const videos = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = activeList
      .filter((v) => genre === 'All' || v.genre === genre)
      .filter((v) => v.bucket === bucket)
      .filter((v) =>
        q
          ? v.genre.toLowerCase().includes(q) ||
          v.title.toLowerCase().includes(q) ||
          (v.channel || '').toLowerCase().includes(q)
          : true,
      );
    return filtered.slice(0, 12);
  }, [activeList, genre, bucket, query]);

  const totalForSelection = useMemo(() => {
    return activeList.filter((v) => genre === 'All' || v.genre === genre).length;
  }, [activeList, genre]);

  const handleModeChange = (nextMode: LoopMode) => {
    setMode(nextMode);
    setGenre('All');
    setBucket('medium');
    setQuery('');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" /> Find YouTube Loops
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Choose rhythm-only drum/percussion loops or harmony loops for chord-progressions, vamps, blues, jazz, pop, and more.
          </p>
        </div>
        <Link href="/loop-library">
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-3 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground">
            <Headphones className="h-4 w-4" />
            Audio Loops
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          {
            id: 'drums' as const,
            title: 'Only Drums & Percussion',
            description: 'Grooves, drum loops, beats, tabla, percussion, metronome-style rhythm tracks.',
            icon: Drum,
            count: catalog.totalsByMode.drums,
          },
          {
            id: 'harmony' as const,
            title: 'Harmony & Chord Progressions',
            description: 'Blues, jazz, pop, R&B, rock and key-centered backing tracks for harmonic practice.',
            icon: Layers,
            count: catalog.totalsByMode.harmony,
          },
        ].map((item) => {
          const active = mode === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleModeChange(item.id)}
              className={`rounded-md border p-4 text-left transition-colors
                ${active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-muted/15 text-foreground/80 hover:border-primary/50 hover:bg-muted/30'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-md ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-base font-semibold leading-tight">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {item.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {availableGenres.map((g) => {
          const active = genre === g;
          const count = g === 'All' ? activeList.length : catalog.totalsByGenre[mode][g] || 0;
          return (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`min-h-16 rounded-md border px-3 py-2 text-left transition-colors
                ${active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/20 text-foreground/80 border-border hover:bg-muted/60 hover:border-primary/40'}`}
            >
              <span className="block text-sm font-medium leading-tight">{g}</span>
              <span className={`block text-[11px] mt-1 ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                {count} {mode === 'drums' ? 'rhythm' : 'harmony'} loops
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TEMPO_BUCKETS.map((b) => {
            const n = counts[b];
            const active = bucket === b;
            return (
              <button
                key={b}
                onClick={() => setBucket(b)}
                disabled={n === 0}
                className={`inline-flex h-9 items-center rounded-md px-3 text-xs font-medium transition-colors
                  ${active ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
                  ${n === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {tempoLabel(b)} <span className="opacity-70">· {n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${modeLabel}`}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Showing {videos.length} of {totalForSelection} {genre === 'All' ? modeLabel : `${genre} ${modeLabel}`}{query ? ` matching “${query}”` : ''}.
      </p>

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
            {query
              ? `No matches for “${query}” in ${genre} ${tempoLabel(bucket).toLowerCase()} — try another tempo or clear the search.`
              : `No ${tempoLabel(bucket).toLowerCase()} tracks for ${genre} yet — try another tempo bucket.`}
          </p>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const catalog = useLoopCatalog();

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="py-4 md:py-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
              <Youtube className="h-4 w-4" />
              YouTube loop finder
            </div>
            <h1 className="font-serif text-4xl md:text-5xl mb-3">
              Find the right YouTube loop and start practicing.
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Start with rhythm-only drum and percussion loops, or jump into harmonic backing tracks for chord-progressions, blues, jazz, pop, and standards. Native audio files stay in Audio Loops.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-2xl font-semibold">{catalog.totalsByMode.drums.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Drum loops</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-2xl font-semibold">{catalog.totalsByMode.harmony.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Harmony loops</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-2xl font-semibold">{KEY_TRACKS.length}</p>
              <p className="text-[11px] text-muted-foreground">Keys</p>
            </div>
          </div>
        </div>
      </section>

      {/* Backing Tracks by Genre & Tempo — curated inline YouTube embeds. */}
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

      {/* Tools stay secondary to the YouTube finder. */}
      <section>
        <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-primary" /> Practice Tools
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

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
        <Link href="/loop-library">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Headphones className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-serif text-lg">Audio Loops</h3>
                <p className="text-sm text-muted-foreground">Separate native audio-file library</p>
              </div>
            </CardContent>
          </Card>
        </Link>
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
        <Link href="/standards">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <BookOpen className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-serif text-lg">Jazz Standards</h3>
                <p className="text-sm text-muted-foreground">Real Book charts with backing tracks</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
