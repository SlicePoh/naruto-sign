import type { SignLabel } from '../classifier/types';

export const JUTSUS = {
  shadowClone: ['shadow'] as SignLabel[],
  fireball: ['serpent', 'ram', 'horse', 'tiger'] as SignLabel[],
  chidori: ['rat', 'tiger', 'dog'] as SignLabel[],
} as const;

export type JutsuKey = keyof typeof JUTSUS;
