import { create } from 'zustand';
import type { SignLabel, JutsuName } from '../classifier/types';

export type ChakraState = 'IDLE' | 'FORMING' | 'SPINNING' | 'CHAKRA_READY' | 'RASENGAN' | null;

interface RasenganPalmPosition {
  x: number;
  y: number;
}

interface AppState {
  currentSign: SignLabel;
  signBuffer: SignLabel[];
  activeJutsu: JutsuName;
  confidence: number;

  // Shadow Clone hold-to-activate state
  shadowHoldStartTime: number | null;
  shadowCloneActive: boolean;
  shadowCloneEndTime: number | null;

  // Rasengan state
  chakraState: ChakraState;
  rasenganActive: boolean;
  rasenganEndTime: number | null;
  rasenganPalmPosition: RasenganPalmPosition | null;

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

  // Rasengan actions
  setChakraState: (state: ChakraState) => void;
  activateRasengan: () => void;
  deactivateRasengan: () => void;
  setRasenganPalmPosition: (pos: RasenganPalmPosition | null) => void;
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

  // Rasengan state defaults
  chakraState: null,
  rasenganActive: false,
  rasenganEndTime: null,
  rasenganPalmPosition: null,

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

  // Rasengan actions
  setChakraState: (state) =>
    set({ chakraState: state }),

  activateRasengan: () =>
    set({
      rasenganActive: true,
      rasenganEndTime: Date.now() + 5_000,
      chakraState: 'RASENGAN',
    }),

  deactivateRasengan: () =>
    set({
      rasenganActive: false,
      rasenganEndTime: null,
      rasenganPalmPosition: null,
      chakraState: null,
      activeJutsu: null,
    }),

  setRasenganPalmPosition: (pos) =>
    set({ rasenganPalmPosition: pos }),
}));
