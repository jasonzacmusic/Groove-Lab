import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

/**
 * Inline YouTube player that embeds search results OR specific video IDs.
 * NEVER redirects to YouTube — everything plays on-site.
 *
 * Two modes:
 * 1. videoId: embed a specific known video
 * 2. searchQuery: embed YouTube search results (uses listType=search)
 */

interface YouTubeInlineProps {
  videoId?: string;
  searchQuery?: string;
  title: string;
  className?: string;
  autoplay?: boolean;
}

export function YouTubeInline({ videoId, searchQuery, title, className = '', autoplay = false }: YouTubeInlineProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Build the embed URL
  let src: string;
  if (videoId) {
    // Specific video — most reliable
    src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`;
  } else if (searchQuery) {
    // Search results — shows first result from YouTube search
    src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`;
  } else {
    return null;
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-border bg-black ${className}`}>
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
  );
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
