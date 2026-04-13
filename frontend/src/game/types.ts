/* ═══════════════════════════════════════════════════════════════
   Game domain types — ninja identity, progression, jutsu mastery
   ═══════════════════════════════════════════════════════════════ */

// ── Ninja identity ─────────────────────────────────────────────

export type NinjaType = 'ninjutsu' | 'genjutsu' | 'taijutsu';

export type ClanId = 'uzumaki' | 'uchiha' | 'hyuga' | 'nara' | 'rogue';

export type ChakraNature = 'fire' | 'wind' | 'water' | 'earth' | 'lightning';

export type NinjaRank =
  | 'academy'
  | 'genin'
  | 'chunin'
  | 'jonin'
  | 'sannin'
  | 'kage';

export const RANK_ORDER: NinjaRank[] = [
  'academy',
  'genin',
  'chunin',
  'jonin',
  'sannin',
  'kage',
];

export const RANK_LABELS: Record<NinjaRank, string> = {
  academy: 'Academy Student',
  genin: 'Genin',
  chunin: 'Chūnin',
  jonin: 'Jōnin',
  sannin: 'Sannin',
  kage: 'Kage',
};

// ── Clan definitions ───────────────────────────────────────────

export interface ClanDef {
  id: ClanId;
  name: string;
  icon: string;
  description: string;
  passive: string;
  affinityNature: ChakraNature;
  statBonus: Partial<NinjaStats>;
}

export const CLANS: ClanDef[] = [
  {
    id: 'uzumaki',
    name: 'Uzumaki',
    icon: '🌀',
    description: 'Known for massive chakra reserves and sealing jutsu.',
    passive: '+20% Chakra Control growth',
    affinityNature: 'wind',
    statBonus: { chakraControl: 10 },
  },
  {
    id: 'uchiha',
    name: 'Uchiha',
    icon: '🔥',
    description: 'Masters of fire-style ninjutsu and the Sharingan.',
    passive: '+15% Precision, Fire affinity',
    affinityNature: 'fire',
    statBonus: { precision: 8, speed: 5 },
  },
  {
    id: 'hyuga',
    name: 'Hyūga',
    icon: '👁️',
    description: 'Gentle Fist users with unmatched focus and accuracy.',
    passive: '+20% Precision',
    affinityNature: 'lightning',
    statBonus: { precision: 12 },
  },
  {
    id: 'nara',
    name: 'Nara',
    icon: '🦌',
    description: 'Brilliant strategists who control shadows.',
    passive: '+15% Mastery gain speed',
    affinityNature: 'earth',
    statBonus: { mastery: 10 },
  },
  {
    id: 'rogue',
    name: 'No Clan',
    icon: '⚔️',
    description: 'Walk your own path. Balanced growth across all stats.',
    passive: '+5% to all stats',
    affinityNature: 'water',
    statBonus: { chakraControl: 4, speed: 4, precision: 4, mastery: 4 },
  },
];

// ── Ninja type definitions ─────────────────────────────────────

export interface NinjaTypeDef {
  id: NinjaType;
  name: string;
  icon: string;
  description: string;
  starterJutsu: string[];
}

export const NINJA_TYPES: NinjaTypeDef[] = [
  {
    id: 'ninjutsu',
    name: 'Ninjutsu Specialist',
    icon: '🔥',
    description: 'Master elemental jutsu and chakra manipulation. Focus on powerful offensive techniques.',
    starterJutsu: ['clone', 'transformation'],
  },
  {
    id: 'genjutsu',
    name: 'Genjutsu Specialist',
    icon: '🌀',
    description: 'Control perception and illusions. Precision and timing are your greatest weapons.',
    starterJutsu: ['clone', 'substitution'],
  },
  {
    id: 'taijutsu',
    name: 'Taijutsu Specialist',
    icon: '👊',
    description: 'Physical combat expert. Speed and accuracy in hand signs fuel your techniques.',
    starterJutsu: ['transformation', 'substitution'],
  },
];

// ── Chakra nature definitions ──────────────────────────────────

export interface ChakraNatureDef {
  id: ChakraNature;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const CHAKRA_NATURES: ChakraNatureDef[] = [
  { id: 'fire', name: 'Fire', icon: '🔥', color: '#ff4500', description: 'Destructive and aggressive. Fuels fireball and flame jutsu.' },
  { id: 'wind', name: 'Wind', icon: '🌬️', color: '#88ddaa', description: 'Sharp and cutting. Enhances Rasengan and blade techniques.' },
  { id: 'water', name: 'Water', icon: '🌊', color: '#4488ff', description: 'Flowing and adaptive. Powers water dragon and mist techniques.' },
  { id: 'earth', name: 'Earth', icon: '🪨', color: '#aa8855', description: 'Solid and defensive. Creates walls, barriers, and traps.' },
  { id: 'lightning', name: 'Lightning', icon: '⚡', color: '#ffdd00', description: 'Fast and piercing. Powers Chidori and lightning techniques.' },
];

// ── Stats ──────────────────────────────────────────────────────

export interface NinjaStats {
  chakraControl: number;
  speed: number;
  precision: number;
  mastery: number;
}

// ── Jutsu system ───────────────────────────────────────────────

export type JutsuId =
  | 'clone'
  | 'transformation'
  | 'substitution'
  | 'shadowClone'
  | 'rasengan'
  | 'fireball'
  | 'chidori'
  | 'waterDragon'
  | 'earthWall'
  | 'phoenixFlower'
  | 'windBlade';

export type JutsuDifficulty = 'basic' | 'intermediate' | 'advanced' | 'master';

export interface JutsuDef {
  id: JutsuId;
  name: string;
  description: string;
  difficulty: JutsuDifficulty;
  requiredSigns: string[];
  requiredRank: NinjaRank;
  requiredMastery: Partial<Record<JutsuId, number>>; // prerequisite jutsu + mastery %
  requiredNature?: ChakraNature;
  clanExclusive?: ClanId;
  xpReward: number;
  masteryToUnlock: number;  // total successful uses to reach 100%
}

export const JUTSU_CATALOG: JutsuDef[] = [
  // Basic (Academy)
  {
    id: 'clone',
    name: 'Clone Technique',
    description: 'Create basic illusory clones.',
    difficulty: 'basic',
    requiredSigns: ['ram', 'serpent', 'tiger'],
    requiredRank: 'academy',
    requiredMastery: {},
    xpReward: 10,
    masteryToUnlock: 10,
  },
  {
    id: 'transformation',
    name: 'Transformation Jutsu',
    description: 'Transform your appearance into another person or object.',
    difficulty: 'basic',
    requiredSigns: ['dog', 'boar', 'ram'],
    requiredRank: 'academy',
    requiredMastery: {},
    xpReward: 10,
    masteryToUnlock: 10,
  },
  {
    id: 'substitution',
    name: 'Substitution Jutsu',
    description: 'Replace yourself with a nearby object to dodge attacks.',
    difficulty: 'basic',
    requiredSigns: ['ram', 'boar', 'ox', 'dog'],
    requiredRank: 'academy',
    requiredMastery: {},
    xpReward: 10,
    masteryToUnlock: 10,
  },

  // Intermediate (Genin)
  {
    id: 'shadowClone',
    name: 'Shadow Clone Jutsu',
    description: 'Create solid clones that can fight independently.',
    difficulty: 'intermediate',
    requiredSigns: ['shadow'],
    requiredRank: 'genin',
    requiredMastery: { clone: 80 },
    xpReward: 25,
    masteryToUnlock: 25,
  },
  {
    id: 'fireball',
    name: 'Fire Style: Fireball Jutsu',
    description: 'Exhale a massive ball of fire.',
    difficulty: 'intermediate',
    requiredSigns: ['serpent', 'ram', 'horse', 'tiger'],
    requiredRank: 'genin',
    requiredMastery: { transformation: 60 },
    requiredNature: 'fire',
    xpReward: 30,
    masteryToUnlock: 25,
  },

  // Advanced (Chūnin)
  {
    id: 'chidori',
    name: 'Chidori',
    description: 'Concentrate lightning chakra into a piercing strike.',
    difficulty: 'advanced',
    requiredSigns: ['rat', 'tiger', 'dog'],
    requiredRank: 'chunin',
    requiredMastery: { fireball: 50 },
    requiredNature: 'lightning',
    xpReward: 40,
    masteryToUnlock: 40,
  },
  {
    id: 'rasengan',
    name: 'Rasengan',
    description: 'Form a spiraling sphere of pure chakra in your palm.',
    difficulty: 'advanced',
    requiredSigns: [],
    requiredRank: 'chunin',
    requiredMastery: { shadowClone: 60 },
    requiredNature: 'wind',
    xpReward: 50,
    masteryToUnlock: 40,
  },
  {
    id: 'waterDragon',
    name: 'Water Style: Water Dragon',
    description: 'Summon a massive water dragon to strike opponents.',
    difficulty: 'advanced',
    requiredSigns: ['ox', 'horse', 'hare', 'ram', 'dog'],
    requiredRank: 'chunin',
    requiredMastery: { substitution: 60 },
    requiredNature: 'water',
    xpReward: 40,
    masteryToUnlock: 35,
  },

  // Master (Jōnin+)
  {
    id: 'earthWall',
    name: 'Earth Style: Mud Wall',
    description: 'Raise a defensive wall of earth from the ground.',
    difficulty: 'master',
    requiredSigns: ['tiger', 'hare', 'boar', 'dog'],
    requiredRank: 'jonin',
    requiredMastery: { waterDragon: 50 },
    requiredNature: 'earth',
    xpReward: 45,
    masteryToUnlock: 50,
  },
  {
    id: 'phoenixFlower',
    name: 'Fire Style: Phoenix Flower',
    description: 'Launch multiple small fireballs in rapid succession.',
    difficulty: 'master',
    requiredSigns: ['rat', 'tiger', 'dog', 'ox', 'hare', 'tiger'],
    requiredRank: 'jonin',
    requiredMastery: { fireball: 80 },
    requiredNature: 'fire',
    clanExclusive: 'uchiha',
    xpReward: 55,
    masteryToUnlock: 50,
  },
  {
    id: 'windBlade',
    name: 'Wind Style: Vacuum Blade',
    description: 'Channel wind chakra into an invisible cutting force.',
    difficulty: 'master',
    requiredSigns: ['rat', 'hare', 'dog'],
    requiredRank: 'jonin',
    requiredMastery: { rasengan: 60 },
    requiredNature: 'wind',
    xpReward: 50,
    masteryToUnlock: 50,
  },
];

// ── Promotion exams ────────────────────────────────────────────

export interface ExamTask {
  description: string;
  jutsuId?: JutsuId;
  signSequence?: string[];
  requiredAccuracy?: number;
}

export interface PromotionExam {
  fromRank: NinjaRank;
  toRank: NinjaRank;
  title: string;
  requiredXP: number;
  requiredJutsuMastery: Partial<Record<JutsuId, number>>;
  tasks: ExamTask[];
  cooldownHours: number;
}

export const PROMOTION_EXAMS: PromotionExam[] = [
  {
    fromRank: 'academy',
    toRank: 'genin',
    title: 'Genin Graduation Exam',
    requiredXP: 100,
    requiredJutsuMastery: { clone: 80, transformation: 60 },
    tasks: [
      { description: 'Perform Clone Technique', jutsuId: 'clone' },
      { description: 'Perform Transformation Jutsu', jutsuId: 'transformation' },
      { description: 'Complete hand sign chain: Ram → Serpent → Tiger', signSequence: ['ram', 'serpent', 'tiger'], requiredAccuracy: 90 },
    ],
    cooldownHours: 24,
  },
  {
    fromRank: 'genin',
    toRank: 'chunin',
    title: 'Chūnin Exam',
    requiredXP: 400,
    requiredJutsuMastery: { shadowClone: 60 },
    tasks: [
      { description: 'Execute Shadow Clone Jutsu', jutsuId: 'shadowClone' },
      { description: 'Perform 3 different jutsu in sequence', signSequence: ['ram', 'serpent', 'tiger', 'serpent', 'ram', 'horse', 'tiger'] },
      { description: 'Maintain 85% accuracy across all tasks', requiredAccuracy: 85 },
    ],
    cooldownHours: 24,
  },
  {
    fromRank: 'chunin',
    toRank: 'jonin',
    title: 'Jōnin Trials',
    requiredXP: 1000,
    requiredJutsuMastery: { rasengan: 50, chidori: 50 },
    tasks: [
      { description: 'Demonstrate Rasengan', jutsuId: 'rasengan' },
      { description: 'Demonstrate Chidori', jutsuId: 'chidori' },
      { description: 'Complete advanced combo chain', signSequence: ['rat', 'tiger', 'dog', 'serpent', 'ram', 'horse', 'tiger'] },
      { description: '90%+ accuracy required', requiredAccuracy: 90 },
    ],
    cooldownHours: 48,
  },
  {
    fromRank: 'jonin',
    toRank: 'sannin',
    title: 'Sannin Trial',
    requiredXP: 2500,
    requiredJutsuMastery: {},
    tasks: [
      { description: 'Master-level precision test', requiredAccuracy: 95 },
      { description: 'Execute 5 jutsu without error' },
    ],
    cooldownHours: 72,
  },
  {
    fromRank: 'sannin',
    toRank: 'kage',
    title: 'Kage Summit Challenge',
    requiredXP: 5000,
    requiredJutsuMastery: {},
    tasks: [
      { description: 'Perfect accuracy on all hand signs', requiredAccuracy: 98 },
      { description: 'Complete the ultimate jutsu gauntlet' },
    ],
    cooldownHours: 168,
  },
];

// ── Missions ───────────────────────────────────────────────────

export type MissionType = 'daily' | 'clan' | 'rank' | 'challenge';

export interface MissionDef {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  xpReward: number;
  requirement: number;  // e.g. number of successful signs, uses, etc.
  requiresClan?: ClanId;
  requiresRank?: NinjaRank;
}

export const MISSION_POOL: MissionDef[] = [
  // Dailies
  { id: 'd1', type: 'daily', title: 'Morning Practice', description: 'Perform 20 correct hand signs', xpReward: 15, requirement: 20 },
  { id: 'd2', type: 'daily', title: 'Combo Streak', description: 'Achieve a 5-sign combo streak', xpReward: 20, requirement: 5 },
  { id: 'd3', type: 'daily', title: 'Jutsu Warm-up', description: 'Successfully execute 2 different jutsu', xpReward: 25, requirement: 2 },

  // Rank missions
  { id: 'r1', type: 'rank', title: 'Academy Basics', description: 'Master Clone Technique to 50%', xpReward: 30, requirement: 50, requiresRank: 'academy' },
  { id: 'r2', type: 'rank', title: 'Genin Drills', description: 'Complete 10 training sessions', xpReward: 40, requirement: 10, requiresRank: 'genin' },
  { id: 'r3', type: 'rank', title: 'Chūnin Precision', description: 'Achieve 90% accuracy in a session', xpReward: 50, requirement: 90, requiresRank: 'chunin' },

  // Clan missions
  { id: 'c1', type: 'clan', title: 'Uzumaki Endurance', description: 'Maintain chakra focus for 60 seconds', xpReward: 35, requirement: 60, requiresClan: 'uzumaki' },
  { id: 'c2', type: 'clan', title: 'Uchiha Fire Mastery', description: 'Use Fireball Jutsu 5 times successfully', xpReward: 40, requirement: 5, requiresClan: 'uchiha' },
  { id: 'c3', type: 'clan', title: 'Hyūga Precision', description: 'Achieve 95% accuracy in one session', xpReward: 45, requirement: 95, requiresClan: 'hyuga' },
  { id: 'c4', type: 'clan', title: 'Nara Shadow Bind', description: 'Hold Shadow sign for 10 seconds total', xpReward: 35, requirement: 10, requiresClan: 'nara' },

  // Challenge missions
  { id: 'ch1', type: 'challenge', title: 'Flawless Run', description: 'Complete a training session with 0 mistakes', xpReward: 60, requirement: 100 },
  { id: 'ch2', type: 'challenge', title: 'Speed Demon', description: 'Perform 10 hand signs in under 15 seconds', xpReward: 50, requirement: 10 },
  { id: 'ch3', type: 'challenge', title: 'Jutsu Marathon', description: 'Execute 5 different jutsu in one session', xpReward: 75, requirement: 5 },
];

// ── Player state ───────────────────────────────────────────────

export interface JutsuProgress {
  jutsuId: JutsuId;
  unlocked: boolean;
  mastery: number;       // 0-100
  successCount: number;
  lastUsed: number | null;
}

export interface MissionProgress {
  missionId: string;
  progress: number;
  completed: boolean;
  completedAt: number | null;
}

export interface PlayerProfile {
  name: string;
  ninjaType: NinjaType;
  clan: ClanId;
  chakraNature: ChakraNature;
  rank: NinjaRank;
  xp: number;
  stats: NinjaStats;
  jutsuProgress: JutsuProgress[];
  activeMissions: MissionProgress[];
  completedMissions: string[];
  lastExamAttempt: number | null;
  lastExamResult: 'pass' | 'fail' | null;
  totalTrainingSessions: number;
  createdAt: number;
}
