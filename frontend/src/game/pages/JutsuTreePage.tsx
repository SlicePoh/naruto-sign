import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { JUTSU_CATALOG, RANK_ORDER, RANK_LABELS } from '../types';
import type { JutsuDef } from '../types';

export function JutsuTreePage() {
  const profile = useGameStore((s) => s.profile);
  const unlockJutsu = useGameStore((s) => s.unlockJutsu);

  if (!profile) return null;

  const playerRankIdx = RANK_ORDER.indexOf(profile.rank);

  // Group jutsu by difficulty
  const groups: { label: string; jutsu: JutsuDef[] }[] = [
    { label: 'BASIC', jutsu: JUTSU_CATALOG.filter((j) => j.difficulty === 'basic') },
    { label: 'INTERMEDIATE', jutsu: JUTSU_CATALOG.filter((j) => j.difficulty === 'intermediate') },
    { label: 'ADVANCED', jutsu: JUTSU_CATALOG.filter((j) => j.difficulty === 'advanced') },
    { label: 'MASTER', jutsu: JUTSU_CATALOG.filter((j) => j.difficulty === 'master') },
  ];

  const canUnlock = (def: JutsuDef): boolean => {
    // Rank check
    if (RANK_ORDER.indexOf(def.requiredRank) > playerRankIdx) return false;
    // Mastery prerequisites
    for (const [prereqId, reqMastery] of Object.entries(def.requiredMastery)) {
      const jp = profile.jutsuProgress.find((j) => j.jutsuId === prereqId);
      if (!jp || jp.mastery < (reqMastery ?? 0)) return false;
    }
    // Nature check
    if (def.requiredNature && def.requiredNature !== profile.chakraNature) {
      // Allow if clan has affinity
      return false;
    }
    // Clan exclusive check
    if (def.clanExclusive && def.clanExclusive !== profile.clan) return false;
    return true;
  };

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">JUTSU SKILL TREE</h1>
        <p className="page-subtitle">Unlock and master techniques along your ninja path</p>
      </div>

      <div className="page-body">
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`g-badge g-badge--${group.label.toLowerCase()}`}>{group.label}</span>
            </div>
            <div className="g-grid-4">
              {group.jutsu.map((def) => {
                const jp = profile.jutsuProgress.find((j) => j.jutsuId === def.id);
                const isUnlocked = jp?.unlocked ?? false;
                const mastery = jp?.mastery ?? 0;
                const unlockable = !isUnlocked && canUnlock(def);
                const isMastered = mastery >= 100;

                return (
                  <div
                    key={def.id}
                    className={`jutsu-card ${isUnlocked ? '' : 'locked'}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="jutsu-name">{def.name}</div>
                      {isMastered && <span className="g-badge g-badge--mastered">MASTERED</span>}
                    </div>
                    <div className="jutsu-desc">{def.description}</div>

                    {def.requiredSigns.length > 0 && (
                      <div className="jutsu-signs">
                        {def.requiredSigns.join(' → ').toUpperCase()}
                      </div>
                    )}

                    {/* Requirements */}
                    <div style={{ marginBottom: 8 }}>
                      <span className="g-badge" style={{ marginRight: 6 }}>
                        {RANK_LABELS[def.requiredRank]}
                      </span>
                      {def.requiredNature && (
                        <span className="g-badge" style={{ marginRight: 6 }}>
                          {def.requiredNature.toUpperCase()}
                        </span>
                      )}
                      {def.clanExclusive && (
                        <span className="g-badge">
                          {def.clanExclusive.toUpperCase()} ONLY
                        </span>
                      )}
                    </div>

                    {/* Mastery bar */}
                    {isUnlocked && (
                      <div className="jutsu-mastery-row">
                        <div className="g-progress" style={{ flex: 1 }}>
                          <div
                            className={`g-progress-fill ${isMastered ? '' : 'g-progress-fill--accent'}`}
                            style={{ width: `${mastery}%` }}
                          />
                        </div>
                        <span className="jutsu-mastery-pct">{mastery}%</span>
                      </div>
                    )}

                    {/* Prerequisites */}
                    {!isUnlocked && Object.keys(def.requiredMastery).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span className="stat-label" style={{ fontSize: '0.65rem' }}>REQUIRES: </span>
                        {Object.entries(def.requiredMastery).map(([id, pct]) => {
                          const prereqDef = JUTSU_CATALOG.find((j) => j.id === id);
                          return (
                            <span key={id} className="g-badge g-badge--locked" style={{ marginRight: 4 }}>
                              {prereqDef?.name ?? id} {pct}%
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Unlock button */}
                    {unlockable && (
                      <button
                        className="g-btn"
                        style={{ marginTop: 12, width: '100%' }}
                        onClick={() => unlockJutsu(def.id)}
                      >
                        UNLOCK
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
