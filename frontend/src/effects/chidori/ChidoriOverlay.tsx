import { useRef } from 'react';
import { useChidori } from './useChidori';
import type { HandLandmarks } from '../../classifier/types';

interface ChidoriOverlayProps {
  readonly hands: HandLandmarks[];
  readonly videoElement?: HTMLVideoElement | null;
}

/**
 * Canvas overlay that renders the Chidori visual effect on the user's palm.
 * Mount this inside the scene-container alongside the other overlays.
 */
export function ChidoriOverlay({ hands, videoElement }: ChidoriOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useChidori(canvasRef, hands, videoElement ?? null);

  return (
    <canvas
      ref={canvasRef}
      className="chidori-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 6,
        pointerEvents: 'none',
      }}
    />
  );
}
