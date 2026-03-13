import { useEffect, useRef } from 'react';
import { predictSignFromLandmarks } from '../../backend/signClient';
import { useAppStore } from '../../store/useAppStore';
import type { ChakraState } from '../../store/useAppStore';
import type { HandLandmarks } from '../../classifier/types';

/**
 * Polling interval (ms) for sending hand data to the backend.
 * Rasengan detection is temporal — we need frequent updates but not
 * every single frame (to avoid flooding the backend).
 */
const POLL_INTERVAL_MS = 200;

/**
 * useRasenganDetection — sends hand landmarks to the backend periodically
 * to drive the rasengan state machine.
 *
 * The backend returns `chakra_state` and `jutsu` fields:
 *  - FORMING / SPINNING → visual feedback (optional)
 *  - CHAKRA_READY       → show "CHAKRA READY" indicator
 *  - jutsu === "rasengan" → activate the rasengan effect
 *
 * Only active when 2 hands are detected (rasengan requires both hands).
 */
export function useRasenganDetection(hands: HandLandmarks[]) {
  const setChakraState = useAppStore((s) => s.setChakraState);
  const activateRasengan = useAppStore((s) => s.activateRasengan);
  const triggerJutsu = useAppStore((s) => s.triggerJutsu);
  const rasenganActive = useAppStore((s) => s.rasenganActive);

  const handsRef = useRef(hands);
  handsRef.current = hands;

  const abortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    // Don't poll while rasengan animation is playing
    if (rasenganActive) return;

    activeRef.current = true;

    const poll = async () => {
      if (!activeRef.current) return;

      const currentHands = handsRef.current;

      // Need at least one hand for palm-open detection; two for chakra forming
      const hasAtLeastOneHand =
        currentHands.length >= 1 && currentHands[0]?.length === 21;

      if (!hasAtLeastOneHand) {
        setChakraState(null);
        scheduleNext();
        return;
      }

      try {
        abortRef.current = new AbortController();
        const response = await predictSignFromLandmarks(
          currentHands,
          abortRef.current.signal,
        );

        if (!activeRef.current) return;

        // Map backend chakra_state to our store type
        const chakra = (response.chakra_state as ChakraState) ?? null;
        setChakraState(chakra);

        // Rasengan triggered!
        if (response.jutsu === 'rasengan') {
          console.log('🌀 RASENGAN — activating effect');
          activateRasengan();
          triggerJutsu('rasengan');
          return; // stop polling; will restart when rasengan finishes
        }
      } catch {
        // Network errors / aborted — silently ignore
      }

      scheduleNext();
    };

    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    // Start the first poll immediately
    poll();

    return () => {
      activeRef.current = false;
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [rasenganActive, setChakraState, activateRasengan, triggerJutsu]);
}
