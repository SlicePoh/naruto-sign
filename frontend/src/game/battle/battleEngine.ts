/* ═══════════════════════════════════════════════════════════════
   Battle Engine — pure functions, no React / Zustand dependency
   Pokémon-style damage formula with Atk/SpAtk/Def/SpDef split,
   evasion, ultimate bar, and buff/status moves
   ═══════════════════════════════════════════════════════════════ */

import type {
  Fighter,
  BattleMove,
  TurnEvent,
  StatusEffect,
} from './types';
import { getTypeEffectiveness, effectivenessLabel } from './typeChart';

// ── Helpers ────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/** Buff status effects that target self */
const BUFF_STATUSES: StatusEffect[] = [
  'atk_up', 'def_up', 'spatk_up', 'spdef_up', 'speed_up', 'focus', 'evasion_up',
];

function isBuff(effect: StatusEffect): boolean {
  return BUFF_STATUSES.includes(effect);
}

// ── STAB (Same Type Attack Bonus) ──────────────────────────────

function getSTAB(move: BattleMove, user: Fighter): number {
  if (!move.nature) return 1;
  return move.nature === user.chakraNature ? 1.5 : 1;
}

// ── Mastery bonus (training integration) ───────────────────────

export function masteryMultiplier(mastery: number): number {
  return 0.6 + (mastery / 100) * 0.6;
}

// ── Stat modifiers from active statuses ────────────────────────

function effectiveSpeed(f: Fighter): number {
  let spd = f.stats.speed;
  if (f.statuses.some((s) => s.effect === 'slow')) spd = Math.round(spd * 0.75);
  if (f.statuses.some((s) => s.effect === 'speed_up')) spd = Math.round(spd * 1.5);
  return spd;
}

function effectiveAttack(f: Fighter): number {
  let atk = f.stats.attack;
  if (f.statuses.some((s) => s.effect === 'atk_up')) atk = Math.round(atk * 1.5);
  return atk;
}

function effectiveSpAttack(f: Fighter): number {
  let spa = f.stats.spAttack;
  if (f.statuses.some((s) => s.effect === 'spatk_up')) spa = Math.round(spa * 1.5);
  return spa;
}

function effectiveDefense(f: Fighter): number {
  let def = f.stats.defense;
  if (f.statuses.some((s) => s.effect === 'guard_down')) def = Math.round(def * 0.75);
  if (f.statuses.some((s) => s.effect === 'def_up')) def = Math.round(def * 1.5);
  return def;
}

function effectiveSpDefense(f: Fighter): number {
  let spd = f.stats.spDefense;
  if (f.statuses.some((s) => s.effect === 'guard_down')) spd = Math.round(spd * 0.75);
  if (f.statuses.some((s) => s.effect === 'spdef_up')) spd = Math.round(spd * 1.5);
  return spd;
}

function effectiveAccuracy(f: Fighter): number {
  let acc = 1;
  if (f.statuses.some((s) => s.effect === 'blind')) acc *= 0.7;
  if (f.statuses.some((s) => s.effect === 'focus')) acc *= 1.3;
  return acc;
}

function effectiveEvasion(f: Fighter): number {
  let ev = f.stats.evasion;
  if (f.statuses.some((s) => s.effect === 'evasion_up')) ev += 25;
  return ev; // base 5, max ~30 (+25 from buff = 55)
}

// ── Core damage formula ────────────────────────────────────────

const RANK_LEVEL: Record<string, number> = {
  academy: 5, genin: 15, chunin: 25, jonin: 35, sannin: 45, kage: 50,
};

export function calcDamage(
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  mastery: number,
): { damage: number; effectiveness: 'super' | 'neutral' | 'resisted' } {
  const level = RANK_LEVEL[attacker.rank] ?? 25;

  // Pick atk / def based on category (physical vs special)
  const isPhysical = move.category === 'taijutsu';
  const atk = isPhysical ? effectiveAttack(attacker) : effectiveSpAttack(attacker);
  const def = isPhysical ? effectiveDefense(defender) : effectiveSpDefense(defender);

  const base = ((2 * level / 5 + 2) * move.power * (atk / (def || 1))) / 50 + 2;

  const stab = getSTAB(move, attacker);
  const typeEff = getTypeEffectiveness(move.nature, defender.chakraNature);
  const masteryMod = masteryMultiplier(mastery);
  const randomMod = rand(0.85, 1);

  // Ninja-type bonus: +20% if move category matches your ninja type
  const typeBonus = attacker.ninjaType === move.category ? 1.2 : 1;

  const total = Math.round(base * stab * typeEff * masteryMod * randomMod * typeBonus);

  return {
    damage: Math.max(1, total),
    effectiveness: effectivenessLabel(typeEff),
  };
}

// ── Turn order (speed-based) ───────────────────────────────────

export function whoGoesFirst(player: Fighter, opponent: Fighter): 'player' | 'opponent' {
  const ps = effectiveSpeed(player);
  const os = effectiveSpeed(opponent);
  if (ps !== os) return ps >= os ? 'player' : 'opponent';
  return Math.random() > 0.5 ? 'player' : 'opponent';
}

// ── Process status effects at end of turn ──────────────────────

export function tickStatuses(fighter: Fighter): { damage: number; messages: string[] } {
  let damage = 0;
  const messages: string[] = [];

  // Burn DoT: 1/16 max HP
  const burn = fighter.statuses.find((s) => s.effect === 'burn');
  if (burn) {
    const dot = Math.max(1, Math.round(fighter.stats.maxHp / 16));
    damage += dot;
    messages.push(`${fighter.name} is burned! (-${dot} HP)`);
  }

  // Tick down all timers
  fighter.statuses = fighter.statuses
    .map((s) => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
    .filter((s) => s.turnsLeft > 0);

  return { damage, messages };
}

// ── Chakra regeneration per turn ───────────────────────────────

/** Restore a small amount of chakra each turn (~5% of max) */
export function regenChakra(fighter: Fighter): string | null {
  const regen = Math.max(1, Math.round(fighter.maxChakra * 0.05));
  if (fighter.chakra >= fighter.maxChakra) return null;
  fighter.chakra = Math.min(fighter.maxChakra, fighter.chakra + regen);
  return `${fighter.name} regenerates ${regen} chakra. (${fighter.chakra}/${fighter.maxChakra})`;
}

/** Replenish action: skip turn, restore ~35% of max chakra */
export function executeReplenish(fighter: Fighter): string {
  const restore = Math.max(5, Math.round(fighter.maxChakra * 0.35));
  fighter.chakra = Math.min(fighter.maxChakra, fighter.chakra + restore);
  return `${fighter.name} focuses and restores ${restore} chakra! (${fighter.chakra}/${fighter.maxChakra})`;
}

// ── Execute a single move ──────────────────────────────────────

export interface MoveResult {
  event: TurnEvent;
  attackerAfter: Fighter;
  defenderAfter: Fighter;
}

export function executeMove(
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  mastery: number,
  turnCount: number,
  side: 'player' | 'opponent',
): MoveResult {
  const attackerCopy = deepCopyFighter(attacker);
  const defenderCopy = deepCopyFighter(defender);

  // ── Check ultimate bar requirement ──
  if (move.isUltimate && attackerCopy.ultimateCharge < 100) {
    return {
      event: {
        turn: turnCount,
        attacker: side,
        moveName: move.name,
        damage: 0,
        effectiveness: 'miss',
        skipped: true,
        message: `${attackerCopy.name} tried ${move.name} but ultimate bar is not full!`,
      },
      attackerAfter: attackerCopy,
      defenderAfter: defenderCopy,
    };
  }

  // ── Check paralysis skip ──
  const para = attackerCopy.statuses.find((s) => s.effect === 'paralysis');
  if (para && Math.random() < 0.25) {
    return {
      event: {
        turn: turnCount,
        attacker: side,
        moveName: move.name,
        damage: 0,
        effectiveness: 'miss',
        skipped: true,
        message: `${attackerCopy.name} is paralyzed and can't move!`,
      },
      attackerAfter: attackerCopy,
      defenderAfter: defenderCopy,
    };
  }

  // ── Check confusion self-hit ──
  const conf = attackerCopy.statuses.find((s) => s.effect === 'confusion');
  if (conf && Math.random() < 0.3) {
    const selfDmg = Math.max(1, Math.round(attackerCopy.stats.maxHp / 12));
    attackerCopy.hp = Math.max(0, attackerCopy.hp - selfDmg);
    return {
      event: {
        turn: turnCount,
        attacker: side,
        moveName: move.name,
        damage: 0,
        effectiveness: 'miss',
        selfDamage: selfDmg,
        message: `${attackerCopy.name} hurt itself in confusion! (-${selfDmg} HP)`,
      },
      attackerAfter: attackerCopy,
      defenderAfter: defenderCopy,
    };
  }

  // ── Chakra cost ──
  if (attackerCopy.chakra < move.chakraCost) {
    const struggleDmg = Math.max(1, Math.round(attackerCopy.stats.maxHp / 20));
    defenderCopy.hp = Math.max(0, defenderCopy.hp - struggleDmg);
    return {
      event: {
        turn: turnCount,
        attacker: side,
        moveName: 'Struggle',
        damage: struggleDmg,
        effectiveness: 'neutral',
        message: `${attackerCopy.name} has no chakra left! Struggle deals ${struggleDmg} damage.`,
      },
      attackerAfter: attackerCopy,
      defenderAfter: defenderCopy,
    };
  }

  attackerCopy.chakra -= move.chakraCost;

  // ── Consume ultimate bar if ultimate move ──
  if (move.isUltimate) {
    attackerCopy.ultimateCharge = 0;
  }

  // ── Accuracy check (includes evasion) ──
  const accRoll = Math.random() * 100;
  const accMod = effectiveAccuracy(attackerCopy);
  const evasion = effectiveEvasion(defenderCopy);
  const hitChance = move.accuracy * accMod - evasion;
  if (accRoll > hitChance) {
    return {
      event: {
        turn: turnCount,
        attacker: side,
        moveName: move.name,
        damage: 0,
        effectiveness: 'miss',
        message: `${attackerCopy.name}'s ${move.name} missed!`,
      },
      attackerAfter: attackerCopy,
      defenderAfter: defenderCopy,
    };
  }

  // ── Damage ──
  let damage = 0;
  let effectiveness: 'super' | 'neutral' | 'resisted' | 'status_only';

  if (move.power > 0) {
    const result = calcDamage(attackerCopy, defenderCopy, move, mastery);
    damage = result.damage;
    effectiveness = result.effectiveness;
    defenderCopy.hp = Math.max(0, defenderCopy.hp - damage);
  } else {
    effectiveness = 'status_only';
  }

  // ── Ultimate charge (gained when move lands) ──
  if (!move.isUltimate) {
    const chargeGain = move.ultimateCharge ?? 10;
    attackerCopy.ultimateCharge = Math.min(100, attackerCopy.ultimateCharge + chargeGain);
  }

  // ── Status effect ──
  let statusApplied: StatusEffect | undefined;
  if (move.statusEffect && move.statusEffect !== 'none' && move.statusChance) {
    if (Math.random() * 100 < move.statusChance) {
      // Determine target: self-target buffs apply to attacker, debuffs to defender
      const target = (move.selfTarget || isBuff(move.statusEffect)) ? attackerCopy : defenderCopy;
      // Don't stack same status
      if (!target.statuses.some((s) => s.effect === move.statusEffect)) {
        const duration = move.statusEffect === 'burn' ? 5 : 3;
        target.statuses.push({ effect: move.statusEffect, turnsLeft: duration });
        statusApplied = move.statusEffect;
      }
    }
  }

  // ── Build message ──
  let msg = '';
  if (move.isUltimate) msg = '⚡ ULTIMATE! ';
  if (damage > 0) {
    msg += `${attackerCopy.name} used ${move.name}! `;
    if (effectiveness === 'super') msg += "It's super effective! ";
    else if (effectiveness === 'resisted') msg += "It's not very effective... ";
    msg += `(-${damage} HP)`;
  } else {
    msg += `${attackerCopy.name} used ${move.name}!`;
  }
  if (statusApplied) {
    const statusTarget = (move.selfTarget || isBuff(statusApplied)) ? attackerCopy.name : defenderCopy.name;
    msg += ` ${statusTarget} gained ${statusApplied}!`;
  }

  return {
    event: {
      turn: turnCount,
      attacker: side,
      moveName: move.name,
      damage,
      effectiveness,
      statusApplied,
      message: msg,
      isUltimate: move.isUltimate,
    },
    attackerAfter: attackerCopy,
    defenderAfter: defenderCopy,
  };
}

// ── Deep copy (avoid mutation) ─────────────────────────────────

function deepCopyFighter(f: Fighter): Fighter {
  return {
    ...f,
    stats: { ...f.stats },
    statuses: f.statuses.map((s) => ({ ...s })),
    moves: f.moves.map((m) => ({ ...m })),
  };
}

// ── XP reward calculation ──────────────────────────────────────

const RANK_XP_REWARD: Record<string, number> = {
  academy: 20, genin: 35, chunin: 60, jonin: 100, sannin: 150, kage: 250,
};

export function calcBattleXP(opponentRank: string, won: boolean): number {
  const base = RANK_XP_REWARD[opponentRank] ?? 50;
  return won ? base : Math.round(base * 0.25);
}
