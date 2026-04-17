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

  // Mode 2: Search query — show a clickable card that launches YouTube search
  // (YouTube deprecated listType=search embeds, so we can't embed search results)
  if (searchQuery) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    // If user clicked play, show the search as an iframe (YouTube results page)
    if (playing) {
      return (
        <div className={className}>
          <div className="relative rounded-lg overflow-hidden border border-border bg-black">
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={title}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5 truncate">{title}</p>
        </div>
      );
    }

    return (
      <div className={className}>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="relative rounded-lg overflow-hidden border border-border bg-gradient-to-br from-red-950/30 to-red-900/10 hover:from-red-900/40 hover:to-red-800/20 transition-all cursor-pointer">
            <div className="aspect-video flex flex-col items-center justify-center gap-3 p-4">
              <div className="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-600 flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
                <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2">
                  {title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Search className="w-3 h-3" /> Search on YouTube
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </p>
              </div>
            </div>
          </div>
        </a>
        {channel && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5 truncate">
            via <span className="font-medium text-foreground/70">{channel}</span>
          </p>
        )}
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
