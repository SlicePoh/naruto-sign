import { useEffect, useRef } from 'react';
import { SequenceDetector } from './sequenceDetector';
import type { SignLabel } from '../classifier/types';
import type { JutsuKey } from './jutsuRegistry';
import { useAppStore } from '../store/useAppStore';

/**
 * Custom hook to manage jutsu sequence detection
 * Integrates with global store to trigger jutsu effects
 */
export function useJutsuEngine(currentSign: SignLabel) {
  const detectorRef = useRef<SequenceDetector | null>(null);
  const setActiveJutsu = useAppStore((state) => state.setActiveJutsu);
  const addToBuffer = useAppStore((state) => state.addToBuffer);

  // Initialize detector
  useEffect(() => {
    const detector = new SequenceDetector((jutsu: JutsuKey) => {
      console.log(`Jutsu detected: ${jutsu}`);
      setActiveJutsu(jutsu);
      
      // Auto-clear jutsu after 4 seconds
      setTimeout(() => {
        setActiveJutsu(null);
      }, 4000);
    });

    detectorRef.current = detector;

    return () => {
      detector.reset();
    };
  }, [setActiveJutsu]);

  // Process new signs
  useEffect(() => {
    if (detectorRef.current && currentSign !== 'unknown') {
      detectorRef.current.addSign(currentSign);
      addToBuffer(currentSign);
    }
  }, [currentSign, addToBuffer]);
}
