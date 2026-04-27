import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCamera } from '../../camera/useCamera';
import { useHandLandmarks } from '../../handTracking/useHandLandmarks';
import { HandOverlay } from '../../handTracking/HandOverlay';
import type { SignLabel, HandLandmarks as HandLandmarksType } from '../../classifier/types';
import { loadModel, predictLocal, isModelLoaded } from '../../classifier/localClassifier';
import { buildCombinedFeatures } from '../../classifier/modelFeatures';
import { useJutsuEngine } from '../../jutsuEngine/useJutsuEngine';
import { ThreeScene } from '../../scene/ThreeScene';
import { ShadowClone } from '../../effects/ShadowClone';
import { SmokeEffect } from '../../effects/SmokeEffect';
import { useShadowCloneHold } from '../../effects/useShadowCloneHold';
import { RasenganOverlay, ChakraReadyIndicator, useRasenganDetection } from '../../effects/rasengan';
import { ChidoriOverlay, ChidoriReadyIndicator, useChidoriDetection } from '../../effects/chidori';
import { useAppStore } from '../../store/useAppStore';
import '../../App.css';

/* ── Sign classification (copied from App.tsx, simplified) ── */

interface ClassifyOpts {
  hands: HandLandmarksType[] | null;
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

/**
 * FreestylePage — open dev/testing sandbox.
 * All jutsu effects are active (rasengan, chidori, shadow clone, etc.).
 * No game logic, no drills — just raw hand-sign detection and jutsu testing.
 * No profile required.
 */
export function FreestylePage() {
  const { videoRef, error, isReady } = useCamera();
  const { hands } = useHandLandmarks(videoRef.current, isReady);

  const currentSign = useAppStore((state) => state.currentSign);
  const signBuffer = useAppStore((state) => state.signBuffer);
  const activeJutsu = useAppStore((state) => state.activeJutsu);
  const confidence = useAppStore((state) => state.confidence);
  const setCurrentSign = useAppStore((state) => state.setCurrentSign);
  const setConfidence = useAppStore((state) => state.setConfidence);
  const shadowCloneActive = useAppStore((state) => state.shadowCloneActive);
  const rasenganActive = useAppStore((state) => state.rasenganActive);
  const chidoriActive = useAppStore((state) => state.chidoriActive);
  const chidoriReady = useAppStore((state) => state.chidoriReady);
  const shadowHoldStartTime = useAppStore((state) => state.shadowHoldStartTime);

  const signStabilityRef = useRef({ sign: 'unknown' as SignLabel, count: 0 });
  const cooldownUntilRef = useRef(0);

  // Shadow hold progress
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

  // Engines
  useJutsuEngine(currentSign);
  useShadowCloneHold(currentSign);
  useRasenganDetection(hands);
  useChidoriDetection(hands);

  // Load model
  useEffect(() => {
    loadModel().catch((err) => console.error('Failed to load RF model:', err));
  }, []);

  // Classify
  useEffect(() => {
    classifyHands({
      hands, currentSign,
      suppressed: rasenganActive || chidoriActive,
      signStabilityRef, cooldownUntilRef,
      setCurrentSign, setConfidence,
    });
  }, [hands, setCurrentSign, setConfidence, currentSign, rasenganActive, chidoriActive]);

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
    <div className="app">
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        muted
        playsInline
      />

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
        <ChidoriOverlay hands={hands} videoElement={videoRef.current} />
      </div>

      {/* HUD corner accents */}
      <div className="hud-corner hud-corner--tl" />
      <div className="hud-corner hud-corner--tr" />
      <div className="hud-corner hud-corner--bl" />
      <div className="hud-corner hud-corner--br" />

      <div className="overlay">
        <div className="header">
          <Link to="/dashboard" className="back-to-training">← BACK</Link>
          <h1>FREESTYLE MODE</h1>
          <span className="subtitle">DEV SANDBOX — ALL JUTSU ACTIVE</span>
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

          {chidoriReady && !chidoriActive && (
            <div className="jutsu-notification" style={{ color: '#aaf' }}>
              ⚡ CHIDORI READY — OPEN PALM
            </div>
          )}

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

          {/* Dev reference: available jutsu sequences */}
          <div style={{ marginTop: 16, fontSize: 11, opacity: 0.6, lineHeight: 1.6 }}>
            <div><b>JUTSU REF:</b></div>
            <div>Shadow Clone: Hold SHADOW 2s</div>
            <div>Fireball: SERPENT → RAM → HORSE → TIGER</div>
            <div>Chidori: OX → HARE → MONKEY → open palm</div>
            <div>Rasengan: Both hands close → spin → open palm</div>
            <div>Clone: RAM → SERPENT → TIGER</div>
            <div>Transformation: DOG → BOAR → RAM</div>
            <div>Substitution: RAM → BOAR → OX → DOG</div>
          </div>
        </div>
      </div>
    </div>
  );
}
