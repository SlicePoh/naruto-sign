import { NavLink } from 'react-router-dom';
import { useGameStore } from './useGameStore';
import { RANK_LABELS, CLANS } from './types';

export function GameNav() {
  const profile = useGameStore((s) => s.profile);
  if (!profile) return null;

  const clan = CLANS.find((c) => c.id === profile.clan);

  return (
    <nav className="game-nav">
      <NavLink to="/dashboard" className="nav-brand">
        SHINOBI TRACKER
      </NavLink>

      <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Dashboard
      </NavLink>
      <NavLink to="/training" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Training
      </NavLink>
      <NavLink to="/jutsu" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Jutsu
      </NavLink>
      <NavLink to="/academy" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Academy
      </NavLink>
      <NavLink to="/missions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Missions
      </NavLink>
      <NavLink to="/clan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Clan
      </NavLink>
      <NavLink to="/exam" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Exam
      </NavLink>
      <NavLink to="/battle-setup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Battle
        <span className="coming-soon-nav-tag">SOON</span>
      </NavLink>
      {/* Future features — hidden for MVP
      <NavLink to="/battle-guide" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Guide
      </NavLink>
      <NavLink to="/online-lobby" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Online
      </NavLink>
      <NavLink to="/clans" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Clans
      </NavLink> */}

      <span className="nav-rank">{clan && <img src={clan.icon} alt={clan.name} className="clan-icon-img-sm" />} {RANK_LABELS[profile.rank]}</span>
      <span className="nav-xp">{profile.xp} XP</span>
    </nav>
  );
}
