import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { useGameStore } from './game/useGameStore';
import { JUTSU_CATALOG, type JutsuId } from './game/types';
import './App.css';

// ── Drill system ──────────────────────────────────────────────

type DrillKind = 'sign' | 'jutsu';

interface Drill {
  type: DrillKind;
  id: string;
  name: string;
  description: string;
  targetSign?: SignLabel;
  jutsuId?: JutsuId;
  xpReward: number;
}

const TRAINABLE_SIGNS: SignLabel[] = [
  'tiger', 'ram', 'dog', 'hare', 'horse',
  'rat', 'serpent', 'shadow', 'bird', 'boar', 'ox', 'dragon',
];

const SIGN_NAMES: Record<string, string> = {
  tiger: 'Tiger (寅)', ram: 'Ram (未)', serpent: 'Serpent (巳)',
  dog: 'Dog (戌)', hare: 'Hare (卯)', horse: 'Horse (午)',
  rat: 'Rat (子)', shadow: 'Shadow Seal (影)',
  bird: 'Bird (酉)', boar: 'Boar (亥)', ox: 'Ox (丑)', dragon: 'Dragon (辰)',
};

const DETECTABLE_JUTSU = new Set<JutsuId>([
  'clone', 'transformation', 'substitution', 'shadowClone',
  'fireball', 'chidori', 'rasengan', 'waterDragon', 'earthWall', 'windBlade',
]);

function generateDrills(unlockedJutsuIds: JutsuId[]): Drill[] {
  const drills: Drill[] = [];

  // Pick 7 random sign drills
  const shuffled = [...TRAINABLE_SIGNS].sort(() => Math.random() - 0.5);
  for (const sign of shuffled.slice(0, 7)) {
    drills.push({
      type: 'sign',
      id: `sign-${sign}`,
      name: SIGN_NAMES[sign] ?? sign.toUpperCase(),
      description: `Perform the ${sign.toUpperCase()} hand sign`,
      targetSign: sign,
      xpReward: 5,
    });
  }

  // Add jutsu drills from unlocked jutsu
  for (const jutsuId of unlockedJutsuIds) {
    if (!DETECTABLE_JUTSU.has(jutsuId)) continue;
    const def = JUTSU_CATALOG.find((j) => j.id === jutsuId);
    if (!def) continue;
    drills.push({
      type: 'jutsu',
      id: `jutsu-${def.id}`,
      name: def.name,
      description:
        def.requiredSigns.length > 0
          ? def.requiredSigns.join(' → ').toUpperCase()
          : 'Form chakra with both hands',
      jutsuId: def.id,
      xpReward: def.xpReward,
    });
  }

  return drills.sort(() => Math.random() - 0.5);
}

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
  const shadowHoldStartTime = useAppStore((state) => state.shadowHoldStartTime);

  // ── Game store integration ──────────────────────────
  const gameProfile = useGameStore((s) => s.profile);
  const addXP = useGameStore((s) => s.addXP);
  const recordJutsuSuccess = useGameStore((s) => s.recordJutsuSuccess);
  const incrementSessions = useGameStore((s) => s.incrementTrainingSessions);

  // ── Drill system state ─────────────────────────────
  const unlockedJutsuIds = useMemo(
    () => gameProfile?.jutsuProgress.filter((j) => j.unlocked).map((j) => j.jutsuId) ?? [],
    [gameProfile],
  );
  const [drills] = useState(() => generateDrills(unlockedJutsuIds));
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillStatus, setDrillStatus] = useState<'ready' | 'active' | 'success' | 'complete'>('ready');
  const [sessionXP, setSessionXP] = useState(0);
  const sessionStartedRef = useRef(false);
  
  // Debouncing: Track sign stability
  const signStabilityRef = useRef({ sign: 'unknown' as SignLabel, count: 0 });
  // 1-second cooldown after a sign is confirmed (prevents duplicate registrations)
  const cooldownUntilRef = useRef(0);

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

  // ── Drill ready → active transition (brief delay to prevent false triggers) ──
  useEffect(() => {
    if (drillStatus !== 'ready') return;
    const t = setTimeout(() => setDrillStatus('active'), 800);
    return () => clearTimeout(t);
  }, [drillStatus, drillIndex]);

  // ── Drill completion detection ──
  const currentDrill = drillIndex < drills.length ? drills[drillIndex] : null;

  useEffect(() => {
    if (drillStatus !== 'active' || !currentDrill) return;

    let matched = false;
    if (currentDrill.type === 'sign' && currentDrill.targetSign && currentSign === currentDrill.targetSign) {
      matched = true;
    }
    if (currentDrill.type === 'jutsu' && currentDrill.jutsuId && activeJutsu === currentDrill.jutsuId) {
      matched = true;
    }

    if (!matched) return;

    setDrillStatus('success');
    const xp = currentDrill.xpReward;
    setSessionXP((prev) => prev + xp);

    // Credit game store
    if (currentDrill.type === 'jutsu' && currentDrill.jutsuId) {
      recordJutsuSuccess(currentDrill.jutsuId as JutsuId);
    } else {
      addXP(xp);
    }

    if (!sessionStartedRef.current) {
      incrementSessions();
      sessionStartedRef.current = true;
    }

    // Auto-advance after feedback
    const t = setTimeout(() => {
      if (drillIndex + 1 >= drills.length) {
        setDrillStatus('complete');
      } else {
        setDrillIndex((i) => i + 1);
        setDrillStatus('ready');
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [drillStatus, currentDrill, currentSign, activeJutsu, drillIndex, drills.length, recordJutsuSuccess, addXP, incrementSessions]);

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
    clone: 'CLONE TECHNIQUE',
    transformation: 'TRANSFORMATION JUTSU',
    substitution: 'SUBSTITUTION JUTSU',
    shadowClone: 'SHADOW CLONE JUTSU',
    fireball: 'FIRE STYLE — FIREBALL',
    chidori: 'CHIDORI',
    rasengan: 'RASENGAN',
    waterDragon: 'WATER STYLE — WATER DRAGON',
    earthWall: 'EARTH STYLE — MUD WALL',
    phoenixFlower: 'FIRE STYLE — PHOENIX FLOWER',
    windBlade: 'WIND STYLE — VACUUM BLADE',
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

      <div className="game-hud">
        <div className="score-badge">
          <span className="score-label">SESSION XP</span>
          <span className="score-value">+{sessionXP}</span>
        </div>
        <div className={`trial-card${drillStatus === 'success' ? ' drill-success' : ''}`}>
          {drillStatus === 'complete' ? (
            <>
              <span className="trial-header">SESSION COMPLETE</span>
              <span className="trial-name">+{sessionXP} XP EARNED</span>
              <span className="trial-desc">{drills.length} drills completed</span>
              <Link to="/training" className="drill-back-link">
                CONTINUE TRAINING
              </Link>
            </>
          ) : currentDrill ? (
            <>
              <span className="trial-header">
                DRILL {drillIndex + 1} / {drills.length}
                {currentDrill.type === 'jutsu' ? ' — JUTSU' : ' — SIGN'}
              </span>
              <span className="trial-name">
                {drillStatus === 'success' ? `+${currentDrill.xpReward} XP ✓` : currentDrill.name}
              </span>
              <span className="trial-desc">
                {drillStatus === 'success'
                  ? 'Well done!'
                  : drillStatus === 'ready'
                  ? 'Get ready…'
                  : currentDrill.description}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* HUD corner accents */}
      <div className="hud-corner hud-corner--tl" />
      <div className="hud-corner hud-corner--tr" />
      <div className="hud-corner hud-corner--bl" />
      <div className="hud-corner hud-corner--br" />

      <div className="overlay">
        <div className="header">
          <Link to="/training" className="back-to-training">← BACK</Link>
          <h1>SHINOBI TRACKER</h1>
          <span className="subtitle">
            {gameProfile
              ? `${gameProfile.name.toUpperCase()} — ${gameProfile.xp} XP`
              : 'TRAINING SESSION'}
          </span>
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
