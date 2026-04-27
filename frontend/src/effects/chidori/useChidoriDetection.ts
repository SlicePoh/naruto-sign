import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { HandLandmarks } from '../../classifier/types';

/**
 * Polling interval (ms) for checking open-palm after sequence completion.
 */
const POLL_INTERVAL_MS = 150;

/**
 * How long (ms) the "CHIDORI READY" window stays open after the
 * Ox → Hare → Monkey sequence is detected. If user doesn't open palm
 * in time, the charge dissipates.
 */
const READY_WINDOW_MS = 5000;

/** Landmark indices for palm-open heuristic. */
const FINGERTIP_INDICES = [8, 12, 16, 20] as const;
const FINGER_BASE_INDICES = [5, 9, 13, 17] as const;

/**
 * Simple open-palm check — all four fingers extended (fingertip further
 * from wrist than the corresponding MCP joint).
 */
function isPalmOpen(hand: HandLandmarks): boolean {
  if (hand.length < 21) return false;
  const wrist = hand[0];
  let extended = 0;
  for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
    const tip = hand[FINGERTIP_INDICES[i]];
    const base = hand[FINGER_BASE_INDICES[i]];
    const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const baseDist = Math.hypot(base.x - wrist.x, base.y - wrist.y);
    if (tipDist > baseDist * 1.1) extended++;
  }
  return extended >= 3;
}

/**
 * useChidoriDetection — watches for the chidori jutsu trigger from the
 * sequence detector, then enters a "CHIDORI_READY" state. When the user
 * opens their palm, the chidori effect fires.
 *
 * Flow:
 *  1. useJutsuEngine detects Ox → Hare → Monkey → sets activeJutsu = 'chidori'
 *  2. This hook sees activeJutsu === 'chidori' && !chidoriActive
 *     → enters ready state, sets chidoriReady = true
 *  3. Polls hand landmarks for open palm
 *  4. Open palm detected → activateChidori()
 *  5. After CHIDORI_DURATION_MS the effect auto-stops
 */
export function useChidoriDetection(hands: HandLandmarks[]) {
  const activeJutsu = useAppStore((s) => s.activeJutsu);
  const chidoriActive = useAppStore((s) => s.chidoriActive);
  const activateChidori = useAppStore((s) => s.activateChidori);
  const setChidoriReady = useAppStore((s) => s.setChidoriReady);
  const chidoriReady = useAppStore((s) => s.chidoriReady);
  const triggerJutsu = useAppStore((s) => s.triggerJutsu);

  const handsRef = useRef(hands);
  handsRef.current = hands;

  // Step 1: When sequence detector fires 'chidori', enter ready state
  useEffect(() => {
    if (activeJutsu === 'chidori' && !chidoriActive && !chidoriReady) {
      console.log('⚡ Chidori sequence detected — waiting for open palm');
      setChidoriReady(true);
    }
  }, [activeJutsu, chidoriActive, chidoriReady, setChidoriReady]);

  // Step 2: Poll for open palm while in ready state
  useEffect(() => {
    if (!chidoriReady || chidoriActive) return;

    const readyStart = Date.now();

    const poll = () => {
      // Timeout — ready window expired
      if (Date.now() - readyStart > READY_WINDOW_MS) {
        console.log('⚡ Chidori ready window expired');
        setChidoriReady(false);
        return;
      }

      const currentHands = handsRef.current;
      const hasOpenPalm = (currentHands ?? []).some(
        (h) => h?.length === 21 && isPalmOpen(h),
      );

      if (hasOpenPalm) {
        console.log('⚡ CHIDORI — activating effect');
        setChidoriReady(false);
        activateChidori();
        triggerJutsu('chidori');
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    let timer: ReturnType<typeof setTimeout>;
    poll();

    return () => {
      clearTimeout(timer);
    };
  }, [chidoriReady, chidoriActive, activateChidori, setChidoriReady, triggerJutsu]);
}
