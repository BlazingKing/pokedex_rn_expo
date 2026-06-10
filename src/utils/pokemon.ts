import type { EvolutionLink, EvoStageInfo } from '../types/pokemon';

export const getPokemonId = (url: string): number => {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
};

export const getPokemonImageUrl = (id: number): string =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const formatStatName = (name: string): string => {
  const map: Record<string, string> = {
    hp: 'HP',
    attack: 'ATK',
    defense: 'DEF',
    'special-attack': 'SP.ATK',
    'special-defense': 'SP.DEF',
    speed: 'SPD',
  };
  return map[name] ?? name.toUpperCase();
};

export const formatHeight = (height: number): string => `${(height / 10).toFixed(1)} m`;
export const formatWeight = (weight: number): string => `${(weight / 10).toFixed(1)} kg`;

export const getEnglishFlavorText = (entries: Array<{ flavor_text: string; language: { name: string } }>): string => {
  const entry = entries.find((e) => e.language.name === 'en');
  return entry ? entry.flavor_text.replace(/\f|\n/g, ' ') : '';
};

export const flattenEvolutionChain = (link: EvolutionLink): EvoStageInfo[] => {
  // First stage has no trigger — it's the base form
  const stages: EvoStageInfo[] = [{ name: link.species.name, minLevel: null, trigger: null }];
  if (link.evolves_to.length > 0) {
    const next = link.evolves_to[0];
    const detail = next.evolution_details?.[0];
    stages.push({
      name: next.species.name,
      minLevel: detail?.min_level ?? null,
      trigger: detail?.trigger?.name ?? null,
    });
    if (next.evolves_to.length > 0) {
      const next2 = next.evolves_to[0];
      const detail2 = next2.evolution_details?.[0];
      stages.push({
        name: next2.species.name,
        minLevel: detail2?.min_level ?? null,
        trigger: detail2?.trigger?.name ?? null,
      });
    }
  }
  return stages;
};
