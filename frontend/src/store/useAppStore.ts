import { create } from 'zustand';
import type { SignLabel, JutsuName } from '../classifier/types';

interface AppState {
  currentSign: SignLabel;
  signBuffer: SignLabel[];
  activeJutsu: JutsuName;
  confidence: number;
  setCurrentSign: (sign: SignLabel) => void;
  addToBuffer: (sign: SignLabel) => void;
  setActiveJutsu: (jutsu: JutsuName) => void;
  setConfidence: (confidence: number) => void;
  clearBuffer: () => void;
}

/**
 * Global state management using Zustand
 * Manages current sign, sign buffer, and active jutsu state
 */
export const useAppStore = create<AppState>((set) => ({
  currentSign: 'unknown',
  signBuffer: [],
  activeJutsu: null,
  confidence: 0,

  setConfidence: (confidence) =>
    set({ confidence }),

  setCurrentSign: (sign) =>
    set({ currentSign: sign }),

  addToBuffer: (sign) =>
    set((state) => ({
      signBuffer: [...state.signBuffer.slice(-2), sign], // Keep last 3 signs
    })),

  setActiveJutsu: (jutsu) =>
    set({ activeJutsu: jutsu }),

  clearBuffer: () =>
    set({ signBuffer: [] }),
}));
