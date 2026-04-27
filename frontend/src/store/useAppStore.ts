import { create } from 'zustand';
import type { SignLabel, JutsuName } from '../classifier/types';

export type ChakraState = 'IDLE' | 'FORMING' | 'SPINNING' | 'CHAKRA_READY' | 'RASENGAN' | null;

interface RasenganPalmPosition {
  x: number;
  y: number;
}

/** Jutsu trial — what the player should perform next. */
export interface JutsuTrial {
  name: string;
  jutsuKey: Exclude<JutsuName, null>;
  description: string;
}

const TRIAL_POOL: JutsuTrial[] = [
  { name: 'Shadow Clone Jutsu', jutsuKey: 'shadowClone', description: 'Hold the Shadow sign for 2 seconds' },
  { name: 'Rasengan', jutsuKey: 'rasengan', description: 'Form chakra with both hands, then open your palm' },
  { name: 'Fire Style: Fireball', jutsuKey: 'fireball', description: 'Serpent → Ram → Horse → Tiger' },
  { name: 'Chidori', jutsuKey: 'chidori', description: 'Ox → Hare → Monkey, then open palm' },
];

function pickTrial(exclude?: Exclude<JutsuName, null>): JutsuTrial {
  const pool = exclude ? TRIAL_POOL.filter((t) => t.jutsuKey !== exclude) : TRIAL_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
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

  // Chidori state
  chidoriReady: boolean;
  chidoriActive: boolean;
  chidoriEndTime: number | null;

  // Game state
  score: number;
  currentTrial: JutsuTrial;
  completedTrials: number;

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

  // Chidori actions
  setChidoriReady: (ready: boolean) => void;
  activateChidori: () => void;
  deactivateChidori: () => void;

  // Game actions
  awardPoints: (pts: number) => void;
  advanceTrial: () => void;
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

  // Chidori state defaults
  chidoriReady: false,
  chidoriActive: false,
  chidoriEndTime: null,

  // Game state defaults
  score: 0,
  currentTrial: pickTrial(),
  completedTrials: 0,

  setConfidence: (confidence) =>
    set({ confidence }),

  setCurrentSign: (sign) =>
    set({ currentSign: sign }),

  addToBuffer: (sign) =>
    set((state) => ({
      signBuffer: [...state.signBuffer.slice(-5), sign], // Keep last 6 signs
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

  // Chidori actions
  setChidoriReady: (ready) =>
    set({ chidoriReady: ready }),

  activateChidori: () =>
    set({
      chidoriReady: false,
      chidoriActive: true,
      chidoriEndTime: Date.now() + 5_000,
    }),

  deactivateChidori: () =>
    set({
      chidoriReady: false,
      chidoriActive: false,
      chidoriEndTime: null,
      activeJutsu: null,
    }),

  // Game actions
  awardPoints: (pts) =>
    set((state) => ({ score: state.score + pts })),

  advanceTrial: () =>
    set((state) => ({
      completedTrials: state.completedTrials + 1,
      currentTrial: pickTrial(state.currentTrial.jutsuKey),
    })),
}));
