/* ═══════════════════════════════════════════════════════════════
   Battle system — Pokémon-style turn-based PvP types
   ═══════════════════════════════════════════════════════════════ */

import type { ChakraNature, NinjaType, NinjaRank, ClanId, JutsuId } from '../types';

// ── Move categories ────────────────────────────────────────────
// ninjutsu → uses SpAtk / SpDef (elemental)
// taijutsu → uses Atk / Def (physical)
// genjutsu → uses SpAtk / SpDef (illusion-based)
// status   → no damage, applies buffs/debuffs

export type MoveCategory = 'ninjutsu' | 'taijutsu' | 'genjutsu' | 'status';

// ── Status effects ─────────────────────────────────────────────

export type StatusEffect =
  | 'none'
  | 'burn'        // DoT 1/16 HP per turn (fire)
  | 'paralysis'   // 25% skip turn (lightning)
  | 'confusion'   // 30% hit self (genjutsu)
  | 'slow'        // -25% speed (earth/water)
  | 'blind'       // -30% accuracy (genjutsu)
  | 'guard_down'  // -25% Def + SpDef (wind)
  | 'atk_up'      // +50% Atk for 3 turns
  | 'def_up'      // +50% Def for 3 turns
  | 'spatk_up'    // +50% SpAtk for 3 turns
  | 'spdef_up'    // +50% SpDef for 3 turns
  | 'speed_up'    // +50% Speed for 3 turns
  | 'focus'       // +30% accuracy for 3 turns
  | 'evasion_up'; // +25% evasion for 3 turns

export interface ActiveStatus {
  effect: StatusEffect;
  turnsLeft: number;
}

// ── Battle move ────────────────────────────────────────────────

export interface BattleMove {
  id: string;
  name: string;
  jutsuId: JutsuId | null;
  category: MoveCategory;
  nature: ChakraNature | null;
  power: number;                 // 0 for status moves, 10-150
  accuracy: number;              // 0–100
  chakraCost: number;
  statusEffect?: StatusEffect;
  statusChance?: number;         // 0–100
  /** If true, this move targets self (buff) instead of opponent */
  selfTarget?: boolean;
  /** If true, this move is an ultimate (requires full ultimate bar) */
  isUltimate?: boolean;
  description: string;
  /** Ultimate charge gained when this move lands (default 10) */
  ultimateCharge?: number;
  /** Minimum player level to unlock this move (default 1 = always available) */
  unlockLevel?: number;
  /** If set, only players of this clan can use this move */
  clanExclusive?: ClanId;
}

// ── Player level derivation ────────────────────────────────────
// Level is derived from XP: level = floor(xp / 50) + 1, capped at 50.
// Rank thresholds:  academy 1-5, genin 6-15, chunin 16-25,
//                   jonin 26-35, sannin 36-45, kage 46-50

export function getPlayerLevel(xp: number): number {
  return Math.min(50, Math.floor(xp / 50) + 1);
}

export function getLevelFromRank(rank: NinjaRank): number {
  const map: Record<NinjaRank, number> = {
    academy: 3, genin: 10, chunin: 20, jonin: 30, sannin: 40, kage: 50,
  };
  return map[rank] ?? 10;
}

/** Minimum level to unlock the ultimate bar */
export const ULTIMATE_UNLOCK_LEVEL = 20;

// ── Fighter stats — Pokémon-style split ────────────────────────

export interface FighterStats {
  maxHp: number;
  attack: number;     // physical attack (taijutsu)
  defense: number;    // physical defense
  spAttack: number;   // special attack (ninjutsu/genjutsu)
  spDefense: number;  // special defense
  speed: number;      // turn order
  evasion: number;    // dodge chance modifier (base 5, max ~30)
}

export interface Fighter {
  name: string;
  rank: NinjaRank;
  ninjaType: NinjaType;
  clan: ClanId;
  chakraNature: ChakraNature;
  stats: FighterStats;
  moves: BattleMove[];
  maxChakra: number;
  // Runtime state
  hp: number;
  chakra: number;
  statuses: ActiveStatus[];
  /** Ultimate bar 0–100, when 100 ultimate moves become available */
  ultimateCharge: number;
  /** Eye ability image path (cosmetic / passive indicator) */
  eyeAbility?: string;
  /** Clan crest image path */
  clanImage?: string;
}

// ── Turn log ───────────────────────────────────────────────────

export interface TurnEvent {
  turn: number;
  attacker: 'player' | 'opponent';
  moveName: string;
  damage: number;
  effectiveness: 'super' | 'neutral' | 'resisted' | 'miss' | 'status_only';
  statusApplied?: StatusEffect;
  selfDamage?: number;
  skipped?: boolean;
  message: string;
  /** Was this an ultimate move? */
  isUltimate?: boolean;
}

// ── Battle state ───────────────────────────────────────────────

export type BattlePhase = 'setup' | 'ready' | 'player_turn' | 'opponent_turn' | 'animating' | 'won' | 'lost';

export interface BattleState {
  phase: BattlePhase;
  player: Fighter;
  opponent: Fighter;
  turnCount: number;
  log: TurnEvent[];
  xpEarned: number;
}

// ── Difficulty tiers for AI ────────────────────────────────────

export type AIDifficulty = 'academy' | 'genin' | 'chunin' | 'jonin' | 'kage';

// ── Clan images ────────────────────────────────────────────────

export const CLAN_IMAGES: Record<string, string> = {
  uzumaki: '/clans/uzumaki clan.png',
  uchiha: '/clans/Uchiha Logo-bg-removed.png',
  hyuga: '/clans/Yamanaka Clan.png',     // using Yamanaka as visual proxy
  nara: '/clans/Clan Nara.png',
  aburame: '/clans/Clan aburame.png',
  inuzuka: '/clans/Inuzuka Clan.png',
  akimichi: '/clans/Akimichi clan.png',
  hatake: '/clans/Hatake Clan.png',
  yamanaka: '/clans/Yamanaka Clan.png',
  senju: '/eyes/Senju Clan.png',
  rogue: '/clans/Hatake Clan.png',
};

// ── Eye abilities ──────────────────────────────────────────────

export const EYE_IMAGES: Record<string, string> = {
  sharingan: '/eyes/Sharingan.png',
  mangekyo_itachi: '/eyes/itachi mangekyou sharingan.png',
  mangekyo_sasuke: '/eyes/sasuke mangekyou sharingan.png',
  byakugan: '/eyes/byakugan.png',
  rinnegan: '/eyes/rinnegan.png',
  sage_mode: '/eyes/naruto sage eyes.png',
  sage_kyubi: '/eyes/naruto sage eyes with kyubi chakra.png',
};

// ── Battlefield backgrounds ────────────────────────────────────

export const BATTLEFIELD_BACKGROUNDS = [
  '/background/hashirama_madara_waterfall.jpg',
  '/background/hashirama_madara_waterfall 2.jpg',
  '/background/rain village.jpg',
  '/background/naruto_swing.jpg',
  '/background/naruto swing 2.jpg',
  '/background/naruto meditaion.jpg',
  '/background/mount rushmore.jpg',
  '/background/ichiraku ramen shop.jpg',
  '/background/Ichiraku ramen shop 2.jpg',
];

export function randomBattlefield(): string {
  return BATTLEFIELD_BACKGROUNDS[Math.floor(Math.random() * BATTLEFIELD_BACKGROUNDS.length)];
}

// ── PvP battle modes ──────────────────────────────────────────

export type BattleMode = 'pve' | 'local_pvp' | 'online_pvp' | 'clan_war';

// ── Online PvP room ───────────────────────────────────────────

export type RoomStatus = 'waiting' | 'ready' | 'in_progress' | 'finished';

export interface BattleRoom {
  roomCode: string;
  host: { name: string; fighter: Fighter };
  guest: { name: string; fighter: Fighter } | null;
  status: RoomStatus;
  battlefield: string;
  createdAt: number;
}

// ── Clan war ──────────────────────────────────────────────────

export interface CustomClan {
  id: string;
  name: string;
  tag: string;
  icon: string;
  description: string;
  createdBy: string;
  members: string[];
  wins: number;
  losses: number;
  createdAt: number;
}
