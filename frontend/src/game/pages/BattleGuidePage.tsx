import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   Battle Guide — Rules sheet explaining all battle mechanics
   ═══════════════════════════════════════════════════════════════ */

const TYPE_CHART: { atk: string; strong: string; weak: string }[] = [
  { atk: '🔥 Fire', strong: '🌬️ Wind', weak: '🌊 Water' },
  { atk: '🌊 Water', strong: '🔥 Fire', weak: '🪨 Earth' },
  { atk: '🪨 Earth', strong: '⚡ Lightning', weak: '🌬️ Wind' },
  { atk: '⚡ Lightning', strong: '🌊 Water', weak: '🪨 Earth' },
  { atk: '🌬️ Wind', strong: '⚡ Lightning', weak: '🔥 Fire' },
];

const POWER_TIERS = [
  { tier: 'Weak', range: '10–25', examples: 'Substitution, Taijutsu Strike, Clone' },
  { tier: 'Light', range: '30–45', examples: 'Shadow Clone, Fire Strike, Gentle Fist' },
  { tier: 'Medium', range: '50–70', examples: 'Fireball, Dynamic Entry, Vacuum Blade' },
  { tier: 'Heavy', range: '80–100', examples: 'Chidori, Rasengan, Water Dragon' },
  { tier: 'Ultimate', range: '140–150', examples: 'Rasenshuriken, Gate of Death, Tsukuyomi' },
];

const STATS_GUIDE = [
  { stat: 'Attack (Atk)', desc: 'Physical power — used by Taijutsu moves' },
  { stat: 'Defense (Def)', desc: 'Reduces physical damage taken' },
  { stat: 'Sp. Attack (SpAtk)', desc: 'Special power — used by Ninjutsu & Genjutsu' },
  { stat: 'Sp. Defense (SpDef)', desc: 'Reduces special damage taken' },
  { stat: 'Speed', desc: 'Determines who attacks first each turn' },
  { stat: 'Evasion', desc: 'Chance to dodge attacks (subtracted from hit chance)' },
];

const STATUS_EFFECTS = [
  { icon: '🔥', name: 'Burn', desc: 'Deals 1/16 max HP damage per turn for 5 turns' },
  { icon: '⚡', name: 'Paralysis', desc: '25% chance to skip your turn' },
  { icon: '💫', name: 'Confusion', desc: '30% chance to hit yourself instead' },
  { icon: '🐢', name: 'Slow', desc: '-25% Speed for 3 turns' },
  { icon: '🌫️', name: 'Blind', desc: '-30% Accuracy for 3 turns' },
  { icon: '🛡️↓', name: 'Guard Down', desc: '-25% Def & SpDef for 3 turns' },
];

const BUFF_EFFECTS = [
  { icon: '⚔️↑', name: 'Atk Up', desc: '+50% Attack for 3 turns' },
  { icon: '🛡️↑', name: 'Def Up', desc: '+50% Defense for 3 turns' },
  { icon: '🔮↑', name: 'SpAtk Up', desc: '+50% Sp. Attack for 3 turns' },
  { icon: '💠↑', name: 'SpDef Up', desc: '+50% Sp. Defense for 3 turns' },
  { icon: '💨↑', name: 'Speed Up', desc: '+50% Speed for 3 turns' },
  { icon: '🎯', name: 'Focus', desc: '+30% Accuracy for 3 turns' },
  { icon: '👤↑', name: 'Evasion Up', desc: '+25 Evasion for 3 turns' },
];

export function BattleGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="game-page battle-guide-page">
      <div className="page-header">
        <h1 className="page-title">⚔️ BATTLE GUIDE</h1>
        <p className="page-subtitle">Master the art of shinobi combat</p>
        <button className="g-btn" onClick={() => navigate('/battle-setup')} style={{ marginTop: '0.5rem' }}>
          ← BACK TO BATTLE
        </button>
      </div>

      {/* ── Overview ── */}
      <section className="guide-section">
        <h2 className="guide-heading">📖 Overview</h2>
        <p className="guide-text">
          Battles are <strong>turn-based</strong>, inspired by Pokémon. Each turn, 
          the faster fighter moves first. Choose from 4 moves to deal damage, inflict 
          status effects, or buff yourself. Reduce your opponent's HP to 0 to win!
        </p>
      </section>

      {/* ── Stats ── */}
      <section className="guide-section">
        <h2 className="guide-heading">📊 Fighter Stats</h2>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead><tr><th>Stat</th><th>Effect</th></tr></thead>
            <tbody>
              {STATS_GUIDE.map((s) => (
                <tr key={s.stat}><td className="guide-stat-name">{s.stat}</td><td>{s.desc}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="guide-note">
          <strong>Physical vs Special:</strong> Taijutsu uses Atk/Def. Ninjutsu & Genjutsu use SpAtk/SpDef.
        </p>
      </section>

      {/* ── Move Categories ── */}
      <section className="guide-section">
        <h2 className="guide-heading">🥋 Move Categories</h2>
        <div className="guide-cards-row">
          <div className="guide-card">
            <div className="guide-card-icon">👊</div>
            <h3>Taijutsu</h3>
            <p>Physical attacks. Uses <strong>Atk vs Def</strong>. No chakra cost.</p>
          </div>
          <div className="guide-card">
            <div className="guide-card-icon">🔥</div>
            <h3>Ninjutsu</h3>
            <p>Elemental jutsu. Uses <strong>SpAtk vs SpDef</strong>. Costs chakra.</p>
          </div>
          <div className="guide-card">
            <div className="guide-card-icon">🌀</div>
            <h3>Genjutsu</h3>
            <p>Illusion attacks. Uses <strong>SpAtk vs SpDef</strong>. Often low damage, strong debuffs.</p>
          </div>
          <div className="guide-card">
            <div className="guide-card-icon">✨</div>
            <h3>Status</h3>
            <p>Self-buffs. <strong>No damage</strong>. Boost your stats for 3 turns.</p>
          </div>
        </div>
      </section>

      {/* ── Power Tiers ── */}
      <section className="guide-section">
        <h2 className="guide-heading">💥 Power Tiers</h2>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead><tr><th>Tier</th><th>Power</th><th>Examples</th></tr></thead>
            <tbody>
              {POWER_TIERS.map((t) => (
                <tr key={t.tier}>
                  <td className="guide-stat-name">{t.tier}</td>
                  <td>{t.range}</td>
                  <td>{t.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Type Effectiveness ── */}
      <section className="guide-section">
        <h2 className="guide-heading">🔄 Type Effectiveness</h2>
        <p className="guide-text">
          Elemental moves deal <strong>1.5× damage</strong> against weak types and{' '}
          <strong>0.75× damage</strong> against strong types.
        </p>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead><tr><th>Attack</th><th>Strong Against (1.5×)</th><th>Weak Against (0.75×)</th></tr></thead>
            <tbody>
              {TYPE_CHART.map((t) => (
                <tr key={t.atk}>
                  <td className="guide-stat-name">{t.atk}</td>
                  <td style={{ color: 'var(--hud-success, #44ff44)' }}>{t.strong}</td>
                  <td style={{ color: 'var(--hud-danger, #ff4444)' }}>{t.weak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── STAB + Bonuses ── */}
      <section className="guide-section">
        <h2 className="guide-heading">⭐ Damage Bonuses</h2>
        <div className="guide-cards-row">
          <div className="guide-card">
            <div className="guide-card-icon">🏷️</div>
            <h3>STAB</h3>
            <p><strong>+50%</strong> damage when move's element matches your chakra nature.</p>
          </div>
          <div className="guide-card">
            <div className="guide-card-icon">🥷</div>
            <h3>Type Synergy</h3>
            <p><strong>+20%</strong> when move category matches your ninja type (e.g. Taijutsu user → Taijutsu moves).</p>
          </div>
          <div className="guide-card">
            <div className="guide-card-icon">📈</div>
            <h3>Mastery</h3>
            <p>Jutsu-linked moves scale <strong>0.6×→1.2×</strong> based on training mastery (0%→100%).</p>
          </div>
        </div>
      </section>

      {/* ── Ultimate Bar ── */}
      <section className="guide-section">
        <h2 className="guide-heading">⚡ Ultimate Bar</h2>
        <p className="guide-text">
          Each fighter has an <strong>Ultimate Bar (0–100%)</strong>. It charges when
          your moves land. Once full, you can unleash a devastating{' '}
          <strong>Ultimate Move</strong> (140–150 power). Using an ultimate resets the bar to 0.
        </p>
        <p className="guide-note">
          ⚡ Ultimate moves are locked until the bar reaches 100%. Plan your strategy!
        </p>
      </section>

      {/* ── Status Effects ── */}
      <section className="guide-section">
        <h2 className="guide-heading">💀 Status Effects (Debuffs)</h2>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead><tr><th>Icon</th><th>Status</th><th>Effect</th></tr></thead>
            <tbody>
              {STATUS_EFFECTS.map((s) => (
                <tr key={s.name}>
                  <td>{s.icon}</td>
                  <td className="guide-stat-name">{s.name}</td>
                  <td>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Buff Effects ── */}
      <section className="guide-section">
        <h2 className="guide-heading">✨ Buff Effects</h2>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead><tr><th>Icon</th><th>Buff</th><th>Effect</th></tr></thead>
            <tbody>
              {BUFF_EFFECTS.map((b) => (
                <tr key={b.name}>
                  <td>{b.icon}</td>
                  <td className="guide-stat-name">{b.name}</td>
                  <td>{b.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Turn Order ── */}
      <section className="guide-section">
        <h2 className="guide-heading">⏱️ Turn Order</h2>
        <p className="guide-text">
          The fighter with <strong>higher effective Speed</strong> attacks first each turn.
          If Speed is tied, it's random. Use <em>Body Flicker</em> to boost your speed 
          and seize the initiative!
        </p>
      </section>

      {/* ── Evasion ── */}
      <section className="guide-section">
        <h2 className="guide-heading">👤 Evasion</h2>
        <p className="guide-text">
          Your <strong>evasion stat</strong> is subtracted from the opponent's hit chance.
          Base evasion is 3–18 depending on difficulty. The <em>Evasion Up</em> buff adds +25.
          Combined with accuracy debuffs (Blind), you can become very hard to hit!
        </p>
      </section>

      {/* ── Tips ── */}
      <section className="guide-section">
        <h2 className="guide-heading">💡 Pro Tips</h2>
        <ul className="guide-tips-list">
          <li>Use <strong>status moves</strong> early — buffs last 3 turns and stack with other advantages.</li>
          <li><strong>STAB + Type effectiveness</strong> together deal 2.25× damage. Build your team around this!</li>
          <li>Save your <strong>ultimate</strong> for when the enemy has low SpDef (use Guard Down first).</li>
          <li><strong>Genjutsu</strong> users shine with confusion/paralysis — the enemy may never get to attack.</li>
          <li><strong>Taijutsu</strong> is free — no chakra cost. Perfect when you're running low.</li>
          <li>Higher <strong>mastery</strong> on jutsu = more damage. Train your signs!</li>
        </ul>
      </section>
    </div>
  );
}
