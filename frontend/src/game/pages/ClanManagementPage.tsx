import { useState } from 'react';
import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { useBattleStore, CLAN_IMAGES } from '../battle';

const CLAN_ICON_OPTIONS = Object.values(CLAN_IMAGES);

export function ClanManagementPage() {
  const profile = useGameStore((s) => s.profile);
  const customClans = useBattleStore((s) => s.customClans);
  const playerClanId = useBattleStore((s) => s.playerClanId);
  const createClan = useBattleStore((s) => s.createClan);
  const joinClan = useBattleStore((s) => s.joinClan);
  const leaveClan = useBattleStore((s) => s.leaveClan);

  const [showCreate, setShowCreate] = useState(false);
  const [clanName, setClanName] = useState('');
  const [clanTag, setClanTag] = useState('');
  const [clanIcon, setClanIcon] = useState(CLAN_ICON_OPTIONS[0]);
  const [clanDesc, setClanDesc] = useState('');

  if (!profile) return null;

  const playerClan = customClans.find((c) => c.id === playerClanId);

  const handleCreate = () => {
    if (!clanName.trim() || !clanTag.trim()) return;
    createClan(clanName.trim(), clanTag.trim(), clanIcon, clanDesc.trim(), profile.name);
    setClanName('');
    setClanTag('');
    setClanDesc('');
    setShowCreate(false);
  };

  const handleJoin = (clanId: string) => {
    joinClan(clanId, profile.name);
  };

  const handleLeave = () => {
    leaveClan(profile.name);
  };

  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">CUSTOM CLANS</h1>
        <p className="page-subtitle">Create or join a clan to fight alongside allies</p>
      </div>

      <div className="page-body">
        {/* Current clan */}
        {playerClan && (
          <div className="g-card" style={{ borderColor: 'var(--hud-accent)', borderWidth: 2 }}>
            <div className="g-card-title">YOUR CLAN</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '2.5rem' }}><img src={playerClan.icon} alt="clan" className="clan-icon-img" /></span>
              <div>
                <div style={{ color: 'var(--hud-accent)', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  [{playerClan.tag}] {playerClan.name}
                </div>
                <div className="select-card-desc">{playerClan.description || 'No description'}</div>
              </div>
            </div>
            <div className="g-grid-3" style={{ gap: 8 }}>
              <div className="stat-row">
                <span className="stat-label">Members</span>
                <span className="stat-value">{playerClan.members.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Wins</span>
                <span className="stat-value" style={{ color: 'var(--hud-success)' }}>{playerClan.wins}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Losses</span>
                <span className="stat-value" style={{ color: 'var(--hud-danger, #ff4444)' }}>{playerClan.losses}</span>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>Members:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {playerClan.members.map((m) => (
                  <span
                    key={m}
                    className="battle-status-badge"
                    style={{ background: m === profile.name ? 'var(--hud-accent)' : undefined }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <button className="g-btn" style={{ marginTop: 12 }} onClick={handleLeave}>
              LEAVE CLAN
            </button>
          </div>
        )}

        {/* Create new clan */}
        {!playerClan && (
          <div className="g-card">
            <div className="g-card-title">CREATE A CLAN</div>
            {!showCreate ? (
              <button className="g-btn g-btn--accent" onClick={() => setShowCreate(true)}>
                + NEW CLAN
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="stat-label">Clan Name</label>
                  <input
                    type="text"
                    className="g-input"
                    value={clanName}
                    onChange={(e) => setClanName(e.target.value)}
                    placeholder="e.g. Akatsuki Reborn"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="stat-label">Clan Tag (3–5 chars)</label>
                  <input
                    type="text"
                    className="g-input"
                    value={clanTag}
                    onChange={(e) => setClanTag(e.target.value.toUpperCase())}
                    placeholder="e.g. AKT"
                    maxLength={5}
                    style={{ textTransform: 'uppercase', letterSpacing: 3 }}
                  />
                </div>
                <div>
                  <label className="stat-label">Icon</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CLAN_ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`battle-move-card${clanIcon === icon ? ' selected' : ''}`}
                        style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center' }}
                        onClick={() => setClanIcon(icon)}
                      >
                        <img src={icon} alt="clan" className="clan-icon-img-sm" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="stat-label">Description (optional)</label>
                  <input
                    type="text"
                    className="g-input"
                    value={clanDesc}
                    onChange={(e) => setClanDesc(e.target.value)}
                    placeholder="Our clan motto..."
                    maxLength={100}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="g-btn g-btn--accent"
                    disabled={!clanName.trim() || !clanTag.trim()}
                    onClick={handleCreate}
                  >
                    CREATE
                  </button>
                  <button className="g-btn" onClick={() => setShowCreate(false)}>
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Available clans */}
        <div className="g-card">
          <div className="g-card-title">AVAILABLE CLANS ({customClans.length})</div>
          {customClans.length === 0 ? (
            <p className="select-card-desc">No custom clans yet. Create one to get started!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customClans.map((clan) => {
                const isMember = clan.members.includes(profile.name);
                const isPlayerClan = clan.id === playerClanId;
                return (
                  <div
                    key={clan.id}
                    className="g-card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      borderColor: isPlayerClan ? 'var(--hud-accent)' : undefined,
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}><img src={clan.icon} alt={clan.name} className="clan-icon-img-sm" /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--hud-primary)', fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>
                        [{clan.tag}] {clan.name}
                      </div>
                      <div className="select-card-desc">
                        {clan.members.length} members · W{clan.wins}/L{clan.losses}
                        {clan.description ? ` · ${clan.description}` : ''}
                      </div>
                    </div>
                    {!playerClan && !isMember && (
                      <button className="g-btn" onClick={() => handleJoin(clan.id)}>
                        JOIN
                      </button>
                    )}
                    {isPlayerClan && (
                      <span style={{ color: 'var(--hud-accent)', fontWeight: 700, fontSize: '0.8rem' }}>YOUR CLAN</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
