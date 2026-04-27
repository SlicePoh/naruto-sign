import { useAppStore } from '../../store/useAppStore';

/**
 * Floating "CHIDORI READY" indicator shown when the sequence
 * Ox → Hare → Monkey has been detected and we're waiting for open palm.
 */
export function ChidoriReadyIndicator() {
  const chidoriReady = useAppStore((s) => s.chidoriReady);
  const chidoriActive = useAppStore((s) => s.chidoriActive);

  if (!chidoriReady || chidoriActive) return null;

  return (
    <div className="chakra-indicator chakra-ready" style={{ borderColor: '#7070ff' }}>
      ⚡ CHIDORI READY — OPEN PALM
    </div>
  );
}
