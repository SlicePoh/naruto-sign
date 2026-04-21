import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { useBattleStore } from '../battle';
import { getMovesForProfile, getStarterMoves } from '../battle/moveCatalog';
import type { BattleMove } from '../battle';

const NATURE_ICON: Record<string, string> = {
  fire: '🔥', wind: '🌬️', water: '🌊', earth: '🪨', lightning: '⚡',
};

export function OnlineLobbyPage() {
  const profile = useGameStore((s) => s.profile);
  const room = useBattleStore((s) => s.room);
  const onlineStatus = useBattleStore((s) => s.onlineStatus);
  const createRoom = useBattleStore((s) => s.createRoom);
  const joinRoom = useBattleStore((s) => s.joinRoom);
  const onOpponentJoined = useBattleStore((s) => s.onOpponentJoined);
  const resetBattle = useBattleStore((s) => s.resetBattle);
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick-select: use starter moves or first 4 available
  const selectedMoves: BattleMove[] = (() => {
    if (!profile) return [];
    const starter = getStarterMoves(profile);
    if (starter.length >= 4) return starter;
    return getMovesForProfile(profile).slice(0, 4);
  })();

  // If connected, navigate to battle
  useEffect(() => {
    if (onlineStatus === 'connected') {
      navigate('/battle');
    }
  }, [onlineStatus, navigate]);

  if (!profile) return null;

  const handleCreate = () => {
    createRoom(profile, selectedMoves);
  };

  const handleJoin = () => {
    if (roomCode.length < 4) return;
    joinRoom(roomCode, profile, selectedMoves);
  };

  const copyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simulate opponent joining (for demo/local testing)
  const simulateJoin = () => {
    if (!room) return;
    const guestFighter = {
      name: 'Guest Shinobi',
      fighter: {
        name: 'Guest Shinobi',
        rank: profile.rank,
        ninjaType: profile.ninjaType,
        clan: profile.clan,
        chakraNature: (['fire', 'wind', 'water', 'earth', 'lightning'] as const)[Math.floor(Math.random() * 5)],
        stats: { maxHp: 200, attack: 40, defense: 35, ninjutsu: 45, resistance: 35, speed: 40 },
        moves: selectedMoves,
        maxChakra: 100,
        hp: 200,
        chakra: 100,
        statuses: [],
      },
    };
    onOpponentJoined(guestFighter);
  };

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">ONLINE BATTLE LOBBY</h1>
        <p className="page-subtitle">Create a room or join one to fight another shinobi</p>
      </div>

      <div className="page-body">
        {/* Status */}
        {onlineStatus === 'idle' && (
          <div className="g-grid-2" style={{ gap: 16 }}>
            {/* Create room */}
            <div className="g-card" style={{ textAlign: 'center' }}>
              <div className="g-card-title">HOST A FIGHT</div>
              <p className="select-card-desc" style={{ marginBottom: 16 }}>
                Create a room and share the code with your opponent
              </p>
              <button className="g-btn g-btn--accent" onClick={handleCreate}>
                CREATE ROOM
              </button>
            </div>

            {/* Join room */}
            <div className="g-card" style={{ textAlign: 'center' }}>
              <div className="g-card-title">JOIN A FIGHT</div>
              <p className="select-card-desc" style={{ marginBottom: 16 }}>
                Enter a room code to challenge another shinobi
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <input
                  type="text"
                  className="g-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  style={{ maxWidth: 160, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase' }}
                />
                <button className="g-btn" disabled={roomCode.length < 4} onClick={handleJoin}>
                  JOIN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waiting for opponent */}
        {onlineStatus === 'waiting' && room && (
          <div className="g-card" style={{ textAlign: 'center' }}>
            <div className="g-card-title">WAITING FOR OPPONENT</div>
            <p className="select-card-desc" style={{ marginBottom: 16 }}>
              Share this code with your friend to start the battle
            </p>
            <div className="battle-room-code" style={{ fontSize: '2.5rem', letterSpacing: 8, margin: '24px 0' }}>
              {room.roomCode}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="g-btn" onClick={copyCode}>
                {copied ? '✅ COPIED!' : '📋 COPY CODE'}
              </button>
              <button className="g-btn" onClick={simulateJoin} style={{ opacity: 0.7 }}>
                🤖 SIMULATE OPPONENT (DEMO)
              </button>
              <button className="g-btn" onClick={() => { resetBattle(); }} style={{ opacity: 0.6 }}>
                CANCEL
              </button>
            </div>

            {/* Room info */}
            <div className="g-card" style={{ marginTop: 24, textAlign: 'left' }}>
              <div className="stat-row">
                <span className="stat-label">Host</span>
                <span className="stat-value">{room.host.name}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Nature</span>
                <span className="stat-value">
                  {NATURE_ICON[room.host.fighter.chakraNature]} {room.host.fighter.chakraNature.toUpperCase()}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Battlefield</span>
                <span className="stat-value" style={{ fontSize: '0.75rem' }}>
                  {room.battlefield.split('/').pop()?.replace('.jpg', '')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Back button */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="g-btn" onClick={() => navigate('/battle-setup')}>
            ← BACK TO SETUP
          </button>
        </div>
      </div>
    </div>
  );
}
