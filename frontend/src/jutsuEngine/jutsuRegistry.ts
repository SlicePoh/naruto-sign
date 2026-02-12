import type { SignLabel } from '../classifier/types';

export const JUTSUS = {
  shadowClone: ['tiger', 'ram', 'snake'] as SignLabel[],
} as const;

export type JutsuKey = keyof typeof JUTSUS;
