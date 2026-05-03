import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface YouTubePlaybackContextType {
  currentId: string | null;
  play: (id: string) => void;
  stop: () => void;
}

const YouTubePlaybackContext = createContext<YouTubePlaybackContextType>({
  currentId: null,
  play: () => {},
  stop: () => {},
});

export const useYouTubePlayback = () => useContext(YouTubePlaybackContext);

export const YouTubePlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentId, setCurrentId] = useState<string | null>(null);

  const play = useCallback((id: string) => setCurrentId(id), []);
  const stop = useCallback(() => setCurrentId(null), []);

  const value = useMemo(() => ({ currentId, play, stop }), [currentId, play, stop]);

  return (
    <YouTubePlaybackContext.Provider value={value}>
      {children}
    </YouTubePlaybackContext.Provider>
  );
};
