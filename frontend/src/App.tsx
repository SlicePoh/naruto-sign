import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCamera } from './camera/useCamera';
import { useHandLandmarks } from './handTracking/useHandLandmarks';
import { HandOverlay } from './handTracking/HandOverlay';
import type { SignLabel, HandLandmarks } from './classifier/types';
import { loadModel, predictLocal, isModelLoaded } from './classifier/localClassifier';
import { buildCombinedFeatures } from './classifier/modelFeatures';
import { useJutsuEngine } from './jutsuEngine/useJutsuEngine';
import { ThreeScene } from './scene/ThreeScene';
import { ShadowClone } from './effects/ShadowClone';
import { SmokeEffect } from './effects/SmokeEffect';
import { FallingLeaves } from './effects/FallingLeaves';
import { useShadowCloneHold } from './effects/useShadowCloneHold';
import { RasenganOverlay, ChakraReadyIndicator, useRasenganDetection } from './effects/rasengan';
import { ChidoriOverlay, ChidoriReadyIndicator, useChidoriDetection } from './effects/chidori';
import { SubstitutionEffect, useSubstitutionDetection } from './effects/substitution';
import { useRotatingBackground } from './effects/useRotatingBackground';
import { useAppStore } from './store/useAppStore';
import { useGameStore } from './game/useGameStore';
import { JUTSU_CATALOG, type JutsuId } from './game/types';
import './App.css';

// ── Session persistence (survives refresh, clears on tab close) ──────
const SESSION_KEY = 'shinobi-training-session';

type DrillStatus = 'ready' | 'active' | 'playing' | 'success' | 'complete';

// Animation durations per jutsu (ms) — how long to let the effect play before showing success
const JUTSU_ANIMATION_DURATIONS: Record<string, number> = {
  shadowClone: 4000,
  fireball: 3000,
  chidori: 3500,
  rasengan: 3500,
  substitution: 5000,
  waterDragon: 3000,
  earthWall: 3000,
  windBlade: 2500,
  clone: 2000,
  transformation: 2000,
};

interface PersistedSession {
  drills: Drill[];
  drillIndex: number;
  sessionXP: number;
  drillStatus: DrillStatus;
  playingStartTime?: number;
}

function saveSession(data: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* storage full or unavailable — ignore */ }
}

function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // Validate shape
    if (!Array.isArray(parsed.drills) || typeof parsed.drillIndex !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// Drill system
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
  'rat', 'serpent', 'shadow', 'bird', 'boar', 'ox', 'dragon', 'monkey',
];

const SIGN_NAMES: Record<string, string> = {
  tiger: 'Tiger (寅)', ram: 'Ram (未)', serpent: 'Serpent (巳)',
  dog: 'Dog (戌)', hare: 'Hare (卯)', horse: 'Horse (午)',
  rat: 'Rat (子)', shadow: 'Shadow Seal (影)',
  bird: 'Bird (酉)', boar: 'Boar (亥)', ox: 'Ox (丑)', dragon: 'Dragon (辰)',
  monkey: 'Monkey (申)',
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
/* ── Drill card sub-component (eliminates nested ternaries) ── */
interface DrillCardProps {
  readonly drillStatus: DrillStatus;
  readonly currentDrill: Drill | null;
  readonly drillIndex: number;
  readonly drillCount: number;
  readonly sessionXP: number;
}

function DrillCard({ drillStatus, currentDrill, drillIndex, drillCount, sessionXP }: DrillCardProps) {
  if (drillStatus === 'complete') {
    return (
      <div className="trial-card">
        <span className="trial-header">SESSION COMPLETE</span>
        <span className="trial-name">+{sessionXP} XP EARNED</span>
        <span className="trial-desc">{drillCount} drills completed</span>
        <Link to="/training" className="drill-back-link">
          CONTINUE TRAINING
        </Link>
      </div>
    );
  }
  if (!currentDrill) return <div className="trial-card" />;
  const drillTypeLabel = currentDrill.type === 'jutsu' ? ' — JUTSU' : ' — SIGN';

  let nameText: string;
  let descText: string;
  let cardClass = 'trial-card';

  if (drillStatus === 'playing') {
    nameText = currentDrill.name;
    descText = 'Jutsu active — watch the animation…';
    cardClass = 'trial-card drill-playing';
  } else if (drillStatus === 'success') {
    nameText = `+${currentDrill.xpReward} XP ✓`;
    descText = 'Well done!';
    cardClass = 'trial-card drill-success';
  } else if (drillStatus === 'ready') {
    nameText = currentDrill.name;
    descText = 'Get ready…';
  } else {
    nameText = currentDrill.name;
    descText = currentDrill.description;
  }

  return (
    <div className={cardClass}>
      <span className="trial-header">
        DRILL {drillIndex + 1} / {drillCount}
        {drillTypeLabel}
      </span>
      <span className="trial-name">{nameText}</span>
      <span className="trial-desc">{descText}</span>
    </div>
  );
}
/* ── Drill success overlay — fullscreen celebration between drills ── */
interface DrillSuccessOverlayProps {
  readonly drill: Drill;
  readonly drillIndex: number;
  readonly drillCount: number;
  readonly nextDrill: Drill | null;
  readonly onContinue: () => void;
}

function DrillSuccessOverlay({ drill, drillIndex, drillCount, nextDrill, onContinue }: DrillSuccessOverlayProps) {
  return (
    <button type="button" className="drill-success-overlay" onClick={onContinue}>
      <div className="drill-success-content">
        <div className="drill-success-check">&#x2714;</div>
        <h2 className="drill-success-heading">
          {drill.type === 'jutsu' ? 'JUTSU COMPLETE!' : 'SIGN COMPLETE!'}
        </h2>
        <div className="drill-success-name">{drill.name}</div>
        <div className="drill-success-xp-badge">+{drill.xpReward} XP</div>
        <div className="drill-success-progress">
          <div className="drill-success-progress-track">
            <div
              className="drill-success-progress-fill"
              style={{ width: `${((drillIndex + 1) / drillCount) * 100}%` }}
            />
          </div>
          <span className="drill-success-progress-label">
            {drillIndex + 1} / {drillCount} COMPLETE
          </span>
        </div>
        {nextDrill && (
          <div className="drill-success-next">
            NEXT: {nextDrill.name}
          </div>
        )}
        <button
          className="drill-success-btn"
          onClick={(e) => { e.stopPropagation(); onContinue(); }}
        >
          {nextDrill ? 'NEXT DRILL \u2192' : 'VIEW RESULTS'}
        </button>
        <div className="drill-success-hint">TAP ANYWHERE TO CONTINUE</div>
      </div>
    </button>
  );
}

/* Sign classification logic (extracted to reduce App complexity) */
interface ClassifyOpts {
  hands: HandLandmarks[] | null;
  currentSign: SignLabel;
  suppressed: boolean;
  signStabilityRef: React.MutableRefObject<{ sign: SignLabel; count: number }>;
  cooldownUntilRef: React.MutableRefObject<number>;
  setCurrentSign: (s: SignLabel) => void;
  setConfidence: (c: number) => void;
}

function classifyHands(opts: ClassifyOpts) {
  const { hands, currentSign, suppressed, signStabilityRef, cooldownUntilRef, setCurrentSign, setConfidence } = opts;
  if (!isModelLoaded() || suppressed) return;
  const hasHands = hands?.some(h => h.length === 21);
  if (!hasHands) {
    setCurrentSign('unknown');
    setConfidence(0);
    signStabilityRef.current = { sign: 'unknown', count: 0 };
    return;
  }
  const features = buildCombinedFeatures(hands!);
  const { sign: rawSign, confidence: conf } = predictLocal(features);
  const detectedSign: SignLabel = (rawSign === 'neutral' || rawSign === 'unknown') ? 'unknown' : rawSign;
  const REQUIRED = conf > 0.85 ? 2 : 3;
  if (detectedSign === signStabilityRef.current.sign) {
    signStabilityRef.current.count++;
  } else {
    signStabilityRef.current = { sign: detectedSign, count: 1 };
  }
  const now = Date.now();
  // Cooldown: suppress confirming the SAME sign again, but allow NEW signs through
  if (now < cooldownUntilRef.current && detectedSign !== 'unknown' && detectedSign === currentSign) {
    setConfidence(conf);
    return;
  }
  if (signStabilityRef.current.count >= REQUIRED && currentSign !== detectedSign) {
    setCurrentSign(detectedSign);
    if (detectedSign !== 'unknown') {
      console.log('✅ Confirmed sign:', detectedSign.toUpperCase());
      cooldownUntilRef.current = Date.now() + 600;
    }
  }
  setConfidence(conf);
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
  const shadowCloneActive = useAppStore((state) => state.shadowCloneActive);
  const rasenganActive = useAppStore((state) => state.rasenganActive);
  const chidoriActive = useAppStore((state) => state.chidoriActive);
  const substitutionActive = useAppStore((state) => state.substitutionActive);
  const shadowHoldStartTime = useAppStore((state) => state.shadowHoldStartTime);
  // Game store integration
  const gameProfile = useGameStore((s) => s.profile);
  const addXP = useGameStore((s) => s.addXP);
  const recordJutsuSuccess = useGameStore((s) => s.recordJutsuSuccess);
  const incrementSessions = useGameStore((s) => s.incrementTrainingSessions);
  // Drill system state — restore from sessionStorage on refresh
  const unlockedJutsuIds = useMemo(
    () => gameProfile?.jutsuProgress.filter((j) => j.unlocked).map((j) => j.jutsuId) ?? [],
    [gameProfile],
  );
  const savedSession = useMemo(() => loadSession(), []);
  const [drills] = useState(() => savedSession?.drills ?? generateDrills(unlockedJutsuIds));
  const [drillIndex, setDrillIndex] = useState(savedSession?.drillIndex ?? 0);
  const [drillStatus, setDrillStatus] = useState<DrillStatus>(
    savedSession?.drillStatus === 'complete' ? 'complete' : 'ready',
  );
  const [sessionXP, setSessionXP] = useState(savedSession?.sessionXP ?? 0);
  const sessionStartedRef = useRef(!!savedSession);
  // Persist session state to sessionStorage on every meaningful change
  useEffect(() => {
    if (drillStatus === 'complete') {
      clearSession();
    } else {
      saveSession({ drills, drillIndex, sessionXP, drillStatus });
    }
  }, [drills, drillIndex, sessionXP, drillStatus]);
  // Debouncing: Track sign stability
  const signStabilityRef = useRef<{ sign: SignLabel; count: number }>({ sign: 'unknown', count: 0 });
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
  // Chidori: sequence-driven (Ox → Hare → Monkey) + open palm
  useChidoriDetection(hands);
  // Substitution: sequence-driven (Ram → Boar → Ox → Dog → Serpent)
  useSubstitutionDetection();
  // Drill ready → active transition (brief delay to prevent false triggers) ──
  useEffect(() => {
    if (drillStatus !== 'ready') return;
    const t = setTimeout(() => setDrillStatus('active'), 800);
    return () => clearTimeout(t);
  }, [drillStatus, drillIndex]);
  // Drill completion detection
  const currentDrill = drillIndex < drills.length ? drills[drillIndex] : null;
  // Advance to next drill (or complete session)
  const handleDrillContinue = useCallback(() => {
    if (drillStatus !== 'success') return;
    if (drillIndex + 1 >= drills.length) {
      setDrillStatus('complete');
    } else {
      setDrillIndex((i) => i + 1);
      setDrillStatus('ready');
    }
  }, [drillStatus, drillIndex, drills.length]);
  // Detect when a drill is matched
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
    // Credit game store immediately
    const xp = currentDrill.xpReward;
    setSessionXP((prev) => prev + xp);
    if (currentDrill.type === 'jutsu' && currentDrill.jutsuId) {
      recordJutsuSuccess(currentDrill.jutsuId);
    } else {
      addXP(xp);
    }
    if (!sessionStartedRef.current) {
      incrementSessions();
      sessionStartedRef.current = true;
    }
    // If jutsu with an animation, go to 'playing' state to let animation run
    const animDuration = currentDrill.type === 'jutsu' && currentDrill.jutsuId
      ? JUTSU_ANIMATION_DURATIONS[currentDrill.jutsuId] ?? 0
      : 0;
    if (animDuration > 0) {
      setDrillStatus('playing');
    } else {
      setDrillStatus('success');
    }
  }, [drillStatus, currentDrill, currentSign, activeJutsu, recordJutsuSuccess, addXP, incrementSessions]);
  // Animation buffer: wait for jutsu animation to finish, then show success
  useEffect(() => {
    if (drillStatus !== 'playing' || !currentDrill) return;
    const animDuration = currentDrill.type === 'jutsu' && currentDrill.jutsuId
      ? JUTSU_ANIMATION_DURATIONS[currentDrill.jutsuId] ?? 0
      : 0;
    const t = setTimeout(() => setDrillStatus('success'), animDuration);
    return () => clearTimeout(t);
  }, [drillStatus, currentDrill]);
  // Auto-advance after success overlay (fallback if user doesn't click)
  useEffect(() => {
    if (drillStatus !== 'success') return;
    const t = setTimeout(handleDrillContinue, 4000);
    return () => clearTimeout(t);
  }, [drillStatus, handleDrillContinue]);
  // Load the RF model once on mount
  useEffect(() => {
    loadModel().catch((err) => console.error('Failed to load RF model:', err));
  }, []);
  // Classify hands locally — no API round-trip, runs synchronously (~1-2 ms)
  useEffect(() => {
    classifyHands({
      hands, currentSign,
      suppressed: rasenganActive || chidoriActive || substitutionActive,
      signStabilityRef, cooldownUntilRef,
      setCurrentSign, setConfidence,
    });
  }, [hands, setCurrentSign, setConfidence, currentSign, rasenganActive, chidoriActive, substitutionActive]);

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
      <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />
      <FallingLeaves />
      <div className="scene-container">
        <ThreeScene videoElement={videoRef.current} />
        {videoRef.current && (
          <ShadowClone videoElement={videoRef.current} active={shadowCloneActive} />
        )}
        <SmokeEffect active={shadowCloneActive || substitutionActive} videoElement={videoRef.current} />
        <SubstitutionEffect active={substitutionActive} videoElement={videoRef.current} />
        <HandOverlay hands={hands} />
        <RasenganOverlay hands={hands} videoElement={videoRef.current} />
        <ChidoriOverlay hands={hands} videoElement={videoRef.current} />
      </div>
      <div className="game-hud">
        <div className="score-badge">
          <span className="score-label">SESSION XP</span>
          <span className="score-value">+{sessionXP}</span>
        </div>
        <DrillCard drillStatus={drillStatus} currentDrill={currentDrill} drillIndex={drillIndex} 
              drillCount={drills.length} sessionXP={sessionXP} />
      </div>
      {/* Drill success overlay */}
      {drillStatus === 'success' && currentDrill && (
        <DrillSuccessOverlay
          drill={currentDrill}
          drillIndex={drillIndex}
          drillCount={drills.length}
          nextDrill={drillIndex + 1 < drills.length ? drills[drillIndex + 1] : null}
          onContinue={handleDrillContinue}
        />
      )}
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
          <ChidoriReadyIndicator />
        </div>
      </div>
    </div>
  );
}
export default App;
