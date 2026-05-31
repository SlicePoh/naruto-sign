import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { HandLandmarks } from '../../classifier/types';

/**
 * useChidoriDetection — watches for the chidori jutsu trigger from the
 * sequence detector, then immediately activates the chidori effect.
 * The open palm is only used for *positioning* the effect (handled by useChidori).
 *
 * Flow:
 *  1. useJutsuEngine detects Ox → Hare → Monkey → sets activeJutsu = 'chidori'
 *  2. This hook sees activeJutsu === 'chidori' && !chidoriActive
 *     → activateChidori() immediately
 *  3. useChidori renders the effect on the user's palm position
 *  4. After CHIDORI_DURATION_MS the effect auto-stops
 */
export function useChidoriDetection(_hands: HandLandmarks[]) {
  const activeJutsu = useAppStore((s) => s.activeJutsu);
  const chidoriActive = useAppStore((s) => s.chidoriActive);
  const activateChidori = useAppStore((s) => s.activateChidori);
  const triggerJutsu = useAppStore((s) => s.triggerJutsu);

  // Guard to prevent re-triggering during the same activation cycle
  const activatingRef = useRef(false);

  // When sequence detector fires 'chidori', activate immediately
  useEffect(() => {
    if (activeJutsu === 'chidori' && !chidoriActive && !activatingRef.current) {
      activatingRef.current = true;
      console.log('⚡ Chidori sequence detected — activating immediately');
      activateChidori();
      triggerJutsu('chidori');
    }

    // Reset guard when chidori deactivates
    if (!chidoriActive && activeJutsu !== 'chidori') {
      activatingRef.current = false;
    }
  }, [activeJutsu, chidoriActive, activateChidori, triggerJutsu]);
}
