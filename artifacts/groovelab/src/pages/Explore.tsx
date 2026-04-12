import React, { useState } from 'react';
import { useGetLoops, useGetTaxonomy, useGetGenreMap } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Music, Map as MapIcon, List, Search } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Explore() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [search, setSearch] = useState('');
  const [bpmRange, setBpmRange] = useState([60, 200]);
  
  const { data: taxonomy, isLoading: isTaxonomyLoading } = useGetTaxonomy();
  const { data: loopsData, isLoading: isLoopsLoading } = useGetLoops({
    search: search || undefined,
    bpmMin: bpmRange[0],
    bpmMax: bpmRange[1]
  });
  const { data: genreMap } = useGetGenreMap();

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
                    <Badge key={ts.id} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono">
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
                  <Badge key={feel.id} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
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
                  <label key={genre.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-background" />
                    {genre.name}
                  </label>
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
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9 bg-background border-border" 
             />
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
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

        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'list' ? (
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
              ) : loopsData?.loops.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Music className="w-12 h-12 mb-4 opacity-50" />
                  <h3 className="text-xl font-serif mb-2">No loops found</h3>
                  <p className="text-sm">Try broadening your search or adjusting filters.</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setBpmRange([60, 200]); }}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                loopsData?.loops.map((loop) => (
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
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">{loop.bpm} BPM</Badge>
                        {loop.timeSignatures?.[0] && <Badge variant="outline" className="font-mono text-xs">{loop.timeSignatures[0].displayName}</Badge>}
                        {loop.feels?.[0] && <Badge variant="outline" className="text-[10px]">{loop.feels[0].name}</Badge>}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-[10px]">{loop.creator?.channelName.substring(0, 2).toUpperCase() || 'GL'}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{loop.creator?.channelName || 'Unknown'}</span>
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
          ) : (
            <div className="h-full w-full bg-card border border-border rounded-xl p-4 flex flex-col relative overflow-hidden">
               <h3 className="font-serif text-2xl mb-2 z-10">The Groove Map</h3>
               <p className="text-sm text-muted-foreground mb-6 z-10">Discover loops by feel and complexity. Straight rhythms on the left, swung on the right.</p>
               
               <div className="flex-1 min-h-0 relative z-10">
                 {genreMap && genreMap.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                       <XAxis type="number" dataKey="x" name="Feel" domain={[0, 1]} hide />
                       <YAxis type="number" dataKey="y" name="Complexity" domain={[0, 1]} hide />
                       <RechartsTooltip cursor={{strokeDasharray: '3 3'}} content={({ active, payload }) => {
                         if (active && payload && payload.length) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                               <p className="font-medium text-foreground">{data.genreName}</p>
                               <p className="text-sm text-muted-foreground">{data.feelName || 'Mixed Feel'}</p>
                               <p className="text-xs font-mono mt-2 text-primary">{data.loopCount} loops</p>
                             </div>
                           );
                         }
                         return null;
                       }} />
                       <Scatter name="Genres" data={genreMap}>
                         {genreMap.map((entry, index) => {
                           // Color based on x (feel) - straight is amber, swung is coral
                           const color = entry.x > 0.6 ? 'hsl(var(--coral))' : entry.x < 0.4 ? 'hsl(var(--primary))' : 'hsl(var(--sage))';
                           return <Cell key={`cell-${index}`} fill={color} />;
                         })}
                       </Scatter>
                     </ScatterChart>
                   </ResponsiveContainer>
                 ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Skeleton className="w-full h-full rounded-xl opacity-20" />
                    </div>
                 )}
               </div>
               
               {/* Decorative grid background */}
               <div className="absolute inset-0 pointer-events-none opacity-5 flex flex-col justify-between p-12">
                  {Array.from({length: 10}).map((_, i) => <div key={`h-${i}`} className="w-full h-px bg-foreground" />)}
               </div>
               <div className="absolute inset-0 pointer-events-none opacity-5 flex justify-between p-12">
                  {Array.from({length: 10}).map((_, i) => <div key={`v-${i}`} className="h-full w-px bg-foreground" />)}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}