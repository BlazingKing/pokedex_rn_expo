import axios from 'axios';
import type { Pokemon, PokemonListResponse, PokemonSpecies, EvolutionChain } from '../types/pokemon';

const api = axios.create({
  baseURL: 'https://pokeapi.co/api/v2',
  timeout: 10000,
});

export const fetchPokemonList = async (limit = 20, offset = 0): Promise<PokemonListResponse> => {
  const { data } = await api.get<PokemonListResponse>('/pokemon', { params: { limit, offset } });
  return data;
};

export const fetchPokemon = async (nameOrId: string | number): Promise<Pokemon> => {
  const { data } = await api.get<Pokemon>(`/pokemon/${nameOrId}`);
  return data;
};

export const fetchPokemonSpecies = async (nameOrId: string | number): Promise<PokemonSpecies> => {
  const { data } = await api.get<PokemonSpecies>(`/pokemon-species/${nameOrId}`);
  return data;
};

export const fetchEvolutionChain = async (url: string): Promise<EvolutionChain> => {
  const { data } = await axios.get<EvolutionChain>(url);
  return data;
};

export const searchPokemon = async (query: string): Promise<Pokemon> => {
  const { data } = await api.get<Pokemon>(`/pokemon/${query.toLowerCase()}`);
  return data;
};

export const fetchMoveDetail = async (nameOrId: string | number) => {
  const { data } = await api.get(`/move/${nameOrId}`);
  return data;
};
