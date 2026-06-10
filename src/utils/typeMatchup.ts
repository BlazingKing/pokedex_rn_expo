import { ATTACK_CHART, ALL_TYPES } from '../constants/typeMatchup';

export interface TypeEffectiveness {
  immune: string[];    // ×0
  quarter: string[];   // ×0.25
  half: string[];      // ×0.5
  double: string[];    // ×2
  quad: string[];      // ×4
}

export function computeDefenseMatchup(defenderTypes: string[]): TypeEffectiveness {
  const result: TypeEffectiveness = { immune: [], quarter: [], half: [], double: [], quad: [] };

  for (const attackType of ALL_TYPES) {
    const chart = ATTACK_CHART[attackType];
    const multiplier = defenderTypes.reduce((acc, dt) => {
      return acc * (chart[dt] ?? 1);
    }, 1);

    if (multiplier === 0) result.immune.push(attackType);
    else if (multiplier === 0.25) result.quarter.push(attackType);
    else if (multiplier === 0.5) result.half.push(attackType);
    else if (multiplier === 2) result.double.push(attackType);
    else if (multiplier === 4) result.quad.push(attackType);
  }

  return result;
}
