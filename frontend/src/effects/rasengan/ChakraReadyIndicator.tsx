import { useAppStore } from '../../store/useAppStore';

/**
 * Floating "CHAKRA READY" indicator shown when the backend
 * reports chakra_state === "CHAKRA_READY".
 */
export function ChakraReadyIndicator() {
  const chakraState = useAppStore((s) => s.chakraState);
  const rasenganActive = useAppStore((s) => s.rasenganActive);

  // Show during FORMING / SPINNING / CHAKRA_READY, but not when rasengan fires
  if (!chakraState || chakraState === 'IDLE' || rasenganActive) return null;

  let label = 'FORMING CHAKRA';
  if (chakraState === 'CHAKRA_READY') {
    label = 'CHAKRA READY \u2014 OPEN PALM';
  } else if (chakraState === 'SPINNING') {
    label = 'SPINNING';
  }

  const isReady = chakraState === 'CHAKRA_READY';

  return (
    <div className={`chakra-indicator ${isReady ? 'chakra-ready' : 'chakra-forming'}`}>
      {label}
    </div>
  );
}
