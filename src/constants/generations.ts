export interface GenInfo {
  label: string;
  region: string;
  offset: number;
  limit: number;
  color: string;
  glow: string;
}

export const GENERATIONS: Record<string, GenInfo> = {
  all: { label: 'ALL', region: '', offset: 0, limit: 20, color: '#1E293B', glow: '#818CF8' },
  'gen-i':   { label: 'GEN I',   region: 'Kanto',  offset: 0,    limit: 151, color: '#1a1a2e', glow: '#FF6B6B' },
  'gen-ii':  { label: 'GEN II',  region: 'Johto',  offset: 151,  limit: 100, color: '#1a2e1a', glow: '#4ADE80' },
  'gen-iii': { label: 'GEN III', region: 'Hoenn',  offset: 251,  limit: 135, color: '#1a1a2e', glow: '#60A5FA' },
  'gen-iv':  { label: 'GEN IV',  region: 'Sinnoh', offset: 386,  limit: 107, color: '#2e1a2e', glow: '#C084FC' },
  'gen-v':   { label: 'GEN V',   region: 'Unova',  offset: 493,  limit: 156, color: '#2e2e1a', glow: '#FACC15' },
  'gen-vi':  { label: 'GEN VI',  region: 'Kalos',  offset: 649,  limit: 72,  color: '#1a2e2e', glow: '#67E8F9' },
  'gen-vii': { label: 'GEN VII', region: 'Alola',  offset: 721,  limit: 88,  color: '#2e1a1a', glow: '#F97316' },
  'gen-viii':{ label: 'GEN VIII',region: 'Galar',  offset: 809,  limit: 96,  color: '#1a1a1a', glow: '#94A3B8' },
  'gen-ix':  { label: 'GEN IX',  region: 'Paldea', offset: 905,  limit: 120, color: '#2e1a2e', glow: '#F472B6' },
};

export const GEN_KEYS = Object.keys(GENERATIONS);
