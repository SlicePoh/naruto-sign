import { Link } from 'react-router-dom';
import { GameNav } from '../GameNav';
import { JUTSU_REFERENCE } from '../reference';

export function AcademyGuidePage() {
  return (
    <div className="game-page">
      <GameNav />

      <div className="page-header">
        <h1 className="page-title">ACADEMY GUIDE</h1>
        <p className="page-subtitle">Core Naruto worldbuilding and jutsu knowledge for the MVP</p>
      </div>

      <div className="page-body">
        <div className="g-card g-card--accent">
          <div className="g-card-title g-card-title--accent">SHINOBI FIELD MANUAL</div>
          <p className="select-card-desc">
            This page turns the uploaded jutsu reference into in-game academy knowledge so new players can
            understand chakra, jutsu classes, technique ranks, and bloodline powers before jumping into training.
          </p>
        </div>

        <div className="g-grid-2">
          <div className="g-card">
            <div className="g-card-title">{JUTSU_REFERENCE.intro.title}</div>
            <p className="select-card-desc">{JUTSU_REFERENCE.intro.body}</p>
            <div className="academy-list" style={{ marginTop: 12 }}>
              {JUTSU_REFERENCE.intro.highlights.map((item) => (
                <span key={item} className="g-badge academy-chip">{item}</span>
              ))}
            </div>
          </div>

          <div className="g-card">
            <div className="g-card-title">{JUTSU_REFERENCE.origins.title}</div>
            <p className="select-card-desc">{JUTSU_REFERENCE.origins.body}</p>
          </div>
        </div>

        <div className="g-card">
          <div className="g-card-title">{JUTSU_REFERENCE.chakra.title}</div>
          <div className="g-grid-2">
            <div>
              <div className="academy-subtitle">Execution Flow</div>
              <ol className="academy-ordered-list">
                {JUTSU_REFERENCE.chakra.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <div className="academy-subtitle">Important Notes</div>
              <ul className="academy-list academy-bullets">
                {JUTSU_REFERENCE.chakra.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="g-card">
          <div className="g-card-title">MAIN JUTSU TYPES</div>
          <div className="g-grid-3">
            {JUTSU_REFERENCE.mainTypes.map((type) => (
              <div key={type.title} className="jutsu-card">
                <div className="jutsu-name">{type.title}</div>
                <div className="jutsu-desc">{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="g-card">
          <div className="g-card-title">SUB-TYPES TO SUPPORT LATER</div>
          <div className="academy-list">
            {JUTSU_REFERENCE.subTypes.map((type) => (
              <span key={type} className="g-badge academy-chip">{type}</span>
            ))}
          </div>
        </div>

        <div className="g-card">
          <div className="g-card-title">TECHNIQUE RANKS</div>
          <div className="g-grid-3">
            {JUTSU_REFERENCE.ranks.map((item) => (
              <div key={item.rank} className="jutsu-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div className="jutsu-name">{item.rank}</div>
                  <span className="g-badge">{item.level}</span>
                </div>
                <div className="jutsu-desc">{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="g-card">
          <div className="g-card-title">BLOODLINE AND SPECIAL ABILITIES</div>
          <div className="g-grid-4">
            {JUTSU_REFERENCE.bloodlines.map((item) => (
              <div key={item.title} className="jutsu-card">
                <div className="jutsu-name">{item.title}</div>
                <div className="jutsu-desc">{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="g-card g-card--accent">
          <div className="g-card-title g-card-title--accent">QUICK SUMMARY</div>
          <div className="academy-summary-grid">
            {JUTSU_REFERENCE.quickSummary.map(([label, meaning]) => (
              <div key={label} className="academy-summary-row">
                <span className="academy-summary-label">{label}</span>
                <span className="academy-summary-value">{meaning}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="g-card">
          <div className="g-card-title">MVP USAGE</div>
          <p className="select-card-desc" style={{ marginBottom: 14 }}>
            The current MVP focuses on hand-sign training, jutsu progression, missions, and exams. This academy guide
            gives players enough Naruto context to understand why signs, chakra control, and rank progression matter.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/training" className="g-btn">GO TO TRAINING</Link>
            <Link to="/jutsu" className="g-btn g-btn--accent">VIEW JUTSU TREE</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
