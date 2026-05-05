import React from 'react';
import { Link, useLocation } from 'wouter';
import { Compass, Music, Cpu, Piano, BookOpen, Radio, Target, Search, Sun, Moon, Play, Pause, Timer, LogOut, User, ListMusic, GraduationCap, Headphones } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_ITEMS = [
  { path: '/', label: 'YouTube Loops', icon: Compass },
  { path: '/loop-library', label: 'Audio Loops', icon: Headphones },
  { path: '/song-builder', label: 'Song Builder', icon: ListMusic },
  { path: '/sequencer', label: 'Sequencer', icon: Music },
  { path: '/metronome', label: 'Metronome', icon: Timer },
  { path: '/midi', label: 'MIDI', icon: Cpu },
  { path: '/chords', label: 'Chords', icon: Piano },
  { path: '/standards', label: 'Standards', icon: BookOpen },
  { path: '/play-along', label: 'Play-Along', icon: GraduationCap },
  { path: '/exam-practice', label: 'Exam Practice', icon: BookOpen },
  { path: '/live', label: 'Live', icon: Radio },
  { path: '/playlists', label: 'Playlists', icon: ListMusic },
  { path: '/practice', label: 'Practice', icon: Target },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const { current: playerCurrent, isOpen: playerOpen, close: closePlayer } = usePlayer();
  
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar h-full z-10">
        <div className="p-6">
          <Logo compact />
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors relative ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10">
          <div className="md:hidden">
            <Logo compact />
          </div>
          
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search YouTube loops, standards, chords..." className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            {!isLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="w-8 h-8 cursor-pointer vinyl-texture">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {user.name
                        ? user.name.slice(0, 2).toUpperCase()
                        : user.email.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      {user.name && (
                        <p className="text-sm font-medium">{user.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : !isLoading ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
                className="text-sm"
              >
                Sign In
              </Button>
            ) : null}
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
          {children}
        </main>

        {/* Bottom Player Bar */}
        {playerOpen && playerCurrent ? (
          <div className="absolute bottom-16 md:bottom-0 left-0 right-0 bg-card border-t border-border z-20 shadow-lg">
            {playerCurrent.youtubeVideoId && (
              <div className="w-full aspect-video max-h-[300px]">
                <iframe
                  src={`https://www.youtube.com/embed/${playerCurrent.youtubeVideoId}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={playerCurrent.title}
                />
              </div>
            )}
            <div className="h-14 flex items-center px-4 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{playerCurrent.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{playerCurrent.creator}{playerCurrent.bpm ? ` · ${playerCurrent.bpm} BPM` : ''}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closePlayer} className="flex-shrink-0">
                <span className="text-lg">x</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-16 md:bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center px-4 z-20">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                <Music className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Select a YouTube loop or audio loop to play</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-t border-border flex items-center justify-around px-2 z-30 pb-safe">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex flex-col items-center justify-center w-14 h-full cursor-pointer ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
