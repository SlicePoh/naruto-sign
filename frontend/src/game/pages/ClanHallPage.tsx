import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { CLANS, JUTSU_CATALOG, CHAKRA_NATURES } from '../types';

export function ClanHallPage() {
  const profile = useGameStore((s) => s.profile);

  if (!profile) return null;

  const clan = CLANS.find((c) => c.id === profile.clan)!;
  const nature = CHAKRA_NATURES.find((n) => n.id === profile.chakraNature)!;

  // Clan-relevant jutsu (matching clan nature or clan exclusive)
  const clanJutsu = JUTSU_CATALOG.filter(
    (j) =>
      j.requiredNature === clan.affinityNature ||
      j.clanExclusive === clan.id,
  );

  return (
    <div className="game-page">
      <GameNav />

      {/* Clan banner */}
      <div className="clan-banner">
        <div className="clan-icon-large"><img src={clan.icon} alt={clan.name} className="clan-icon-img-lg" /></div>
        <div className="clan-name-large">{clan.name} CLAN</div>
        <div className="clan-desc-large">{clan.description}</div>
      </div>

      <div className="page-body">
        <div className="g-grid-2">
          {/* Clan info */}
          <div className="g-card">
            <div className="g-card-title">CLAN TRAITS</div>
            <div className="stat-row">
              <span className="stat-label">Passive Bonus</span>
              <span className="stat-value" style={{ fontSize: '0.78rem' }}>{clan.passive}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Affinity Nature</span>
              <span className="stat-value--accent" style={{ textTransform: 'uppercase' }}>
                {clan.affinityNature}
              </span>
            </div>
            {Object.entries(clan.statBonus).map(([stat, val]) => (
              <div key={stat} className="stat-row">
                <span className="stat-label">+{stat}</span>
                <span className="stat-value">+{val}</span>
              </div>
            ))}
          </div>

          {/* Player's nature / identity */}
          <div className="g-card g-card--accent">
            <div className="g-card-title g-card-title--accent">YOUR IDENTITY</div>
            <div className="stat-row">
              <span className="stat-label">Name</span>
              <span className="stat-value--accent">{profile.name}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Chakra Nature</span>
              <span className="stat-value--accent">{nature.icon} {nature.name}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Ninja Type</span>
              <span className="stat-value--accent" style={{ textTransform: 'uppercase' }}>
                {profile.ninjaType}
              </span>
            </div>
          </div>
        </div>

        {/* Clan jutsu path */}
        <div className="g-card" style={{ marginTop: 8 }}>
          <div className="g-card-title">CLAN JUTSU PATH</div>
          <p className="select-card-desc" style={{ marginBottom: 16 }}>
            Techniques aligned with the {clan.name} clan&apos;s {clan.affinityNature} affinity:
          </p>
          <div className="g-grid-4">
            {clanJutsu.map((def) => {
              const jp = profile.jutsuProgress.find((j) => j.jutsuId === def.id);
              const isUnlocked = jp?.unlocked ?? false;
              const mastery = jp?.mastery ?? 0;

              return (
                <div
                  key={def.id}
                  className={`jutsu-card ${isUnlocked ? '' : 'locked'}`}
                >
                  <div className="jutsu-name">{def.name}</div>
                  <div className="jutsu-desc">{def.description}</div>
                  <div style={{ marginBottom: 6 }}>
                    <span className={`g-badge g-badge--${def.difficulty}`}>
                      {def.difficulty.toUpperCase()}
                    </span>
                    {def.clanExclusive && (
                      <span className="g-badge" style={{ marginLeft: 6, color: 'var(--hud-warning)' }}>
                        EXCLUSIVE
                      </span>
                    )}
                  </div>
                  {isUnlocked && (
                    <div className="jutsu-mastery-row">
                      <div className="g-progress" style={{ flex: 1 }}>
                        <div
                          className="g-progress-fill"
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                      <span className="jutsu-mastery-pct">{mastery}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {clanJutsu.length === 0 && (
            <p className="select-card-desc">
              No specialized jutsu found for your current nature. Explore the full skill tree for more options.
            </p>
          )}
        </div>

        {/* Clan lore */}
        <div className="g-card">
          <div className="g-card-title">CLAN LORE</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--hud-text-dim)', lineHeight: 1.6 }}>
            The {clan.name} clan is renowned throughout the shinobi world.{' '}
            {clan.id === 'uzumaki' && 'Originally from the Land of Whirlpools, the Uzumaki are known for their incredible longevity, massive chakra reserves, and mastery of sealing techniques. Their vitality makes them uniquely suited for chakra-intensive jutsu like the Rasengan.'}
            {clan.id === 'uchiha' && 'Descendants of Indra Ōtsutsuki, the Uchiha possess the legendary Sharingan. Their natural affinity for fire-style ninjutsu and exceptional visual prowess make them feared across all nations.'}
            {clan.id === 'hyuga' && 'Bearers of the Byakugan, the Hyūga clan sees all. Their Gentle Fist taijutsu style targets the chakra pathway system directly, making their precision unmatched in close combat.'}
            {clan.id === 'nara' && 'The Nara clan are master strategists who manipulate shadows. Though they appear lazy, their intellect and shadow techniques make them invaluable in team-based combat and tactical operations.'}
            {clan.id === 'aburame' && 'The Aburame clan forms symbiotic bonds with insects at birth, housing kikaichū beetles within their bodies. These bugs feed on chakra, making the Aburame deadly trackers and silent assassins who can drain an enemy\'s chakra reserves without ever throwing a punch.'}
            {clan.id === 'inuzuka' && 'Fierce and loyal, the Inuzuka clan fights alongside their ninken — ninja dogs who are partners for life. Their beast-mimicry techniques and heightened senses make them unrivaled trackers and ferocious close-range fighters.'}
            {clan.id === 'akimichi' && 'The Akimichi clan channels chakra into raw physical power through their signature Expansion Jutsu. Kind-hearted yet devastating in battle, they can multiply their size and strength to become unstoppable forces on the battlefield.'}
            {clan.id === 'hatake' && 'The Hatake clan produced some of the most gifted prodigies in shinobi history. Known for their exceptional adaptability and mastery of diverse jutsu, the White Fang\'s legacy lives on through those who value versatility and ingenuity above all.'}
            {clan.id === 'yamanaka' && 'Masters of the mind, the Yamanaka clan specializes in consciousness transfer and telepathic techniques. Their Mind Body Switch and sensory abilities make them indispensable for intelligence gathering and coordinated team operations.'}
            {clan.id === 'senju' && 'Descendants of Ashura Ōtsutsuki and founders of the Hidden Leaf Village, the Senju are legendary for their unmatched life force and mastery of all shinobi arts. Their Wood Release and overwhelming chakra have shaped the course of ninja history.'}
            {clan.id === 'rogue' && 'Walking your own path means freedom — no clan ties, no expectations. Rogue ninja must rely on their own adaptability and balanced growth to survive.'}
          </p>
        </div>
      </div>
    </div>
  );
}
