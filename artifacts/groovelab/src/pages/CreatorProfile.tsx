import React from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Star, Eye, Music, Users, Heart } from 'lucide-react';

export default function CreatorProfile() {
  const [, params] = useRoute('/creators/:id');
  const creatorId = params?.id;

  const [creator, setCreator] = React.useState<any>(null);
  const [loops, setLoops] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!creatorId) return;
    setLoading(true);
    fetch(`/api/creators/${creatorId}`)
      .then(r => r.json())
      .then(data => { setCreator(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`/api/loops?limit=50`)
      .then(r => r.json())
      .then(data => {
        const creatorLoops = (data.loops || []).filter((l: any) => l.creatorId === creatorId);
        setLoops(creatorLoops);
      })
      .catch(() => {});
  }, [creatorId]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-muted-foreground">
        <p className="text-xl">Creator not found</p>
      </div>
    );
  }

  const qualityPercent = Math.round(Number(creator.qualityScore) * 100);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex items-end gap-4 -mt-10">
            <Avatar className="w-20 h-20 border-4 border-background">
              <AvatarImage src={creator.avatarUrl || ''} />
              <AvatarFallback className="text-2xl font-serif bg-primary/20 text-primary">
                {creator.channelName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1">
              <h1 className="font-serif text-2xl md:text-3xl">{creator.channelName}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {(creator.subscriberCount || 0).toLocaleString()} subscribers
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {(creator.totalViews || 0).toLocaleString()} views
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {creator.youtubeChannelId && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://www.youtube.com/channel/${creator.youtubeChannelId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    YouTube
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-mono font-bold text-primary">{qualityPercent}%</div>
            <div className="text-xs text-muted-foreground mt-1">Quality Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-mono font-bold">{loops.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Loops</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-mono font-bold">{creator.videoCount || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(creator.qualityScore) * 5) ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Rating</div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {creator.description && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">About</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{creator.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Support */}
      {creator.paypalEmail && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Support this creator's work
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Help {creator.channelName} keep making great content
              </p>
            </div>
            <Button asChild>
              <a href={`https://paypal.me/${creator.paypalEmail}`} target="_blank" rel="noopener noreferrer">
                Donate via PayPal
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loops */}
      <div>
        <h3 className="font-serif text-xl mb-4">Loops by {creator.channelName}</h3>
        {loops.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No loops available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loops.map((loop: any) => (
              <Card key={loop.id} className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{loop.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {loop.bpm && <Badge variant="secondary" className="text-[10px] font-mono">{loop.bpm} BPM</Badge>}
                        {loop.durationSeconds && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {Math.floor(loop.durationSeconds / 60)}:{(loop.durationSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {(loop.viewCount || 0).toLocaleString()} views
                        </span>
                      </div>
                    </div>
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
