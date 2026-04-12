import React from 'react';
import { useGetLoops, useGetFeaturedLoops, useGetTaxonomy } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, Play, Music, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function Home() {
  const { data: taxonomy, isLoading: isTaxonomyLoading } = useGetTaxonomy();
  const { data: featuredLoops, isLoading: isFeaturedLoading } = useGetFeaturedLoops();
  const { data: loops, isLoading: isLoopsLoading } = useGetLoops({ limit: 12 });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <section>
        <h2 className="font-serif text-3xl mb-6 flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" /> Discover
        </h2>
        
        {/* Categories Carousel */}
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex w-max space-x-4">
            {isTaxonomyLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-full vinyl-texture bg-primary/20" />
              ))
            ) : (
              taxonomy?.contentTypes.map((type) => (
                <div key={type.id} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors">
                  {type.name}
                </div>
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Featured Section */}
      <section>
        <h3 className="font-serif text-2xl mb-4">Featured Creators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isFeaturedLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border bg-card">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : (
            featuredLoops?.map((loop) => (
              <Card key={loop.id} className="overflow-hidden border-border bg-card hover:border-primary/50 transition-colors cursor-pointer group vinyl-hover">
                <div className="aspect-video relative bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  {loop.youtubeVideoId ? (
                    <img src={`https://img.youtube.com/vi/${loop.youtubeVideoId}/mqdefault.jpg`} alt={loop.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Music className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-12 h-12 text-white drop-shadow-md" fill="currentColor" />
                  </div>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-medium text-lg truncate mb-2">{loop.title}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px]">{loop.creator?.channelName.substring(0, 2).toUpperCase() || 'GL'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate max-w-[100px]">{loop.creator?.channelName || 'Unknown'}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">{loop.bpm} BPM</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Filter Pills */}
      <section>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex w-max space-x-2">
            <Badge variant="outline" className="bg-background text-muted-foreground hover:bg-muted cursor-pointer">4/4</Badge>
            <Badge variant="outline" className="bg-background text-muted-foreground hover:bg-muted cursor-pointer">3/4</Badge>
            <Badge variant="outline" className="bg-background text-muted-foreground hover:bg-muted cursor-pointer">6/8</Badge>
            <div className="w-px h-6 bg-border mx-2" />
            <Badge variant="outline" className="bg-background text-muted-foreground hover:bg-muted cursor-pointer">Straight</Badge>
            <Badge variant="outline" className="bg-background text-muted-foreground hover:bg-muted cursor-pointer">Swing</Badge>
            <Badge variant="outline" className="bg-background text-muted-foreground hover:bg-muted cursor-pointer">Shuffle</Badge>
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Main Grid */}
      <section>
        <h3 className="font-serif text-2xl mb-4">Fresh Drops</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          ) : (
            loops?.loops.map((loop) => (
              <Card key={loop.id} className="overflow-hidden border-border bg-card hover:border-primary/50 transition-colors cursor-pointer group vinyl-hover">
                <CardContent className="p-4">
                  <h4 className="font-medium text-lg truncate mb-2">{loop.title}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">{loop.bpm} BPM</Badge>
                    {loop.timeSignatures?.[0] && <Badge variant="outline" className="font-mono text-xs">{loop.timeSignatures[0].displayName}</Badge>}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px]">{loop.creator?.channelName.substring(0, 2).toUpperCase() || 'GL'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate max-w-[100px]">{loop.creator?.channelName || 'Unknown'}</span>
                    </div>
                    <div className="flex gap-1 items-center text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < loop.qualityScore ? 'bg-primary' : 'bg-muted'}`} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}