/* ═══════════════════════════════════════════════════════════════
   Chakra Nature type chart — Naruto canon weakness cycle
   Fire > Wind > Lightning > Earth > Water > Fire
   ═══════════════════════════════════════════════════════════════ */

import type { ChakraNature } from '../types';

/** Returns the damage multiplier for attackNature vs defenderNature */
export function getTypeEffectiveness(
  attackNature: ChakraNature | null,
  defenderNature: ChakraNature,
): number {
  if (!attackNature) return 1; // typeless (taijutsu / genjutsu) — always neutral

  const chart: Record<ChakraNature, ChakraNature> = {
    fire: 'wind',       // fire beats wind
    wind: 'lightning',   // wind beats lightning
    lightning: 'earth',  // lightning beats earth
    earth: 'water',      // earth beats water
    water: 'fire',       // water beats fire
  };

  if (chart[attackNature] === defenderNature) return 2;   // super effective
  if (chart[defenderNature] === attackNature) return 0.5;   // not very effective
  return 1; // neutral
}

/** Human-readable label */
export function effectivenessLabel(multiplier: number): 'super' | 'neutral' | 'resisted' {
  if (multiplier >= 2) return 'super';
  if (multiplier <= 0.5) return 'resisted';
  return 'neutral';
}

/** Nature weakness names for display */
export const NATURE_WEAKNESS: Record<ChakraNature, ChakraNature> = {
  fire: 'water',
  wind: 'fire',
  lightning: 'wind',
  earth: 'lightning',
  water: 'earth',
};

export const NATURE_STRENGTH: Record<ChakraNature, ChakraNature> = {
  fire: 'wind',
  wind: 'lightning',
  lightning: 'earth',
  earth: 'water',
  water: 'fire',
};
