/* ═══════════════════════════════════════════════════════════════
   Move catalog — rebalanced Pokémon-style power scaling
   with level-gated unlocks and clan-specific moves

   Power tiers:
     Weak      10–25   (basic strikes, status moves)
     Light     30–45   (elemental jabs, academy jutsu)
     Medium    50–70   (genin–chūnin jutsu)
     Heavy     80–100  (jōnin jutsu)
     Ultra    110–120  (sannin-tier)
     Ultimate 140–150  (requires full ultimate bar)

   Level tiers:
     1–5    Academy — basic taijutsu + 1 elemental strike + 1 status
     6–10   Genin   — elemental strikes, academy jutsu
     11–15  Mid Genin — shadow clone, genjutsu
     16–20  Chūnin  — mid-tier jutsu, more status moves
     21–30  Jōnin   — heavy jutsu (chidori, rasengan, etc.)
     31–40  Sannin  — advanced jutsu, all status moves
     41–50  Kage    — all moves incl. ultimates via bar
   ═══════════════════════════════════════════════════════════════ */

import type { BattleMove, MoveCategory } from './types';
import type { JutsuId, ClanId, ChakraNature } from '../types';
import { getPlayerLevel, ULTIMATE_UNLOCK_LEVEL } from './types';
import type { PlayerProfile } from '../types';

// ── Full move catalog ──────────────────────────────────────────

export const MOVE_CATALOG: BattleMove[] = [

  // ═══════════════════════════════════════════
  // TAIJUTSU (physical: uses Atk vs Def)
  // ═══════════════════════════════════════════

  {
    id: 'mv_punch',
    name: 'Taijutsu Strike',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 30,
    accuracy: 100,
    chakraCost: 0,
    ultimateCharge: 8,
    unlockLevel: 1,
    description: 'A basic physical strike. Always available, never misses.',
  },
  {
    id: 'mv_leaf_hurricane',
    name: 'Leaf Hurricane',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 55,
    accuracy: 90,
    chakraCost: 0,
    ultimateCharge: 12,
    unlockLevel: 12,
    description: 'A powerful spinning kick. High damage, no chakra cost.',
  },
  {
    id: 'mv_gentle_fist',
    name: 'Gentle Fist',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 45,
    accuracy: 85,
    chakraCost: 0,
    statusEffect: 'slow',
    statusChance: 35,
    ultimateCharge: 10,
    unlockLevel: 6,
    clanExclusive: 'hyuga',
    description: 'Targets chakra points. May slow the opponent. (Hyūga only)',
  },
  {
    id: 'mv_dynamic_entry',
    name: 'Dynamic Entry',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 70,
    accuracy: 80,
    chakraCost: 0,
    ultimateCharge: 15,
    unlockLevel: 20,
    description: 'A reckless flying kick. High power but can miss.',
  },

  // ═══════════════════════════════════════════
  // NINJUTSU — JUTSU-LINKED (uses SpAtk vs SpDef)
  // ═══════════════════════════════════════════

  // Academy tier
  {
    id: 'mv_substitution',
    name: 'Substitution Jutsu',
    jutsuId: 'substitution',
    category: 'ninjutsu',
    nature: null,
    power: 20,
    accuracy: 100,
    chakraCost: 5,
    statusEffect: 'evasion_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 5,
    unlockLevel: 1,
    description: 'Dodge and boost evasion for 3 turns.',
  },

  // Genin tier
  {
    id: 'mv_shadowClone',
    name: 'Shadow Clone Jutsu',
    jutsuId: 'shadowClone',
    category: 'ninjutsu',
    nature: null,
    power: 35,
    accuracy: 95,
    chakraCost: 15,
    ultimateCharge: 10,
    unlockLevel: 10,
    description: 'Solid clones that attack independently.',
  },
  {
    id: 'mv_fireball',
    name: 'Fireball Jutsu',
    jutsuId: 'fireball',
    category: 'ninjutsu',
    nature: 'fire',
    power: 60,
    accuracy: 90,
    chakraCost: 20,
    statusEffect: 'burn',
    statusChance: 20,
    ultimateCharge: 12,
    unlockLevel: 14,
    description: 'A massive ball of fire. May burn the target.',
  },

  // Chūnin tier
  {
    id: 'mv_chidori',
    name: 'Chidori',
    jutsuId: 'chidori',
    category: 'ninjutsu',
    nature: 'lightning',
    power: 80,
    accuracy: 85,
    chakraCost: 25,
    statusEffect: 'paralysis',
    statusChance: 25,
    ultimateCharge: 15,
    unlockLevel: 22,
    description: 'A piercing lightning strike. May paralyze.',
  },
  {
    id: 'mv_rasengan',
    name: 'Rasengan',
    jutsuId: 'rasengan',
    category: 'ninjutsu',
    nature: 'wind',
    power: 85,
    accuracy: 90,
    chakraCost: 25,
    ultimateCharge: 15,
    unlockLevel: 22,
    description: 'A spiraling sphere of pure chakra.',
  },
  {
    id: 'mv_waterDragon',
    name: 'Water Dragon',
    jutsuId: 'waterDragon',
    category: 'ninjutsu',
    nature: 'water',
    power: 75,
    accuracy: 85,
    chakraCost: 25,
    statusEffect: 'slow',
    statusChance: 30,
    ultimateCharge: 12,
    unlockLevel: 22,
    description: 'A massive water dragon. May slow.',
  },

  // Jōnin tier
  {
    id: 'mv_earthWall',
    name: 'Earth Wall',
    jutsuId: 'earthWall',
    category: 'ninjutsu',
    nature: 'earth',
    power: 45,
    accuracy: 95,
    chakraCost: 20,
    statusEffect: 'def_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 8,
    unlockLevel: 18,
    description: 'Raise a wall. Deals damage AND boosts your Def.',
  },
  {
    id: 'mv_phoenixFlower',
    name: 'Phoenix Flower',
    jutsuId: 'phoenixFlower',
    category: 'ninjutsu',
    nature: 'fire',
    power: 50,
    accuracy: 95,
    chakraCost: 18,
    statusEffect: 'burn',
    statusChance: 35,
    ultimateCharge: 10,
    unlockLevel: 16,
    description: 'Multiple small fireballs. High burn chance.',
  },
  {
    id: 'mv_windBlade',
    name: 'Vacuum Blade',
    jutsuId: 'windBlade',
    category: 'ninjutsu',
    nature: 'wind',
    power: 70,
    accuracy: 90,
    chakraCost: 22,
    statusEffect: 'guard_down',
    statusChance: 25,
    ultimateCharge: 12,
    unlockLevel: 18,
    description: 'An invisible wind slice. May lower enemy defenses.',
  },

  // ═══════════════════════════════════════════
  // NINJUTSU — ELEMENTAL STRIKES (generic, one per element)
  // These are the starter nature-affinity moves
  // ═══════════════════════════════════════════

  {
    id: 'mv_fire_strike',
    name: 'Fire Strike',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'fire',
    power: 40,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'burn',
    statusChance: 10,
    ultimateCharge: 8,
    unlockLevel: 1,
    description: 'A basic fire-infused attack. Starter move for fire nature.',
  },
  {
    id: 'mv_wind_slash',
    name: 'Wind Slash',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'wind',
    power: 40,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'guard_down',
    statusChance: 10,
    ultimateCharge: 8,
    unlockLevel: 1,
    description: 'A sharp gust of cutting wind. Starter move for wind nature.',
  },
  {
    id: 'mv_water_bullet',
    name: 'Water Bullet',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'water',
    power: 40,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'slow',
    statusChance: 10,
    ultimateCharge: 8,
    unlockLevel: 1,
    description: 'A pressurized water shot. Starter move for water nature.',
  },
  {
    id: 'mv_earth_spike',
    name: 'Earth Spike',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'earth',
    power: 40,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'slow',
    statusChance: 10,
    ultimateCharge: 8,
    unlockLevel: 1,
    description: 'A spike of earth erupts from below. Starter move for earth nature.',
  },
  {
    id: 'mv_lightning_jolt',
    name: 'Lightning Jolt',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'lightning',
    power: 40,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'paralysis',
    statusChance: 10,
    ultimateCharge: 8,
    unlockLevel: 1,
    description: 'A quick bolt of lightning. Starter move for lightning nature.',
  },

  // ═══════════════════════════════════════════
  // CLAN-SPECIFIC MOVES
  // Each clan gets a signature move usable from early levels
  // ═══════════════════════════════════════════

  // Uzumaki — Chakra Chains
  {
    id: 'mv_uzumaki_chains',
    name: 'Chakra Chains',
    jutsuId: null,
    category: 'ninjutsu',
    nature: null,
    power: 35,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'slow',
    statusChance: 40,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'uzumaki',
    description: 'Uzumaki sealing chains bind the target. May slow.',
  },
  // Uchiha — Sharingan Copy
  {
    id: 'mv_uchiha_copy',
    name: 'Sharingan Copy',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 35,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'focus',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'uchiha',
    description: 'Copy the opponent\'s stance. Boosts your accuracy.',
  },
  // Hyūga — Byakugan Palm
  {
    id: 'mv_hyuga_palm',
    name: 'Byakugan Palm',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 35,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'guard_down',
    statusChance: 30,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'hyuga',
    description: 'A precise chakra-infused palm strike. May lower defenses.',
  },
  // Nara — Shadow Bind
  {
    id: 'mv_nara_shadow',
    name: 'Shadow Possession',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'paralysis',
    statusChance: 50,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'nara',
    description: 'Bind the opponent with your shadow. May paralyze.',
  },
  // Aburame — Insect Drain
  {
    id: 'mv_aburame_insects',
    name: 'Insect Drain',
    jutsuId: null,
    category: 'ninjutsu',
    nature: null,
    power: 30,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'slow',
    statusChance: 35,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'aburame',
    description: 'Release kikaichū to drain enemy chakra. May slow.',
  },
  // Inuzuka — Fang Strike
  {
    id: 'mv_inuzuka_fang',
    name: 'Fang Strike',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 38,
    accuracy: 100,
    chakraCost: 5,
    ultimateCharge: 10,
    unlockLevel: 1,
    clanExclusive: 'inuzuka',
    description: 'A ferocious combo with your partner. Fast and reliable.',
  },
  // Akimichi — Body Slam
  {
    id: 'mv_akimichi_slam',
    name: 'Partial Expansion',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 38,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'slow',
    statusChance: 25,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'akimichi',
    description: 'Expand your fist for a crushing blow. May slow.',
  },
  // Hatake — White Light Blade
  {
    id: 'mv_hatake_blade',
    name: 'White Light Blade',
    jutsuId: null,
    category: 'taijutsu',
    nature: 'lightning',
    power: 38,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'paralysis',
    statusChance: 15,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'hatake',
    description: 'A lightning-fast saber strike. May paralyze.',
  },
  // Yamanaka — Mind Probe
  {
    id: 'mv_yamanaka_mind',
    name: 'Mind Probe',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 30,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'confusion',
    statusChance: 40,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'yamanaka',
    description: 'Invade the opponent\'s mind. May cause confusion.',
  },
  // Senju — Wood Release Sprout
  {
    id: 'mv_senju_wood',
    name: 'Wood Sprout',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'earth',
    power: 35,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'def_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 8,
    unlockLevel: 1,
    clanExclusive: 'senju',
    description: 'Grow wooden vines for protection. Boosts defense.',
  },

  // ═══════════════════════════════════════════
  // CLAN-SPECIFIC MID-TIER MOVES (unlock ~Lv 15-20)
  // ═══════════════════════════════════════════

  {
    id: 'mv_hyuga_8tri',
    name: '8 Trigrams: 32 Palms',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 65,
    accuracy: 88,
    chakraCost: 15,
    statusEffect: 'guard_down',
    statusChance: 50,
    ultimateCharge: 14,
    unlockLevel: 16,
    clanExclusive: 'hyuga',
    description: 'Rapid 32-strike combo shutting down chakra points.',
  },
  {
    id: 'mv_inuzuka_fangover',
    name: 'Fang Over Fang',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 65,
    accuracy: 85,
    chakraCost: 12,
    ultimateCharge: 14,
    unlockLevel: 16,
    clanExclusive: 'inuzuka',
    description: 'A devastating dual spinning attack with your partner.',
  },
  {
    id: 'mv_aburame_swarm',
    name: 'Insect Swarm',
    jutsuId: null,
    category: 'ninjutsu',
    nature: null,
    power: 55,
    accuracy: 90,
    chakraCost: 18,
    statusEffect: 'slow',
    statusChance: 50,
    ultimateCharge: 12,
    unlockLevel: 16,
    clanExclusive: 'aburame',
    description: 'A swarm of kikaichū engulfs the enemy. High slow chance.',
  },
  {
    id: 'mv_akimichi_expand',
    name: 'Full Body Expansion',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 70,
    accuracy: 85,
    chakraCost: 15,
    statusEffect: 'slow',
    statusChance: 40,
    ultimateCharge: 14,
    unlockLevel: 18,
    clanExclusive: 'akimichi',
    description: 'Expand to massive size and crush the opponent.',
  },
  {
    id: 'mv_yamanaka_transfer',
    name: 'Mind Transfer Jutsu',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 0,
    accuracy: 80,
    chakraCost: 20,
    statusEffect: 'confusion',
    statusChance: 100,
    ultimateCharge: 12,
    unlockLevel: 16,
    clanExclusive: 'yamanaka',
    description: 'Take control of the enemy mind. Guaranteed confusion on hit.',
  },
  {
    id: 'mv_nara_strangle',
    name: 'Shadow Strangle Jutsu',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 50,
    accuracy: 85,
    chakraCost: 18,
    statusEffect: 'paralysis',
    statusChance: 40,
    ultimateCharge: 12,
    unlockLevel: 18,
    clanExclusive: 'nara',
    description: 'Your shadow reaches out and squeezes the enemy.',
  },
  {
    id: 'mv_senju_woodwall',
    name: 'Wood Style: Great Forest',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'earth',
    power: 65,
    accuracy: 90,
    chakraCost: 20,
    statusEffect: 'slow',
    statusChance: 35,
    ultimateCharge: 12,
    unlockLevel: 18,
    clanExclusive: 'senju',
    description: 'Sprout a forest of wooden spears at the enemy.',
  },

  // ═══════════════════════════════════════════
  // GENJUTSU (uses SpAtk vs SpDef, debuffs)
  // ═══════════════════════════════════════════

  {
    id: 'mv_clone',
    name: 'Clone Technique',
    jutsuId: 'clone',
    category: 'genjutsu',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 5,
    statusEffect: 'confusion',
    statusChance: 40,
    ultimateCharge: 5,
    unlockLevel: 1,
    description: 'Illusory clones confuse the opponent.',
  },
  {
    id: 'mv_transformation',
    name: 'Transformation Jutsu',
    jutsuId: 'transformation',
    category: 'genjutsu',
    nature: null,
    power: 0,
    accuracy: 95,
    chakraCost: 5,
    statusEffect: 'blind',
    statusChance: 45,
    ultimateCharge: 5,
    unlockLevel: 1,
    description: 'Disguise lowers opponent accuracy.',
  },
  {
    id: 'mv_demonic_illusion',
    name: 'Demonic Illusion',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 25,
    accuracy: 80,
    chakraCost: 15,
    statusEffect: 'confusion',
    statusChance: 55,
    ultimateCharge: 10,
    unlockLevel: 14,
    description: 'A powerful illusion. Very high confusion chance.',
  },
  {
    id: 'mv_genjutsu_bind',
    name: 'Genjutsu: Binding',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 0,
    accuracy: 85,
    chakraCost: 12,
    statusEffect: 'paralysis',
    statusChance: 65,
    ultimateCharge: 8,
    unlockLevel: 10,
    description: 'Paralyze the opponent through illusion.',
  },

  // ═══════════════════════════════════════════
  // STATUS MOVES (buffs — target self)
  // ═══════════════════════════════════════════

  {
    id: 'mv_chakra_focus',
    name: 'Chakra Focus',
    jutsuId: null,
    category: 'status',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'spatk_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 5,
    unlockLevel: 1,
    description: 'Focus chakra. Boosts SpAtk by 50% for 3 turns.',
  },
  {
    id: 'mv_iron_body',
    name: 'Iron Body',
    jutsuId: null,
    category: 'status',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'def_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 5,
    unlockLevel: 1,
    description: 'Harden your body. Boosts Def by 50% for 3 turns.',
  },
  {
    id: 'mv_battle_cry',
    name: 'Battle Cry',
    jutsuId: null,
    category: 'status',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 8,
    statusEffect: 'atk_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 5,
    unlockLevel: 6,
    description: 'Pump yourself up. Boosts Atk by 50% for 3 turns.',
  },
  {
    id: 'mv_sharingan_focus',
    name: 'Sharingan Focus',
    jutsuId: null,
    category: 'status',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 12,
    statusEffect: 'focus',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 8,
    unlockLevel: 10,
    clanExclusive: 'uchiha',
    description: 'Sharpen your Sharingan. +30% accuracy for 3 turns. (Uchiha only)',
  },
  {
    id: 'mv_body_flicker',
    name: 'Body Flicker',
    jutsuId: null,
    category: 'status',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'speed_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 8,
    unlockLevel: 10,
    description: 'Boost speed for 3 turns. Attack first!',
  },
  {
    id: 'mv_chakra_shield',
    name: 'Chakra Shield',
    jutsuId: null,
    category: 'status',
    nature: null,
    power: 0,
    accuracy: 100,
    chakraCost: 10,
    statusEffect: 'spdef_up',
    statusChance: 100,
    selfTarget: true,
    ultimateCharge: 5,
    unlockLevel: 8,
    description: 'Wrap yourself in chakra. Boosts SpDef by 50% for 3 turns.',
  },

  // ═══════════════════════════════════════════
  // ULTIMATE MOVES — CLAN-SPECIFIC
  // Each clan gets its own ultimate. Rogues get generic ones.
  // Requires full ultimate bar + player level ≥ 20
  // ═══════════════════════════════════════════

  // Generic ultimates (available to all clans, or rogue)
  {
    id: 'mv_ult_rasenshuriken',
    name: 'Rasenshuriken',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'wind',
    power: 150,
    accuracy: 90,
    chakraCost: 40,
    isUltimate: true,
    statusEffect: 'guard_down',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'uzumaki',
    description: 'ULTIMATE: Wind-infused Rasengan. Devastating damage + guard break. (Uzumaki)',
  },
  {
    id: 'mv_ult_susanoo_strike',
    name: "Susano'o Strike",
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'fire',
    power: 150,
    accuracy: 85,
    chakraCost: 45,
    isUltimate: true,
    statusEffect: 'burn',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'uchiha',
    description: 'ULTIMATE: Manifest the spectral warrior. Fire damage + guaranteed burn. (Uchiha)',
  },
  {
    id: 'mv_ult_eight_gates',
    name: 'Gate of Death',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 150,
    accuracy: 95,
    chakraCost: 35,
    isUltimate: true,
    unlockLevel: 35,
    description: 'ULTIMATE: Open the 8th Gate. Insane physical damage. (Any clan)',
  },
  {
    id: 'mv_ult_tsukuyomi',
    name: 'Tsukuyomi',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 140,
    accuracy: 80,
    chakraCost: 40,
    isUltimate: true,
    statusEffect: 'confusion',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'uchiha',
    description: 'ULTIMATE: Trap opponent in an illusion world. Guaranteed confusion. (Uchiha)',
  },
  {
    id: 'mv_ult_lightning_blade',
    name: 'Lightning Blade',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'lightning',
    power: 145,
    accuracy: 88,
    chakraCost: 40,
    isUltimate: true,
    statusEffect: 'paralysis',
    statusChance: 80,
    unlockLevel: 35,
    clanExclusive: 'hatake',
    description: 'ULTIMATE: A perfected Chidori. Extreme piercing power. (Hatake)',
  },
  {
    id: 'mv_ult_water_vortex',
    name: 'Giant Water Vortex',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'water',
    power: 140,
    accuracy: 88,
    chakraCost: 40,
    isUltimate: true,
    statusEffect: 'slow',
    statusChance: 100,
    unlockLevel: 35,
    description: 'ULTIMATE: A massive whirlpool engulfs the battlefield. (Any clan)',
  },
  {
    id: 'mv_ult_earth_golem',
    name: 'Earth Style: Golem',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'earth',
    power: 140,
    accuracy: 92,
    chakraCost: 40,
    isUltimate: true,
    statusEffect: 'guard_down',
    statusChance: 80,
    unlockLevel: 35,
    description: 'ULTIMATE: Summon a massive earth golem to crush the enemy. (Any clan)',
  },

  // Clan-specific ultimates
  {
    id: 'mv_ult_hyuga_128',
    name: '8 Trigrams: 128 Palms',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 150,
    accuracy: 90,
    chakraCost: 35,
    isUltimate: true,
    statusEffect: 'guard_down',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'hyuga',
    description: 'ULTIMATE: The ultimate Gentle Fist barrage. 128 precision strikes. (Hyūga)',
  },
  {
    id: 'mv_ult_nara_shadow',
    name: 'Shadow Possession: Total Bind',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 120,
    accuracy: 95,
    chakraCost: 35,
    isUltimate: true,
    statusEffect: 'paralysis',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'nara',
    description: 'ULTIMATE: Complete shadow takeover. Guaranteed paralysis. (Nara)',
  },
  {
    id: 'mv_ult_aburame_plague',
    name: 'Insect Plague',
    jutsuId: null,
    category: 'ninjutsu',
    nature: null,
    power: 130,
    accuracy: 95,
    chakraCost: 35,
    isUltimate: true,
    statusEffect: 'slow',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'aburame',
    description: 'ULTIMATE: A massive insect swarm devours chakra. (Aburame)',
  },
  {
    id: 'mv_ult_inuzuka_fang',
    name: 'Wolf Fang Over Fang',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 145,
    accuracy: 88,
    chakraCost: 35,
    isUltimate: true,
    unlockLevel: 35,
    clanExclusive: 'inuzuka',
    description: 'ULTIMATE: An unstoppable dual-beast tornado. (Inuzuka)',
  },
  {
    id: 'mv_ult_akimichi_meteor',
    name: 'Butterfly Meteor Bomb',
    jutsuId: null,
    category: 'taijutsu',
    nature: null,
    power: 150,
    accuracy: 85,
    chakraCost: 40,
    isUltimate: true,
    unlockLevel: 35,
    clanExclusive: 'akimichi',
    description: 'ULTIMATE: Butterfly chakra mode. A colossal meteor strike. (Akimichi)',
  },
  {
    id: 'mv_ult_yamanaka_shatter',
    name: 'Mind Destruction Jutsu',
    jutsuId: null,
    category: 'genjutsu',
    nature: null,
    power: 135,
    accuracy: 85,
    chakraCost: 40,
    isUltimate: true,
    statusEffect: 'confusion',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'yamanaka',
    description: 'ULTIMATE: Shatter the enemy\'s psyche completely. (Yamanaka)',
  },
  {
    id: 'mv_ult_senju_deep_forest',
    name: 'Deep Forest Emergence',
    jutsuId: null,
    category: 'ninjutsu',
    nature: 'earth',
    power: 150,
    accuracy: 90,
    chakraCost: 45,
    isUltimate: true,
    statusEffect: 'slow',
    statusChance: 100,
    unlockLevel: 35,
    clanExclusive: 'senju',
    description: 'ULTIMATE: Sprout an entire forest. The 1st Hokage\'s signature. (Senju)',
  },
  {
    id: 'mv_ult_generic_rasengan',
    name: 'Giant Rasengan',
    jutsuId: null,
    category: 'ninjutsu',
    nature: null,
    power: 140,
    accuracy: 90,
    chakraCost: 40,
    isUltimate: true,
    unlockLevel: 35,
    description: 'ULTIMATE: A massive sphere of pure chakra. (Any clan)',
  },
];

// ── Lookup helpers ─────────────────────────────────────────────

const MOVE_BY_JUTSU = new Map<JutsuId, BattleMove>(
  MOVE_CATALOG.filter((m): m is BattleMove & { jutsuId: JutsuId } => m.jutsuId != null).map((m) => [m.jutsuId, m]),
);

const MOVE_BY_ID = new Map<string, BattleMove>(
  MOVE_CATALOG.map((m) => [m.id, m]),
);

export function getMoveForJutsu(jutsuId: JutsuId): BattleMove | undefined {
  return MOVE_BY_JUTSU.get(jutsuId);
}

export function getMoveById(id: string): BattleMove | undefined {
  return MOVE_BY_ID.get(id);
}

/** Get all non-jutsu non-ultimate moves, optionally filtered by category */
export function getGenericMoves(category?: MoveCategory): BattleMove[] {
  return MOVE_CATALOG.filter(
    (m) => m.jutsuId === null && !m.isUltimate && !m.clanExclusive && (category == null || m.category === category),
  );
}

/** Get all ultimate moves */
export function getUltimateMoves(): BattleMove[] {
  return MOVE_CATALOG.filter((m) => m.isUltimate);
}

/** Legacy: Get moves available based on unlocked jutsu (no level filtering) */
export function getAvailableMoves(unlockedJutsuIds: JutsuId[]): BattleMove[] {
  const jutsuMoves = unlockedJutsuIds
    .map((id) => MOVE_BY_JUTSU.get(id))
    .filter((m): m is BattleMove => m != null);
  const generic = getGenericMoves();
  return [...jutsuMoves, ...generic];
}

// ── Nature → starter elemental strike mapping ─────────────────

const NATURE_STARTER: Record<ChakraNature, string> = {
  fire: 'mv_fire_strike',
  wind: 'mv_wind_slash',
  water: 'mv_water_bullet',
  earth: 'mv_earth_spike',
  lightning: 'mv_lightning_jolt',
};

// ── Clan → starter clan move mapping ──────────────────────────

const CLAN_STARTER: Record<ClanId, string | null> = {
  uzumaki: 'mv_uzumaki_chains',
  uchiha: 'mv_uchiha_copy',
  hyuga: 'mv_hyuga_palm',
  nara: 'mv_nara_shadow',
  aburame: 'mv_aburame_insects',
  inuzuka: 'mv_inuzuka_fang',
  akimichi: 'mv_akimichi_slam',
  hatake: 'mv_hatake_blade',
  yamanaka: 'mv_yamanaka_mind',
  senju: 'mv_senju_wood',
  rogue: null,
};

/**
 * Get the auto-assigned starter moveset for a player.
 * Returns exactly 4 moves:
 *   1. Nature affinity elemental strike (or first available)
 *   2. Clan-specific starter (or Substitution if rogue)
 *   3. One status move (iron_body or chakra_focus depending on type)
 *   4. Taijutsu Strike
 */
export function getStarterMoves(profile: PlayerProfile): BattleMove[] {
  const moves: BattleMove[] = [];

  // 1. Nature affinity strike
  const natId = NATURE_STARTER[profile.chakraNature];
  const natMove = MOVE_BY_ID.get(natId);
  if (natMove) moves.push(natMove);

  // 2. Clan-specific starter (or substitution for rogue)
  const clanId = CLAN_STARTER[profile.clan];
  if (clanId) {
    const clanMove = MOVE_BY_ID.get(clanId);
    if (clanMove) moves.push(clanMove);
  } else {
    // Rogue gets Substitution as 2nd move
    const sub = MOVE_BY_ID.get('mv_substitution');
    if (sub) moves.push(sub);
  }

  // 3. Status move — taijutsu type gets battle_cry, ninjutsu gets chakra_focus, genjutsu gets iron_body
  const statusId = profile.ninjaType === 'taijutsu' ? 'mv_iron_body'
    : profile.ninjaType === 'ninjutsu' ? 'mv_chakra_focus'
    : 'mv_iron_body';
  const statusMove = MOVE_BY_ID.get(statusId);
  if (statusMove) moves.push(statusMove);

  // 4. Taijutsu Strike (always)
  const punch = MOVE_BY_ID.get('mv_punch');
  if (punch) moves.push(punch);

  return moves;
}

/**
 * Get all moves a player can access based on their level, clan, and nature.
 * Filters by:
 *   - unlockLevel <= player level
 *   - clanExclusive matches player clan (or no exclusivity)
 *   - jutsu-linked moves require the jutsu to be unlocked
 *   - ultimates require level >= ULTIMATE_UNLOCK_LEVEL
 */
export function getMovesForProfile(profile: PlayerProfile): BattleMove[] {
  const level = getPlayerLevel(profile.xp);
  const unlockedJutsuIds = new Set(
    profile.jutsuProgress.filter((j) => j.unlocked).map((j) => j.jutsuId),
  );

  return MOVE_CATALOG.filter((move) => {
    // Level gate
    const reqLevel = move.unlockLevel ?? 1;
    if (level < reqLevel) return false;

    // Ultimate gate
    if (move.isUltimate && level < ULTIMATE_UNLOCK_LEVEL) return false;

    // Clan exclusivity
    if (move.clanExclusive && move.clanExclusive !== profile.clan) return false;

    // Jutsu-linked moves need the jutsu unlocked
    if (move.jutsuId && !unlockedJutsuIds.has(move.jutsuId)) return false;

    return true;
  });
}

/**
 * Get all moves in the catalog relevant to this clan/nature,
 * marking which ones are locked vs unlocked for the given level.
 * Used for the setup page to show "Unlocks at Lv X" labels.
 */
export function getAllMovesWithLockStatus(profile: PlayerProfile): Array<BattleMove & { locked: boolean; requiredLevel: number }> {
  const level = getPlayerLevel(profile.xp);
  const unlockedJutsuIds = new Set(
    profile.jutsuProgress.filter((j) => j.unlocked).map((j) => j.jutsuId),
  );

  return MOVE_CATALOG
    .filter((move) => {
      // Filter out moves from other clans
      if (move.clanExclusive && move.clanExclusive !== profile.clan) return false;
      // Filter out jutsu-linked moves for unlearned jutsu
      if (move.jutsuId && !unlockedJutsuIds.has(move.jutsuId)) return false;
      return true;
    })
    .map((move) => {
      const reqLevel = move.unlockLevel ?? 1;
      const locked = level < reqLevel || (move.isUltimate && level < ULTIMATE_UNLOCK_LEVEL);
      return { ...move, locked, requiredLevel: move.isUltimate ? Math.max(reqLevel, ULTIMATE_UNLOCK_LEVEL) : reqLevel };
    })
    .sort((a, b) => {
      // Unlocked first, then by requiredLevel
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      return a.requiredLevel - b.requiredLevel;
    });
}
