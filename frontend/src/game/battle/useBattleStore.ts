/* ═══════════════════════════════════════════════════════════════
   Battle Store — Zustand state for a single battle session
   Supports PvE, Local PvP, Online PvP, and Clan War modes
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BattleMove, BattlePhase, Fighter, TurnEvent, AIDifficulty, BattleMode, BattleRoom, CustomClan } from './types';
import { randomBattlefield } from './types';
import {
  executeMove,
  whoGoesFirst,
  tickStatuses,
  calcBattleXP,
  regenChakra,
  executeReplenish,
} from './battleEngine';
import {
  generateOpponent,
  buildPlayerFighter,
  aiChooseMove,
  getJutsuMastery,
} from './aiOpponent';
import type { PlayerProfile } from '../types';
import { getPlayerLevel, ULTIMATE_UNLOCK_LEVEL } from './types';

/* ─── store shape ──────────────────────────────────────────────── */

interface BattleStore {
  // Core
  phase: BattlePhase;
  mode: BattleMode;
  player: Fighter | null;
  opponent: Fighter | null;
  turnCount: number;
  log: TurnEvent[];
  xpEarned: number;
  difficulty: AIDifficulty;
  playerMasteryMap: Map<string, number>;
  battlefield: string;

  // Local PvP — whose turn it is
  localPvpTurn: 'player1' | 'player2';
  player2MasteryMap: Map<string, number>;

  // Online PvP
  room: BattleRoom | null;
  onlineStatus: 'idle' | 'creating' | 'joining' | 'waiting' | 'connected';

  // Clans (persisted)
  customClans: CustomClan[];
  playerClanId: string | null;

  // ── Actions ──
  initPveBattle: (profile: PlayerProfile, selectedMoves: BattleMove[], difficulty: AIDifficulty) => void;
  playerAttack: (move: BattleMove) => void;
  playerReplenish: () => void;
  initLocalPvp: (profile1: PlayerProfile, moves1: BattleMove[], p2Name: string, moves2: BattleMove[], p2Profile: PlayerProfile) => void;
  localPvpAttack: (move: BattleMove) => void;
  localPvpReplenish: () => void;
  createRoom: (profile: PlayerProfile, moves: BattleMove[]) => void;
  joinRoom: (roomCode: string, profile: PlayerProfile, moves: BattleMove[]) => void;
  onOpponentJoined: (guest: { name: string; fighter: Fighter }) => void;
  sendMove: (move: BattleMove) => void;
  createClan: (name: string, tag: string, icon: string, description: string, creatorName: string) => void;
  joinClan: (clanId: string, playerName: string) => void;
  leaveClan: (playerName: string) => void;
  resetBattle: () => void;
}

/* ─── helpers ──────────────────────────────────────────────────── */

function buildMasteryMap(profile: PlayerProfile): Map<string, number> {
  const map = new Map<string, number>();
  for (const jp of profile.jutsuProgress) {
    map.set(jp.jutsuId, jp.mastery);
  }
  return map;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function deepCopyFighter(f: Fighter): Fighter {
  return {
    ...f,
    stats: { ...f.stats },
    statuses: f.statuses.map((s) => ({ ...s })),
    moves: f.moves.map((m) => ({ ...m })),
  };
}

function doAttack(
  atk: Fighter, def: Fighter, move: BattleMove, mastery: number, turn: number, side: 'player' | 'opponent', log: TurnEvent[],
): { atk: Fighter; def: Fighter } {
  const result = executeMove(atk, def, move, mastery, turn, side);
  log.push(result.event);
  const st = tickStatuses(result.attackerAfter);
  if (st.damage > 0) {
    result.attackerAfter.hp = Math.max(0, result.attackerAfter.hp - st.damage);
    st.messages.forEach((msg) =>
      log.push({ turn, attacker: side, moveName: 'Status', damage: st.damage, effectiveness: 'status_only', message: msg }),
    );
  }
  // Chakra regen at end of each fighter's action
  const regenMsg = regenChakra(result.attackerAfter);
  if (regenMsg) {
    log.push({ turn, attacker: side, moveName: 'Regen', damage: 0, effectiveness: 'status_only', message: regenMsg });
  }
  return { atk: result.attackerAfter, def: result.defenderAfter };
}

function getMasteryFor(masteryMap: Map<string, number>, jutsuId: string | null): number {
  if (!jutsuId) return 100;
  return masteryMap.get(jutsuId) ?? 0;
}

/* ─── store ────────────────────────────────────────────────────── */

export const useBattleStore = create<BattleStore>()((set, get) => ({
  phase: 'setup',
  mode: 'pve',
  player: null,
  opponent: null,
  turnCount: 0,
  log: [],
  xpEarned: 0,
  difficulty: 'genin',
  playerMasteryMap: new Map(),
  battlefield: randomBattlefield(),
  localPvpTurn: 'player1',
  player2MasteryMap: new Map(),
  room: null,
  onlineStatus: 'idle',
  customClans: [],
  playerClanId: null,

  /* ═══════════ PvE ═══════════ */

  initPveBattle: (profile, selectedMoves, difficulty) => {
    set({
      phase: 'ready',
      mode: 'pve',
      player: buildPlayerFighter(profile, selectedMoves),
      opponent: generateOpponent(difficulty),
      turnCount: 1,
      log: [],
      xpEarned: 0,
      difficulty,
      playerMasteryMap: buildMasteryMap(profile),
      battlefield: randomBattlefield(),
    });
  },

  playerAttack: (move) => {
    const s = get();
    if (!s.player || !s.opponent || s.phase === 'animating') return;
    if (s.mode === 'local_pvp') { s.localPvpAttack(move); return; }

    set({ phase: 'animating' });
    const first = whoGoesFirst(s.player, s.opponent);
    const newLog: TurnEvent[] = [...s.log];
    let p = deepCopyFighter(s.player);
    let o = deepCopyFighter(s.opponent);
    const t = s.turnCount;

    const pMastery = (m: BattleMove) => getMasteryFor(s.playerMasteryMap, m.jutsuId);
    const oMastery = () => 80 + Math.random() * 20;

    if (first === 'player') {
      const r1 = doAttack(p, o, move, pMastery(move), t, 'player', newLog); p = r1.atk; o = r1.def;
      if (o.hp <= 0) { set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'won', xpEarned: calcBattleXP(s.difficulty, true) }); return; }
      const aiM = aiChooseMove(o, p);
      const r2 = doAttack(o, p, aiM, oMastery(), t, 'opponent', newLog); o = r2.atk; p = r2.def;
      if (p.hp <= 0) { set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'lost', xpEarned: calcBattleXP(s.difficulty, false) }); return; }
    } else {
      const aiM = aiChooseMove(o, p);
      const r1 = doAttack(o, p, aiM, oMastery(), t, 'opponent', newLog); o = r1.atk; p = r1.def;
      if (p.hp <= 0) { set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'lost', xpEarned: calcBattleXP(s.difficulty, false) }); return; }
      const r2 = doAttack(p, o, move, pMastery(move), t, 'player', newLog); p = r2.atk; o = r2.def;
      if (o.hp <= 0) { set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'won', xpEarned: calcBattleXP(s.difficulty, true) }); return; }
    }
    set({ player: p, opponent: o, turnCount: t + 1, log: newLog, phase: 'player_turn' });
  },

  /** Player skips their turn to replenish chakra. Opponent still attacks. */
  playerReplenish: () => {
    const s = get();
    if (!s.player || !s.opponent || s.phase === 'animating') return;
    if (s.mode === 'local_pvp') { s.localPvpReplenish(); return; }

    set({ phase: 'animating' });
    const newLog: TurnEvent[] = [...s.log];
    let p = deepCopyFighter(s.player);
    let o = deepCopyFighter(s.opponent);
    const t = s.turnCount;

    // Player replenishes
    const replenishMsg = executeReplenish(p);
    newLog.push({ turn: t, attacker: 'player', moveName: 'Replenish Chakra', damage: 0, effectiveness: 'status_only', message: replenishMsg });

    // Opponent still attacks
    const oMastery = () => 80 + Math.random() * 20;
    const aiM = aiChooseMove(o, p);
    const r = doAttack(o, p, aiM, oMastery(), t, 'opponent', newLog);
    o = r.atk; p = r.def;

    if (p.hp <= 0) {
      set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'lost', xpEarned: calcBattleXP(s.difficulty, false) });
      return;
    }

    set({ player: p, opponent: o, turnCount: t + 1, log: newLog, phase: 'player_turn' });
  },

  /* ═══════════ Local PvP ═══════════ */

  initLocalPvp: (profile1, moves1, p2Name, moves2, p2Profile) => {
    const f1 = buildPlayerFighter(profile1, moves1);
    const f2 = buildPlayerFighter(p2Profile, moves2);
    f2.name = p2Name;
    set({
      phase: 'ready', mode: 'local_pvp',
      player: f1, opponent: f2,
      turnCount: 1, log: [], xpEarned: 0,
      playerMasteryMap: buildMasteryMap(profile1),
      player2MasteryMap: buildMasteryMap(p2Profile),
      localPvpTurn: whoGoesFirst(f1, f2) === 'player' ? 'player1' : 'player2',
      battlefield: randomBattlefield(),
    });
  },

  localPvpAttack: (move) => {
    const s = get();
    if (!s.player || !s.opponent) return;
    set({ phase: 'animating' });

    const newLog: TurnEvent[] = [...s.log];
    let p = deepCopyFighter(s.player);
    let o = deepCopyFighter(s.opponent);
    const t = s.turnCount;
    const side: 'player' | 'opponent' = s.localPvpTurn === 'player1' ? 'player' : 'opponent';
    const masteryMap = side === 'player' ? s.playerMasteryMap : s.player2MasteryMap;
    const mastery = getMasteryFor(masteryMap, move.jutsuId);

    const atk = side === 'player' ? p : o;
    const def = side === 'player' ? o : p;
    const r = doAttack(atk, def, move, mastery, t, side, newLog);

    if (side === 'player') { p = r.atk; o = r.def; } else { o = r.atk; p = r.def; }

    if (o.hp <= 0) { set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'won', xpEarned: 0 }); return; }
    if (p.hp <= 0) { set({ player: p, opponent: o, turnCount: t, log: newLog, phase: 'lost', xpEarned: 0 }); return; }

    const nextTurn = s.localPvpTurn === 'player1' ? 'player2' : 'player1';
    set({
      player: p, opponent: o,
      turnCount: nextTurn === 'player1' ? t + 1 : t,
      log: newLog, phase: 'player_turn', localPvpTurn: nextTurn,
    });
  },

  /** Local PvP: active player skips turn to replenish chakra */
  localPvpReplenish: () => {
    const s = get();
    if (!s.player || !s.opponent) return;
    set({ phase: 'animating' });

    const newLog: TurnEvent[] = [...s.log];
    let p = deepCopyFighter(s.player);
    let o = deepCopyFighter(s.opponent);
    const t = s.turnCount;
    const side: 'player' | 'opponent' = s.localPvpTurn === 'player1' ? 'player' : 'opponent';
    const fighter = side === 'player' ? p : o;

    const replenishMsg = executeReplenish(fighter);
    newLog.push({ turn: t, attacker: side, moveName: 'Replenish Chakra', damage: 0, effectiveness: 'status_only', message: replenishMsg });

    const nextTurn = s.localPvpTurn === 'player1' ? 'player2' : 'player1';
    set({
      player: p, opponent: o,
      turnCount: nextTurn === 'player1' ? t + 1 : t,
      log: newLog, phase: 'player_turn', localPvpTurn: nextTurn,
    });
  },

  /* ═══════════ Online PvP ═══════════ */

  createRoom: (profile, moves) => {
    const fighter = buildPlayerFighter(profile, moves);
    const room: BattleRoom = {
      roomCode: generateRoomCode(),
      host: { name: profile.name, fighter },
      guest: null,
      status: 'waiting',
      battlefield: randomBattlefield(),
      createdAt: Date.now(),
    };
    set({ room, onlineStatus: 'waiting', mode: 'online_pvp', playerMasteryMap: buildMasteryMap(profile) });
  },

  joinRoom: (roomCode, profile, moves) => {
    const fighter = buildPlayerFighter(profile, moves);
    const { room } = get();
    if (room && room.roomCode === roomCode) {
      const updated: BattleRoom = { ...room, guest: { name: profile.name, fighter }, status: 'ready' };
      set({
        room: updated, onlineStatus: 'connected',
        player: room.host.fighter, opponent: fighter,
        playerMasteryMap: buildMasteryMap(profile),
        battlefield: room.battlefield, phase: 'ready', turnCount: 1, log: [],
      });
    }
  },

  onOpponentJoined: (guest) => {
    const { room } = get();
    if (!room) return;
    set({
      room: { ...room, guest, status: 'ready' },
      opponent: guest.fighter, player: room.host.fighter,
      onlineStatus: 'connected', phase: 'ready', turnCount: 1, log: [],
    });
  },

  sendMove: (move) => { get().playerAttack(move); },

  /* ═══════════ Custom Clans ═══════════ */

  createClan: (name, tag, icon, description, creatorName) => {
    const clan: CustomClan = {
      id: `clan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name, tag: tag.toUpperCase().slice(0, 5), icon, description,
      createdBy: creatorName, members: [creatorName],
      wins: 0, losses: 0, createdAt: Date.now(),
    };
    set((s) => ({ customClans: [...s.customClans, clan], playerClanId: clan.id }));
  },

  joinClan: (clanId, playerName) => {
    set((s) => ({
      customClans: s.customClans.map((c) =>
        c.id === clanId && !c.members.includes(playerName)
          ? { ...c, members: [...c.members, playerName] } : c,
      ),
      playerClanId: clanId,
    }));
  },

  leaveClan: (playerName) => {
    set((s) => ({
      customClans: s.customClans.map((c) => ({ ...c, members: c.members.filter((m) => m !== playerName) })),
      playerClanId: null,
    }));
  },

  /* ═══════════ Reset ═══════════ */

  resetBattle: () => {
    set({
      phase: 'setup', player: null, opponent: null, turnCount: 0,
      log: [], xpEarned: 0, playerMasteryMap: new Map(), player2MasteryMap: new Map(),
      localPvpTurn: 'player1', room: null, onlineStatus: 'idle',
    });
  },
}));
