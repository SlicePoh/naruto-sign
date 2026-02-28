import type { SignLabel } from '../classifier/types';

export const JUTSUS = {
  shadowClone: ['tiger', 'tiger', 'tiger'] as SignLabel[],
} as const;

export type JutsuKey = keyof typeof JUTSUS;
