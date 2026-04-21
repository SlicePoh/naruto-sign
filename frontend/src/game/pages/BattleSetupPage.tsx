import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { useBattleStore } from '../battle';
import { getMovesForProfile, getAllMovesWithLockStatus, getStarterMoves } from '../battle/moveCatalog';
import { getPlayerLevel, ULTIMATE_UNLOCK_LEVEL } from '../battle/types';
import type { BattleMove, AIDifficulty } from '../battle';
import { NATURE_WEAKNESS, NATURE_STRENGTH } from '../battle';

type SetupMode = 'pve' | 'local_pvp' | 'online_pvp';

const MODE_TABS: { id: SetupMode; label: string; icon: string; desc: string }[] = [
  { id: 'pve', label: 'VS NPC', icon: '🤖', desc: 'Fight AI opponents' },
  { id: 'local_pvp', label: 'LOCAL PVP', icon: '🎮', desc: 'Same device, take turns' },
  { id: 'online_pvp', label: 'ONLINE PVP', icon: '🌐', desc: 'Fight via room code' },
];

const DIFFICULTIES: { id: AIDifficulty; label: string; desc: string }[] = [
  { id: 'academy', label: 'Academy', desc: 'Fresh students. Good for learning.' },
  { id: 'genin', label: 'Genin', desc: 'Entry-level shinobi. A fair fight.' },
  { id: 'chunin', label: 'Chūnin', desc: 'Experienced fighters. Bring your best.' },
  { id: 'jonin', label: 'Jōnin', desc: 'Elite ninja. Mistakes will cost you.' },
  { id: 'kage', label: 'Kage', desc: 'Legendary opponents. Only the best survive.' },
];

const CATEGORY_ICON: Record<string, string> = {
  ninjutsu: '🔥',
  taijutsu: '👊',
  genjutsu: '🌀',
};

const NATURE_ICON: Record<string, string> = {
  fire: '🔥', wind: '🌬️', water: '🌊', earth: '🪨', lightning: '⚡',
};

export function BattleSetupPage() {
  const profile = useGameStore((s) => s.profile);
  const initPveBattle = useBattleStore((s) => s.initPveBattle);
  const initLocalPvp = useBattleStore((s) => s.initLocalPvp);
  const createRoom = useBattleStore((s) => s.createRoom);
  const joinRoom = useBattleStore((s) => s.joinRoom);
  const room = useBattleStore((s) => s.room);
  const onlineStatus = useBattleStore((s) => s.onlineStatus);
  const navigate = useNavigate();

  const [mode, setMode] = useState<SetupMode>('pve');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('genin');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Local PvP state
  const [p2Name, setP2Name] = useState('Player 2');
  const [p2Selected, setP2Selected] = useState<Set<string>>(new Set());
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);

  // Online PvP state
  const [roomCode, setRoomCode] = useState('');

  const available = useMemo(() => {
    if (!profile) return [];
    return getAllMovesWithLockStatus(profile);
  }, [profile]);

  const starterMoves = useMemo(() => {
    if (!profile) return [];
    return getStarterMoves(profile);
  }, [profile]);

  const playerLevel = profile ? getPlayerLevel(profile.xp) : 1;

  if (!profile) return null;

  const currentSelected = activePlayer === 1 ? selected : p2Selected;
  const setCurrentSelected = activePlayer === 1 ? setSelected : setP2Selected;

  const toggleMove = (move: BattleMove & { locked: boolean }) => {
    if (move.locked) return;
    setCurrentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(move.id)) {
        next.delete(move.id);
      } else if (next.size < 4) {
        next.add(move.id);
      }
      return next;
    });
  };

  const padMoves = (sel: Set<string>): BattleMove[] => {
    const unlocked = available.filter((m) => !m.locked);
    const moves = unlocked.filter((m) => sel.has(m.id));
    while (moves.length < 4) {
      const punch = unlocked.find((m) => m.id === 'mv_punch');
      if (punch && !moves.find((m) => m.id === punch.id)) {
        moves.push(punch);
      } else break;
    }
    return moves;
  };

  const useStarter = () => {
    const ids = new Set(starterMoves.map((m) => m.id));
    if (activePlayer === 1) setSelected(ids);
    else setP2Selected(ids);
  };

  const startBattle = () => {
    const moves = padMoves(selected);
    if (moves.length < 1) return;

    if (mode === 'pve') {
      initPveBattle(profile, moves, difficulty);
      navigate('/battle');
    } else if (mode === 'local_pvp') {
      const moves2 = padMoves(p2Selected);
      // Build a guest profile-like object with same shape
      const p2Profile = {
        ...profile,
        name: p2Name,
        jutsuProgress: profile.jutsuProgress.map((j) => ({ ...j })),
      };
      initLocalPvp(profile, moves, p2Name, moves2, p2Profile);
      navigate('/battle');
    } else if (mode === 'online_pvp') {
      createRoom(profile, moves);
    }
  };

  const handleJoinRoom = () => {
    if (roomCode.length < 4) return;
    const moves = padMoves(selected);
    joinRoom(roomCode, profile, moves);
    navigate('/battle');
  };

  const getMastery = (jutsuId: string | null) => {
    if (!jutsuId) return 100;
    return profile.jutsuProgress.find((j) => j.jutsuId === jutsuId)?.mastery ?? 0;
  };

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">BATTLE PREPARATION</h1>
        <p className="page-subtitle">Choose your mode, moves, and enter the arena</p>
      </div>

      <div className="page-body">
        {/* ── Mode tabs ── */}
        <div className="g-card">
          <div className="g-card-title">BATTLE MODE</div>
          <div className="g-grid-3 battle-mode-grid">
            {MODE_TABS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`select-card battle-mode-card${mode === m.id ? ' selected' : ''}`}
                onClick={() => { setMode(m.id); setActivePlayer(1); }}
              >
                <div style={{ fontSize: '1.6rem' }}>{m.icon}</div>
                <div className="select-card-label">{m.label}</div>
                <div className="select-card-desc">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Type info */}
        <div className="g-card battle-type-info">
          <div className="g-card-title">YOUR COMBAT PROFILE</div>
          <div className="g-grid-3" style={{ gap: 12 }}>
            <div className="stat-row">
              <span className="stat-label">Nature</span>
              <span className="stat-value--accent">
                {NATURE_ICON[profile.chakraNature]} {profile.chakraNature.toUpperCase()}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Strong vs</span>
              <span className="stat-value" style={{ color: 'var(--hud-success)' }}>
                {NATURE_ICON[NATURE_STRENGTH[profile.chakraNature]]} {NATURE_STRENGTH[profile.chakraNature].toUpperCase()}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Weak to</span>
              <span className="stat-value" style={{ color: 'var(--hud-danger, #ff4444)' }}>
                {NATURE_ICON[NATURE_WEAKNESS[profile.chakraNature]]} {NATURE_WEAKNESS[profile.chakraNature].toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty — PvE only */}
        {mode === 'pve' && (
          <div className="g-card">
            <div className="g-card-title">OPPONENT DIFFICULTY</div>
            <div className="g-grid-5 battle-diff-grid">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`select-card battle-diff-card${difficulty === d.id ? ' selected' : ''}`}
                  onClick={() => setDifficulty(d.id)}
                >
                  <div className="select-card-label">{d.label}</div>
                  <div className="select-card-desc">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Local PvP: Player 2 name */}
        {mode === 'local_pvp' && (
          <div className="g-card">
            <div className="g-card-title">LOCAL MATCH SETUP</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="stat-label" style={{ minWidth: 100 }}>Player 2 Name:</label>
              <input
                type="text"
                className="g-input"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value || 'Player 2')}
                placeholder="Player 2"
                style={{ flex: 1, maxWidth: 260 }}
              />
            </div>
            <div className="battle-player-toggle" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                className={`g-btn${activePlayer === 1 ? ' g-btn--accent' : ''}`}
                onClick={() => setActivePlayer(1)}
              >
                {profile.name}'s Moves ({selected.size}/4)
              </button>
              <button
                className={`g-btn${activePlayer === 2 ? ' g-btn--accent' : ''}`}
                onClick={() => setActivePlayer(2)}
              >
                {p2Name}'s Moves ({p2Selected.size}/4)
              </button>
            </div>
          </div>
        )}

        {/* Online PvP controls */}
        {mode === 'online_pvp' && (
          <div className="g-card">
            <div className="g-card-title">ONLINE BATTLE</div>
            {onlineStatus === 'waiting' && room ? (
              <div className="battle-room-info">
                <p style={{ color: 'var(--hud-success)', marginBottom: 8 }}>Room created! Share this code:</p>
                <div className="battle-room-code">{room.roomCode}</div>
                <p className="select-card-desc">Waiting for opponent to join...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p className="select-card-desc" style={{ marginBottom: 8 }}>Create a new room or join an existing one</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="g-input"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter room code"
                      maxLength={6}
                      style={{ flex: 1, letterSpacing: 4, textTransform: 'uppercase' }}
                    />
                    <button
                      className="g-btn"
                      disabled={roomCode.length < 4}
                      onClick={handleJoinRoom}
                    >
                      JOIN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Move selection */}
        <div className="g-card">
          <div className="g-card-title">
            {mode === 'local_pvp'
              ? `${activePlayer === 1 ? profile.name : p2Name}'s MOVES (${currentSelected.size}/4)`
              : `SELECT MOVES (${selected.size}/4)`
            }
            <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--hud-primary)', fontFamily: 'Share Tech Mono' }}>
              LV {playerLevel}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <p className="select-card-desc" style={{ margin: 0, flex: 1 }}>
              Pick up to 4 moves for battle. Locked moves unlock as you level up.
            </p>
            <button
              type="button"
              className="g-btn"
              style={{ fontSize: '0.7rem', padding: '4px 10px' }}
              onClick={useStarter}
            >
              AUTO-PICK STARTER
            </button>
          </div>

          <div className="battle-move-grid">
            {available.map((move) => {
              const isSelected = currentSelected.has(move.id);
              const mastery = getMastery(move.jutsuId);
              const maxedOut = currentSelected.size >= 4 && !isSelected;
              const isLocked = move.locked;
              return (
                <button
                  key={move.id}
                  type="button"
                  className={`battle-move-card${isSelected ? ' selected' : ''}${maxedOut || isLocked ? ' locked' : ''}`}
                  onClick={() => !maxedOut && !isLocked && toggleMove(move)}
                  disabled={maxedOut || isLocked}
                  style={isLocked ? { opacity: 0.45, filter: 'grayscale(0.7)' } : undefined}
                >
                  <div className="battle-move-header">
                    <span className="battle-move-name">
                      {isLocked ? '🔒 ' : ''}{move.name}
                    </span>
                    <span className="battle-move-cat">
                      {CATEGORY_ICON[move.category]} {move.category}
                    </span>
                  </div>

                  {isLocked ? (
                    <div className="battle-move-stats" style={{ color: 'var(--hud-accent)' }}>
                      <span className="battle-move-stat">UNLOCKS LV {move.requiredLevel}</span>
                    </div>
                  ) : (
                    <div className="battle-move-stats">
                      {move.power > 0 && (
                        <span className="battle-move-stat">PWR {move.power}</span>
                      )}
                      <span className="battle-move-stat">ACC {move.accuracy}</span>
                      <span className="battle-move-stat">
                        {move.chakraCost > 0 ? `CHK ${move.chakraCost}` : 'FREE'}
                      </span>
                      {move.nature && (
                        <span className="battle-move-stat">
                          {NATURE_ICON[move.nature]}
                        </span>
                      )}
                    </div>
                  )}

                  {!isLocked && move.statusEffect && move.statusEffect !== 'none' && (
                    <div className="battle-move-status">
                      {move.statusEffect.toUpperCase()} ({move.statusChance}%)
                    </div>
                  )}

                  {!isLocked && move.isUltimate && (
                    <div className="battle-move-status" style={{ color: 'var(--hud-accent)' }}>
                      ⚡ ULTIMATE
                    </div>
                  )}

                  {!isLocked && move.clanExclusive && (
                    <div className="battle-move-status" style={{ color: 'var(--hud-primary)', fontSize: '0.65rem' }}>
                      CLAN EXCLUSIVE
                    </div>
                  )}

                  {!isLocked && move.jutsuId && (
                    <div className="battle-move-mastery">
                      <div className="g-progress" style={{ flex: 1 }}>
                        <div
                          className="g-progress-fill"
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                      <span style={{ fontSize: '0.7rem' }}>{mastery}%</span>
                    </div>
                  )}

                  <div className="battle-move-desc">{move.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start button */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'online_pvp' && onlineStatus !== 'waiting' ? (
            <button
              type="button"
              className="g-btn g-btn--accent battle-start-btn"
              disabled={selected.size < 1}
              onClick={startBattle}
            >
              CREATE ROOM
            </button>
          ) : mode !== 'online_pvp' ? (
            <button
              type="button"
              className="g-btn g-btn--accent battle-start-btn"
              disabled={mode === 'local_pvp' ? (selected.size < 1 || p2Selected.size < 1) : selected.size < 1}
              onClick={startBattle}
            >
              {mode === 'local_pvp' ? 'START LOCAL BATTLE' : 'ENTER THE ARENA'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
