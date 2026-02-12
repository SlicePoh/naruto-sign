import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Results } from '@mediapipe/hands';
import type { HandLandmarks } from '../classifier/types';

interface UseHandLandmarksResult {
  /** First hand (kept for backward compatibility) */
  landmarks: HandLandmarks | null;
  /** All detected hands (0..2) */
  hands: HandLandmarks[];
  confidence: number;
  isDetecting: boolean;
  handCount: number;
}

/**
 * Custom hook to detect hand landmarks using MediaPipe Hands
 * Runs detection in requestAnimationFrame loop for optimal performance
 */
export function useHandLandmarks(
  videoElement: HTMLVideoElement | null,
  isVideoReady: boolean
): UseHandLandmarksResult {
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null);
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [handCount, setHandCount] = useState(0);

  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const onResults = useCallback((results: Results) => {
    // Only update state if there's a meaningful change (throttle updates)
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) { // Update max 10 times per second
      return;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const formattedHands: HandLandmarks[] = results.multiHandLandmarks.map((hand) =>
        hand.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }))
      );

      setHands(formattedHands);
      setHandCount(formattedHands.length);
      setLandmarks(formattedHands[0] ?? null);
      setConfidence(formattedHands.length > 0 ? 1.0 : 0);
      lastUpdateRef.current = now;
    } else {
      setHands([]);
      setHandCount(0);
      setLandmarks(null);
      setConfidence(0);
    }
  }, []);

  // Initialize MediaPipe Hands
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;
    setIsDetecting(true);

    return () => {
      if (handsRef.current) {
        handsRef.current.close();
      }
      setIsDetecting(false);
    };
  }, [onResults]);

  // Run detection loop
  useEffect(() => {
    if (!videoElement || !isVideoReady || !handsRef.current) {
      return;
    }

    let isActive = true;

    async function detect() {
      if (!isActive || !handsRef.current || !videoElement) {
        return;
      }

      try {
        await handsRef.current.send({ image: videoElement });
      } catch (err) {
        console.error('MediaPipe detection error:', err);
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    }

    detect();

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, isVideoReady]);

  return { landmarks, hands, confidence, isDetecting, handCount };
}
