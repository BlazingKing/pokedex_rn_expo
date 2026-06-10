import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pokedex_team';
const MAX_TEAM = 6;

interface TeamContextValue {
  team: number[];
  addMember: (id: number) => void;
  removeMember: (id: number) => void;
  isInTeam: (id: number) => boolean;
  isFull: boolean;
}

const TeamContext = createContext<TeamContextValue>({
  team: [],
  addMember: () => {},
  removeMember: () => {},
  isInTeam: () => false,
  isFull: false,
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<number[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setTeam(JSON.parse(raw));
    });
  }, []);

  const addMember = useCallback((id: number) => {
    setTeam((prev) => {
      if (prev.includes(id) || prev.length >= MAX_TEAM) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeMember = useCallback((id: number) => {
    setTeam((prev) => {
      const next = prev.filter((m) => m !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isInTeam = useCallback((id: number) => team.includes(id), [team]);

  return (
    <TeamContext.Provider value={{ team, addMember, removeMember, isInTeam, isFull: team.length >= MAX_TEAM }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => useContext(TeamContext);
