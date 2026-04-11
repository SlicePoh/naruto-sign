import { useRef } from 'react';
import { useRasengan } from './useRasengan';
import type { HandLandmarks } from '../../classifier/types';

interface RasenganOverlayProps {
  readonly hands: HandLandmarks[];
  readonly videoElement?: HTMLVideoElement | null;
}

/**
 * Canvas overlay that renders the Rasengan visual effect on the user's palm.
 * Mount this inside the scene-container alongside the other overlays.
 */
export function RasenganOverlay({ hands, videoElement }: RasenganOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useRasengan(canvasRef, hands, videoElement ?? null);

  return (
    <canvas
      ref={canvasRef}
      className="rasengan-overlay"
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
