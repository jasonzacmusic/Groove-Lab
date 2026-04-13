import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ListMusic, FolderOpen, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { SongBuilder, type SongSection } from '@/components/SongBuilder';

interface CollectionGroup {
  artist: string;
  collection: string;
  bpm: number | null;
  genre: string;
  sectionTypes: string[];
  count: number;
  firstLoopId: string;
}

const ITEMS_PER_PAGE = 50;

async function fetchCollections(search: string, page: number): Promise<{ groups: CollectionGroup[]; total: number }> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('sort', 'collection');
  params.set('limit', '200');
  params.set('offset', String((page - 1) * 200));

  const res = await fetch(`/api/audio-loops?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch loops');
  const data = await res.json();

  // Group loops by artist+collection on the client
  const groupMap = new Map<string, CollectionGroup>();
  for (const loop of data.loops) {
    const key = `${loop.artist}::${loop.collection || loop.grooveName}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        artist: loop.artist,
        collection: loop.collection || loop.grooveName || loop.title,
        bpm: loop.bpm ?? null,
        genre: loop.genre,
        sectionTypes: [],
        count: 0,
        firstLoopId: loop.id,
      });
    }
    const group = groupMap.get(key)!;
    group.count++;
    if (loop.sectionType && !group.sectionTypes.includes(loop.sectionType)) {
      group.sectionTypes.push(loop.sectionType);
    }
  }

  const groups = Array.from(groupMap.values());
  // Paginate the groups
  const start = 0;
  const end = ITEMS_PER_PAGE;
  return { groups: groups.slice(start, end), total: groups.length };
}

export default function SongBuilderPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [songBuilderData, setSongBuilderData] = useState<{
    sections: SongSection[];
    artist: string;
    collection: string;
    bpm: number | null;
  } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['song-builder-collections', search, page],
    queryFn: () => fetchCollections(search, page),
  });

  const groups = data?.groups || [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const openBuilder = useCallback(async (group: CollectionGroup) => {
    setLoading(group.firstLoopId);
    try {
      const params = new URLSearchParams();
      params.set('collection', group.collection);
      params.set('limit', '200');
      params.set('sort', 'collection');

      const res = await fetch(`/api/audio-loops?${params.toString()}`);
      const data = await res.json();
      const sections: SongSection[] = (data.loops || []).map((l: any) => ({
        id: l.id,
        grooveName: l.grooveName || l.title,
        sectionType: l.sectionType || 'full_loop',
        sectionNumber: l.sectionNumber ?? null,
        bpm: l.bpm ?? null,
        wavUrl: l.wavUrl,
        artist: l.artist || '',
      }));

      setSongBuilderData({
        sections,
        artist: group.artist,
        collection: group.collection,
        bpm: group.bpm,
      });
    } catch (err) {
      console.error('Failed to load collection:', err);
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 md:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <ListMusic className="w-7 h-7 text-primary" />
            <div>
              <h1 className="font-serif text-2xl md:text-3xl">Song Builder</h1>
              <p className="text-sm text-muted-foreground">Pick a collection and arrange sections into a full song</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by artist, collection, genre..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" variant="default">Search</Button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="text-center py-20">
            <ListMusic className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-serif text-xl mb-2">No collections found</h2>
            <p className="text-sm text-muted-foreground">Try adjusting your search.</p>
          </div>
        )}

        {!isLoading && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={`${group.artist}::${group.collection}`}
                className="overflow-hidden cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => openBuilder(group)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-base truncate">{group.collection.replace(/_/g, ' ')}</h3>
                      <p className="text-sm text-muted-foreground truncate">{group.artist}</p>
                    </div>
                    {loading === group.firstLoopId ? (
                      <span className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full flex-shrink-0" />
                    ) : (
                      <Play className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {group.bpm && <Badge variant="secondary" className="font-mono text-[10px]">{group.bpm} BPM</Badge>}
                    <Badge className="bg-primary/15 text-primary text-[10px] border-0">{group.genre}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {group.count} section{group.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {group.sectionTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {group.sectionTypes.slice(0, 6).map((type) => (
                        <span key={type} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                          {type.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {group.sectionTypes.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">+{group.sectionTypes.length - 6} more</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
