import { useEffect, useRef, useState } from 'react';
import { useCamera } from './camera/useCamera';
import { useHandLandmarks } from './handTracking/useHandLandmarks';
import { HandOverlay } from './handTracking/HandOverlay';
import type { SignLabel } from './classifier/types';
import { loadModel, predictLocal, isModelLoaded } from './classifier/localClassifier';
import { buildCombinedFeatures } from './classifier/modelFeatures';
import { useJutsuEngine } from './jutsuEngine/useJutsuEngine';
import { ThreeScene } from './scene/ThreeScene';
import { ShadowClone } from './effects/ShadowClone';
import { SmokeEffect } from './effects/SmokeEffect';
import { FallingLeaves } from './effects/FallingLeaves';
import { useShadowCloneHold } from './effects/useShadowCloneHold';
import { RasenganOverlay, ChakraReadyIndicator, useRasenganDetection } from './effects/rasengan';
import { useRotatingBackground } from './effects/useRotatingBackground';
import { useAppStore } from './store/useAppStore';
import './App.css';

function App() {
  const { videoRef, error, isReady } = useCamera();
  const { hands } = useHandLandmarks(videoRef.current, isReady);
  const bgUrl = useRotatingBackground();
  
  const currentSign = useAppStore((state) => state.currentSign);
  const signBuffer = useAppStore((state) => state.signBuffer);
  const activeJutsu = useAppStore((state) => state.activeJutsu);
  const confidence = useAppStore((state) => state.confidence);
  const setCurrentSign = useAppStore((state) => state.setCurrentSign);
  const setConfidence = useAppStore((state) => state.setConfidence);
  const triggerJutsu = useAppStore((state) => state.triggerJutsu);
  const shadowCloneActive = useAppStore((state) => state.shadowCloneActive);
  const activateShadowClone = useAppStore((state) => state.activateShadowClone);
  const activateRasengan = useAppStore((state) => state.activateRasengan);
  const rasenganActive = useAppStore((state) => state.rasenganActive);
  const score = useAppStore((state) => state.score);
  const currentTrial = useAppStore((state) => state.currentTrial);
  const completedTrials = useAppStore((state) => state.completedTrials);
  const awardPoints = useAppStore((state) => state.awardPoints);
  const advanceTrial = useAppStore((state) => state.advanceTrial);
  const shadowHoldStartTime = useAppStore((state) => state.shadowHoldStartTime);
  
  // Debouncing: Track sign stability
  const signStabilityRef = useRef({ sign: 'unknown' as SignLabel, count: 0 });
  // 1-second cooldown after a sign is confirmed (prevents duplicate registrations)
  const cooldownUntilRef = useRef(0);
  // Track whether the current trial was already scored
  const lastScoredTrialRef = useRef(0);

  // Shadow hold progress (0–1) for the loading indicator
  const [shadowHoldProgress, setShadowHoldProgress] = useState(0);
  useEffect(() => {
    if (shadowHoldStartTime === null || shadowCloneActive) {
      setShadowHoldProgress(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - shadowHoldStartTime;
      setShadowHoldProgress(Math.min(elapsed / 2000, 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shadowHoldStartTime, shadowCloneActive]);
  
  // Use jutsu engine to detect sequences
  useJutsuEngine(currentSign);

  // Shadow Clone: 2-second hold detection + 10-second duration
  useShadowCloneHold(currentSign);

  // Rasengan: backend-driven temporal gesture detection
  useRasenganDetection(hands);

  // Award points when a trial jutsu is completed
  useEffect(() => {
    if (!activeJutsu) return;
    if (activeJutsu === currentTrial.jutsuKey && lastScoredTrialRef.current !== completedTrials + 1) {
      const JUTSU_POINTS: Record<string, number> = { rasengan: 50, fireball: 30, chidori: 30, shadowClone: 20 };
      const pts = JUTSU_POINTS[activeJutsu] ?? 10;
      awardPoints(pts);
      lastScoredTrialRef.current = completedTrials + 1;
      // Advance after a short delay so the player sees the success
      const t = setTimeout(() => advanceTrial(), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [activeJutsu, currentTrial, completedTrials, awardPoints, advanceTrial]);

  // Load the RF model once on mount
  useEffect(() => {
    loadModel().catch((err) => console.error('Failed to load RF model:', err));
  }, []);

  // Classify hands locally — no API round-trip, runs synchronously (~1-2 ms)
  useEffect(() => {
    if (!isModelLoaded()) return;

    // Don't reclassify while rasengan effect is playing —
    // it would feed noise into the jutsu engine and overwrite the label.
    if (rasenganActive) return;

    const hasHands = hands && hands.length > 0 && hands.some(h => h.length === 21);

    if (!hasHands) {
      setCurrentSign('unknown');
      setConfidence(0);
      signStabilityRef.current = { sign: 'unknown', count: 0 };
      return;
    }

    // Build the same 161-dim feature vector the Python backend uses
    const features = buildCombinedFeatures(hands);
    const { sign: rawSign, confidence: conf } = predictLocal(features);

    // Treat "neutral" from the model as no-sign — this prevents edge-case
    // hand positions (relaxed hands, transitions) from being misclassified.
    const detectedSign: SignLabel = (rawSign === 'neutral' || rawSign === 'unknown') ? 'unknown' : rawSign;
    const detectedConfidence = conf;

    // During cooldown period, only accept 'unknown' (to reset state),
    // but ignore any new sign detection to avoid duplicate registrations.
    const now = Date.now();
    if (now < cooldownUntilRef.current && detectedSign !== 'unknown') {
      setConfidence(detectedConfidence);
      return;
    }

    // Stability debounce: require N consecutive identical predictions
    const REQUIRED = detectedConfidence > 0.85 ? 2 : 3;

    if (detectedSign === signStabilityRef.current.sign) {
      signStabilityRef.current.count++;
    } else {
      signStabilityRef.current = { sign: detectedSign, count: 1 };
    }

    if (signStabilityRef.current.count >= REQUIRED) {
      if (currentSign !== detectedSign) {
        setCurrentSign(detectedSign);
        if (detectedSign !== 'unknown') {
          console.log('✅ Confirmed sign:', detectedSign.toUpperCase());
          // Start 1-second cooldown so the same sign isn't re-registered
          cooldownUntilRef.current = Date.now() + 1000;
        }
      }
    }

    setConfidence(detectedConfidence);
  }, [hands, setCurrentSign, setConfidence, currentSign, rasenganActive]);

  const jutsuLabels: Record<string, string> = {
    shadowClone: 'SHADOW CLONE JUTSU',
    fireball: 'FIRE STYLE — FIREBALL',
    chidori: 'CHIDORI',
    rasengan: 'RASENGAN',
  };
  const activeJutsuLabel = activeJutsu ? (jutsuLabels[activeJutsu] ?? activeJutsu) : '';

  return (
    <div className="app" style={{ backgroundImage: `url('${bgUrl}')` }}>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        muted
        playsInline
      />

      <FallingLeaves />

      <div className="scene-container">
        <ThreeScene videoElement={videoRef.current} />

        {videoRef.current && (
          <ShadowClone
            videoElement={videoRef.current}
            active={shadowCloneActive}
          />
        )}

        <SmokeEffect active={shadowCloneActive} videoElement={videoRef.current} />

        <HandOverlay hands={hands} />

        <RasenganOverlay hands={hands} videoElement={videoRef.current} />
      </div>

      <div className="test-controls">
        <button
          type="button"
          className="test-button"
          onClick={() => {
            activateShadowClone();
            triggerJutsu('shadowClone');
          }}
        >
          Test Shadow Clone
        </button>
        <button
          type="button"
          className="test-button test-button-rasengan"
          onClick={() => {
            activateRasengan();
            triggerJutsu('rasengan');
          }}
        >
          Test Rasengan
        </button>
      </div>

      <div className="game-hud">
        <div className="score-badge">
          <span className="score-label">Score</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="trial-card">
          <span className="trial-header">MISSION #{completedTrials + 1}</span>
          <span className="trial-name">{currentTrial.name}</span>
          <span className="trial-desc">{currentTrial.description}</span>
        </div>
      </div>

      {/* HUD corner accents */}
      <div className="hud-corner hud-corner--tl" />
      <div className="hud-corner hud-corner--tr" />
      <div className="hud-corner hud-corner--bl" />
      <div className="hud-corner hud-corner--br" />

      <div className="overlay">
        <div className="header">
          <h1>SHINOBI TRACKER</h1>
          <span className="subtitle">PERFORM THE TRIAL JUTSU TO EARN XP</span>
        </div>

        {error && (
          <div className="error">
            ⚠️ {error}
          </div>
        )}

        <div className="info-panel-compact">
          <div className="info-row">
            <span className="label">Sign:</span>
            <span className={`sign ${currentSign === 'unknown' ? '' : 'detected'}`}>
              {currentSign.toUpperCase()}
            </span>
          </div>

          <div className="info-row">
            <span className="label">Sequence:</span>
            <span className="buffer">
              {signBuffer.length > 0
                ? signBuffer.map(s => s.toUpperCase()).join(' → ')
                : 'None'}
            </span>
          </div>

          <div className="info-row">
              <span className="label">Confidence:</span>
              <span className="buffer">
                {confidence ? `${(confidence * 100).toFixed(2)}%` : 'N/A'}
              </span>
          </div>

          {activeJutsu && (
            <div className="jutsu-notification">
              {activeJutsuLabel}
            </div>
          )}

          {/* Shadow clone hold progress bar */}
          {shadowHoldProgress > 0 && !shadowCloneActive && (
            <div className="hold-progress">
              <div className="hold-progress-label">Charging Shadow Clone…</div>
              <div className="hold-progress-track">
                <div className="hold-progress-fill" style={{ width: `${shadowHoldProgress * 100}%` }} />
              </div>
            </div>
          )}

          <ChakraReadyIndicator />
        </div>
      </div>
    </div>
  );
}

export default App;
