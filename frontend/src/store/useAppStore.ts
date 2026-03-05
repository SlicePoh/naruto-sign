import { create } from 'zustand';
import type { SignLabel, JutsuName } from '../classifier/types';

interface AppState {
  currentSign: SignLabel;
  signBuffer: SignLabel[];
  activeJutsu: JutsuName;
  confidence: number;

  // Shadow Clone hold-to-activate state
  shadowHoldStartTime: number | null;
  shadowCloneActive: boolean;
  shadowCloneEndTime: number | null;

  setCurrentSign: (sign: SignLabel) => void;
  addToBuffer: (sign: SignLabel) => void;
  setActiveJutsu: (jutsu: JutsuName) => void;
  triggerJutsu: (jutsu: Exclude<JutsuName, null>) => void;
  clearJutsu: () => void;
  setConfidence: (confidence: number) => void;
  clearBuffer: () => void;

  // Shadow Clone actions
  setShadowHoldStart: (time: number | null) => void;
  activateShadowClone: () => void;
  deactivateShadowClone: () => void;
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

  // Shadow Clone state defaults
  shadowHoldStartTime: null,
  shadowCloneActive: false,
  shadowCloneEndTime: null,

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

  triggerJutsu: (jutsu) => {
    set({ activeJutsu: jutsu });
  },

  clearJutsu: () => {
    set({ activeJutsu: null });
  },

  clearBuffer: () =>
    set({ signBuffer: [] }),

  // Shadow Clone actions
  setShadowHoldStart: (time) =>
    set({ shadowHoldStartTime: time }),

  activateShadowClone: () =>
    set({
      shadowCloneActive: true,
      shadowCloneEndTime: Date.now() + 10_000, // 10 seconds duration
      shadowHoldStartTime: null,
    }),

  deactivateShadowClone: () =>
    set({
      shadowCloneActive: false,
      shadowCloneEndTime: null,
      shadowHoldStartTime: null,
    }),
}));
