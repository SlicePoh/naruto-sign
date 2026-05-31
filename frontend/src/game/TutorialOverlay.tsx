import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   Interactive Tutorial — spotlight-based guided tour
   ═══════════════════════════════════════════════════════════════ */

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  route: string | null;
  targetSelector: string | null;
  placement: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: 'click';
  nextRoute?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome, Shinobi!',
    description:
      'Your path to becoming a legendary ninja begins here. Let me show you around the village.',
    icon: '🥷',
    route: '/dashboard',
    targetSelector: null,
    placement: 'center',
  },
  {
    title: 'Your Ninja HQ',
    description:
      'This is your Dashboard — your rank, XP, stats, and quick actions are all here at a glance.',
    icon: '📊',
    route: '/dashboard',
    targetSelector: '.page-header',
    placement: 'bottom',
  },
  {
    title: 'Head to Training',
    description:
      'Click on Training to see where you\'ll practice real hand signs and earn XP!',
    icon: '🎯',
    route: '/dashboard',
    targetSelector: 'a[href="/training"]',
    placement: 'bottom',
    action: 'click',
    nextRoute: '/training',
  },
  {
    title: 'Training Ground',
    description:
      'Welcome to your Training Ground! Start a Hand Sign Practice session to begin learning real ninja hand signs in front of your camera.',
    icon: '🎯',
    route: '/training',
    targetSelector: '.g-grid-3 .g-card:first-child',
    placement: 'right',
  },
  {
    title: 'Check Your Jutsu',
    description:
      'Click on Jutsu to see your skill tree — unlock new techniques as you master hand signs!',
    icon: '🌳',
    route: '/training',
    targetSelector: 'a[href="/jutsu"]',
    placement: 'bottom',
    action: 'click',
    nextRoute: '/jutsu',
  },
  {
    title: 'Your Jutsu Path',
    description:
      'Each jutsu requires mastering specific hand sign sequences. Start with the basics and unlock powerful techniques!',
    icon: '🌳',
    route: '/jutsu',
    targetSelector: '.page-body',
    placement: 'top',
  },
  {
    title: 'Study & Missions',
    description:
      'Visit the Academy for hand sign references and study materials. Check Missions for daily XP challenges.',
    icon: '📖',
    route: '/jutsu',
    targetSelector: 'a[href="/academy"]',
    placement: 'bottom',
  },
  {
    title: 'Rank Up!',
    description:
      'Earn XP through training and missions, then take the Promotion Exam to climb from Academy Student to Genin and beyond!',
    icon: '🎓',
    route: '/jutsu',
    targetSelector: 'a[href="/exam"]',
    placement: 'bottom',
  },
  {
    title: 'You\'re Ready!',
    description:
      'Head to Training and start a practice session — your first hand signs await. Good luck, shinobi!',
    icon: '✨',
    route: null,
    targetSelector: null,
    placement: 'center',
  },
];

function getCardPosition(
  targetRect: DOMRect | null,
  placement: 'center' | 'top' | 'bottom' | 'left' | 'right',
): React.CSSProperties {
  if (!targetRect || placement === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const GAP = 20;
  const CARD_W = 400;

  switch (placement) {
    case 'bottom': {
      return {
        top: targetRect.bottom + GAP,
        left: Math.max(16, Math.min(
          targetRect.left + targetRect.width / 2 - CARD_W / 2,
          globalThis.innerWidth - CARD_W - 16,
        )),
      };
    }
    case 'top': {
      return { bottom: globalThis.innerHeight - targetRect.top + GAP };
    }
    case 'right': {
      const topVal = Math.max(16, targetRect.top + targetRect.height / 2 - 120);
      return { top: topVal, left: Math.min(targetRect.right + GAP, globalThis.innerWidth - CARD_W - 16) };
    }
    case 'left': {
      const topVal = Math.max(16, targetRect.top + targetRect.height / 2 - 120);
      return { top: topVal, right: globalThis.innerWidth - targetRect.left + GAP };
    }
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

interface TutorialOverlayProps {
  readonly onComplete: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const navigate = useNavigate();
  const location = useLocation();
  const advancingRef = useRef(false);

  const current = TUTORIAL_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  // Navigate to step's route when step changes
  useEffect(() => {
    if (current.route && location.pathname !== current.route) {
      navigate(current.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Find and measure target element, elevate it for click steps
  useEffect(() => {
    if (!current.targetSelector) {
      setTargetRect(null);
      return;
    }

    let attempts = 0;
    let rafId: number | null = null;

    const findTarget = () => {
      const el = document.querySelector(current.targetSelector!) as HTMLElement | null;
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        if (current.action === 'click') {
          el.style.position = 'relative';
          el.style.zIndex = '10001';
          el.classList.add('tutorial-elevated');
        }
      } else if (attempts < 30) {
        attempts++;
        rafId = requestAnimationFrame(findTarget);
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(findTarget, 150);

    const remeasure = () => {
      const el = document.querySelector(current.targetSelector!) as HTMLElement | null;
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
      document.querySelectorAll('.tutorial-elevated').forEach((e) => {
        (e as HTMLElement).style.position = '';
        (e as HTMLElement).style.zIndex = '';
        e.classList.remove('tutorial-elevated');
      });
    };
  }, [step, current.targetSelector, current.action]);

  // Detect navigation for click-action steps
  useEffect(() => {
    if (current.action !== 'click' || !current.nextRoute) return;
    if (location.pathname === current.nextRoute && !advancingRef.current) {
      advancingRef.current = true;
      // Small delay to let the page render before showing spotlight
      setTimeout(() => goNext(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const cleanUpElevated = useCallback(() => {
    document.querySelectorAll('.tutorial-elevated').forEach((e) => {
      (e as HTMLElement).style.position = '';
      (e as HTMLElement).style.zIndex = '';
      e.classList.remove('tutorial-elevated');
    });
  }, []);

  function goNext() {
    cleanUpElevated();
    advancingRef.current = false;

    if (step >= TUTORIAL_STEPS.length - 1) {
      setIsExiting(true);
      navigate('/training');
      setTimeout(onComplete, 400);
      return;
    }

    setDirection('next');
    const nextStep = TUTORIAL_STEPS[step + 1];
    setStep((s) => s + 1);
    if (nextStep.route && globalThis.location.pathname !== nextStep.route) {
      navigate(nextStep.route);
    }
  }

  function goBack() {
    if (isFirst) return;
    cleanUpElevated();
    advancingRef.current = false;
    setDirection('prev');
    const prevStep = TUTORIAL_STEPS[step - 1];
    setStep((s) => s - 1);
    if (prevStep.route && globalThis.location.pathname !== prevStep.route) {
      navigate(prevStep.route);
    }
  }

  function skip() {
    cleanUpElevated();
    setIsExiting(true);
    navigate('/dashboard');
    setTimeout(onComplete, 400);
  }

  const hasSpotlight = !!current.targetSelector && !!targetRect;
  const cardStyle = getCardPosition(
    hasSpotlight ? targetRect : null,
    current.placement,
  );

  return (
    <>
      {/* Click blocker — blocks all clicks across the page */}
      <div
        className={`tutorial-click-blocker ${isExiting ? 'tutorial-exit' : ''}`}
      />

      {/* Visual overlay — spotlight or full dark backdrop */}
      {hasSpotlight && targetRect ? (
        <div
          className={`tutorial-spotlight ${isExiting ? 'tutorial-exit' : ''}`}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      ) : (
        <div
          className={`tutorial-full-backdrop ${isExiting ? 'tutorial-exit' : ''}`}
        />
      )}

      {/* Pointer arrow for spotlight steps */}
      {hasSpotlight && targetRect && (
        <div
          className="tutorial-pointer"
          style={{
            top: targetRect.top + targetRect.height / 2 - 14,
            left: targetRect.left - 36,
          }}
        >
          &#x25B6;
        </div>
      )}

      {/* Tutorial instruction card */}
      <div
        className={`tutorial-card-v2 tutorial-slide-${direction}`}
        key={step}
        style={cardStyle}
      >
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="tutorial-icon">{current.icon}</div>
        <h2 className="tutorial-title">{current.title}</h2>
        <p className="tutorial-desc">{current.description}</p>

        {current.action === 'click' && (
          <p className="tutorial-action-hint">
            &#x1F446; Click the highlighted element to continue
          </p>
        )}

        <div className="tutorial-step-label">
          {step + 1} / {TUTORIAL_STEPS.length}
        </div>

        <div className="tutorial-actions">
          {!isFirst && (
            <button className="tutorial-btn tutorial-btn-secondary" onClick={goBack}>
              ← Back
            </button>
          )}
          {current.action !== 'click' && (
            <button className="tutorial-btn tutorial-btn-primary" onClick={goNext}>
              {isLast ? 'Start Training →' : 'Next →'}
            </button>
          )}
        </div>

        <button className="tutorial-skip" onClick={skip}>
          Skip Tour
        </button>
      </div>
    </>
  );
}
