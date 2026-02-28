import { create } from 'zustand';
import type { SignLabel, JutsuName } from '../classifier/types';

let activeJutsuTimeoutId: number | null = null;

interface AppState {
  currentSign: SignLabel;
  signBuffer: SignLabel[];
  activeJutsu: JutsuName;
  confidence: number;
  setCurrentSign: (sign: SignLabel) => void;
  addToBuffer: (sign: SignLabel) => void;
  setActiveJutsu: (jutsu: JutsuName) => void;
  triggerJutsu: (jutsu: Exclude<JutsuName, null>, durationMs?: number) => void;
  setConfidence: (confidence: number) => void;
  clearBuffer: () => void;
}

/**
 * Global state management using Zustand
 * Manages current sign, sign buffer, and active jutsu state
 */
export const useAppStore = create<AppState>((set, get) => ({
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

  triggerJutsu: (jutsu, durationMs = 4000) => {
    if (activeJutsuTimeoutId !== null) {
      window.clearTimeout(activeJutsuTimeoutId);
      activeJutsuTimeoutId = null;
    }

    set({ activeJutsu: jutsu });

    activeJutsuTimeoutId = window.setTimeout(() => {
      const { activeJutsu } = get();
      if (activeJutsu === jutsu) {
        set({ activeJutsu: null });
      }
      activeJutsuTimeoutId = null;
    }, durationMs);
  },

  clearBuffer: () =>
    set({ signBuffer: [] }),
}));
