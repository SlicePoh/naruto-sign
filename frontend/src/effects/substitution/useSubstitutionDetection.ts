import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * useSubstitutionDetection — watches for the substitution jutsu trigger from
 * the sequence detector, then immediately activates the substitution effect.
 *
 * Flow:
 *  1. useJutsuEngine detects Ram → Boar → Ox → Dog → Serpent → sets activeJutsu = 'substitution'
 *  2. This hook sees activeJutsu === 'substitution' && !substitutionActive
 *     → activateSubstitution() immediately
 *  3. SubstitutionEffect renders smoke + log replacement
 *  4. After duration the effect auto-stops
 */
export function useSubstitutionDetection() {
  const activeJutsu = useAppStore((s) => s.activeJutsu);
  const substitutionActive = useAppStore((s) => s.substitutionActive);
  const activateSubstitution = useAppStore((s) => s.activateSubstitution);

  const activatingRef = useRef(false);

  useEffect(() => {
    if (activeJutsu === 'substitution' && !substitutionActive && !activatingRef.current) {
      activatingRef.current = true;
      console.log('💨 Substitution Jutsu — activating!');
      activateSubstitution();
    }

    if (!substitutionActive && activeJutsu !== 'substitution') {
      activatingRef.current = false;
    }
  }, [activeJutsu, substitutionActive, activateSubstitution]);
}
