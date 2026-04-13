import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';

interface PlayerState {
  loopId: string | null;
  title: string;
  creator: string;
  youtubeVideoId: string | null;
  bpm: number | null;
}

interface PlayerContextType {
  current: PlayerState | null;
  isOpen: boolean;
  playLoop: (loop: { id: string; title: string; creator?: { channelName: string } | null; youtubeVideoId?: string | null; bpm?: number | null }) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextType>({
  current: null,
  isOpen: false,
  playLoop: () => {},
  close: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<PlayerState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  // Close player on navigation
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
      setCurrent(null);
    }
  }, [location]);

  const playLoop = useCallback((loop: any) => {
    setCurrent({
      loopId: loop.id,
      title: loop.title,
      creator: loop.creator?.channelName || 'Unknown',
      youtubeVideoId: loop.youtubeVideoId || null,
      bpm: loop.bpm || null,
    });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrent(null);
  }, []);

  return (
    <PlayerContext.Provider value={{ current, isOpen, playLoop, close }}>
      {children}
    </PlayerContext.Provider>
  );
};
