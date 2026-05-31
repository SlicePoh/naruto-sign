import { useAppStore } from '../../store/useAppStore';

/**
 * Floating "CHIDORI" indicator shown when the chidori effect is active.
 * Open palm to aim/place the lightning.
 */
export function ChidoriReadyIndicator() {
  const chidoriActive = useAppStore((s) => s.chidoriActive);

  if (!chidoriActive) return null;

  return (
    <div className="chakra-indicator chakra-ready" style={{ borderColor: '#7070ff' }}>
      ⚡ CHIDORI — OPEN PALM TO AIM
    </div>
  );
}
