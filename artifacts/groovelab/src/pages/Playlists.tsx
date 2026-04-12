import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ListMusic, Plus, ChevronDown, ChevronUp, Globe, Lock, Music } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Playlist {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  loops: any[];
  createdAt: string;
}

export default function Playlists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/playlists?userId=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlaylists(data);
      }
    } catch {
      toast({ title: 'Failed to load playlists', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleCreate = async () => {
    if (!user?.id || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: newTitle.trim(),
          description: newDescription.trim(),
          isPublic: newIsPublic,
        }),
      });
      if (res.ok) {
        toast({ title: 'Playlist created' });
        setNewTitle('');
        setNewDescription('');
        setNewIsPublic(false);
        setDialogOpen(false);
        fetchPlaylists();
      } else {
        toast({ title: 'Failed to create playlist', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to create playlist', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-muted-foreground">
        <ListMusic className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-2xl font-serif mb-2">Your Playlists</h2>
        <p className="text-sm">Sign in to create and manage your playlists.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif">Your Playlists</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your favorite loops into collections.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Playlist</DialogTitle>
              <DialogDescription>
                Give your playlist a name and optional description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-title">Title</Label>
                <Input
                  id="playlist-title"
                  placeholder="My awesome playlist"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="playlist-desc">Description</Label>
                <Textarea
                  id="playlist-desc"
                  placeholder="What's this playlist about?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="playlist-public">Public</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow others to discover this playlist
                  </p>
                </div>
                <Switch
                  id="playlist-public"
                  checked={newIsPublic}
                  onCheckedChange={setNewIsPublic}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ListMusic className="w-12 h-12 mb-4 opacity-50" />
          <h3 className="text-xl font-serif mb-2">No playlists yet</h3>
          <p className="text-sm">Create your first playlist to start organizing loops.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map((playlist) => {
            const isExpanded = expandedId === playlist.id;
            return (
              <Card
                key={playlist.id}
                className="border-border bg-card transition-colors"
              >
                <CardContent className="p-0">
                  <button
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors rounded-lg"
                    onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ListMusic className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-base truncate">{playlist.title}</h4>
                        {playlist.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {playlist.loops?.length || 0} loops
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        {playlist.isPublic ? (
                          <><Globe className="w-3 h-3" /> Public</>
                        ) : (
                          <><Lock className="w-3 h-3" /> Private</>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(playlist.createdAt).toLocaleDateString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4">
                      {!playlist.loops || playlist.loops.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No loops in this playlist yet. Add loops from the Explore page.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {playlist.loops.map((loop: any, idx: number) => (
                            <div
                              key={loop.id || idx}
                              className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
                            >
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <Music className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {loop.title || `Loop ${idx + 1}`}
                                </p>
                              </div>
                              {loop.bpm && (
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  {loop.bpm} BPM
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
