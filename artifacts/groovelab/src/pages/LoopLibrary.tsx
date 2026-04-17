import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, Pause, Headphones, SlidersHorizontal, X, ChevronLeft, ChevronRight, ListMusic, FolderOpen } from 'lucide-react';
import { LoopPlayer, type AudioLoopData } from '@/components/LoopPlayer';
import { SongBuilder, type SongSection } from '@/components/SongBuilder';

// These match the ACTUAL values in the Neon database (verified 2026-04-13)
const GENRES = ['All', 'Rock', 'Pop', 'Funk', 'Blues', 'Jazz', 'R&B', 'Soul', 'Indie Rock', 'Hip Hop', 'Folk', 'World', 'Latin', 'Cinematic', 'Electronic', 'Reggae'];
const INSTRUMENTS = ['All', 'drums+percussion', 'drums', 'percussion', 'bass', 'guitar'];
const KEYS = ['All', 'A', 'B', 'C', 'C#', 'D', 'Db', 'E', 'Eb', 'F#', 'G', 'G#'];
const SORT_OPTIONS = [
  { value: 'collection', label: 'By Song / Collection' },
  { value: 'artist', label: 'Artist A-Z' },
  { value: 'bpm_asc', label: 'BPM (Low-High)' },
  { value: 'bpm_desc', label: 'BPM (High-Low)' },
  { value: 'genre', label: 'Genre' },
  { value: 'most_played', label: 'Most Played' },
  { value: 'newest', label: 'Newest' },
];

const ITEMS_PER_PAGE = 48;

// Display label helper for DB values
function displayLabel(val: string): string {
  if (val === 'All') return 'All';
  if (val === 'drums+percussion') return 'Drums & Percussion';
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface LoopFilters {
  search: string;
  genre: string;
  instrument: string;
  key: string;
  bpmRange: [number, number];
  sort: string;
  page: number;
}

async function fetchLoops(filters: LoopFilters): Promise<{ loops: AudioLoopData[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.genre !== 'All') params.set('genre', filters.genre);
  if (filters.instrument !== 'All') {
    if (filters.instrument === 'drums+percussion') {
      params.set('instrument_category', 'drums,percussion');
    } else {
      params.set('instrument_category', filters.instrument);
    }
  }
  if (filters.key !== 'All') params.set('key', filters.key);
  // Only send BPM range if user has narrowed it from defaults (so NULL-bpm loops show when unfiltered)
  if (filters.bpmRange[0] > 40) params.set('bpm_min', String(filters.bpmRange[0]));
  if (filters.bpmRange[1] < 240) params.set('bpm_max', String(filters.bpmRange[1]));
  params.set('sort', filters.sort);
  params.set('limit', String(ITEMS_PER_PAGE));
  params.set('offset', String((filters.page - 1) * ITEMS_PER_PAGE));

  const res = await fetch(`/api/audio-loops?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch loops');
  return res.json();
}

function MiniWaveform({ loop, isActive }: { loop: AudioLoopData; isActive: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const peaks = loop.waveformPeaks || Array.from({ length: 60 }, (_, i) => {
      const seed = (loop.id.charCodeAt(i % loop.id.length) * 31 + i * 17) % 100;
      return seed / 100 * 0.7 + 0.15;
    });
    const barW = w / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const barH = peaks[i] * h * 0.8;
      ctx.fillStyle = isActive ? '#e2a832' : 'rgba(226, 168, 50, 0.3)';
      ctx.fillRect(x, (h - barH) / 2, Math.max(barW - 1, 1), barH);
    }
  }, [loop, isActive]);

  return <canvas ref={canvasRef} width={240} height={40} className="w-full h-10" />;
}

export default function LoopLibrary() {
  const [filters, setFilters] = useState<LoopFilters>({
    search: '',
    genre: 'All',
    instrument: 'drums+percussion',
    key: 'All',
    bpmRange: [40, 240],
    sort: 'collection',
    page: 1,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [songBuilderData, setSongBuilderData] = useState<{
    sections: SongSection[];
    artist: string;
    collection: string;
    bpm: number | null;
  } | null>(null);
  const [songBuilderLoading, setSongBuilderLoading] = useState(false);

  const openSongBuilder = useCallback(async (loop: AudioLoopData) => {
    if (!loop.collection && !loop.artist) return;
    setSongBuilderLoading(true);
    try {
      // Fetch all loops from the EXACT same collection (folder)
      const params = new URLSearchParams();
      params.set('collection', loop.collection || '');
      params.set('limit', '200');
      params.set('sort', 'collection');

      const res = await fetch(`/api/audio-loops?${params.toString()}`);
      const data = await res.json();
      const allSections: SongSection[] = (data.loops || []).map((l: any) => ({
        id: l.id,
        grooveName: l.grooveName || l.title,
        sectionType: l.sectionType || 'full_loop',
        sectionNumber: l.sectionNumber ?? null,
        bpm: l.bpm ?? null,
        wavUrl: l.wavUrl,
        artist: l.artist || '',
      }));

      setSongBuilderData({
        sections: allSections,
        artist: loop.artist || 'Unknown',
        collection: loop.collection || loop.grooveName || loop.title,
        bpm: loop.bpm ?? null,
      });
    } catch (err) {
      console.error('Failed to load sections for Song Builder:', err);
    } finally {
      setSongBuilderLoading(false);
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audio-loops', filters],
    queryFn: () => fetchLoops(filters),
  });

  const loops = data?.loops || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const updateFilter = useCallback(<K extends keyof LoopFilters>(key: K, value: LoopFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value as number : 1 }));
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  }, [searchInput, updateFilter]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      genre: 'All',
      instrument: 'drums+percussion',
      key: 'All',
      bpmRange: [40, 240],
      sort: 'collection',
      page: 1,
    });
    setSearchInput('');
  }, []);

  const hasActiveFilters = filters.genre !== 'All' || filters.instrument !== 'drums+percussion' ||
    filters.key !== 'All' || filters.bpmRange[0] !== 40 || filters.bpmRange[1] !== 240 || filters.search !== '';

  // Group loops by collection when sorted by collection
  const groupedLoops = React.useMemo(() => {
    if (filters.sort !== 'collection') return null;
    const groups: { key: string; artist: string; collection: string; bpm: number | null; loops: AudioLoopData[] }[] = [];
    let currentKey = '';
    for (const loop of loops) {
      const groupKey = `${loop.artist}::${loop.collection || loop.grooveName}`;
      if (groupKey !== currentKey) {
        currentKey = groupKey;
        groups.push({ key: groupKey, artist: loop.artist, collection: loop.collection || loop.grooveName || loop.title, bpm: loop.bpm ?? null, loops: [] });
      }
      groups[groups.length - 1].loops.push(loop);
    }
    return groups;
  }, [loops, filters.sort]);

  const renderLoopCard = (loop: AudioLoopData) => (
    <>
      <Card
        className={`overflow-hidden cursor-pointer transition-all hover:border-primary/50 ${expandedId === loop.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
        onClick={() => setExpandedId(expandedId === loop.id ? null : loop.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Play button */}
            <button
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${expandedId === loop.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === loop.id ? null : loop.id); }}
            >
              {expandedId === loop.id ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm md:text-base truncate">{loop.grooveName || loop.title}</h3>
                {loop.sectionType && (
                  <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                    {loop.sectionType.replace(/_/g, ' ')}{loop.sectionNumber != null ? ` ${loop.sectionNumber}` : ''}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {loop.artist}
                {loop.collection && filters.sort !== 'collection' ? ` \u00b7 ${loop.collection.replace(/_/g, ' ')}` : ''}
              </p>
            </div>

            {/* Mini waveform (desktop only) */}
            <div className="hidden lg:block w-40 flex-shrink-0">
              <MiniWaveform loop={loop} isActive={expandedId === loop.id} />
            </div>

            {/* Tags */}
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              {loop.bpm && <Badge variant="secondary" className="font-mono text-[10px]">{loop.bpm}</Badge>}
              {loop.keySignature && <Badge variant="outline" className="font-mono text-[10px]">{loop.keySignature}</Badge>}
              <Badge className="bg-primary/15 text-primary text-[10px] border-0">{loop.genre}</Badge>
              {loop.feel && <Badge variant="outline" className="text-[10px]">{loop.feel}</Badge>}
            </div>
          </div>

          {/* Mobile tags */}
          <div className="flex sm:hidden flex-wrap gap-1 mt-2">
            {loop.bpm && <Badge variant="secondary" className="font-mono text-[10px]">{loop.bpm} BPM</Badge>}
            <Badge className="bg-primary/15 text-primary text-[10px] border-0">{loop.genre}</Badge>
            {loop.sectionType && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {loop.sectionType.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expanded Player */}
      {expandedId === loop.id && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <LoopPlayer loop={loop} autoPlay onClose={() => setExpandedId(null)} />
          <div className="px-4 pb-3 -mt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={(e) => { e.stopPropagation(); openSongBuilder(loop); }}
              disabled={songBuilderLoading}
            >
              {songBuilderLoading ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <ListMusic className="w-3.5 h-3.5" />
              )}
              Build Song
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 md:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Headphones className="w-7 h-7 text-primary" />
              <div>
                <h1 className="font-serif text-2xl md:text-3xl">Loop Library</h1>
                <p className="text-sm text-muted-foreground">Browse and preview native audio loops</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filters.sort} onValueChange={(v) => updateFilter('sort', v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-primary/10 text-primary' : ''}>
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by artist, groove name, genre..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" variant="default">Search</Button>
          </form>
        </div>
      </div>

      <div className="flex">
        {/* Filter Sidebar */}
        {showFilters && (
          <aside className="hidden md:block w-64 border-r border-border p-4 space-y-5 flex-shrink-0 sticky top-[140px] h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-6 px-2">
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Instrument — primary filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Instrument</label>
              <Select value={filters.instrument} onValueChange={(v) => updateFilter('instrument', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTRUMENTS.map(i => <SelectItem key={i} value={i}>{displayLabel(i)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Genre */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Genre</label>
              <Select value={filters.genre} onValueChange={(v) => updateFilter('genre', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Key */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Key</label>
              <Select value={filters.key} onValueChange={(v) => updateFilter('key', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* BPM Range */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                BPM Range: <span className="font-mono text-foreground">{filters.bpmRange[0]} - {filters.bpmRange[1]}</span>
              </label>
              <Slider
                value={filters.bpmRange}
                min={40}
                max={240}
                step={5}
                onValueChange={(v) => updateFilter('bpmRange', v as [number, number])}
                className="mt-2"
              />
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                {filters.search && (
                  <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => { updateFilter('search', ''); setSearchInput(''); }}>
                    "{filters.search}" <X className="w-2.5 h-2.5 ml-1" />
                  </Badge>
                )}
                {filters.genre !== 'All' && (
                  <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => updateFilter('genre', 'All')}>
                    {displayLabel(filters.genre)} <X className="w-2.5 h-2.5 ml-1" />
                  </Badge>
                )}
                {filters.instrument !== 'All' && (
                  <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => updateFilter('instrument', 'All')}>
                    {displayLabel(filters.instrument)} <X className="w-2.5 h-2.5 ml-1" />
                  </Badge>
                )}
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : `${total} loop${total !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <p className="text-destructive mb-2">Failed to load loops</p>
              <p className="text-sm text-muted-foreground">Please try again later.</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && loops.length === 0 && (
            <div className="text-center py-20">
              <Headphones className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-serif text-xl mb-2">No audio loops yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'No loops match your current filters. Try adjusting your search criteria.'
                  : 'Upload loops to get started building your library.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear All Filters</Button>
              )}
            </div>
          )}

          {/* Loop Grid */}
          {!isLoading && !error && loops.length > 0 && (
            <div className="space-y-3">
              {groupedLoops ? (
                /* Grouped by collection view */
                groupedLoops.map((group) => (
                  <div key={group.key} className="mb-6">
                    {/* Collection Header */}
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h2 className="font-serif text-lg truncate">{group.collection.replace(/_/g, ' ')}</h2>
                        <p className="text-xs text-muted-foreground">{group.artist}{group.bpm ? ` \u00b7 ${group.bpm} BPM` : ''} \u00b7 {group.loops.length} section{group.loops.length !== 1 ? 's' : ''}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs flex-shrink-0"
                        onClick={() => openSongBuilder(group.loops[0])}
                        disabled={songBuilderLoading}
                      >
                        {songBuilderLoading ? (
                          <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <ListMusic className="w-3.5 h-3.5" />
                        )}
                        Build Song
                      </Button>
                    </div>
                    {/* Loops in this collection */}
                    <div className="space-y-1.5 pl-2 border-l-2 border-primary/20 ml-2">
                      {group.loops.map((loop) => (
                        <React.Fragment key={loop.id}>
                          {renderLoopCard(loop)}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Flat list view */
                loops.map((loop) => (
                  <React.Fragment key={loop.id}>
                    {renderLoopCard(loop)}
                  </React.Fragment>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pb-8">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => updateFilter('page', filters.page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (filters.page <= 4) {
                    pageNum = i + 1;
                  } else if (filters.page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = filters.page - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={filters.page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-9 h-9"
                      onClick={() => updateFilter('page', pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => updateFilter('page', filters.page + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Song Builder Modal */}
      {songBuilderData && (
        <SongBuilder
          sections={songBuilderData.sections}
          artist={songBuilderData.artist}
          collection={songBuilderData.collection}
          bpm={songBuilderData.bpm}
          onClose={() => setSongBuilderData(null)}
        />
      )}
    </div>
  );
}
