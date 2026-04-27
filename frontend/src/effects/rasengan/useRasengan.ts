import { useEffect, useRef, useCallback } from 'react';
import { RasenganEffect, RASENGAN_DURATION_MS } from './RasenganEffect';
import { useAppStore } from '../../store/useAppStore';
import type { ChakraState } from '../../store/useAppStore';
import type { HandLandmarks, SignLabel } from '../../classifier/types';

/** Landmark indices whose average approximates palm centre. */
const PALM_CENTER_INDICES = [0, 5, 9, 13, 17] as const;

/** Chakra states from the backend that should trigger the charging visual. */
const CHARGING_CHAKRA_STATES: ReadonlySet<ChakraState> = new Set([
  'FORMING',
  'SPINNING',
  'CHAKRA_READY',
]);

/**
 * Any trained hand sign that is NOT rasengan / neutral / unknown.
 * When the local classifier confidently detects one of these,
 * the rasengan charge is suppressed so other jutsus aren't
 * accidentally hijacked by the wrist-proximity state machine.
 */
const BLOCKING_SIGNS: ReadonlySet<SignLabel> = new Set([
  'tiger', 'ram', 'dog', 'hare', 'horse', 'rat',
  'serpent', 'shadow', 'bird', 'boar', 'ox', 'dragon', 'monkey',
]);

interface PalmTarget {
  x: number;
  y: number;
  palmGapPx: number;
  gapNorm: number;
}

/* ── geometry helpers ─────────────────────────────────────────── */

function averagePalmCenter(hand: HandLandmarks) {
  let sx = 0, sy = 0;
  for (const idx of PALM_CENTER_INDICES) {
    sx += hand[idx].x;
    sy += hand[idx].y;
  }
  return { x: sx / PALM_CENTER_INDICES.length, y: sy / PALM_CENTER_INDICES.length };
}

/**
 * Compute the on-screen rect of the Three.js video plane.
 * Must stay in sync with ThreeScene (fov 50, cameraZ 5, planeW 6).
 */
function getVideoRect(cw: number, ch: number, vw: number, vh: number) {
  const videoAspect = (vw / vh) || 16 / 9;
  const containerAspect = cw / ch;
  const fovRad = (50 * Math.PI) / 180;
  const cameraZ = 5;
  const frustumH = 2 * cameraZ * Math.tan(fovRad / 2);
  const frustumW = frustumH * containerAspect;
  const planeW = 6;
  const planeH = planeW / videoAspect;
  const fracW = planeW / frustumW;
  const fracH = planeH / frustumH;
  const rw = fracW * cw;
  const rh = fracH * ch;
  return { x: (cw - rw) / 2, y: (ch - rh) / 2, w: rw, h: rh };
}

function clampToVideoRect(
  px: number,
  py: number,
  rect: { x: number; y: number; w: number; h: number },
  margin = 30,
): { x: number; y: number; inside: boolean } {
  const minX = rect.x + margin;
  const maxX = rect.x + rect.w - margin;
  const minY = rect.y + margin;
  const maxY = rect.y + rect.h - margin;
  const cx = Math.max(minX, Math.min(maxX, px));
  const cy = Math.max(minY, Math.min(maxY, py));
  const inside =
    px >= rect.x - margin && px <= rect.x + rect.w + margin &&
    py >= rect.y - margin && py <= rect.y + rect.h + margin;
  return { x: cx, y: cy, inside };
}

function toCanvasTarget(
  center: { x: number; y: number },
  rect: DOMRect,
  palmGapPx: number,
  gapNorm: number,
): PalmTarget {
  return {
    x: (1 - center.x) * rect.width,
    y: center.y * rect.height,
    palmGapPx,
    gapNorm,
  };
}

function getDualPalmTarget(hands: HandLandmarks[], rect: DOMRect): PalmTarget | null {
  const valid = (hands ?? []).filter((h) => h?.length === 21).slice(0, 2);
  if (valid.length < 2) return null;
  const lp = averagePalmCenter(valid[0]);
  const rp = averagePalmCenter(valid[1]);
  const center = { x: (lp.x + rp.x) / 2, y: (lp.y + rp.y) / 2 };
  const gapNorm = Math.hypot(lp.x - rp.x, lp.y - rp.y);
  const palmGapPx = Math.hypot(
    (lp.x - rp.x) * rect.width,
    (lp.y - rp.y) * rect.height,
  );
  return toCanvasTarget(center, rect, palmGapPx, gapNorm);
}

function getSinglePalmTarget(hands: HandLandmarks[], rect: DOMRect): PalmTarget | null {
  const hand = (hands ?? []).find((h) => h?.length === 21);
  if (!hand) return null;
  const center = averagePalmCenter(hand);
  return toCanvasTarget(center, rect, 110, 0);
}

/* ── hook ─────────────────────────────────────────────────────── */

/**
 * useRasengan — manages the full lifecycle of the Rasengan visual effect.
 *
 *  • Only charges when the backend signals FORMING / SPINNING / CHAKRA_READY
 *    AND the local classifier has NOT detected a trained sign (which would
 *    mean the user is performing a different jutsu).
 *  • Clamps the ball position to the visible video rect so it never floats
 *    outside the camera view; disappears when the hand leaves the rect.
 *  • Uses refs for store values so the rAF loop never sees stale closures.
 */
export function useRasengan(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hands: HandLandmarks[],
  videoElement: HTMLVideoElement | null,
) {
  const effectRef = useRef<RasenganEffect | null>(null);
  const rafRef = useRef(0);
  const lastTargetRef = useRef<PalmTarget | null>(null);

  const rasenganActive = useAppStore((s) => s.rasenganActive);
  const chakraState = useAppStore((s) => s.chakraState);
  const currentSign = useAppStore((s) => s.currentSign);
  const deactivateRasengan = useAppStore((s) => s.deactivateRasengan);
  const setRasenganPalmPosition = useAppStore((s) => s.setRasenganPalmPosition);

  // Mutable refs — rAF always reads the latest values
  const handsRef = useRef(hands);
  handsRef.current = hands;
  const rasenganActiveRef = useRef(rasenganActive);
  rasenganActiveRef.current = rasenganActive;
  const chakraStateRef = useRef(chakraState);
  chakraStateRef.current = chakraState;
  const currentSignRef = useRef(currentSign);
  currentSignRef.current = currentSign;
  const videoRef = useRef(videoElement);
  videoRef.current = videoElement;

  // Mount: create effect + start render loop
  useEffect(() => {
    const fx = new RasenganEffect();
    effectRef.current = fx;
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      fx.dispose();
      effectRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── render loop ──────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const fx = effectRef.current;
    if (!canvas || !fx) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }
    const parent = canvas.parentElement;
    if (!parent) { rafRef.current = requestAnimationFrame(draw); return; }

    const rect = parent.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Latest values from refs
    const isActive = rasenganActiveRef.current;
    const currentChakra = chakraStateRef.current;
    const sign = currentSignRef.current;
    const isCharging = currentChakra != null && CHARGING_CHAKRA_STATES.has(currentChakra);

    // Block rasengan charge when a trained non-rasengan sign is detected
    const signBlocks = BLOCKING_SIGNS.has(sign);

    // Auto-stop after duration
    if (fx.finished) {
      fx.stop();
      lastTargetRef.current = null;
      setRasenganPalmPosition(null);
      deactivateRasengan();
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // Resolve palm targets
    const currentHands = handsRef.current;
    const dualTarget = getDualPalmTarget(currentHands, rect);
    const singleTarget = getSinglePalmTarget(currentHands, rect);
    const bestTarget = dualTarget ?? singleTarget ?? lastTargetRef.current;

    // Compute video rect for bounds clamping
    const vid = videoRef.current;
    const vw = vid?.videoWidth ?? 1280;
    const vh = vid?.videoHeight ?? 720;
    const videoRect = getVideoRect(rect.width, rect.height, vw, vh);

    // Drive the effect state machine
    if (isActive) {
      fx.activate();
    } else if (isCharging && dualTarget && !signBlocks) {
      fx.beginCharge();
    } else if (fx.visible && !isActive) {
      fx.stop();
    }

    let target: PalmTarget | null = null;
    if (isActive) target = bestTarget;
    else if (isCharging && !signBlocks) target = dualTarget;

    if (!target || !fx.visible) {
      lastTargetRef.current = null;
      setRasenganPalmPosition(null);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // Clamp position to the visible video area
    const clamped = clampToVideoRect(target.x, target.y, videoRect);
    if (!clamped.inside && isActive) {
      // Hand is outside camera — hide the effect
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const clampedTarget: PalmTarget = {
      ...target,
      x: clamped.x,
      y: clamped.y,
    };

    lastTargetRef.current = clampedTarget;
    setRasenganPalmPosition({ x: clamped.x, y: clamped.y });
    fx.draw(ctx, clampedTarget);

    rafRef.current = requestAnimationFrame(draw);
  }, [canvasRef, deactivateRasengan, setRasenganPalmPosition]);

  // Safety timer: guarantee deactivation after duration
  useEffect(() => {
    if (!rasenganActive) return undefined;
    const timer = setTimeout(() => {
      const fx = effectRef.current;
      if (fx) fx.stop();
      lastTargetRef.current = null;
      setRasenganPalmPosition(null);
      deactivateRasengan();
    }, RASENGAN_DURATION_MS + 500);
    return () => clearTimeout(timer);
  }, [rasenganActive, deactivateRasengan, setRasenganPalmPosition]);

  // Cleanup canvas when rasengan turns off
  useEffect(() => {
    if (rasenganActive) return undefined;
    const fx = effectRef.current;
    if (fx && !fx.charging) {
      fx.stop();
      lastTargetRef.current = null;
      setRasenganPalmPosition(null);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return undefined;
  }, [rasenganActive, canvasRef, setRasenganPalmPosition]);
}
