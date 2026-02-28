import { useEffect, useRef } from 'react';
import { useCamera } from './camera/useCamera';
import { useHandLandmarks } from './handTracking/useHandLandmarks';
import { HandOverlay } from './handTracking/HandOverlay';
import { extractFeatures } from './classifier/extractFeatures';
import { classifySign } from './classifier/ruleClassifier';
import type { SignLabel } from './classifier/types';
import { predictSignFromLandmarks } from './backend/signClient';
import { useJutsuEngine } from './jutsuEngine/useJutsuEngine';
import { ThreeScene } from './scene/ThreeScene';
import { useAppStore } from './store/useAppStore';
import './App.css';

function App() {
  const { videoRef, error, isReady } = useCamera();
  const { landmarks, hands, confidence: mpConfidence } = useHandLandmarks(
    videoRef.current,
    isReady
  );
  
  const currentSign = useAppStore((state) => state.currentSign);
  const signBuffer = useAppStore((state) => state.signBuffer);
  const activeJutsu = useAppStore((state) => state.activeJutsu);
  const confidence = useAppStore((state) => state.confidence);
  const setCurrentSign = useAppStore((state) => state.setCurrentSign);
  const setConfidence = useAppStore((state) => state.setConfidence);
  const triggerJutsu = useAppStore((state) => state.triggerJutsu);
  
  // Debouncing: Track sign stability
  const signStabilityRef = useRef({ sign: 'unknown' as SignLabel, count: 0, required: 5 });
  const backendReqRef = useRef<{ abort?: AbortController; lastSent: number }>({ lastSent: 0 });
  
  // Use jutsu engine to detect sequences
  useJutsuEngine(currentSign);

  // Process landmarks and classify sign with debouncing
  useEffect(() => {
    const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return dx * dx + dy * dy;
    };

    const isExtended = (
      hand: NonNullable<typeof hands>[number],
      tip: number,
      pip: number,
      margin = 0.008
    ) => hand[tip].y + margin < hand[pip].y;

    const detectTwoHandSnake = (maybeHands: typeof hands): SignLabel | 'unknown' => {
      if (!maybeHands || maybeHands.length < 2) return 'unknown';
      const [a, b] = maybeHands;
      if (a.length !== 21 || b.length !== 21) return 'unknown';

      const wristClose = dist2(a[0], b[0]) < 0.08 * 0.08;
      const indexTipsClose = dist2(a[8], b[8]) < 0.11 * 0.11;

      const indexExtendedA = isExtended(a, 8, 6, 0.01);
      const indexExtendedB = isExtended(b, 8, 6, 0.01);

      // Snake: index extended, middle NOT clearly extended (helps separate from Ram).
      const middleExtendedA = isExtended(a, 12, 10, 0.01);
      const middleExtendedB = isExtended(b, 12, 10, 0.01);

      const ringExtendedA = isExtended(a, 16, 14, 0.008);
      const ringExtendedB = isExtended(b, 16, 14, 0.008);
      const pinkyExtendedA = isExtended(a, 20, 18, 0.008);
      const pinkyExtendedB = isExtended(b, 20, 18, 0.008);

      const othersMostlyCurled =
        !ringExtendedA && !ringExtendedB && !pinkyExtendedA && !pinkyExtendedB &&
        (!middleExtendedA || !middleExtendedB);

      if (wristClose && (indexTipsClose || dist2(a[5], b[5]) < 0.12 * 0.12) && indexExtendedA && indexExtendedB && othersMostlyCurled) {
        return 'snake';
      }
      return 'unknown';
    };

    const detectTwoHandRam = (maybeHands: typeof hands): SignLabel | 'unknown' => {
      if (!maybeHands || maybeHands.length < 2) return 'unknown';
      const [a, b] = maybeHands;
      if (a.length !== 21 || b.length !== 21) return 'unknown';

      const wristClose = dist2(a[0], b[0]) < 0.09 * 0.09;
      const indexTipsClose = dist2(a[8], b[8]) < 0.12 * 0.12;
      const middleTipsClose = dist2(a[12], b[12]) < 0.14 * 0.14;

      const indexExtendedA = isExtended(a, 8, 6, 0.01);
      const indexExtendedB = isExtended(b, 8, 6, 0.01);
      const middleExtendedA = isExtended(a, 12, 10, 0.01);
      const middleExtendedB = isExtended(b, 12, 10, 0.01);

      const ringExtendedA = isExtended(a, 16, 14, 0.008);
      const ringExtendedB = isExtended(b, 16, 14, 0.008);
      const pinkyExtendedA = isExtended(a, 20, 18, 0.008);
      const pinkyExtendedB = isExtended(b, 20, 18, 0.008);

      // Ram: index + middle extended on both hands; ring/pinky not clearly extended.
      const coreExtended = indexExtendedA && indexExtendedB && middleExtendedA && middleExtendedB;
      const othersNotExtended = !ringExtendedA && !ringExtendedB && !pinkyExtendedA && !pinkyExtendedB;

      if (wristClose && indexTipsClose && middleTipsClose && coreExtended && othersNotExtended) {
        return 'ram';
      }
      return 'unknown';
    };

    const ramFromTwoHands = detectTwoHandRam(hands);
    const snakeFromTwoHands = ramFromTwoHands === 'ram' ? 'unknown' : detectTwoHandSnake(hands);

    const hasAnySignal =
      (landmarks && landmarks.length === 21) || snakeFromTwoHands === 'snake' || ramFromTwoHands === 'ram';

    if (!hasAnySignal) {
      setCurrentSign('unknown');
      setConfidence(0);
      signStabilityRef.current = { sign: 'unknown', count: 0, required: 5 };
      return;
    }

    const now = Date.now();
    const THROTTLE_MS = 150;
    if (now - backendReqRef.current.lastSent < THROTTLE_MS) {
      return;
    }
    backendReqRef.current.lastSent = now;

    // Cancel previous in-flight request
    if (backendReqRef.current.abort) {
      backendReqRef.current.abort.abort();
    }
    const abort = new AbortController();
    backendReqRef.current.abort = abort;

    const localFallback = (): { sign: SignLabel; confidence: number; strong: boolean } => {
      try {
        if (ramFromTwoHands === 'ram') return { sign: 'ram', confidence: 1.0, strong: true };
        if (snakeFromTwoHands === 'snake') return { sign: 'snake', confidence: 1.0, strong: true };
        const sign = classifySign(extractFeatures(landmarks!));
        return { sign, confidence: sign === 'unknown' ? 0 : mpConfidence, strong: false };
      } catch {
        return { sign: 'unknown', confidence: 0, strong: false };
      }
    };

    (async () => {
      let detectedSign: SignLabel = 'unknown';
      let detectedConfidence = 0;
      let strong = false;

      try {
        const resp = await predictSignFromLandmarks(hands, abort.signal);
        detectedSign = resp.sign;
        detectedConfidence = resp.confidence;
        strong = resp.hands >= 2 && (resp.sign === 'ram' || resp.sign === 'snake');
      } catch {
        const fallback = localFallback();
        detectedSign = fallback.sign;
        detectedConfidence = fallback.confidence;
        strong = fallback.strong;
      }

      const requiredStableFrames = strong ? 2 : 5;

      if (detectedSign === signStabilityRef.current.sign) {
        signStabilityRef.current.count++;
        signStabilityRef.current.required = Math.min(signStabilityRef.current.required, requiredStableFrames);
      } else {
        signStabilityRef.current.sign = detectedSign;
        signStabilityRef.current.count = 1;
        signStabilityRef.current.required = requiredStableFrames;
      }

      if (signStabilityRef.current.count >= signStabilityRef.current.required) {
        if (currentSign !== detectedSign) {
          setCurrentSign(detectedSign);
          if (detectedSign !== 'unknown') {
            console.log('✅ Confirmed sign:', detectedSign.toUpperCase());
          }
        }
      }

      setConfidence(detectedConfidence);
    })();
  }, [hands, landmarks, mpConfidence, setCurrentSign, setConfidence, currentSign]);

  return (
    <div className="app">
      {/* Hidden video element for camera feed */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        muted
        playsInline
      />

      {/* 3D Scene with video background and effects */}
      <div className="scene-container">
        <ThreeScene videoElement={videoRef.current} />
        <HandOverlay hands={hands} />
      </div>

      {/* Manual test controls (clickable) */}
      <div className="test-controls">
        <button
          type="button"
          className="test-button"
          onClick={() => triggerJutsu('shadowClone', 4000)}
        >
          Test Shadow Clone
        </button>
      </div>

      {/* UI Overlay */}
      <div className="overlay">
        <div className="header">
          <h1>🍥 Naruto Hand Signs</h1>
          <p className="subtitle">Perform: Tiger → Ram → Snake</p>
        </div>

        {error && (
          <div className="error">
            ⚠️ {error}
          </div>
        )}

        <div className="info-panel-compact">
          <div className="info-row">
            <span className="label">Sign:</span>
            <span className={`sign ${currentSign !== 'unknown' ? 'detected' : ''}`}>
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
              ⚡ SHADOW CLONE JUTSU! ⚡
            </div>
          )}
        </div>

        <div className="instructions">
          <h3>Available Hand Signs:</h3>
          
          <div className="sign-guide">
            <div className="sign-info">
              <strong>🐅 Tiger:</strong> Index up + middle visible
            </div>
            <div className="sign-info">
              <strong>🐏 Ram:</strong> Two hands together, index + middle up
            </div>
            <div className="sign-info">
              <strong>🐍 Snake:</strong> Two hands together, index fingers up
            </div>
            <div className="sign-info">
              <strong>🦅 Bird:</strong> All fingers + thumb up
            </div>
            <div className="sign-info">
              <strong>🐗 Boar:</strong> Fist (all down)
            </div>
            <div className="sign-info">
              <strong>🐂 Ox:</strong> Thumb + Index up
            </div>
            <div className="sign-info">
              <strong>🐉 Dragon:</strong> Thumb + Index + Middle
            </div>
          </div>
          
          <p style={{ marginTop: '15px', color: '#ffa500', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Note: Real Naruto signs use both hands. This tracks up to two hands.<br/>
            Try: Tiger → Ram → Snake for Shadow Clone Jutsu!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
