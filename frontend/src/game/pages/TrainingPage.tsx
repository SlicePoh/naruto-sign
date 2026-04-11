import { Link } from 'react-router-dom';
import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';

/**
 * Training Ground — launches the hand-sign tracker (the original App component).
 * This page provides context and then links into the live camera training session.
 */
export function TrainingPage() {
  const profile = useGameStore((s) => s.profile);
  const incrementSessions = useGameStore((s) => s.incrementTrainingSessions);

  if (!profile) return null;

  const unlockedJutsu = profile.jutsuProgress.filter((j) => j.unlocked);

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">TRAINING GROUND</h1>
        <p className="page-subtitle">Practice hand signs and master your jutsu</p>
      </div>

      <div className="page-body">
        {/* Training modes */}
        <div className="g-grid-3">
          <div className="g-card">
            <div className="g-card-title">HAND SIGN PRACTICE</div>
            <p className="select-card-desc">
              Practice individual hand signs with real-time detection. Build accuracy and speed.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link
                to="/play"
                className="g-btn"
                onClick={() => incrementSessions()}
              >
                START SESSION
              </Link>
            </div>
          </div>

          <div className="g-card g-card--accent">
            <div className="g-card-title g-card-title--accent">JUTSU COMBOS</div>
            <p className="select-card-desc">
              Execute full jutsu hand-sign sequences. Timing and accuracy are scored.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link
                to="/play"
                className="g-btn g-btn--accent"
                onClick={() => incrementSessions()}
              >
                COMBO TRAINING
              </Link>
            </div>
          </div>

          <div className="g-card">
            <div className="g-card-title">DAILY DRILL</div>
            <p className="select-card-desc">
              Complete today&apos;s training challenges to earn bonus XP and mission progress.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link
                to="/play"
                className="g-btn"
                onClick={() => incrementSessions()}
              >
                DAILY DRILL
              </Link>
            </div>
          </div>
        </div>

        {/* Unlocked jutsu available for training */}
        <div className="g-card" style={{ marginTop: 8 }}>
          <div className="g-card-title">AVAILABLE JUTSU</div>
          <p className="select-card-desc" style={{ marginBottom: 16 }}>
            Jutsu you&apos;ve unlocked and can practice in training sessions:
          </p>
          <div className="g-grid-4">
            {unlockedJutsu.map((jp) => {
              const def = JUTSU_LOOKUP[jp.jutsuId];
              if (!def) return null;
              return (
                <div key={jp.jutsuId} className="jutsu-card">
                  <div className="jutsu-name">{def.name}</div>
                  <div className="jutsu-signs">
                    {def.requiredSigns.length > 0
                      ? def.requiredSigns.join(' → ').toUpperCase()
                      : 'CHAKRA CONTROL'}
                  </div>
                  <div className="jutsu-mastery-row">
                    <div className="g-progress" style={{ flex: 1 }}>
                      <div
                        className="g-progress-fill"
                        style={{ width: `${jp.mastery}%` }}
                      />
                    </div>
                    <span className="jutsu-mastery-pct">{jp.mastery}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session stats */}
        <div className="g-card">
          <div className="g-card-title">TRAINING STATS</div>
          <div className="g-grid-2">
            <div>
              <div className="stat-row">
                <span className="stat-label">Total Sessions</span>
                <span className="stat-value">{profile.totalTrainingSessions}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Jutsu Unlocked</span>
                <span className="stat-value">{unlockedJutsu.length}</span>
              </div>
            </div>
            <div>
              <div className="stat-row">
                <span className="stat-label">Current Rank</span>
                <span className="stat-value--accent">{profile.rank.toUpperCase()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total XP</span>
                <span className="stat-value--accent">{profile.xp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { JUTSU_CATALOG } from '../types';
const JUTSU_LOOKUP: Record<string, typeof JUTSU_CATALOG[number]> = Object.fromEntries(
  JUTSU_CATALOG.map((j) => [j.id, j]),
);
