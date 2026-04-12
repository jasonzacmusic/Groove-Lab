import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Eye, Star, Music, ExternalLink } from 'lucide-react';

interface Creator {
  id: string;
  channelName: string;
  youtubeChannelId: string | null;
  subscriberCount: number;
  totalViews: number;
  qualityScore: number;
  avatarUrl: string | null;
  description: string | null;
}

export default function Creators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/creators?limit=50')
      .then(r => r.json())
      .then(data => {
        setCreators(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = creators.filter(c =>
    !search || c.channelName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-3xl">Creators</h2>
          <p className="text-muted-foreground text-sm mt-1">{creators.length} drum loop creators</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search creators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50 border-none"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(creator => (
            <Link key={creator.id} href={`/creators/${creator.id}`}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 flex-shrink-0">
                      <AvatarImage src={creator.avatarUrl || ''} />
                      <AvatarFallback className="text-lg font-serif bg-primary/20 text-primary">
                        {creator.channelName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-medium text-base truncate group-hover:text-primary transition-colors">
                        {creator.channelName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {creator.subscriberCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {creator.totalViews.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= Math.round(Number(creator.qualityScore) * 5) ? 'text-primary fill-primary' : 'text-muted-foreground/20'}`} />
                        ))}
                        <Badge variant="secondary" className="ml-2 text-[10px] font-mono">
                          {Math.round(Number(creator.qualityScore) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No creators found matching "{search}"</p>
        </div>
      )}
    </div>
  );
}
