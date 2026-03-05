import { useEffect, useRef } from 'react';
import { useCamera } from './camera/useCamera';
import { useHandLandmarks } from './handTracking/useHandLandmarks';
import { HandOverlay } from './handTracking/HandOverlay';
import type { SignLabel } from './classifier/types';
import { loadModel, predictLocal, isModelLoaded } from './classifier/localClassifier';
import { buildCombinedFeatures } from './classifier/modelFeatures';
import { useJutsuEngine } from './jutsuEngine/useJutsuEngine';
import { ThreeScene } from './scene/ThreeScene';
import { ShadowClone } from './effects/ShadowClone';
import { useShadowCloneHold } from './effects/useShadowCloneHold';
import { useAppStore } from './store/useAppStore';
import './App.css';

function App() {
  const { videoRef, error, isReady } = useCamera();
  const { hands } = useHandLandmarks(videoRef.current, isReady);
  
  const currentSign = useAppStore((state) => state.currentSign);
  const signBuffer = useAppStore((state) => state.signBuffer);
  const activeJutsu = useAppStore((state) => state.activeJutsu);
  const confidence = useAppStore((state) => state.confidence);
  const setCurrentSign = useAppStore((state) => state.setCurrentSign);
  const setConfidence = useAppStore((state) => state.setConfidence);
  const triggerJutsu = useAppStore((state) => state.triggerJutsu);
  const shadowCloneActive = useAppStore((state) => state.shadowCloneActive);
  const activateShadowClone = useAppStore((state) => state.activateShadowClone);
  
  // Debouncing: Track sign stability
  const signStabilityRef = useRef({ sign: 'unknown' as SignLabel, count: 0 });
  // 1-second cooldown after a sign is confirmed (prevents duplicate registrations)
  const cooldownUntilRef = useRef(0);
  
  // Use jutsu engine to detect sequences
  useJutsuEngine(currentSign);

  // Shadow Clone: 2-second hold detection + 10-second duration
  useShadowCloneHold(currentSign);

  // Load the RF model once on mount
  useEffect(() => {
    loadModel().catch((err) => console.error('Failed to load RF model:', err));
  }, []);

  // Classify hands locally — no API round-trip, runs synchronously (~1-2 ms)
  useEffect(() => {
    if (!isModelLoaded()) return;

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
  }, [hands, setCurrentSign, setConfidence, currentSign]);

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

        {/* Shadow Clone canvas overlay — renders segmented clones */}
        {videoRef.current && (
          <ShadowClone
            videoElement={videoRef.current}
            active={shadowCloneActive}
          />
        )}

        <HandOverlay hands={hands} />
      </div>

      {/* Manual test controls (clickable) */}
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
      </div>

      {/* UI Overlay */}
      <div className="overlay">
        <div className="header">
          <h1>🍥 Naruto Hand Signs</h1>
          <p className="subtitle">Hold Shadow sign for Shadow Clone Jutsu!</p>
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
              ⚡ {activeJutsu === 'shadowClone' ? 'SHADOW CLONE JUTSU' :
                  activeJutsu === 'fireball' ? 'FIRE STYLE: FIREBALL JUTSU' :
                  activeJutsu === 'chidori' ? 'CHIDORI' :
                  activeJutsu}! ⚡
            </div>
          )}
        </div>

        <div className="instructions">
          <h3>Available Hand Signs:</h3>
          
          <div className="sign-guide">
            <div className="sign-info">
              <strong>🐅 Tiger:</strong> Interlocked fingers, index + middle up
            </div>
            <div className="sign-info">
              <strong>🐏 Ram:</strong> Hands clasped, index + middle extended
            </div>
            <div className="sign-info">
              <strong>🐍 Serpent:</strong> Palms flat, fingers interlocked
            </div>
            <div className="sign-info">
              <strong>🐶 Dog:</strong> One fist over the other, palm down
            </div>
            <div className="sign-info">
              <strong>🐴 Horse:</strong> Index fingers up, other fingers interlocked
            </div>
            <div className="sign-info">
              <strong>🐇 Hare:</strong> Pinky up, index pointed
            </div>
            <div className="sign-info">
              <strong>🐀 Rat:</strong> Left hand wraps right index + middle
            </div>
            <div className="sign-info">
              <strong>👥 Shadow:</strong> Crossed fingers, clone seal
            </div>
          </div>
          
          <p style={{ marginTop: '15px', color: '#ffa500', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Model-powered detection with 9 trained signs.<br/>
            Hold the Shadow sign for Shadow Clone Jutsu!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
