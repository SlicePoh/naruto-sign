import { useEffect, useRef } from 'react';
import { SequenceDetector } from './sequenceDetector';
import type { SignLabel } from '../classifier/types';
import { JUTSUS, type JutsuKey } from './jutsuRegistry';
import { useAppStore } from '../store/useAppStore';

/**
 * Map from the last sign of a jutsu sequence → jutsu key for "hold" jutsus.
 * "shadowClone" is excluded — its hold logic is handled by useShadowCloneHold.
 */
const HOLD_SIGN_TO_JUTSU = new Map<SignLabel, JutsuKey>();
const HOLD_JUTSUS = new Set<JutsuKey>();
for (const [key, seq] of Object.entries(JUTSUS)) {
  if (seq.length === 1 && key !== 'shadowClone') {
    HOLD_SIGN_TO_JUTSU.set(seq[0], key as JutsuKey);
    HOLD_JUTSUS.add(key as JutsuKey);
  }
}

/**
 * Custom hook to manage jutsu sequence detection.
 * Single-sign jutsus (except shadowClone) stay active as long as the sign is held.
 * shadowClone is handled by the dedicated useShadowCloneHold hook.
 */
export function useJutsuEngine(currentSign: SignLabel) {
  const detectorRef = useRef<SequenceDetector | null>(null);
  const triggerJutsu = useAppStore((state) => state.triggerJutsu);
  const clearJutsu = useAppStore((state) => state.clearJutsu);
  const addToBuffer = useAppStore((state) => state.addToBuffer);
  const activeJutsu = useAppStore((state) => state.activeJutsu);

  // Initialize detector (for multi-sign sequences)
  useEffect(() => {
    const detector = new SequenceDetector((jutsu: JutsuKey) => {
      console.log(`Jutsu detected: ${jutsu}`);
      triggerJutsu(jutsu);
    });

    detectorRef.current = detector;

    return () => {
      detector.reset();
    };
  }, [triggerJutsu]);

  // Process new signs & handle hold-to-activate jutsus
  useEffect(() => {
    if (currentSign !== 'unknown') {
      detectorRef.current?.addSign(currentSign);
      addToBuffer(currentSign);
    }

    // Single-sign "hold" jutsus: activate while sign is held, clear when released
    const holdJutsu = HOLD_SIGN_TO_JUTSU.get(currentSign);
    if (holdJutsu) {
      if (activeJutsu !== holdJutsu) {
        console.log(`⚡ Hold jutsu activated: ${holdJutsu}`);
        triggerJutsu(holdJutsu);
      }
    } else if (activeJutsu && HOLD_JUTSUS.has(activeJutsu as JutsuKey) && activeJutsu !== 'rasengan' && activeJutsu !== 'chidori') {
      // The active jutsu is a hold-type and the sign changed — clear it
      // (rasengan & chidori are managed by their own lifecycle timers, never clear them here)
      console.log(`⚡ Hold jutsu cleared`);
      clearJutsu();
    }
  }, [currentSign, addToBuffer, triggerJutsu, clearJutsu, activeJutsu]);
}
