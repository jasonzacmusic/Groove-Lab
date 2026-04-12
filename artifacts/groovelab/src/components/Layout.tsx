import React from 'react';
import { Link, useLocation } from 'wouter';
import { Compass, Music, Cpu, Piano, BookOpen, Radio, Target, Search, Sun, Moon, Play, Pause, Disc3, Timer } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NAV_ITEMS = [
  { path: '/', label: 'Explore', icon: Compass },
  { path: '/sequencer', label: 'Sequencer', icon: Music },
  { path: '/metronome', label: 'Metronome', icon: Timer },
  { path: '/midi', label: 'MIDI', icon: Cpu },
  { path: '/chords', label: 'Chords', icon: Piano },
  { path: '/standards', label: 'Standards', icon: BookOpen },
  { path: '/live', label: 'Live', icon: Radio },
  { path: '/practice', label: 'Practice', icon: Target },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar h-full z-10">
        <div className="p-6 flex items-center gap-3">
          <Disc3 className="w-8 h-8 text-primary" />
          <h1 className="font-serif italic text-2xl text-foreground">GrooveLab</h1>
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
          <div className="md:hidden flex items-center gap-2">
            <Disc3 className="w-6 h-6 text-primary" />
            <h1 className="font-serif italic text-xl text-foreground">GrooveLab</h1>
          </div>
          
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search loops, creators, standards..." className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Avatar className="w-8 h-8 cursor-pointer vinyl-texture">
              <AvatarImage src="" />
              <AvatarFallback>GL</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-24">
          {children}
        </main>

        {/* Bottom Player Bar */}
        <div className="absolute bottom-16 md:bottom-0 left-0 right-0 h-20 bg-card border-t border-border flex items-center px-4 z-20 shadow-lg">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
              <Music className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Select a loop to play</p>
              <p className="text-xs text-muted-foreground">--</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Play className="w-5 h-5" />
            </Button>
          </div>
        </div>
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