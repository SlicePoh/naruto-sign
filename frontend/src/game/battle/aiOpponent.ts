/* ═══════════════════════════════════════════════════════════════
   AI Opponent Generator — builds fighters of varying difficulty
   with Atk/SpAtk/Def/SpDef split, evasion, ultimate bar,
   clan images, and eye abilities
   ═══════════════════════════════════════════════════════════════ */

import type { Fighter, FighterStats, AIDifficulty, BattleMove } from './types';
import { CLAN_IMAGES, EYE_IMAGES } from './types';
import type { ChakraNature, NinjaType, ClanId, NinjaRank, PlayerProfile, JutsuProgress } from '../types';
import { MOVE_CATALOG } from './moveCatalog';

// ── Opponent templates ─────────────────────────────────────────

interface OpponentTemplate {
  name: string;
  ninjaType: NinjaType;
  clan: ClanId;
  chakraNature: ChakraNature;
  moveIds: string[];
  eyeAbility?: string;   // key into EYE_IMAGES
}

const OPPONENT_POOL: Record<AIDifficulty, OpponentTemplate[]> = {
  academy: [
    { name: 'Konohamaru', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'fire', moveIds: ['mv_clone', 'mv_transformation', 'mv_substitution', 'mv_punch'] },
    { name: 'Moegi', ninjaType: 'genjutsu', clan: 'rogue', chakraNature: 'water', moveIds: ['mv_clone', 'mv_transformation', 'mv_punch', 'mv_genjutsu_bind'] },
  ],
  genin: [
    { name: 'Kiba', ninjaType: 'taijutsu', clan: 'inuzuka', chakraNature: 'earth', moveIds: ['mv_punch', 'mv_leaf_hurricane', 'mv_substitution', 'mv_shadowClone'] },
    { name: 'Hinata', ninjaType: 'taijutsu', clan: 'hyuga', chakraNature: 'lightning', moveIds: ['mv_gentle_fist', 'mv_substitution', 'mv_clone', 'mv_punch'], eyeAbility: 'byakugan' },
    { name: 'Shikamaru', ninjaType: 'genjutsu', clan: 'nara', chakraNature: 'earth', moveIds: ['mv_genjutsu_bind', 'mv_demonic_illusion', 'mv_substitution', 'mv_punch'] },
    { name: 'Sakura', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'earth', moveIds: ['mv_punch', 'mv_clone', 'mv_iron_body', 'mv_transformation'] },
    { name: 'Shino', ninjaType: 'ninjutsu', clan: 'aburame', chakraNature: 'earth', moveIds: ['mv_earth_spike', 'mv_substitution', 'mv_clone', 'mv_punch'] },
    { name: 'Choji', ninjaType: 'taijutsu', clan: 'akimichi', chakraNature: 'earth', moveIds: ['mv_punch', 'mv_dynamic_entry', 'mv_battle_cry', 'mv_substitution'] },
  ],
  chunin: [
    { name: 'Neji', ninjaType: 'taijutsu', clan: 'hyuga', chakraNature: 'lightning', moveIds: ['mv_gentle_fist', 'mv_leaf_hurricane', 'mv_body_flicker', 'mv_chidori'], eyeAbility: 'byakugan' },
    { name: 'Temari', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'wind', moveIds: ['mv_windBlade', 'mv_rasengan', 'mv_wind_slash', 'mv_punch'] },
    { name: 'Gaara', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'earth', moveIds: ['mv_earthWall', 'mv_earth_spike', 'mv_iron_body', 'mv_punch'] },
    { name: 'Sasuke', ninjaType: 'ninjutsu', clan: 'uchiha', chakraNature: 'lightning', moveIds: ['mv_chidori', 'mv_fireball', 'mv_sharingan_focus', 'mv_punch'], eyeAbility: 'sharingan' },
    { name: 'Ino', ninjaType: 'genjutsu', clan: 'yamanaka', chakraNature: 'water', moveIds: ['mv_demonic_illusion', 'mv_genjutsu_bind', 'mv_chakra_focus', 'mv_punch'] },
  ],
  jonin: [
    { name: 'Kakashi', ninjaType: 'ninjutsu', clan: 'hatake', chakraNature: 'lightning', moveIds: ['mv_chidori', 'mv_waterDragon', 'mv_sharingan_focus', 'mv_shadowClone'], eyeAbility: 'sharingan' },
    { name: 'Guy', ninjaType: 'taijutsu', clan: 'rogue', chakraNature: 'fire', moveIds: ['mv_leaf_hurricane', 'mv_dynamic_entry', 'mv_battle_cry', 'mv_body_flicker'] },
    { name: 'Kurenai', ninjaType: 'genjutsu', clan: 'rogue', chakraNature: 'fire', moveIds: ['mv_demonic_illusion', 'mv_genjutsu_bind', 'mv_fireball', 'mv_chakra_focus'] },
    { name: 'Asuma', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'wind', moveIds: ['mv_windBlade', 'mv_rasengan', 'mv_punch', 'mv_shadowClone'] },
  ],
  kage: [
    { name: 'Itachi', ninjaType: 'genjutsu', clan: 'uchiha', chakraNature: 'fire', moveIds: ['mv_demonic_illusion', 'mv_phoenixFlower', 'mv_fireball', 'mv_sharingan_focus'], eyeAbility: 'mangekyo_itachi' },
    { name: 'Jiraiya', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'fire', moveIds: ['mv_rasengan', 'mv_fireball', 'mv_shadowClone', 'mv_chakra_focus'], eyeAbility: 'sage_mode' },
    { name: 'Orochimaru', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'earth', moveIds: ['mv_earthWall', 'mv_waterDragon', 'mv_genjutsu_bind', 'mv_chakra_focus'] },
    { name: 'Tsunade', ninjaType: 'taijutsu', clan: 'senju', chakraNature: 'earth', moveIds: ['mv_punch', 'mv_dynamic_entry', 'mv_iron_body', 'mv_battle_cry'] },
    { name: 'Minato', ninjaType: 'ninjutsu', clan: 'rogue', chakraNature: 'wind', moveIds: ['mv_rasengan', 'mv_windBlade', 'mv_body_flicker', 'mv_shadowClone'] },
    { name: 'Naruto (Sage)', ninjaType: 'ninjutsu', clan: 'uzumaki', chakraNature: 'wind', moveIds: ['mv_rasengan', 'mv_shadowClone', 'mv_chakra_focus', 'mv_windBlade'], eyeAbility: 'sage_kyubi' },
    { name: 'Sasuke (MS)', ninjaType: 'ninjutsu', clan: 'uchiha', chakraNature: 'lightning', moveIds: ['mv_chidori', 'mv_fireball', 'mv_sharingan_focus', 'mv_body_flicker'], eyeAbility: 'mangekyo_sasuke' },
  ],
};

// ── Stat scaling by difficulty (new stat model) ────────────────

const DIFFICULTY_STATS: Record<AIDifficulty, { base: FighterStats; chakra: number; rank: NinjaRank }> = {
  academy: {
    base: { maxHp: 120, attack: 18, defense: 16, spAttack: 16, spDefense: 14, speed: 14, evasion: 3 },
    chakra: 60,
    rank: 'academy',
  },
  genin: {
    base: { maxHp: 180, attack: 28, defense: 24, spAttack: 26, spDefense: 22, speed: 22, evasion: 5 },
    chakra: 80,
    rank: 'genin',
  },
  chunin: {
    base: { maxHp: 260, attack: 38, defense: 34, spAttack: 38, spDefense: 32, speed: 32, evasion: 8 },
    chakra: 110,
    rank: 'chunin',
  },
  jonin: {
    base: { maxHp: 350, attack: 50, defense: 45, spAttack: 52, spDefense: 44, speed: 42, evasion: 12 },
    chakra: 140,
    rank: 'jonin',
  },
  kage: {
    base: { maxHp: 450, attack: 62, defense: 58, spAttack: 65, spDefense: 56, speed: 55, evasion: 18 },
    chakra: 180,
    rank: 'kage',
  },
};

// ── Ninja-type stat variance ───────────────────────────────────

function applyTypeBonus(base: FighterStats, ninjaType: NinjaType): FighterStats {
  const s = { ...base };
  switch (ninjaType) {
    case 'taijutsu':
      s.attack = Math.round(s.attack * 1.25);
      s.speed = Math.round(s.speed * 1.15);
      s.spAttack = Math.round(s.spAttack * 0.85);
      break;
    case 'ninjutsu':
      s.spAttack = Math.round(s.spAttack * 1.25);
      s.spDefense = Math.round(s.spDefense * 1.1);
      s.attack = Math.round(s.attack * 0.9);
      break;
    case 'genjutsu':
      s.spAttack = Math.round(s.spAttack * 1.15);
      s.spDefense = Math.round(s.spDefense * 1.2);
      s.defense = Math.round(s.defense * 0.9);
      break;
  }
  return s;
}

// ── Generate opponent ──────────────────────────────────────────

const MOVE_MAP = new Map(MOVE_CATALOG.map((m) => [m.id, m]));

export function generateOpponent(difficulty: AIDifficulty): Fighter {
  const pool = OPPONENT_POOL[difficulty];
  const template = pool[Math.floor(Math.random() * pool.length)];
  const tier = DIFFICULTY_STATS[difficulty];

  const stats = applyTypeBonus(tier.base, template.ninjaType);
  const moves: BattleMove[] = template.moveIds
    .map((id) => MOVE_MAP.get(id))
    .filter((m): m is BattleMove => m != null);

  // Ensure exactly 4 moves (pad with basic punch if needed)
  while (moves.length < 4) {
    const punch = MOVE_MAP.get('mv_punch');
    if (punch) moves.push(punch);
    else break;
  }

  return {
    name: template.name,
    rank: tier.rank,
    ninjaType: template.ninjaType,
    clan: template.clan,
    chakraNature: template.chakraNature,
    stats,
    moves: moves.slice(0, 4),
    maxChakra: tier.chakra,
    hp: stats.maxHp,
    chakra: tier.chakra,
    statuses: [],
    ultimateCharge: 0,
    clanImage: CLAN_IMAGES[template.clan],
    eyeAbility: template.eyeAbility ? EYE_IMAGES[template.eyeAbility] : undefined,
  };
}

// ── Build a Fighter from the player's profile ──────────────────

const RANK_HP: Record<string, number> = {
  academy: 130, genin: 200, chunin: 280, jonin: 370, sannin: 430, kage: 500,
};
const RANK_CHAKRA: Record<string, number> = {
  academy: 70, genin: 90, chunin: 120, jonin: 150, sannin: 175, kage: 200,
};

export function buildPlayerFighter(
  profile: PlayerProfile,
  selectedMoves: BattleMove[],
): Fighter {
  const baseHp = RANK_HP[profile.rank] ?? 200;
  const baseChakra = RANK_CHAKRA[profile.rank] ?? 100;

  const stats: FighterStats = {
    maxHp: baseHp + profile.stats.chakraControl * 2,
    attack: 20 + profile.stats.speed * 2,
    defense: 18 + profile.stats.precision,
    spAttack: 20 + profile.stats.chakraControl * 2 + profile.stats.mastery,
    spDefense: 16 + profile.stats.precision + profile.stats.mastery,
    speed: 18 + profile.stats.speed * 2,
    evasion: 5 + Math.round(profile.stats.speed / 2),
  };

  const appliedStats = applyTypeBonus(stats, profile.ninjaType);

  // Uzumaki clan bonus: +20% chakra
  const chakraMod = profile.clan === 'uzumaki' ? 1.2 : 1;
  const maxChakra = Math.round(baseChakra * chakraMod);

  // Determine eye ability based on clan
  let eyeAbility: string | undefined;
  if (profile.clan === 'uchiha') eyeAbility = EYE_IMAGES.sharingan;
  else if (profile.clan === 'hyuga') eyeAbility = EYE_IMAGES.byakugan;

  return {
    name: profile.name,
    rank: profile.rank,
    ninjaType: profile.ninjaType,
    clan: profile.clan,
    chakraNature: profile.chakraNature,
    stats: appliedStats,
    moves: selectedMoves.slice(0, 4),
    maxChakra,
    hp: appliedStats.maxHp,
    chakra: maxChakra,
    statuses: [],
    ultimateCharge: 0,
    clanImage: CLAN_IMAGES[profile.clan],
    eyeAbility,
  };
}

/** Get mastery % for a given jutsuId from player's progress */
export function getJutsuMastery(progress: JutsuProgress[], jutsuId: string | null): number {
  if (!jutsuId) return 100; // generic moves always full power
  const jp = progress.find((j) => j.jutsuId === jutsuId);
  return jp?.mastery ?? 0;
}

// ── AI move selection (with ultimate awareness) ────────────────

export function aiChooseMove(fighter: Fighter, opponent: Fighter): BattleMove {
  // If ultimate bar is full and AI has an ultimate move, 60% chance to use it
  if (fighter.ultimateCharge >= 100) {
    const ultimates = fighter.moves.filter((m) => m.isUltimate && fighter.chakra >= m.chakraCost);
    if (ultimates.length > 0 && Math.random() < 0.6) {
      return ultimates[Math.floor(Math.random() * ultimates.length)];
    }
  }

  // Filter moves the AI can afford (exclude ultimates if bar not full)
  const affordable = fighter.moves.filter(
    (m) => fighter.chakra >= m.chakraCost && (!m.isUltimate || fighter.ultimateCharge >= 100),
  );
  if (affordable.length === 0) {
    return fighter.moves[0]; // will result in Struggle
  }

  // If opponent HP < 30%, prefer high-power finishers
  const hpRatio = opponent.hp / opponent.stats.maxHp;
  if (hpRatio < 0.3) {
    const best = [...affordable].sort((a, b) => b.power - a.power);
    return best[0];
  }

  // If no status on opponent, 40% chance to use a status move
  if (opponent.statuses.length === 0 && Math.random() < 0.4) {
    const statusMoves = affordable.filter((m) => m.statusEffect && m.statusEffect !== 'none');
    if (statusMoves.length > 0) {
      return statusMoves[Math.floor(Math.random() * statusMoves.length)];
    }
  }

  // If self has no buffs, 30% chance to use a buff move
  if (fighter.statuses.length === 0 && Math.random() < 0.3) {
    const buffMoves = affordable.filter((m) => m.selfTarget);
    if (buffMoves.length > 0) {
      return buffMoves[Math.floor(Math.random() * buffMoves.length)];
    }
  }

  // Otherwise pick weighted random (higher power = higher weight)
  const totalPower = affordable.reduce((sum, m) => sum + (m.power || 20), 0);
  let roll = Math.random() * totalPower;
  for (const move of affordable) {
    roll -= (move.power || 20);
    if (roll <= 0) return move;
  }
  return affordable[affordable.length - 1];
}
