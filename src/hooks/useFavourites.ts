import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pokedex_favourites';

export function useFavourites() {
  const [favourites, setFavourites] = useState<number[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setFavourites(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((ids: number[]) => {
    setFavourites(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const toggle = useCallback(
    (id: number) => {
      const next = favourites.includes(id)
        ? favourites.filter((f) => f !== id)
        : [...favourites, id];
      persist(next);
    },
    [favourites, persist]
  );

  const isFav = useCallback((id: number) => favourites.includes(id), [favourites]);

  return { favourites, toggle, isFav };
}
