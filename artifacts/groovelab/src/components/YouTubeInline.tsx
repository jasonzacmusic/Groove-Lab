import React, { useState, useEffect } from 'react';
import { Play, Loader2, ExternalLink, Search } from 'lucide-react';
import { useYouTubePlayback } from '@/context/YouTubePlaybackContext';

/**
 * Inline YouTube player with **single-playback coordination**.
 *
 * All instances share a global `YouTubePlaybackContext`. Only one iframe
 * is mounted at a time — clicking play on another instance unmounts the
 * previous one (which guarantees its audio stops). The non-active instances
 * render a lightweight click-to-play poster, so multiple cards on screen
 * never produce overlapping audio.
 *
 * Two modes:
 * 1. videoId: click-to-play poster → mounts iframe with autoplay on click
 * 2. searchQuery: clean external link card (YouTube blocks listType=search embeds)
 */

interface YouTubeInlineProps {
  videoId?: string;
  searchQuery?: string;
  title: string;
  channel?: string;
  className?: string;
}

export function YouTubeInline({ videoId, searchQuery, title, channel, className = '' }: YouTubeInlineProps) {
  const { currentId, play, stop } = useYouTubePlayback();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isActive = !!videoId && currentId === videoId;

  // Reset iframe loading state whenever this card stops being active
  useEffect(() => {
    if (!isActive) {
      setLoaded(false);
      setError(false);
    }
  }, [isActive]);

  // Mode 1: Specific video — click-to-play poster + on-demand iframe
  if (videoId) {
    const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return (
      <div className={className}>
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          <div className="aspect-video">
            {isActive ? (
              <>
                {!loaded && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-2">
                    <Play className="w-8 h-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Video unavailable</p>
                  </div>
                )}
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&enablejsapi=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={title}
                  loading="lazy"
                  onLoad={() => setLoaded(true)}
                  onError={() => setError(true)}
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); stop(); }}
                  className="absolute top-1.5 right-1.5 z-20 px-2 py-0.5 rounded bg-black/70 hover:bg-black/90 text-white text-[10px] font-medium opacity-80 hover:opacity-100 transition-opacity"
                  title="Stop"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => play(videoId)}
                className="group relative w-full h-full block"
                title={`Play: ${title}`}
              >
                <img
                  src={thumb}
                  alt={title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-600 group-hover:scale-110 transition-all flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </button>
            )}
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

  // Mode 2: searchQuery → external link card
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
