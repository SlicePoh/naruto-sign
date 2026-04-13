import { Link } from 'react-router-dom';
import { useGameStore } from '../useGameStore';
import { RANK_LABELS, CLANS, NINJA_TYPES, CHAKRA_NATURES, PROMOTION_EXAMS, RANK_ORDER, JUTSU_CATALOG, MISSION_POOL } from '../types';
import { GameNav } from '../GameNav';

export function DashboardPage() {
  const profile = useGameStore((s) => s.profile);

  if (!profile) return null;

  const clan = CLANS.find((c) => c.id === profile.clan)!;
  const ninjaType = NINJA_TYPES.find((t) => t.id === profile.ninjaType)!;
  const nature = CHAKRA_NATURES.find((n) => n.id === profile.chakraNature)!;
  const nextExam = PROMOTION_EXAMS.find((e) => e.fromRank === profile.rank);
  const xpForNextRank = nextExam?.requiredXP ?? profile.xp;
  const xpProgress = Math.min(100, Math.round((profile.xp / xpForNextRank) * 100));

  const unlockedJutsu = profile.jutsuProgress.filter((j) => j.unlocked);
  const masteredJutsu = profile.jutsuProgress.filter((j) => j.mastery >= 100);
  const activeMissions = profile.activeMissions.filter((m) => !m.completed);
  const nextRank = nextExam ? RANK_LABELS[nextExam.toRank] : 'MAX RANK';

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">DASHBOARD</h1>
        <p className="page-subtitle">Ninja Overview</p>
      </div>

      <div className="page-body">
        {/* Identity card */}
        <div className="g-card">
          <div className="dash-identity">
            <div className="dash-avatar">{clan.icon}</div>
            <div>
              <div className="dash-name">{profile.name}</div>
              <div className="dash-rank-line">{RANK_LABELS[profile.rank]}</div>
              <div className="dash-clan-line">
                {clan.name} Clan &middot; {ninjaType.name} &middot; {nature.icon} {nature.name} Nature
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div className="dash-xp-section">
            <div className="dash-xp-label">
              <span>XP: {profile.xp} / {xpForNextRank}</span>
              <span>Next: {nextRank}</span>
            </div>
            <div className="g-progress">
              <div className="g-progress-fill--accent" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="g-grid-2">
          {/* Stats */}
          <div className="g-card">
            <div className="g-card-title">STATS</div>
            <div className="stat-row">
              <span className="stat-label">Chakra Control</span>
              <span className="stat-value">{profile.stats.chakraControl}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Speed</span>
              <span className="stat-value">{profile.stats.speed}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Precision</span>
              <span className="stat-value">{profile.stats.precision}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Mastery</span>
              <span className="stat-value">{profile.stats.mastery}</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="g-card g-card--accent">
            <div className="g-card-title g-card-title--accent">PROGRESS</div>
            <div className="stat-row">
              <span className="stat-label">Jutsu Unlocked</span>
              <span className="stat-value--accent">{unlockedJutsu.length} / {JUTSU_CATALOG.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Jutsu Mastered</span>
              <span className="stat-value--accent">{masteredJutsu.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Training Sessions</span>
              <span className="stat-value--accent">{profile.totalTrainingSessions}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active Missions</span>
              <span className="stat-value--accent">{activeMissions.length}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="g-card">
          <div className="g-card-title">QUICK ACTIONS</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <Link to="/training" className="g-btn">
              START TRAINING
            </Link>
            <Link to="/jutsu" className="g-btn g-btn--accent">
              SKILL TREE
            </Link>
            <Link to="/academy" className="g-btn">
              ACADEMY GUIDE
            </Link>
            <Link to="/missions" className="g-btn">
              MISSIONS
            </Link>
            {nextExam && RANK_ORDER.indexOf(profile.rank) < RANK_ORDER.length - 1 && (
              <Link to="/exam" className="g-btn g-btn--accent">
                PROMOTION EXAM
              </Link>
            )}
          </div>
        </div>

        {/* Current mission */}
        {activeMissions.length > 0 && (
          <div className="g-card">
            <div className="g-card-title">ACTIVE MISSIONS</div>
            <div className="g-grid-4">
              {activeMissions.slice(0, 3).map((m) => {
                const def = MISSION_POOL_LOOKUP[m.missionId];
                if (!def) return null;
                return (
                  <div key={m.missionId} className="mission-card">
                    <span className={`mission-type mission-type--${def.type}`}>{def.type}</span>
                    <span className="mission-title">{def.title}</span>
                    <span className="mission-desc">{def.description}</span>
                    <span className="mission-reward">+{def.xpReward} XP</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="g-card g-card--accent">
          <div className="g-card-title g-card-title--accent">ACADEMY BRIEFING</div>
          <p className="select-card-desc" style={{ marginBottom: 14 }}>
            New to the shinobi world? Review chakra basics, jutsu categories, technique ranks, and bloodline powers
            before heading into training or promotion exams.
          </p>
          <Link to="/academy" className="g-btn g-btn--accent">
            OPEN FIELD MANUAL
          </Link>
        </div>
      </div>
    </div>
  );
}

// Quick lookup
const MISSION_POOL_LOOKUP: Record<string, typeof MISSION_POOL[number]> = Object.fromEntries(
  MISSION_POOL.map((m) => [m.id, m]),
);
