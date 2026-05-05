import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Drum,
  Filter,
  Layers,
  Music2,
  Piano,
  Search,
  Sparkles,
} from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import {
  GENRES,
  TEMPO_BUCKETS,
  GENRE_VIDEO_LIBRARY_BY_TEMPO,
  tempoLabel,
  type GenreVideo,
  type TempoBucket,
} from '@/data/genre-videos';
import { CHORD_PROGRESSION_VIDEOS, KEY_BACKING_TRACKS } from '@/data/chord-videos';

type HarmonyVideo = GenreVideo & {
  genre: string;
  bucket: TempoBucket;
  family: string;
};

const DRUM_KEYWORDS = /\b(drum|drums|drummer|beat|beats|percussion|tabla|cajon|djembe|conga|bongo|metronome|rhythm)\b|drum loop|groove loop/i;
const DRUMLESS_KEYWORDS = /\b(no drums?|without drums?|drumless)\b/i;

const FAMILY_FILTERS = [
  'All',
  '12-Bar Blues',
  'ii-V-I',
  'Jazz Standards',
  'Pop Progressions',
  'R&B / Neo Soul',
  'Modal & Vamps',
  'Genre Grooves',
] as const;

const FAMILY_DESCRIPTIONS: Record<string, string> = {
  '12-Bar Blues': 'Blues forms, shuffles, minor blues, jazz blues, and turnaround practice.',
  'ii-V-I': 'Major and minor ii-V-I loops, rhythm changes, and jazz cadence work.',
  'Jazz Standards': 'Swing, Real Book style progressions, rhythm changes, and standards vocabulary.',
  'Pop Progressions': 'Simple harmonic cycles, pop vamps, ballads, and worship-style loops.',
  'R&B / Neo Soul': 'Neo-soul, gospel, R&B, soul, and extended-harmony grooves.',
  'Modal & Vamps': 'One-chord vamps, modal jams, dorian grooves, funk vamps, and static harmony.',
  'Genre Grooves': 'General harmonic backing tracks organized by style and tempo.',
};

const KEY_TRACKS = Object.entries(KEY_BACKING_TRACKS)
  .filter(([, videos]) => videos.length > 0)
  .map(([key, videos]) => ({ key, video: videos[0] }));

function isDrumLoop(video: GenreVideo): boolean {
  const haystack = `${video.title} ${video.channel}`;
  return DRUM_KEYWORDS.test(haystack) && !DRUMLESS_KEYWORDS.test(haystack);
}

function inferFamily(video: GenreVideo, genre: string): string {
  const text = `${video.title} ${video.channel}`.toLowerCase();
  if (/12\s*bar|blues/.test(text)) return '12-Bar Blues';
  if (/ii[-\s]?v[-\s]?i|2[-\s]?5[-\s]?1|251|rhythm changes|oleo/.test(text)) return 'ii-V-I';
  if (/jazz|swing|standard|real book|bebop|bossa|satin doll|autumn leaves|fly me to the moon/.test(text)) {
    return 'Jazz Standards';
  }
  if (/neo[-\s]?soul|r&b|rnb|gospel|soul/.test(text) || ['R&B', 'Soul'].includes(genre)) {
    return 'R&B / Neo Soul';
  }
  if (/pop|1\s*5\s*6\s*4|i[-\s]?v[-\s]?vi[-\s]?iv|worship|ballad/.test(text) || ['Pop', 'Country', 'Folk'].includes(genre)) {
    return 'Pop Progressions';
  }
  if (/vamp|one chord|one-chord|modal|dorian|mixolydian|groove|funk/.test(text) || ['Funk', 'Hip Hop', 'Electronic'].includes(genre)) {
    return 'Modal & Vamps';
  }
  return 'Genre Grooves';
}

function buildHarmonyCatalog(): HarmonyVideo[] {
  const seen = new Set<string>();
  const videos: HarmonyVideo[] = [];

  for (const genre of GENRES) {
    for (const bucket of TEMPO_BUCKETS) {
      for (const video of GENRE_VIDEO_LIBRARY_BY_TEMPO[genre]?.[bucket] || []) {
        if (seen.has(video.id) || isDrumLoop(video)) continue;
        seen.add(video.id);
        videos.push({
          ...video,
          genre,
          bucket,
          family: inferFamily(video, genre),
        });
      }
    }
  }

  return videos;
}

function catalogStats(videos: HarmonyVideo[]) {
  const byGenre: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  const byBucket: Record<TempoBucket, number> = { slow: 0, medium: 0, fast: 0, veryFast: 0 };

  for (const video of videos) {
    byGenre[video.genre] = (byGenre[video.genre] || 0) + 1;
    byFamily[video.family] = (byFamily[video.family] || 0) + 1;
    byBucket[video.bucket] += 1;
  }

  return { byGenre, byFamily, byBucket };
}

function FeaturedProgressions() {
  const featured = Object.entries(CHORD_PROGRESSION_VIDEOS).slice(0, 6);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Progression Starters
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fast entry points for the chord movements students ask for most often.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {featured.map(([name, videos]) => {
          const first = videos[0];
          return (
            <div key={name} className="rounded-md border border-border bg-muted/15 p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-serif text-lg">{name}</p>
                  <p className="text-xs text-muted-foreground">{videos.length} curated videos</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{inferFamily(first, name)}</Badge>
              </div>
              {first && (
                <YouTubeInline videoId={first.id} title={first.title} channel={first.channel} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Chords() {
  const harmonyVideos = useMemo(() => buildHarmonyCatalog(), []);
  const stats = useMemo(() => catalogStats(harmonyVideos), [harmonyVideos]);
  const [genre, setGenre] = useState('All');
  const [family, setFamily] = useState('All');
  const [bucket, setBucket] = useState<TempoBucket | 'All'>('All');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);

  const genresWithCounts = useMemo(
    () => GENRES.filter((g) => (stats.byGenre[g] || 0) > 0),
    [stats.byGenre],
  );

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return harmonyVideos.filter((video) => {
      if (genre !== 'All' && video.genre !== genre) return false;
      if (family !== 'All' && video.family !== family) return false;
      if (bucket !== 'All' && video.bucket !== bucket) return false;
      if (!q) return true;
      return (
        video.title.toLowerCase().includes(q) ||
        video.channel.toLowerCase().includes(q) ||
        video.genre.toLowerCase().includes(q) ||
        video.family.toLowerCase().includes(q)
      );
    });
  }, [bucket, family, genre, harmonyVideos, query]);

  const visibleVideos = filteredVideos.slice(0, visibleCount);

  const resetFilters = () => {
    setGenre('All');
    setFamily('All');
    setBucket('All');
    setQuery('');
    setVisibleCount(24);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Piano className="h-4 w-4" />
            Chord progression YouTube loops
          </div>
          <h1 className="font-serif text-4xl md:text-5xl mb-3">Harmony Loop Library</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Browse the full YouTube harmony catalog for chord progressions, blues, jazz, pop,
            R&B, modal vamps, key practice, and standards. Drum-only loops are kept out of this page.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-2xl font-semibold">{harmonyVideos.length.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Harmony loops</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-2xl font-semibold">{genresWithCounts.length}</p>
            <p className="text-[11px] text-muted-foreground">Genres</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-2xl font-semibold">{KEY_TRACKS.length}</p>
            <p className="text-[11px] text-muted-foreground">Keys</p>
          </div>
        </div>
      </section>

      <FeaturedProgressions />

      <section className="rounded-md border border-border bg-card/60 p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-2xl flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Browse All Harmony Loops
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Filter by progression family, genre, tempo, title, or channel.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(24);
              }}
              placeholder="Search blues, ii-V-I, neo soul, channel name..."
              className="pl-9"
            />
          </div>
          <Select value={family} onValueChange={(v) => { setFamily(v); setVisibleCount(24); }}>
            <SelectTrigger>
              <SelectValue placeholder="Progression family" />
            </SelectTrigger>
            <SelectContent>
              {FAMILY_FILTERS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f === 'All' ? `All families (${harmonyVideos.length})` : `${f} (${stats.byFamily[f] || 0})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bucket} onValueChange={(v) => { setBucket(v as TempoBucket | 'All'); setVisibleCount(24); }}>
            <SelectTrigger>
              <SelectValue placeholder="Tempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All tempos ({harmonyVideos.length})</SelectItem>
              {TEMPO_BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>{tempoLabel(b)} ({stats.byBucket[b]})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            type="button"
            onClick={() => { setGenre('All'); setVisibleCount(24); }}
            className={`min-h-14 rounded-md border px-3 py-2 text-left transition-colors ${genre === 'All' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/20 hover:bg-muted/50'}`}
          >
            <span className="block text-sm font-medium">All</span>
            <span className={`block text-[11px] mt-1 ${genre === 'All' ? 'opacity-80' : 'text-muted-foreground'}`}>{harmonyVideos.length} loops</span>
          </button>
          {genresWithCounts.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => { setGenre(g); setVisibleCount(24); }}
              className={`min-h-14 rounded-md border px-3 py-2 text-left transition-colors ${genre === g ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/20 hover:bg-muted/50'}`}
            >
              <span className="block text-sm font-medium">{g}</span>
              <span className={`block text-[11px] mt-1 ${genre === g ? 'opacity-80' : 'text-muted-foreground'}`}>{stats.byGenre[g]} loops</span>
            </button>
          ))}
        </div>

        {family !== 'All' && FAMILY_DESCRIPTIONS[family] && (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{family}:</span> {FAMILY_DESCRIPTIONS[family]}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{filteredVideos.length.toLocaleString()} matching loops</Badge>
          {genre !== 'All' && <Badge variant="outline">{genre}</Badge>}
          {family !== 'All' && <Badge variant="outline">{family}</Badge>}
          {bucket !== 'All' && <Badge variant="outline">{tempoLabel(bucket)}</Badge>}
        </div>

        {visibleVideos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleVideos.map((video) => (
                <div key={video.id} className="rounded-md border border-border bg-background/50 p-3">
                  <YouTubeInline videoId={video.id} title={video.title} channel={video.channel} />
                  <div className="mt-2 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">{video.genre}</Badge>
                      <Badge variant="outline" className="text-[10px]">{tempoLabel(video.bucket)}</Badge>
                      <Badge variant="outline" className="text-[10px]">{video.family}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {visibleCount < filteredVideos.length && (
              <div className="flex justify-center pt-2">
                <Button onClick={() => setVisibleCount((n) => n + 24)}>
                  Load 24 more
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center">
            <Music2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No harmony loops match those filters.</p>
            <p className="text-sm text-muted-foreground mt-1">Clear the search or switch the progression family.</p>
          </div>
        )}
      </section>

      <section className="space-y-3 pb-8">
        <div>
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Key Practice
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quick key-centered loops from the chord backing-track catalog.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {KEY_TRACKS.slice(0, 12).map(({ key, video }) => (
            <div key={key} className="rounded-md border border-border bg-muted/15 p-3">
              <YouTubeInline videoId={video.id} title={video.title} channel={video.channel} />
              <p className="text-sm font-medium text-primary mt-2">{key}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="sr-only">
        <Drum />
      </div>
    </div>
  );
}
