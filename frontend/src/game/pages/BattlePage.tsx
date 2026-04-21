import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleStore } from '../battle';
import { useGameStore } from '../useGameStore';
import { getPlayerLevel, ULTIMATE_UNLOCK_LEVEL } from '../battle/types';
import type { BattleMove } from '../battle';

const NATURE_ICON: Record<string, string> = {
  fire: '🔥', wind: '🌬️', water: '🌊', earth: '🪨', lightning: '⚡',
};

const CATEGORY_ICON: Record<string, string> = {
  ninjutsu: '🔥', taijutsu: '👊', genjutsu: '🌀', status: '✨',
};

const STATUS_ICON: Record<string, string> = {
  burn: '🔥', paralysis: '⚡', confusion: '💫', slow: '🐢', blind: '🌫️', guard_down: '🛡️↓',
  atk_up: '⚔️↑', def_up: '🛡️↑', spatk_up: '🔮↑', spdef_up: '💠↑',
  speed_up: '💨↑', focus: '🎯', evasion_up: '👤↑',
};

function HpBar({ current, max, side }: { current: number; max: number; side: 'player' | 'opponent' }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? 'var(--hud-success)' : pct > 20 ? 'var(--hud-warning, #ffcc00)' : 'var(--hud-danger, #ff4444)';
  return (
    <div className={`battle-hp-bar-wrap battle-hp-${side}`}>
      <div className="battle-hp-track">
        <div className="battle-hp-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="battle-hp-text">{current} / {max}</span>
    </div>
  );
}

function ChakraBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <div className="battle-chakra-bar-wrap">
      <div className="battle-chakra-track">
        <div className="battle-chakra-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="battle-chakra-text">Chakra {current}/{max}</span>
    </div>
  );
}

function UltimateBar({ charge }: { charge: number }) {
  const pct = Math.min(100, Math.max(0, charge));
  const ready = pct >= 100;
  return (
    <div className="battle-ult-bar-wrap">
      <div className="battle-ult-track">
        <div
          className={`battle-ult-fill${ready ? ' battle-ult-ready' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="battle-ult-text">
        {ready ? '⚡ ULTIMATE READY!' : `ULT ${Math.round(pct)}%`}
      </span>
    </div>
  );
}

function FighterCrest({ clanImage, eyeAbility }: { clanImage?: string; eyeAbility?: string }) {
  if (!clanImage && !eyeAbility) return null;
  return (
    <div className="battle-crest-row">
      {clanImage && <img src={clanImage} alt="clan" className="battle-clan-icon" />}
      {eyeAbility && <img src={eyeAbility} alt="eye" className="battle-eye-icon" />}
    </div>
  );
}

export function BattlePage() {
  const navigate = useNavigate();
  const phase = useBattleStore((s: any) => s.phase);
  const mode = useBattleStore((s: any) => s.mode);
  const player = useBattleStore((s: any) => s.player);
  const opponent = useBattleStore((s: any) => s.opponent);
  const turnCount = useBattleStore((s: any) => s.turnCount);
  const log = useBattleStore((s: any) => s.log);
  const xpEarned = useBattleStore((s: any) => s.xpEarned);
  const playerAttack = useBattleStore((s: any) => s.playerAttack);
  const localPvpAttack = useBattleStore((s: any) => s.localPvpAttack);
  const playerReplenish = useBattleStore((s: any) => s.playerReplenish);
  const localPvpReplenish = useBattleStore((s: any) => s.localPvpReplenish);
  const localPvpTurn = useBattleStore((s: any) => s.localPvpTurn);
  const battlefield = useBattleStore((s: any) => s.battlefield);
  const resetBattle = useBattleStore((s: any) => s.resetBattle);
  const addXP = useGameStore((s: any) => s.addXP);
  const profile = useGameStore((s: any) => s.profile);
  const xpClaimed = useRef(false);

  const playerLevel = profile ? getPlayerLevel(profile.xp) : 1;
  const ultUnlocked = playerLevel >= ULTIMATE_UNLOCK_LEVEL;

  const logEndRef = useRef<HTMLDivElement>(null);

  const isLocalPvp = mode === 'local_pvp';

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  // Start battle on mount
  useEffect(() => {
    if (phase === 'ready') {
      useBattleStore.setState({ phase: 'player_turn' });
    }
  }, [phase]);

  // Award XP on battle end (PvE only)
  useEffect(() => {
    if ((phase === 'won' || phase === 'lost') && xpEarned > 0 && !xpClaimed.current) {
      xpClaimed.current = true;
      addXP(xpEarned);
    }
  }, [phase, xpEarned, addXP]);

  if (!player || !opponent) {
    return (
      <div className="game-page battle-page">
        <div className="page-header">
          <h1 className="page-title">NO BATTLE ACTIVE</h1>
          <button className="g-btn" onClick={() => navigate('/battle-setup')}>
            GO TO SETUP
          </button>
        </div>
      </div>
    );
  }

  const canAct = phase === 'player_turn';

  // In local PvP, the active fighter's moves are shown
  const activeFighter = isLocalPvp && localPvpTurn === 'player2' ? opponent : player;
  const activeName = isLocalPvp
    ? (localPvpTurn === 'player1' ? player.name : opponent.name)
    : player.name;

  const onMoveClick = (move: BattleMove) => {
    if (!canAct) return;
    if (isLocalPvp) {
      localPvpAttack(move);
    } else {
      playerAttack(move);
    }
  };

  const onReplenish = () => {
    if (!canAct) return;
    if (isLocalPvp) {
      localPvpReplenish();
    } else {
      playerReplenish();
    }
  };

  const onBackToSetup = () => {
    resetBattle();
    navigate('/battle-setup');
  };

  // Victory label depends on mode
  const winLabel = isLocalPvp
    ? `${player.hp > 0 ? player.name : opponent.name} WINS!`
    : phase === 'won' ? 'VICTORY!' : 'DEFEATED';

  return (
    <div className="game-page battle-page">
      {/* ── Battlefield background ── */}
      <div
        className="battle-battlefield-bg"
        style={{
          backgroundImage: `url("${battlefield}")`,
        }}
      />

      {/* ── Arena ── */}
      <div className="battle-arena">
        {/* Opponent panel (top) */}
        <div className="battle-fighter-panel battle-opponent-panel">
          <FighterCrest clanImage={opponent.clanImage} eyeAbility={opponent.eyeAbility} />
          <div className="battle-fighter-info">
            <span className="battle-fighter-name">{opponent.name}</span>
            <span className="battle-fighter-nature">
              {NATURE_ICON[opponent.chakraNature]} {opponent.rank.toUpperCase()}
            </span>
          </div>
          <HpBar current={opponent.hp} max={opponent.stats.maxHp} side="opponent" />
          <ChakraBar current={opponent.chakra} max={opponent.maxChakra} />
          {ultUnlocked && <UltimateBar charge={opponent.ultimateCharge ?? 0} />}
          <div className="battle-statuses">
            {opponent.statuses.map((s, i) => (
              <span key={i} className="battle-status-badge" title={`${s.effect} (${s.turnsLeft} turns)`}>
                {STATUS_ICON[s.effect] ?? '❓'} {s.turnsLeft}
              </span>
            ))}
          </div>
        </div>

        {/* VS + turn counter */}
        <div className="battle-vs-center">
          <span className="battle-turn-badge">TURN {turnCount}</span>
          {isLocalPvp && canAct && (
            <div className="battle-pvp-turn-indicator">
              ⚔️ {activeName}'s TURN
            </div>
          )}
          {(phase === 'won' || phase === 'lost') && (
            <div className={`battle-result ${phase === 'won' ? 'battle-result-win' : 'battle-result-lose'}`}>
              {winLabel}
            </div>
          )}
        </div>

        {/* Player panel (bottom) */}
        <div className="battle-fighter-panel battle-player-panel">
          <FighterCrest clanImage={player.clanImage} eyeAbility={player.eyeAbility} />
          <div className="battle-fighter-info">
            <span className="battle-fighter-name">{player.name}</span>
            <span className="battle-fighter-nature">
              {NATURE_ICON[player.chakraNature]} {player.rank.toUpperCase()}
            </span>
          </div>
          <HpBar current={player.hp} max={player.stats.maxHp} side="player" />
          <ChakraBar current={player.chakra} max={player.maxChakra} />
          {ultUnlocked && <UltimateBar charge={player.ultimateCharge ?? 0} />}
          <div className="battle-statuses">
            {player.statuses.map((s, i) => (
              <span key={i} className="battle-status-badge" title={`${s.effect} (${s.turnsLeft} turns)`}>
                {STATUS_ICON[s.effect] ?? '❓'} {s.turnsLeft}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Move buttons / End screen ── */}
      <div className="battle-controls">
        {(phase === 'won' || phase === 'lost') ? (
          <div className="battle-end-panel">
            {xpEarned > 0 && <div className="battle-xp-reward">+{xpEarned} XP</div>}
            {isLocalPvp && <div className="battle-xp-reward" style={{ fontSize: '1rem' }}>Good match!</div>}
            <button className="g-btn g-btn--accent" onClick={onBackToSetup}>
              BACK TO SETUP
            </button>
            <button className="g-btn" onClick={() => navigate('/dashboard')}>
              DASHBOARD
            </button>
          </div>
        ) : (
          <div className="battle-move-buttons">
            {activeFighter.moves.map((move) => {
              const affordable = activeFighter.chakra >= move.chakraCost;
              const ultLocked = move.isUltimate && ((activeFighter.ultimateCharge ?? 0) < 100 || !ultUnlocked);
              const disabled = !canAct || !affordable || ultLocked;
              return (
                <button
                  key={move.id}
                  type="button"
                  className={`battle-action-btn${!affordable || ultLocked ? ' disabled' : ''}${move.isUltimate ? ' battle-action-ultimate' : ''}`}
                  disabled={disabled}
                  onClick={() => onMoveClick(move)}
                  title={ultLocked ? (ultUnlocked ? 'Ultimate bar not full!' : `Unlocks at Lv ${ULTIMATE_UNLOCK_LEVEL}`) : move.description}
                >
                  <span className="battle-action-name">
                    {move.isUltimate ? '⚡' : CATEGORY_ICON[move.category] ?? '✨'} {move.name}
                  </span>
                  <span className="battle-action-meta">
                    {move.isUltimate ? 'ULT' : move.power > 0 ? `PWR ${move.power}` : 'BUFF'}
                    {' · '}
                    {move.chakraCost > 0 ? `CHK ${move.chakraCost}` : 'FREE'}
                    {move.nature ? ` · ${NATURE_ICON[move.nature]}` : ''}
                  </span>
                </button>
              );
            })}
            {/* Replenish Chakra — always visible as a 5th action */}
            <button
              type="button"
              className={`battle-action-btn battle-action-replenish${activeFighter.chakra >= activeFighter.maxChakra ? ' disabled' : ''}`}
              disabled={!canAct || activeFighter.chakra >= activeFighter.maxChakra}
              onClick={onReplenish}
              title="Skip your turn to restore ~35% chakra"
            >
              <span className="battle-action-name">🔋 Replenish Chakra</span>
              <span className="battle-action-meta">SKIP TURN · +35% CHK</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Battle log ── */}
      <div className="battle-log">
        <div className="battle-log-title">BATTLE LOG</div>
        <div className="battle-log-scroll">
          {log.map((entry, i) => (
            <div
              key={i}
              className={`battle-log-entry battle-log-${entry.attacker}${
                entry.isUltimate ? ' battle-log-ultimate' :
                entry.effectiveness === 'super' ? ' battle-log-super' :
                entry.effectiveness === 'resisted' ? ' battle-log-resisted' :
                entry.effectiveness === 'miss' ? ' battle-log-miss' : ''
              }`}
            >
              <span className="battle-log-turn">T{entry.turn}</span>
              <span className="battle-log-msg">{entry.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
