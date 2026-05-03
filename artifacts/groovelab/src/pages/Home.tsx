import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Compass, Play, Music, Timer, Cpu, Piano, BookOpen,
  GraduationCap, Radio, Star, Search as SearchIcon,
} from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import {
  GENRES, TEMPO_BUCKETS, GENRE_VIDEO_LIBRARY_BY_TEMPO,
  tempoLabel, getGenreByTempo, type TempoBucket,
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

// ── Backing-track browser (genre pills + tempo tabs + search) ────────────
function BackingTrackBrowser() {
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [bucket, setBucket] = useState<TempoBucket>('medium');
  const [query, setQuery] = useState('');

  // Per-genre totals — shown in the pill so the user knows how rich each genre is.
  const genreTotals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const g of GENRES) {
      out[g] = TEMPO_BUCKETS.reduce(
        (s, b) => s + (GENRE_VIDEO_LIBRARY_BY_TEMPO[g]?.[b]?.length || 0),
        0,
      );
    }
    return out;
  }, []);

  const counts = useMemo(() => {
    return TEMPO_BUCKETS.reduce((acc, b) => {
      acc[b] = getGenreByTempo(genre, b).length;
      return acc;
    }, {} as Record<TempoBucket, number>);
  }, [genre]);

  const videos = useMemo(() => {
    const list = getGenreByTempo(genre, bucket);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(v =>
          v.title.toLowerCase().includes(q) ||
          (v.channel || '').toLowerCase().includes(q),
        )
      : list;
    return filtered.slice(0, 12);
  }, [genre, bucket, query]);

  const totalForGenre = genreTotals[genre] || 0;

  return (
    <section>
      <h2 className="font-serif text-2xl mb-2 flex items-center gap-2">
        <Star className="w-5 h-5 text-primary" /> Find Your Loop — by Genre & Tempo
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Browse {GENRES.length} genres, all with 100+ curated YouTube backing tracks. Pick a vibe, pick a tempo, hit play. Only one plays at a time.
      </p>

      {/* Genre pills (always visible, easier than a dropdown) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {GENRES.map((g) => {
          const active = genre === g;
          return (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 text-foreground/80 border-border hover:bg-muted/60 hover:border-primary/40'}`}
            >
              {g} <span className={`ml-1 ${active ? 'opacity-80' : 'opacity-50'}`}>· {genreTotals[g]}</span>
            </button>
          );
        })}
      </div>

      {/* Tempo tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
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
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${genre}…`}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Showing {videos.length} of {totalForGenre} {genre} tracks{query ? ` matching “${query}”` : ''}.
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
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="text-center py-6 md:py-10">
        <h1 className="font-serif text-4xl md:text-5xl mb-3">
          Welcome to <span className="text-primary">The Groove Kit</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Curated YouTube backing tracks by genre and key, plus chord progressions and practice tools.
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

      {/* Backing Tracks by Genre & Tempo — curated inline YouTube embeds.
         Audio WAV loops live on their own page (/loop-library), not here. */}
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
        <Link href="/chords">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Piano className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-serif text-lg">Chord Lab</h3>
                <p className="text-sm text-muted-foreground">Progressions with curated YouTube backing videos</p>
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
