import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome, Shinobi!',
    description:
      'Welcome to Shinobi Tracker — your path to becoming a legendary ninja begins here. Let me show you around the village.',
    icon: '🥷',
    route: null,
  },
  {
    title: 'Dashboard',
    description:
      'Your ninja HQ. View your rank, XP progress, stats, active missions, and quick actions — all in one place.',
    icon: '📊',
    route: '/dashboard',
    navHighlight: 'Dashboard',
  },
  {
    title: 'Training',
    description:
      'Practice hand signs in front of your camera. Complete drills to earn XP and level up your jutsu mastery.',
    icon: '🎯',
    route: '/training',
    navHighlight: 'Training',
  },
  {
    title: 'Jutsu Tree',
    description:
      'View and unlock new jutsu as you progress. Each jutsu requires mastering specific hand sign sequences.',
    icon: '🌳',
    route: '/jutsu',
    navHighlight: 'Jutsu',
  },
  {
    title: 'Academy',
    description:
      'Your field manual. Study hand sign references, jutsu sequences, and tips to improve your technique.',
    icon: '📖',
    route: '/academy',
    navHighlight: 'Academy',
  },
  {
    title: 'Missions',
    description:
      'Take on daily missions to earn bonus XP. Complete clan-specific and rank challenges to prove your worth.',
    icon: '📜',
    route: '/missions',
    navHighlight: 'Missions',
  },
  {
    title: 'Clan Hall',
    description:
      'Explore your clan\'s history, traits, and unique jutsu path. Your clan shapes your ninja identity.',
    icon: '🏯',
    route: '/clan',
    navHighlight: 'Clan',
  },
  {
    title: 'Promotion Exam',
    description:
      'Ready to rank up? Take the exam when you\'ve earned enough XP. Pass to unlock new ranks and abilities.',
    icon: '🎓',
    route: '/exam',
    navHighlight: 'Exam',
  },
  {
    title: 'Battle Arena',
    description:
      'Challenge AI opponents or other shinobi in tactical hand-sign battles. Coming soon!',
    icon: '⚔️',
    route: '/battle-setup',
    navHighlight: 'Battle',
  },
  {
    title: 'You\'re Ready!',
    description:
      'Your journey begins now. Head to Training to start practicing hand signs and earning XP. Good luck, shinobi!',
    icon: '✨',
    route: null,
  },
];

interface TutorialOverlayProps {
  readonly onComplete: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const navigate = useNavigate();

  const current = TUTORIAL_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  /* Highlight the matching nav link */
  useEffect(() => {
    const navHighlight = current.navHighlight;
    if (!navHighlight) return;

    const links = document.querySelectorAll<HTMLElement>('.nav-link');
    let matched: HTMLElement | null = null;
    links.forEach((el) => {
      const text = el.childNodes[0]?.textContent?.trim();
      if (text === navHighlight) {
        matched = el;
        el.classList.add('tutorial-highlight');
      }
    });
    return () => {
      if (matched) matched.classList.remove('tutorial-highlight');
    };
  }, [step, current.navHighlight]);

  function goNext() {
    if (isLast) {
      setIsExiting(true);
      setTimeout(onComplete, 400);
      return;
    }
    setDirection('next');
    setStep((s) => s + 1);
    const nextRoute = TUTORIAL_STEPS[step + 1]?.route;
    if (nextRoute) navigate(nextRoute);
  }

  function goPrev() {
    if (isFirst) return;
    setDirection('prev');
    setStep((s) => s - 1);
    const prevRoute = TUTORIAL_STEPS[step - 1]?.route;
    if (prevRoute) navigate(prevRoute);
  }

  function skip() {
    setIsExiting(true);
    navigate('/dashboard');
    setTimeout(onComplete, 400);
  }

  return (
    <div className={`tutorial-overlay ${isExiting ? 'tutorial-exit' : ''}`}>
      <div className="tutorial-backdrop" />

      <div
        className={`tutorial-card tutorial-slide-${direction}`}
        key={step}
      >
        {/* Progress dots */}
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, i) => (
            <span
              key={`step-${i}`}
              className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="tutorial-icon">{current.icon}</div>
        <h2 className="tutorial-title">{current.title}</h2>
        <p className="tutorial-desc">{current.description}</p>

        <div className="tutorial-step-label">
          {step + 1} / {TUTORIAL_STEPS.length}
        </div>

        <div className="tutorial-actions">
          {!isFirst && (
            <button className="tutorial-btn tutorial-btn-secondary" onClick={goPrev}>
              ← Back
            </button>
          )}
          <button className="tutorial-btn tutorial-btn-primary" onClick={goNext}>
            {isLast ? 'Start Training →' : 'Next →'}
          </button>
        </div>

        <button className="tutorial-skip" onClick={skip}>
          Skip Tour
        </button>
      </div>
    </div>
  );
}
