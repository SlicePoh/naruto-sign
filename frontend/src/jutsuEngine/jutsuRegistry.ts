import type { SignLabel } from '../classifier/types';

export const JUTSUS = {
  // Basic (Academy)
  clone: ['ram', 'serpent', 'tiger'] as SignLabel[],
  transformation: ['dog', 'boar', 'ram'] as SignLabel[],
  substitution: ['ram', 'boar', 'ox', 'dog'] as SignLabel[],
  // Intermediate
  shadowClone: ['shadow'] as SignLabel[],
  fireball: ['serpent', 'ram', 'horse', 'tiger'] as SignLabel[],
  // Advanced
  chidori: ['rat', 'tiger', 'dog'] as SignLabel[],
  waterDragon: ['ox', 'horse', 'hare', 'ram', 'dog'] as SignLabel[],
  // Master
  earthWall: ['tiger', 'hare', 'boar', 'dog'] as SignLabel[],
  windBlade: ['rat', 'hare', 'dog'] as SignLabel[],
} as const;

export type JutsuKey = keyof typeof JUTSUS;
