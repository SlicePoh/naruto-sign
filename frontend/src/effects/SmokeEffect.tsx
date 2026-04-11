import { useEffect, useRef } from 'react';

/**
 * Sprite-sheet smoke puff that plays once when `active` turns true.
 * Uses the 56-frame sequence in /smoke/.
 * Renders only within the visible video rect (matches ThreeScene plane).
 */

const FRAME_COUNT = 56;
const FRAME_PREFIX = '/smoke/cf7378e5-58a9-4967-af50-904b2d11ecdd-';
const FPS = 28;

function buildFramePaths(): string[] {
  return Array.from({ length: FRAME_COUNT }, (_, i) => `${FRAME_PREFIX}${i}.png`);
}

/** Replicate the ThreeScene frustum math to find the on-screen video rect. */
function getVideoRect(containerW: number, containerH: number, videoW: number, videoH: number) {
  const videoAspect = (videoW / videoH) || 16 / 9;
  const containerAspect = containerW / containerH;
  const fovRad = (50 * Math.PI) / 180;
  const cameraZ = 5;
  const frustumH = 2 * cameraZ * Math.tan(fovRad / 2);
  const frustumW = frustumH * containerAspect;
  const planeW = 6;
  const planeH = planeW / videoAspect;
  const fracW = planeW / frustumW;
  const fracH = planeH / frustumH;
  const rectW = fracW * containerW;
  const rectH = fracH * containerH;
  return { x: (containerW - rectW) / 2, y: (containerH - rectH) / 2, w: rectW, h: rectH };
}

interface SmokeEffectProps {
  readonly active: boolean;
  readonly videoElement?: HTMLVideoElement | null;
}

export function SmokeEffect({ active, videoElement }: SmokeEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedCountRef = useRef(0);
  const rafRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const paths = buildFramePaths();
    const imgs = paths.map((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { loadedCountRef.current++; };
      return img;
    });
    imagesRef.current = imgs;
  }, []);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    startTimeRef.current = performance.now();

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const containerRect = parent.getBoundingClientRect();
      if (canvas.width !== containerRect.width || canvas.height !== containerRect.height) {
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;
      }

      const elapsed = performance.now() - startTimeRef.current;
      const frameIndex = Math.floor((elapsed / 1000) * FPS);

      if (frameIndex >= FRAME_COUNT) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const img = imagesRef.current[frameIndex];
      if (!img?.complete || img.naturalWidth === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw only within the video rect
      const vw = videoElement?.videoWidth ?? 1280;
      const vh = videoElement?.videoHeight ?? 720;
      const vr = getVideoRect(containerRect.width, containerRect.height, vw, vh);

      ctx.save();
      ctx.beginPath();
      ctx.rect(vr.x, vr.y, vr.w, vr.h);
      ctx.clip();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, vr.x, vr.y, vr.w, vr.h);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, videoElement]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 7,
        pointerEvents: 'none',
      }}
    />
  );
}
