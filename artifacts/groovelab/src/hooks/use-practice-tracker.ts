import { useRef, useCallback, useEffect } from 'react';

export function usePracticeTracker(pageName: string) {
  const startTime = useRef<number | null>(null);
  const userId = useRef<string | null>(null);

  // Try to get userId from auth context or localStorage
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(data => {
      if (data.user) userId.current = data.user.id;
    }).catch(() => {});
  }, []);

  const startTracking = useCallback(() => {
    startTime.current = Date.now();
  }, []);

  const stopTracking = useCallback(async (bpm?: number) => {
    if (!startTime.current || !userId.current) return;
    const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);
    if (durationSeconds < 10) return; // ignore very short sessions

    try {
      await fetch('/api/practice/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.current,
          durationSeconds,
          bpmPracticed: bpm || null,
        }),
      });
    } catch (e) { console.log('Failed to log practice'); }
    startTime.current = null;
  }, []);

  // Auto-start on mount, auto-stop on unmount
  useEffect(() => {
    startTracking();
    return () => { stopTracking(); };
  }, [startTracking, stopTracking]);

  return { startTracking, stopTracking };
}
