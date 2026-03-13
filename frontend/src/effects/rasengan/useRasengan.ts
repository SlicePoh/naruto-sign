import { useEffect, useRef, useCallback } from 'react';
import { RasenganEffect } from './RasenganEffect';
import { useAppStore } from '../../store/useAppStore';
import type { HandLandmarks } from '../../classifier/types';

/** Landmark index 9 = middle-finger MCP ≈ palm centre. */
// const PALM_LANDMARK_INDEX = 9;

/**
 * useRasengan — manages the full lifecycle of the Rasengan visual effect.
 *
 *  • Loads the video asset on mount.
 *  • Listens to `rasenganActive` in the global store.
 *  • On each animation frame, reads the latest palm position from `hands`
 *    and draws the effect onto a dedicated overlay canvas.
 *  • Auto-deactivates after the animation completes.
 *
 * @param canvasRef  Ref to the overlay `<canvas>` element.
 * @param hands      Current hand landmarks array (from MediaPipe).
 */
export function useRasengan(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hands: HandLandmarks[],
) {
  const effectRef = useRef<RasenganEffect | null>(null);
  const rafRef = useRef(0);

  const rasenganActive = useAppStore((s) => s.rasenganActive);
  const deactivateRasengan = useAppStore((s) => s.deactivateRasengan);
  const setRasenganPalmPosition = useAppStore((s) => s.setRasenganPalmPosition);

  // Keep a mutable ref so the rAF loop always sees latest hands
  const handsRef = useRef(hands);
  handsRef.current = hands;

  // Load the video asset once on mount 
  useEffect(() => {
    const fx = new RasenganEffect();
    effectRef.current = fx;

    return () => {
      fx.dispose();
      effectRef.current = null;
    };
  }, []);

  // Render loop 
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const fx = effectRef.current;
    if (!canvas || !fx || !fx.active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Resize canvas to match parent container
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Auto-stop check
    if (fx.finished) {
      fx.stop();
      deactivateRasengan();
      return;
    }
    // Find palm position from the first available hand with 21 landmarks
    const currentHands = handsRef.current;
    let palmX: number | null = null;
    let palmY: number | null = null;
    for (const hand of currentHands) {
      if (hand && hand.length === 21) {
        if (currentHands.length >= 2) {
            const h1 = currentHands[0][9]
            const h2 = currentHands[1][9]
            palmX = (1 - ((h1.x + h2.x) / 2)) * rect.width
            palmY = ((h1.y + h2.y) / 2) * rect.height
        } else {
            const lm9 = currentHands[0][9]
            palmX = (1 - lm9.x) * rect.width
            palmY = lm9.y * rect.height
        }
        break;
      }
    }
    if (palmX !== null && palmY !== null) {
      setRasenganPalmPosition({ x: palmX, y: palmY });
      fx.draw(ctx, { x: palmX, y: palmY });
    }
    rafRef.current = requestAnimationFrame(draw);
  }, [canvasRef, deactivateRasengan, setRasenganPalmPosition]);

  //  Start / stop based on store state 
  useEffect(() => {
    const fx = effectRef.current;
    if (!fx) return;

    if (rasenganActive) {
      fx.start();
      rafRef.current = requestAnimationFrame(draw);
    } else {
      fx.stop();
      cancelAnimationFrame(rafRef.current);
      // Clear the canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [rasenganActive, draw, canvasRef]);
}
