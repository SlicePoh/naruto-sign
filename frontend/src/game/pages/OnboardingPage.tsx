import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../useGameStore';
import type { NinjaType, ClanId, ChakraNature } from '../types';
import { NINJA_TYPES, CLANS, CHAKRA_NATURES } from '../types';

export function OnboardingPage() {
  const step = useGameStore((s) => s.onboardingStep);
  const setStep = useGameStore((s) => s.setOnboardingStep);
  const createProfile = useGameStore((s) => s.createProfile);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [ninjaType, setNinjaType] = useState<NinjaType | null>(null);
  const [clan, setClan] = useState<ClanId | null>(null);
  const [nature, setNature] = useState<ChakraNature | null>(null);

  const totalSteps = 4;

  const canProceed = () => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return ninjaType !== null;
    if (step === 2) return clan !== null;
    if (step === 3) return nature !== null;
    return false;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else if (step === 3 && ninjaType && clan && nature) {
      createProfile(name.trim(), ninjaType, clan, nature);
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="onboard-page">
      {/* Step indicators */}
      <div className="onboard-step-indicator">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`onboard-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
          />
        ))}
      </div>

      {/* Step 0: Name */}
      {step === 0 && (
        <>
          <h1 className="onboard-title">BEGIN YOUR NINJA PATH</h1>
          <p className="onboard-subtitle">What is your name, shinobi?</p>
          <input
            className="g-input"
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canProceed() && handleNext()}
            autoFocus
          />
        </>
      )}

      {/* Step 1: Ninja Type */}
      {step === 1 && (
        <>
          <h1 className="onboard-title">CHOOSE YOUR PATH</h1>
          <p className="onboard-subtitle">Select your ninja specialization</p>
          <div className="onboard-grid">
            {NINJA_TYPES.map((nt) => (
              <button
                key={nt.id}
                type="button"
                className={`select-card ${ninjaType === nt.id ? 'selected' : ''}`}
                onClick={() => setNinjaType(nt.id)}
              >
                <div className="select-card-icon">{nt.icon}</div>
                <div className="select-card-name">{nt.name}</div>
                <div className="select-card-desc">{nt.description}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 2: Clan */}
      {step === 2 && (
        <>
          <h1 className="onboard-title">CHOOSE YOUR CLAN</h1>
          <p className="onboard-subtitle">Your clan shapes your strengths and jutsu path</p>
          <div className="onboard-grid">
            {CLANS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`select-card ${clan === c.id ? 'selected' : ''}`}
                onClick={() => setClan(c.id)}
              >
                <div className="select-card-icon"><img src={c.icon} alt={c.name} className="clan-icon-img" /></div>
                <div className="select-card-name">{c.name}</div>
                <div className="select-card-desc">{c.description}</div>
                <div className="select-card-passive">{c.passive}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 3: Chakra Nature */}
      {step === 3 && (
        <>
          <h1 className="onboard-title">CHOOSE CHAKRA NATURE</h1>
          <p className="onboard-subtitle">Your elemental affinity unlocks nature-based jutsu</p>
          <div className="onboard-grid">
            {CHAKRA_NATURES.map((cn) => (
              <button
                key={cn.id}
                type="button"
                className={`select-card ${nature === cn.id ? 'selected' : ''}`}
                onClick={() => setNature(cn.id)}
              >
                <div className="select-card-icon">{cn.icon}</div>
                <div className="select-card-name">{cn.name}</div>
                <div className="select-card-desc">{cn.description}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Navigation buttons */}
      <div className="onboard-actions">
        {step > 0 && (
          <button className="g-btn" onClick={handleBack}>
            Back
          </button>
        )}
        <button
          className="g-btn g-btn--large"
          disabled={!canProceed()}
          onClick={handleNext}
        >
          {step === 3 ? 'START TRAINING' : 'CONTINUE'}
        </button>
      </div>
    </div>
  );
}
