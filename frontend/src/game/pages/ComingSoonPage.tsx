import { Link } from 'react-router-dom';
import { GameNav } from '../GameNav';

interface ComingSoonPageProps {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly features?: { icon: string; label: string }[];
}

export function ComingSoonPage({
  title,
  subtitle,
  icon,
  features = [],
}: ComingSoonPageProps) {
  return (
    <div className="game-page">
      <GameNav />
      <div className="coming-soon-page">
        {/* Animated background orbs */}
        <div className="coming-soon-bg-effects">
          <div className="coming-soon-orb coming-soon-orb-1" />
          <div className="coming-soon-orb coming-soon-orb-2" />
          <div className="coming-soon-orb coming-soon-orb-3" />
        </div>

        <div className="coming-soon-icon">{icon}</div>
        <span className="coming-soon-badge">Coming Soon</span>
        <h1 className="coming-soon-title">{title}</h1>
        <p className="coming-soon-subtitle">{subtitle}</p>

        {features.length > 0 && (
          <div className="coming-soon-features">
            {features.map((f) => (
              <div key={f.label} className="coming-soon-feature">
                <div className="coming-soon-feature-icon">{f.icon}</div>
                <div className="coming-soon-feature-label">{f.label}</div>
              </div>
            ))}
          </div>
        )}

        <Link to="/dashboard" className="coming-soon-back">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

/* Pre-configured Coming Soon pages for each future feature */

export function BattleComingSoonPage() {
  return (
    <ComingSoonPage
      title="Battle Arena"
      subtitle="Challenge AI opponents and other shinobi in tactical hand-sign combat. Master your jutsu before the arena opens."
      icon="⚔️"
      features={[
        { icon: '🤖', label: 'VS AI' },
        { icon: '🎮', label: 'Local PVP' },
        { icon: '🌐', label: 'Online' },
      ]}
    />
  );
}

export function OnlineComingSoonPage() {
  return (
    <ComingSoonPage
      title="Online Lobby"
      subtitle="Connect with shinobi worldwide. Create rooms, challenge opponents, and climb the leaderboards."
      icon="🌐"
      features={[
        { icon: '🏆', label: 'Ranked' },
        { icon: '👥', label: 'Lobbies' },
        { icon: '📊', label: 'Leaderboard' },
      ]}
    />
  );
}

export function ClansComingSoonPage() {
  return (
    <ComingSoonPage
      title="Custom Clans"
      subtitle="Create or join custom clans, design your emblem, and build your village together."
      icon="🏯"
      features={[
        { icon: '🎨', label: 'Clan Creator' },
        { icon: '👥', label: 'Members' },
        { icon: '🏅', label: 'Clan Wars' },
      ]}
    />
  );
}
