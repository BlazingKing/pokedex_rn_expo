import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pokedex_favourites';

interface FavouritesContextValue {
  favourites: number[];
  toggle: (id: number) => void;
  isFav: (id: number) => boolean;
}

const FavouritesContext = createContext<FavouritesContextValue>({
  favourites: [],
  toggle: () => {},
  isFav: () => false,
});

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [favourites, setFavourites] = useState<number[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setFavourites(JSON.parse(raw));
    });
  }, []);

  const toggle = useCallback((id: number) => {
    setFavourites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFav = useCallback((id: number) => favourites.includes(id), [favourites]);

  return (
    <FavouritesContext.Provider value={{ favourites, toggle, isFav }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export const useFavourites = () => useContext(FavouritesContext);
