import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchPokemon, fetchPokemonList, fetchPokemonSpecies, fetchEvolutionChain } from '../api/pokemon';
import type { GenInfo } from '../constants/generations';

export const usePokemonList = () =>
  useInfiniteQuery({
    queryKey: ['pokemon-list'],
    queryFn: ({ pageParam = 0 }) => fetchPokemonList(20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length * 20 : undefined,
  });

export const usePokemon = (nameOrId: string | number) =>
  useQuery({
    queryKey: ['pokemon', nameOrId],
    queryFn: () => fetchPokemon(nameOrId),
    enabled: !!nameOrId,
  });

export const usePokemonByGen = (gen: GenInfo) =>
  useQuery({
    queryKey: ['pokemon-gen', gen.label],
    queryFn: () => fetchPokemonList(gen.limit, gen.offset),
    staleTime: 1000 * 60 * 30,
  });

export const usePokemonSpecies = (nameOrId: string | number) =>
  useQuery({
    queryKey: ['pokemon-species', nameOrId],
    queryFn: () => fetchPokemonSpecies(nameOrId),
    enabled: !!nameOrId,
  });

export const useGen1PokemonList = () =>
  useQuery({
    queryKey: ['pokemon-gen1-full'],
    queryFn: () => fetchPokemonList(151, 0),
    staleTime: Infinity,
  });

export const useEvolutionChain = (url: string | undefined) =>
  useQuery({
    queryKey: ['evolution-chain', url],
    queryFn: () => fetchEvolutionChain(url!),
    enabled: !!url,
  });
