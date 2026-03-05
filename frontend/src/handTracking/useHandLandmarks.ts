import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { HandLandmarks } from '../classifier/types';

interface UseHandLandmarksResult {
  landmarks: HandLandmarks | null;
  hands: HandLandmarks[];
  confidence: number;
  isDetecting: boolean;
  handCount: number;
}

const HAND_LANDMARKER_WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const HAND_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

/**
 * Detects hand landmarks using MediaPipe Tasks-Vision HandLandmarker
 * in VIDEO running-mode for smooth, synchronous per-frame detection.
 */
export function useHandLandmarks(
  videoElement: HTMLVideoElement | null,
  isVideoReady: boolean,
): UseHandLandmarksResult {
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null);
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [handCount, setHandCount] = useState(0);

  const detectorRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimestampRef = useRef(-1);

  // ── Initialise the HandLandmarker once ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_WASM);
      if (cancelled) return;

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_LANDMARKER_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });

      if (cancelled) {
        handLandmarker.close();
        return;
      }

      detectorRef.current = handLandmarker;
      setIsDetecting(true);
    })();

    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
      setIsDetecting(false);
    };
  }, []);

  // ── Detection loop — runs every animation frame ───────────────────
  const detect = useCallback(() => {
    const detector = detectorRef.current;
    if (!detector || !videoElement || videoElement.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    // HandLandmarker.detectForVideo requires strictly increasing timestamps
    const timestampMs = performance.now();
    if (timestampMs <= lastTimestampRef.current) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastTimestampRef.current = timestampMs;

    try {
      const result = detector.detectForVideo(videoElement, timestampMs);

      if (result.landmarks && result.landmarks.length > 0) {
        const formatted: HandLandmarks[] = result.landmarks.map((hand) =>
          hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
        );

        setHands(formatted);
        setHandCount(formatted.length);
        setLandmarks(formatted[0] ?? null);
        setConfidence(formatted.length > 0 ? 1.0 : 0);
      } else {
        setHands([]);
        setHandCount(0);
        setLandmarks(null);
        setConfidence(0);
      }
    } catch {
      // Silently ignore transient detection errors
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [videoElement]);

  useEffect(() => {
    if (!isVideoReady || !videoElement) return;

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isVideoReady, videoElement, detect]);

  return { landmarks, hands, confidence, isDetecting, handCount };
}
