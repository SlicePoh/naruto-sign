import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlayerProfile,
  NinjaType,
  ClanId,
  ChakraNature,
  NinjaRank,
  JutsuId,
  JutsuProgress,
  MissionProgress,
} from './types';
import {
  CLANS,
  JUTSU_CATALOG,
  MISSION_POOL,
  RANK_ORDER,
  PROMOTION_EXAMS,
} from './types';

/* ─── helpers ──────────────────────────────────────────────────── */

function initialJutsuProgress(): JutsuProgress[] {
  return JUTSU_CATALOG.map((j) => ({
    jutsuId: j.id,
    unlocked: false,
    mastery: 0,
    successCount: 0,
    lastUsed: null,
  }));
}

function rollDailyMissions(clan: ClanId, rank: NinjaRank): MissionProgress[] {
  const eligible = MISSION_POOL.filter((m) => {
    if (m.requiresClan && m.requiresClan !== clan) return false;
    if (m.requiresRank && RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(m.requiresRank)) return false;
    return true;
  });
  // Pick up to 4 random ones
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((m) => ({
    missionId: m.id,
    progress: 0,
    completed: false,
    completedAt: null,
  }));
}

/* ─── store shape ──────────────────────────────────────────────── */

interface GameState {
  /** null until the player completes onboarding */
  profile: PlayerProfile | null;
  onboardingStep: number; // 0-3

  // Onboarding actions
  setOnboardingStep: (step: number) => void;
  createProfile: (name: string, ninjaType: NinjaType, clan: ClanId, nature: ChakraNature) => void;

  // Progression
  addXP: (amount: number) => void;
  recordJutsuSuccess: (jutsuId: JutsuId) => void;
  unlockJutsu: (jutsuId: JutsuId) => void;
  promote: (toRank: NinjaRank) => void;
  recordExamAttempt: (result: 'pass' | 'fail') => void;
  incrementTrainingSessions: () => void;
  setTutorialSeen: () => void;

  // Missions
  refreshMissions: () => void;
  updateMissionProgress: (missionId: string, progress: number) => void;
  completeMission: (missionId: string) => void;

  // Utility
  resetProfile: () => void;
  getNextExam: () => typeof PROMOTION_EXAMS[number] | null;
  canTakeExam: () => boolean;
  getJutsuMastery: (jutsuId: JutsuId) => number;
  isJutsuUnlocked: (jutsuId: JutsuId) => boolean;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: null,
      onboardingStep: 0,

      /* ── Onboarding ──────────────────────────────────────── */

      setOnboardingStep: (step) => set({ onboardingStep: step }),

      createProfile: (name, ninjaType, clan, nature) => {
        const clanDef = CLANS.find((c) => c.id === clan)!;
        const baseStats = { chakraControl: 10, speed: 10, precision: 10, mastery: 10 };
        const stats = { ...baseStats };
        for (const [k, v] of Object.entries(clanDef.statBonus)) {
          stats[k as keyof typeof stats] += v;
        }

        const jutsuProgress = initialJutsuProgress();
        // Unlock starter jutsu
        const starterIds: JutsuId[] = ['clone', 'transformation', 'substitution'];
        starterIds.forEach((id) => {
          const jp = jutsuProgress.find((j) => j.jutsuId === id);
          if (jp) jp.unlocked = true;
        });

        const profile: PlayerProfile = {
          name,
          ninjaType,
          clan,
          chakraNature: nature,
          rank: 'academy',
          xp: 0,
          stats,
          jutsuProgress,
          activeMissions: rollDailyMissions(clan, 'academy'),
          completedMissions: [],
          lastExamAttempt: null,
          lastExamResult: null,
          totalTrainingSessions: 0,
          tutorialSeen: false,
          createdAt: Date.now(),
        };
        set({ profile, onboardingStep: 4 });
      },

      /* ── Progression ─────────────────────────────────────── */

      addXP: (amount) =>
        set((s) => {
          if (!s.profile) return s;
          return { profile: { ...s.profile, xp: s.profile.xp + amount } };
        }),

      recordJutsuSuccess: (jutsuId) =>
        set((s) => {
          if (!s.profile) return s;
          const def = JUTSU_CATALOG.find((j) => j.id === jutsuId);
          if (!def) return s;
          const prog = s.profile.jutsuProgress.map((jp) => {
            if (jp.jutsuId !== jutsuId) return jp;
            const newCount = jp.successCount + 1;
            const newMastery = Math.min(100, Math.round((newCount / def.masteryToUnlock) * 100));
            return { ...jp, successCount: newCount, mastery: newMastery, lastUsed: Date.now() };
          });
          return {
            profile: {
              ...s.profile,
              jutsuProgress: prog,
              xp: s.profile.xp + def.xpReward,
            },
          };
        }),

      unlockJutsu: (jutsuId) =>
        set((s) => {
          if (!s.profile) return s;
          const prog = s.profile.jutsuProgress.map((jp) =>
            jp.jutsuId === jutsuId ? { ...jp, unlocked: true } : jp,
          );
          return { profile: { ...s.profile, jutsuProgress: prog } };
        }),

      promote: (toRank) =>
        set((s) => {
          if (!s.profile) return s;
          return { profile: { ...s.profile, rank: toRank, lastExamResult: 'pass' } };
        }),

      recordExamAttempt: (result) =>
        set((s) => {
          if (!s.profile) return s;
          return {
            profile: {
              ...s.profile,
              lastExamAttempt: Date.now(),
              lastExamResult: result,
            },
          };
        }),

      incrementTrainingSessions: () =>
        set((s) => {
          if (!s.profile) return s;
          return { profile: { ...s.profile, totalTrainingSessions: s.profile.totalTrainingSessions + 1 } };
        }),

      setTutorialSeen: () =>
        set((s) => {
          if (!s.profile) return s;
          return { profile: { ...s.profile, tutorialSeen: true } };
        }),

      /* ── Missions ────────────────────────────────────────── */

      refreshMissions: () =>
        set((s) => {
          if (!s.profile) return s;
          return {
            profile: {
              ...s.profile,
              activeMissions: rollDailyMissions(s.profile.clan, s.profile.rank),
            },
          };
        }),

      updateMissionProgress: (missionId, progress) =>
        set((s) => {
          if (!s.profile) return s;
          const missions = s.profile.activeMissions.map((m) =>
            m.missionId === missionId ? { ...m, progress } : m,
          );
          return { profile: { ...s.profile, activeMissions: missions } };
        }),

      completeMission: (missionId) =>
        set((s) => {
          if (!s.profile) return s;
          const def = MISSION_POOL.find((m) => m.id === missionId);
          const missions = s.profile.activeMissions.map((m) =>
            m.missionId === missionId ? { ...m, completed: true, completedAt: Date.now() } : m,
          );
          return {
            profile: {
              ...s.profile,
              activeMissions: missions,
              completedMissions: [...s.profile.completedMissions, missionId],
              xp: s.profile.xp + (def?.xpReward ?? 0),
            },
          };
        }),

      /* ── Utility ─────────────────────────────────────────── */

      resetProfile: () => set({ profile: null, onboardingStep: 0 }),

      getNextExam: () => {
        const p = get().profile;
        if (!p) return null;
        return PROMOTION_EXAMS.find((e) => e.fromRank === p.rank) ?? null;
      },

      canTakeExam: () => {
        const p = get().profile;
        if (!p) return false;
        const exam = PROMOTION_EXAMS.find((e) => e.fromRank === p.rank);
        if (!exam) return false;
        if (p.xp < exam.requiredXP) return false;
        // Check cooldown
        if (p.lastExamAttempt && p.lastExamResult === 'fail') {
          const cooldownMs = exam.cooldownHours * 60 * 60 * 1000;
          if (Date.now() - p.lastExamAttempt < cooldownMs) return false;
        }
        return true;
      },

      getJutsuMastery: (jutsuId) => {
        const p = get().profile;
        if (!p) return 0;
        return p.jutsuProgress.find((j) => j.jutsuId === jutsuId)?.mastery ?? 0;
      },

      isJutsuUnlocked: (jutsuId) => {
        const p = get().profile;
        if (!p) return false;
        return p.jutsuProgress.find((j) => j.jutsuId === jutsuId)?.unlocked ?? false;
      },
    }),
    {
      name: 'shinobi-tracker-game',
    },
  ),
);
