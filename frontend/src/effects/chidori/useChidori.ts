import { useEffect, useRef, useCallback } from 'react';
import { ChidoriEffect, CHIDORI_DURATION_MS } from './ChidoriEffect';
import { useAppStore } from '../../store/useAppStore';
import type { HandLandmarks } from '../../classifier/types';

/** Landmark indices whose average approximates palm centre. */
const PALM_CENTER_INDICES = [0, 5, 9, 13, 17] as const;


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

function getSinglePalmTarget(hands: HandLandmarks[], rect: DOMRect): PalmTarget | null {
  const hand = (hands ?? []).find((h) => h?.length === 21);
  if (!hand) return null;
  const center = averagePalmCenter(hand);
  return toCanvasTarget(center, rect, 110, 0);
}

/* ── hook ─────────────────────────────────────────────────────── */

/**
 * useChidori — manages the full lifecycle of the Chidori visual effect.
 *
 * Chidori is a single-hand jutsu: lightning concentrates in one palm.
 * It activates when the jutsu engine detects the Ox → Hare → Monkey sequence
 * followed by an open palm.
 */
export function useChidori(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hands: HandLandmarks[],
  videoElement: HTMLVideoElement | null,
) {
  const effectRef = useRef<ChidoriEffect | null>(null);
  const rafRef = useRef(0);
  const lastTargetRef = useRef<PalmTarget | null>(null);

  const chidoriActive = useAppStore((s) => s.chidoriActive);
  const currentSign = useAppStore((s) => s.currentSign);
  const deactivateChidori = useAppStore((s) => s.deactivateChidori);

  // Mutable refs — rAF always reads the latest values
  const handsRef = useRef(hands);
  handsRef.current = hands;
  const chidoriActiveRef = useRef(chidoriActive);
  chidoriActiveRef.current = chidoriActive;
  const currentSignRef = useRef(currentSign);
  currentSignRef.current = currentSign;
  const videoRef = useRef(videoElement);
  videoRef.current = videoElement;

  // Mount: create effect + start render loop
  useEffect(() => {
    const fx = new ChidoriEffect();
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

    const isActive = chidoriActiveRef.current;

    // Auto-stop after duration
    if (fx.finished) {
      fx.stop();
      lastTargetRef.current = null;
      deactivateChidori();
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // Single palm target — chidori is a one-hand jutsu
    const currentHands = handsRef.current;
    const singleTarget = getSinglePalmTarget(currentHands, rect);
    const bestTarget = singleTarget ?? lastTargetRef.current;

    // Compute video rect for bounds clamping
    const vid = videoRef.current;
    const vw = vid?.videoWidth ?? 1280;
    const vh = vid?.videoHeight ?? 720;
    const videoRect = getVideoRect(rect.width, rect.height, vw, vh);

    // Drive the effect state machine
    if (isActive) {
      fx.activate();
    } else if (fx.visible && !isActive) {
      fx.stop();
    }

    const target: PalmTarget | null = isActive ? bestTarget : null;

    if (!target || !fx.visible) {
      lastTargetRef.current = null;
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // Clamp position to the visible video area
    const clamped = clampToVideoRect(target.x, target.y, videoRect);
    if (!clamped.inside && isActive) {
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
    fx.draw(ctx, clampedTarget);

    rafRef.current = requestAnimationFrame(draw);
  }, [canvasRef, deactivateChidori]);

  // Safety timer: guarantee deactivation after duration
  useEffect(() => {
    if (!chidoriActive) return undefined;
    const timer = setTimeout(() => {
      const fx = effectRef.current;
      if (fx) fx.stop();
      lastTargetRef.current = null;
      deactivateChidori();
    }, CHIDORI_DURATION_MS + 500);
    return () => clearTimeout(timer);
  }, [chidoriActive, deactivateChidori]);

  // Cleanup canvas when chidori turns off
  useEffect(() => {
    if (chidoriActive) return undefined;
    const fx = effectRef.current;
    if (fx) {
      fx.stop();
      lastTargetRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return undefined;
  }, [chidoriActive, canvasRef]);
}
