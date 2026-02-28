import { useEffect, useRef } from 'react';
import type { HandLandmarks } from '../classifier/types';

const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm cross connections
  [5, 9], [9, 13], [13, 17],
] as const;

const TIP_INDICES = [4, 8, 12, 16, 20] as const;

export function HandOverlay({ hands }: { hands: HandLandmarks[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Lines: green
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.9)';

      for (const hand of hands ?? []) {
        if (!hand || hand.length !== 21) continue;

        // Bones
        for (const [a, b] of CONNECTIONS) {
          const pa = hand[a];
          const pb = hand[b];
          if (!pa || !pb) continue;

          // Mirror X to match the Three.js video plane (scale [-1, 1, 1])
          const ax = (1 - pa.x) * rect.width;
          const ay = pa.y * rect.height;
          const bx = (1 - pb.x) * rect.width;
          const by = pb.y * rect.height;

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Landmarks (small green dots)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        for (let i = 0; i < hand.length; i++) {
          const p = hand[i];
          const x = (1 - p.x) * rect.width;
          const y = p.y * rect.height;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fingertip endpoints (red)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.95)';
        for (const idx of TIP_INDICES) {
          const p = hand[idx];
          const x = (1 - p.x) * rect.width;
          const y = p.y * rect.height;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hands]);

  return <canvas ref={canvasRef} className="hand-overlay" />;
}
