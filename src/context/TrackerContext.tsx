import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CAUGHT_KEY = '@pokedex_caught';
const SEEN_KEY = '@pokedex_seen';

interface TrackerContextValue {
  caught: number[];
  seen: number[];
  markCaught: (id: number) => void;
  markSeen: (id: number) => void;
  isCaught: (id: number) => boolean;
  isSeen: (id: number) => boolean;
}

const TrackerContext = createContext<TrackerContextValue>({
  caught: [],
  seen: [],
  markCaught: () => {},
  markSeen: () => {},
  isCaught: () => false,
  isSeen: () => false,
});

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [caught, setCaught] = useState<number[]>([]);
  const [seen, setSeen] = useState<number[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CAUGHT_KEY).then((raw) => {
      if (raw) setCaught(JSON.parse(raw));
    });
    AsyncStorage.getItem(SEEN_KEY).then((raw) => {
      if (raw) setSeen(JSON.parse(raw));
    });
  }, []);

  const markSeen = useCallback((id: number) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markCaught = useCallback((id: number) => {
    markSeen(id);
    setCaught((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((f) => f !== id);
        AsyncStorage.setItem(CAUGHT_KEY, JSON.stringify(next));
        return next;
      }
      const next = [...prev, id];
      AsyncStorage.setItem(CAUGHT_KEY, JSON.stringify(next));
      return next;
    });
  }, [markSeen]);

  const isCaught = useCallback((id: number) => caught.includes(id), [caught]);
  const isSeen = useCallback((id: number) => seen.includes(id), [seen]);

  return (
    <TrackerContext.Provider value={{ caught, seen, markCaught, markSeen, isCaught, isSeen }}>
      {children}
    </TrackerContext.Provider>
  );
}

export const useTracker = () => useContext(TrackerContext);
