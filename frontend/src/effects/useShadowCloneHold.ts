import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { SignLabel } from '../classifier/types';

const HOLD_DURATION_MS = 2_000; // 2 seconds to activate

export function useShadowCloneHold(currentSign: SignLabel) {
  const shadowCloneActive = useAppStore((s) => s.shadowCloneActive);
  const shadowCloneEndTime = useAppStore((s) => s.shadowCloneEndTime);
  const activateShadowClone = useAppStore((s) => s.activateShadowClone);
  const deactivateShadowClone = useAppStore((s) => s.deactivateShadowClone);
  const triggerJutsu = useAppStore((s) => s.triggerJutsu);
  const clearJutsu = useAppStore((s) => s.clearJutsu);
  const setShadowHoldStart = useAppStore((s) => s.setShadowHoldStart);

  const holdStartRef = useRef<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deactivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hold detection ──────────────────────────────────────────────
  useEffect(() => {
    // If clone is already active, don't interfere
    if (shadowCloneActive) return;

    if (currentSign === 'shadow') {
      // Start the hold timer if not already running
      if (holdStartRef.current === null) {
        const now = Date.now();
        holdStartRef.current = now;
        setShadowHoldStart(now);

        holdTimerRef.current = setTimeout(() => {
          // Timer fired → activate
          console.log('🥷 Shadow Clone Jutsu — ACTIVATED');
          activateShadowClone();
          triggerJutsu('shadowClone');
          holdStartRef.current = null;
          setShadowHoldStart(null);
        }, HOLD_DURATION_MS);
      }
    } else {
      // Sign changed — reset hold timer
      if (holdTimerRef.current !== null) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      holdStartRef.current = null;
      setShadowHoldStart(null);
    }

    return () => {
      // Cleanup on unmount / deps change (StrictMode-safe)
      if (holdTimerRef.current !== null) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      holdStartRef.current = null;
    };
  }, [currentSign, shadowCloneActive, activateShadowClone, triggerJutsu, setShadowHoldStart]);

  // ── Auto-deactivation after JUTSU_DURATION_MS ──────────────────
  useEffect(() => {
    if (!shadowCloneActive || shadowCloneEndTime === null) return;

    const remaining = shadowCloneEndTime - Date.now();
    if (remaining <= 0) {
      deactivateShadowClone();
      clearJutsu();
      return;
    }

    deactivateTimerRef.current = setTimeout(() => {
      console.log('🥷 Shadow Clone Jutsu — DEACTIVATED');
      deactivateShadowClone();
      clearJutsu();
    }, remaining);

    return () => {
      if (deactivateTimerRef.current !== null) {
        clearTimeout(deactivateTimerRef.current);
        deactivateTimerRef.current = null;
      }
    };
  }, [shadowCloneActive, shadowCloneEndTime, deactivateShadowClone, clearJutsu]);
}
