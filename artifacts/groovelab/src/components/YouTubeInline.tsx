import React, { useState } from 'react';
import { Play, Loader2, ExternalLink, Search } from 'lucide-react';

/**
 * Inline YouTube player that embeds specific video IDs or shows
 * styled YouTube search cards.
 *
 * Two modes:
 * 1. videoId: embed a specific known video (reliable, inline playback)
 * 2. searchQuery: show a styled card that opens YouTube search (because
 *    YouTube deprecated listType=search embeds — they show blank)
 */

interface YouTubeInlineProps {
  videoId?: string;
  searchQuery?: string;
  title: string;
  channel?: string;
  className?: string;
  autoplay?: boolean;
}

export function YouTubeInline({ videoId, searchQuery, title, channel, className = '', autoplay = false }: YouTubeInlineProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Mode 1: Specific video — embed iframe
  if (videoId) {
    const src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`;
    return (
      <div className={className}>
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 z-10 gap-2">
              <Play className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Video unavailable</p>
            </div>
          )}
          <div className="aspect-video">
            <iframe
              src={src}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={title}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        {channel && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5 truncate">
            via <span className="font-medium text-foreground/70">{channel}</span>
          </p>
        )}
      </div>
    );
  }

  // Mode 2 (deprecated): searchQuery — render a clean external link card.
  // YouTube blocks listType=search embeds (returns blank), so we never iframe
  // a search. Instead show a styled card that opens YouTube search in a new tab.
  // All in-app callers should pass videoId; this mode is only a graceful fallback.
  if (searchQuery) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    return (
      <div className={className}>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden border border-border bg-gradient-to-br from-muted/40 to-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
        >
          <div className="aspect-video flex flex-col items-center justify-center gap-2 p-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 group-hover:bg-primary/25 flex items-center justify-center transition-colors">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-foreground text-center font-medium line-clamp-2">{title}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Search on YouTube
            </p>
          </div>
        </a>
      </div>
    );
  }

  return null;
}

/**
 * Grid of YouTube search embeds for a topic.
 * Shows multiple search queries as inline players.
 */
interface YouTubeSearchGridProps {
  queries: { label: string; query: string }[];
  columns?: 1 | 2 | 3;
}

export function YouTubeSearchGrid({ queries, columns = 2 }: YouTubeSearchGridProps) {
  const gridClass = columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {queries.map((q, i) => (
        <div key={`${q.query}-${i}`}>
          <YouTubeInline searchQuery={q.query} title={q.label} />
          <p className="text-xs text-muted-foreground mt-1.5 px-1 truncate">{q.label}</p>
        </div>
      ))}
    </div>
  );
}
