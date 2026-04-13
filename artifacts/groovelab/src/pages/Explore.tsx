import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGetTaxonomy, useGetGenreMap, useGetGrooveMatch } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Music, Map as MapIcon, List, Search, X, Heart } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Genre Map Component (SVG-based 2D interactive map)                */
/* ------------------------------------------------------------------ */

interface GenreMapNode {
  genreId: number;
  genreName: string;
  x: number;
  y: number;
  loopCount: number;
  feelId?: number | null;
  feelName?: string | null;
}

interface GenreMapViewProps {
  data: GenreMapNode[];
  onGenreClick: (genreId: number, genreName: string) => void;
}

function GenreMapView({ data, onGenreClick }: GenreMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredGenre, setHoveredGenre] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const padding = { top: 50, right: 50, bottom: 50, left: 60 };
  const plotW = dimensions.width - padding.left - padding.right;
  const plotH = dimensions.height - padding.top - padding.bottom;

  const maxLoops = Math.max(...data.map((d) => d.loopCount), 1);

  const toSvgX = (v: number) => padding.left + v * plotW;
  const toSvgY = (v: number) => padding.top + (1 - v) * plotH; // flip Y so 0=bottom

  const radius = (loopCount: number) => {
    const min = 15;
    const max = 30;
    return min + (loopCount / maxLoops) * (max - min);
  };

  const nodeColor = (x: number) => {
    if (x > 0.55) return '#f59e0b'; // warm amber for swung
    if (x < 0.45) return '#3b82f6'; // cool blue for straight
    return '#8b5cf6'; // purple blend for middle
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const hoveredNode = data.find((d) => d.genreId === hoveredGenre);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: 400 }}>
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes genre-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.3); }
        }
        .genre-pulse-ring {
          animation: genre-pulse 3s ease-in-out infinite;
          transform-origin: center;
          pointer-events: none;
        }
      `}</style>

      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="block"
        style={{ background: 'hsl(220 20% 8%)' }}
      >
        {/* Grid lines */}
        {gridLines.map((v) => (
          <React.Fragment key={`grid-${v}`}>
            <line
              x1={toSvgX(v)}
              y1={padding.top}
              x2={toSvgX(v)}
              y2={padding.top + plotH}
              stroke="hsl(220 10% 20%)"
              strokeWidth={v === 0.5 ? 1 : 0.5}
              strokeDasharray={v === 0.5 ? undefined : '4 4'}
            />
            <line
              x1={padding.left}
              y1={toSvgY(v)}
              x2={padding.left + plotW}
              y2={toSvgY(v)}
              stroke="hsl(220 10% 20%)"
              strokeWidth={v === 0.5 ? 1 : 0.5}
              strokeDasharray={v === 0.5 ? undefined : '4 4'}
            />
          </React.Fragment>
        ))}

        {/* Axis labels */}
        <text x={padding.left} y={padding.top + plotH + 40} fill="hsl(220 10% 50%)" fontSize={12} fontFamily="sans-serif">
          Straight
        </text>
        <text x={padding.left + plotW} y={padding.top + plotH + 40} fill="hsl(220 10% 50%)" fontSize={12} fontFamily="sans-serif" textAnchor="end">
          Swung
        </text>
        <text x={padding.left - 10} y={padding.top - 10} fill="hsl(220 10% 50%)" fontSize={12} fontFamily="sans-serif" textAnchor="start">
          Complex
        </text>
        <text x={padding.left - 10} y={padding.top + plotH + 5} fill="hsl(220 10% 50%)" fontSize={12} fontFamily="sans-serif" textAnchor="start">
          Simple
        </text>

        {/* Genre nodes */}
        {data.map((entry) => {
          const cx = toSvgX(entry.x);
          const cy = toSvgY(entry.y);
          const r = radius(entry.loopCount);
          const color = nodeColor(entry.x);
          const isHovered = hoveredGenre === entry.genreId;

          return (
            <g
              key={entry.genreId}
              style={{ cursor: 'pointer' }}
              onClick={() => onGenreClick(entry.genreId, entry.genreName)}
              onMouseEnter={(e) => {
                setHoveredGenre(entry.genreId);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredGenre(null)}
            >
              {/* Pulse ring for nodes with loops */}
              {entry.loopCount > 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 6}
                  fill={color}
                  className="genre-pulse-ring"
                  style={{ animationDelay: `${(entry.genreId * 0.4) % 3}s` }}
                />
              )}

              {/* Main circle */}
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? r + 4 : r}
                fill={color}
                fillOpacity={isHovered ? 0.9 : 0.6}
                stroke={isHovered ? '#fff' : color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={0.8}
                style={{ transition: 'r 0.2s, fill-opacity 0.2s' }}
              />

              {/* Genre name */}
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={r > 20 ? 11 : 9}
                fontWeight={600}
                fontFamily="sans-serif"
                pointerEvents="none"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
              >
                {entry.genreName.length > 10 ? entry.genreName.slice(0, 9) + '...' : entry.genreName}
              </text>

              {/* Loop count badge */}
              <circle
                cx={cx + r * 0.7}
                cy={cy - r * 0.7}
                r={9}
                fill="hsl(220 20% 15%)"
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={cx + r * 0.7}
                y={cy - r * 0.7 + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={8}
                fontWeight={700}
                fontFamily="monospace"
                pointerEvents="none"
              >
                {entry.loopCount}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-xl px-4 py-3"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
          }}
        >
          <p className="font-medium text-foreground text-sm">{hoveredNode.genreName}</p>
          <p className="text-xs text-muted-foreground">{hoveredNode.feelName || 'Mixed Feel'}</p>
          <p className="text-xs font-mono mt-1 text-primary">{hoveredNode.loopCount} loops</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Groove Match Panel                                                */
/* ------------------------------------------------------------------ */

interface GrooveMatchPanelProps {
  loopId: string;
  loopTitle: string;
  onClose: () => void;
  onMatchClick: (loopId: string) => void;
}

function GrooveMatchPanel({ loopId, loopTitle, onClose, onMatchClick }: GrooveMatchPanelProps) {
  const { data: matches, isLoading } = useGetGrooveMatch(loopId);

  return (
    <div
      className="border-t border-border bg-card/80 backdrop-blur overflow-hidden"
      style={{
        animation: 'grooveMatchSlideIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards',
      }}
    >
      <style>{`
        @keyframes grooveMatchSlideIn {
          from { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
          to   { max-height: 300px; opacity: 1; padding-top: 1.5rem; padding-bottom: 1.5rem; }
        }
      `}</style>

      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-serif text-lg text-foreground">Loops that groove with this one</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on <span className="text-primary font-medium">{loopTitle}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-56 flex-shrink-0 rounded-lg" />
            ))}
          </div>
        ) : !matches || matches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No groove matches found for this loop.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {matches.slice(0, 6).map((match) => (
              <Card
                key={match.id}
                className="flex-shrink-0 w-56 border-border bg-background hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => onMatchClick(match.id)}
              >
                <CardContent className="p-3">
                  <h5 className="font-medium text-sm truncate mb-2 group-hover:text-primary transition-colors">
                    {match.title}
                  </h5>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {match.bpm && (
                      <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary">
                        {match.bpm} BPM
                      </Badge>
                    )}
                    {match.timeSignatures?.[0] && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {match.timeSignatures[0].displayName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Avatar className="w-4 h-4">
                      <AvatarFallback className="text-[7px]">
                        {match.creator?.channelName?.substring(0, 2).toUpperCase() || 'GL'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {match.creator?.channelName || 'Unknown'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Explore Page                                                 */
/* ------------------------------------------------------------------ */

export default function Explore() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [search, setSearch] = useState('');
  const [bpmRange, setBpmRange] = useState([40, 300]);
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);
  const [selectedLoopTitle, setSelectedLoopTitle] = useState('');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [selectedTimeSigId, setSelectedTimeSigId] = useState<number | null>(null);
  const [selectedFeelId, setSelectedFeelId] = useState<number | null>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);

  const { user } = useAuth();
  const { playLoop } = usePlayer();
  const { toast } = useToast();

  // Fetch user's favorites on mount
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/favorites?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFavoritedIds(new Set(data.map((f: any) => f.loopId)));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent, loopId: string) => {
      e.stopPropagation();
      if (!user?.id) {
        toast({ title: 'Sign in to save favorites' });
        return;
      }
      const isFavorited = favoritedIds.has(loopId);
      // Optimistic update
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (isFavorited) next.delete(loopId);
        else next.add(loopId);
        return next;
      });
      try {
        if (isFavorited) {
          await fetch('/api/favorites', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, loopId }),
          });
        } else {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, loopId }),
          });
        }
      } catch {
        // Revert on error
        setFavoritedIds((prev) => {
          const next = new Set(prev);
          if (isFavorited) next.add(loopId);
          else next.delete(loopId);
          return next;
        });
      }
    },
    [user?.id, favoritedIds, toast]
  );

  const { data: taxonomy, isLoading: isTaxonomyLoading } = useGetTaxonomy();
  const { data: genreMap } = useGetGenreMap();

  // Fetch from the REAL audio loops endpoint (5,429 loops) instead of old YouTube loops
  const bpmFilterActive = bpmRange[0] > 40 || bpmRange[1] < 300;
  const audioLoopParams = new URLSearchParams();
  audioLoopParams.set('limit', '24');
  if (search) audioLoopParams.set('search', search);
  if (bpmFilterActive) { audioLoopParams.set('bpm_min', String(bpmRange[0])); audioLoopParams.set('bpm_max', String(bpmRange[1])); }
  // Map taxonomy IDs to actual values for the audio-loops API
  if (selectedTimeSigId && taxonomy?.timeSignatures) {
    const ts = taxonomy.timeSignatures.find(t => t.id === selectedTimeSigId);
    if (ts) audioLoopParams.set('time_signature', ts.displayName);
  }
  if (selectedFeelId && taxonomy?.feels) {
    const f = taxonomy.feels.find(f => f.id === selectedFeelId);
    if (f) audioLoopParams.set('feel', f.name);
  }
  if (selectedGenreId && taxonomy?.genres) {
    const g = taxonomy.genres.find(g => g.id === selectedGenreId);
    if (g) audioLoopParams.set('genre', g.name);
  }

  const { data: loopsData, isLoading: isLoopsLoading } = useQuery({
    queryKey: ['audio-loops-explore', audioLoopParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/audio-loops?${audioLoopParams.toString()}`);
      return res.json();
    },
  });

  const handleGenreMapClick = useCallback((genreId: number, genreName: string) => {
    setGenreFilter(genreName);
    setSearch(genreName);
    setViewMode('list');
  }, []);

  const handleLoopCardClick = useCallback((loopId: string, loopTitle: string) => {
    if (selectedLoopId === loopId) {
      setSelectedLoopId(null);
      setSelectedLoopTitle('');
    } else {
      setSelectedLoopId(loopId);
      setSelectedLoopTitle(loopTitle);
    }
  }, [selectedLoopId]);

  const handleMatchClick = useCallback((loopId: string) => {
    // Find the match title from the loops data or just use the id
    const matchLoop = loopsData?.loops?.find((l: any) => l.id === loopId);
    setSelectedLoopId(loopId);
    setSelectedLoopTitle(matchLoop?.title || 'Selected Loop');
  }, [loopsData]);

  const clearGenreFilter = useCallback(() => {
    setGenreFilter(null);
    setSearch('');
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-80 border-r border-border bg-sidebar overflow-y-auto hidden md:block p-6">
        <h3 className="font-serif text-xl mb-6">Filters</h3>

        <Accordion type="multiple" defaultValue={['bpm', 'time_sig', 'feel']} className="w-full">
          <AccordionItem value="bpm" className="border-border">
            <AccordionTrigger className="hover:no-underline font-medium text-sm text-foreground">BPM Range</AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 px-1">
              <Slider
                value={bpmRange}
                min={40}
                max={300}
                step={1}
                onValueChange={setBpmRange}
                className="mb-6"
              />
              <div className="flex justify-between font-mono text-xs text-muted-foreground">
                <span>{bpmRange[0]}</span>
                <span>{bpmRange[1]}</span>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="time_sig" className="border-border">
            <AccordionTrigger className="hover:no-underline font-medium text-sm text-foreground">Time Signature</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 pt-2">
                {isTaxonomyLoading ? (
                   Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-8 w-16 rounded-full" />)
                ) : (
                  taxonomy?.timeSignatures.map(ts => (
                    <Badge key={ts.id} variant="outline"
                      className={`cursor-pointer transition-colors font-mono ${selectedTimeSigId === ts.id ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/20'}`}
                      onClick={() => setSelectedTimeSigId(selectedTimeSigId === ts.id ? null : ts.id)}>
                      {ts.displayName}
                    </Badge>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="feel" className="border-border">
            <AccordionTrigger className="hover:no-underline font-medium text-sm text-foreground">Feel</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 pt-2">
                {taxonomy?.feels.map(feel => (
                  <Badge key={feel.id} variant="outline"
                    className={`cursor-pointer transition-colors ${selectedFeelId === feel.id ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/20'}`}
                    onClick={() => setSelectedFeelId(selectedFeelId === feel.id ? null : feel.id)}>
                    {feel.name}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="genre" className="border-border">
            <AccordionTrigger className="hover:no-underline font-medium text-sm text-foreground">Genre</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 pt-2">
                {taxonomy?.genres.map(genre => (
                  <button key={genre.id}
                    className={`flex items-center gap-2 text-sm cursor-pointer transition-colors text-left px-2 py-1 rounded ${selectedGenreId === genre.id ? 'bg-primary/20 text-primary font-medium' : 'hover:text-primary'}`}
                    onClick={() => setSelectedGenreId(selectedGenreId === genre.id ? null : genre.id)}>
                    <span className={`w-2 h-2 rounded-full ${selectedGenreId === genre.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    {genre.name}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        <div className="p-6 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md hidden md:block">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search loops..."
               value={search}
               onChange={(e) => { setSearch(e.target.value); setGenreFilter(null); }}
               className="pl-9 bg-background border-border"
             />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {genreFilter && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={clearGenreFilter}>
                Genre: {genreFilter}
                <X className="w-3 h-3" />
              </Badge>
            )}

            <Select defaultValue="newest">
              <SelectTrigger className="w-[180px] bg-background border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="quality_score">Highest Quality</SelectItem>
                <SelectItem value="most_views">Most Viewed</SelectItem>
                <SelectItem value="bpm_asc">BPM (Low to High)</SelectItem>
                <SelectItem value="bpm_desc">BPM (High to Low)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" /> List
              </Button>
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="w-4 h-4 mr-2" /> Map
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {isLoopsLoading ? (
                   Array.from({ length: 8 }).map((_, i) => (
                    <Card key={`loading-${i}`} className="overflow-hidden border-border bg-card">
                      <Skeleton className="h-40 w-full" />
                      <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
                ) : loopsData?.loops.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Music className="w-12 h-12 mb-4 opacity-50" />
                    <h3 className="text-xl font-serif mb-2">No loops found</h3>
                    <p className="text-sm">Try broadening your search or adjusting filters.</p>
                    <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setBpmRange([40, 300]); setGenreFilter(null); setSelectedTimeSigId(null); setSelectedFeelId(null); setSelectedGenreId(null); }}>
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  loopsData?.loops?.map((loop: any) => (
                    <Card
                      key={loop.id}
                      className={`overflow-hidden border-border bg-card hover:border-primary/50 transition-colors cursor-pointer group vinyl-hover ${
                        selectedLoopId === loop.id ? 'ring-2 ring-primary border-primary' : ''
                      }`}
                      onClick={() => handleLoopCardClick(loop.id, loop.title)}
                    >
                      {/* Artist header bar */}
                      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                        <button
                          className="flex items-center gap-2 hover:text-primary transition-colors text-left"
                          onClick={(e) => { e.stopPropagation(); setSearch(loop.artist || ''); }}
                          title={`Show all loops by ${loop.artist}`}
                        >
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                              {loop.artist?.substring(0, 2).toUpperCase() || 'GK'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{loop.artist || 'Unknown Artist'}</span>
                        </button>
                        {loop.isMultitrack && <Badge variant="secondary" className="text-[8px] flex-shrink-0">Multi</Badge>}
                      </div>
                      {/* Main content */}
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm truncate">{loop.grooveName || loop.title}</h4>
                        {loop.collection && (
                          <button
                            className="text-[10px] text-muted-foreground hover:text-primary transition-colors truncate block mt-0.5"
                            onClick={(e) => { e.stopPropagation(); setSearch(loop.collection || ''); }}
                            title={`Show all loops from ${loop.collection}`}
                          >
                            📁 {loop.collection.replace(/_/g, ' ')}
                          </button>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {loop.genre && <Badge className="text-[9px] bg-primary/15 text-primary border-0">{loop.genre}</Badge>}
                          {loop.bpm && <Badge variant="secondary" className="font-mono text-[9px]">{loop.bpm} BPM</Badge>}
                          {loop.timeSignature && <Badge variant="outline" className="font-mono text-[9px]">{loop.timeSignature}</Badge>}
                          {loop.feel && <Badge variant="outline" className="text-[9px]">{loop.feel}</Badge>}
                          {loop.sectionType && loop.sectionType !== 'full_loop' && (
                            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">{loop.sectionType}</Badge>
                          )}
                          {loop.instrumentCategory && loop.instrumentCategory !== 'drums' && (
                            <Badge variant="outline" className="text-[9px]">{loop.instrumentCategory}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Groove Match Panel */}
              {selectedLoopId && (
                <GrooveMatchPanel
                  key={selectedLoopId}
                  loopId={selectedLoopId}
                  loopTitle={selectedLoopTitle}
                  onClose={() => { setSelectedLoopId(null); setSelectedLoopTitle(''); }}
                  onMatchClick={handleMatchClick}
                />
              )}
            </>
          ) : (
            <div className="h-full w-full flex flex-col relative overflow-hidden" style={{ background: 'hsl(220 20% 8%)' }}>
               <div className="px-6 pt-6 pb-2 z-10">
                 <h3 className="font-serif text-2xl text-white">The Groove Map</h3>
                 <p className="text-sm text-gray-400 mt-1">Discover loops by feel and complexity. Click a genre to explore its loops.</p>
               </div>

               <div className="flex-1 min-h-0 relative z-10">
                 {genreMap && genreMap.length > 0 ? (
                   <GenreMapView data={genreMap} onGenreClick={handleGenreMapClick} />
                 ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Skeleton className="w-full h-full rounded-xl opacity-20" />
                    </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
