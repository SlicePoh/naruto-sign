import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { MISSION_POOL } from '../types';

export function MissionsPage() {
  const profile = useGameStore((s) => s.profile);
  const refreshMissions = useGameStore((s) => s.refreshMissions);
  const completeMission = useGameStore((s) => s.completeMission);

  if (!profile) return null;

  const activeMissions = profile.activeMissions;

  // Group by type
  const grouped: Record<string, typeof activeMissions> = {};
  for (const m of activeMissions) {
    const def = MISSION_POOL.find((mp) => mp.id === m.missionId);
    const type = def?.type ?? 'daily';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(m);
  }

  const completedCount = activeMissions.filter((m) => m.completed).length;
  const totalCount = activeMissions.length;

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">MISSION BOARD</h1>
            <p className="page-subtitle">Complete missions to earn XP and unlock rewards</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="stat-value" style={{ fontSize: '0.8rem' }}>
              {completedCount} / {totalCount} COMPLETE
            </span>
            <button className="g-btn" onClick={refreshMissions}>
              REFRESH
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {Object.entries(grouped).map(([type, missions]) => (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <span className={`g-badge g-badge--${type === 'challenge' ? 'advanced' : type === 'rank' ? 'intermediate' : 'basic'}`}>
                {type.toUpperCase()} MISSIONS
              </span>
            </div>
            <div className="g-grid-4">
              {missions.map((m) => {
                const def = MISSION_POOL.find((mp) => mp.id === m.missionId);
                if (!def) return null;
                return (
                  <div
                    key={m.missionId}
                    className={`mission-card ${m.completed ? 'completed' : ''}`}
                  >
                    <span className={`mission-type mission-type--${def.type}`}>{def.type}</span>
                    <span className="mission-title">{def.title}</span>
                    <span className="mission-desc">{def.description}</span>

                    {/* Progress bar */}
                    <div className="jutsu-mastery-row">
                      <div className="g-progress" style={{ flex: 1 }}>
                        <div
                          className="g-progress-fill--accent"
                          style={{ width: `${Math.min(100, Math.round((m.progress / def.requirement) * 100))}%` }}
                        />
                      </div>
                      <span className="jutsu-mastery-pct">
                        {m.progress}/{def.requirement}
                      </span>
                    </div>

                    <span className="mission-reward">+{def.xpReward} XP</span>

                    {!m.completed && m.progress >= def.requirement && (
                      <button
                        className="g-btn"
                        style={{ marginTop: 4, width: '100%' }}
                        onClick={() => completeMission(m.missionId)}
                      >
                        CLAIM
                      </button>
                    )}
                    {m.completed && (
                      <span className="g-badge g-badge--mastered" style={{ marginTop: 4 }}>
                        COMPLETED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {activeMissions.length === 0 && (
          <div className="g-card">
            <div className="g-card-title">NO ACTIVE MISSIONS</div>
            <p className="select-card-desc">
              Hit refresh to get new missions, or complete training sessions to make progress.
            </p>
          </div>
        )}

        {/* Completed missions log */}
        {profile.completedMissions.length > 0 && (
          <div className="g-card" style={{ marginTop: 16 }}>
            <div className="g-card-title">COMPLETED ({profile.completedMissions.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.completedMissions.map((id) => {
                const def = MISSION_POOL.find((m) => m.id === id);
                return (
                  <span key={id} className="g-badge g-badge--mastered">
                    {def?.title ?? id}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
