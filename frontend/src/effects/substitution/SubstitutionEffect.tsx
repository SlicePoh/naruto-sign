import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * Two log images — randomly pick one per activation for variety.
 */
const LOG_IMAGES = [
  '/Substitution Jutsu 1.png',
  '/Substitution Jutsu 2.png',
];

/** Replicate ThreeScene frustum math to find the on-screen video rect. */
function getVideoRect(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
) {
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
  return {
    x: (containerW - rectW) / 2,
    y: (containerH - rectH) / 2,
    w: rectW,
    h: rectH,
  };
}

interface SubstitutionEffectProps {
  readonly active: boolean;
  readonly videoElement?: HTMLVideoElement | null;
}

/**
 * SubstitutionEffect — when active, replaces the user's body with a wooden log.
 * 
 * The effect:
 *  1. Smoke covers the scene (handled by SmokeEffect)
 *  2. After ~400ms the log fades in, positioned to cover where the person was
 *  3. The log is drawn full-height within the video rect to simulate body replacement
 *  4. A subtle sway animation makes the log feel like it just "poofed" into place
 */
export function SubstitutionEffect({ active, videoElement }: SubstitutionEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const activationTimeRef = useRef(0);
  const logImageRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  const substitutionEndTime = useAppStore((s) => s.substitutionEndTime);
  const deactivateSubstitution = useAppStore((s) => s.deactivateSubstitution);
  const clearJutsu = useAppStore((s) => s.clearJutsu);

  // Preload both log images on mount
  const imagesRef = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    const imgs = LOG_IMAGES.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    imagesRef.current = imgs;
  }, []);

  // Pick a random log on activation
  useEffect(() => {
    if (active) {
      activationTimeRef.current = Date.now();
      const idx = Math.floor(Math.random() * imagesRef.current.length);
      const img = imagesRef.current[idx];
      logImageRef.current = img;
      if (img.complete && img.naturalWidth > 0) {
        setReady(true);
      } else {
        img.onload = () => setReady(true);
      }
      console.log(`🪵 Substitution — using log image ${idx + 1}`);
    } else {
      setReady(false);
      logImageRef.current = null;
    }
  }, [active]);

  // Auto-deactivation timer
  useEffect(() => {
    if (!active || substitutionEndTime === null) return;
    const remaining = substitutionEndTime - Date.now();
    if (remaining <= 0) {
      deactivateSubstitution();
      clearJutsu();
      return;
    }
    const timer = setTimeout(() => {
      console.log('🪵 Substitution Jutsu — DEACTIVATED');
      deactivateSubstitution();
      clearJutsu();
    }, remaining);
    return () => clearTimeout(timer);
  }, [active, substitutionEndTime, deactivateSubstitution, clearJutsu]);

  // Render loop — draws the log image replacing the user's body
  useEffect(() => {
    if (!active || !ready) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let running = true;

    const draw = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      const logImg = logImageRef.current;
      if (!canvas || !logImg || !logImg.complete || logImg.naturalWidth === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const containerRect = parent.getBoundingClientRect();
      if (canvas.width !== containerRect.width || canvas.height !== containerRect.height) {
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Timing
      const elapsed = Date.now() - activationTimeRef.current;
      const APPEAR_DELAY_MS = 400;   // smoke covers the swap
      const FADE_DURATION_MS = 300;  // log fades in
      const FADE_OUT_START = substitutionEndTime
        ? substitutionEndTime - Date.now()
        : 99999;

      if (elapsed < APPEAR_DELAY_MS) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Fade in / fade out
      let alpha: number;
      if (elapsed - APPEAR_DELAY_MS < FADE_DURATION_MS) {
        alpha = (elapsed - APPEAR_DELAY_MS) / FADE_DURATION_MS;
      } else if (FADE_OUT_START < 800) {
        // Fade out in the last 800ms
        alpha = Math.max(0, FADE_OUT_START / 800);
      } else {
        alpha = 1;
      }

      // Compute video rect (where the person's body is)
      const vw = videoElement?.videoWidth ?? 1280;
      const vh = videoElement?.videoHeight ?? 720;
      const vr = getVideoRect(containerRect.width, containerRect.height, vw, vh);

      // Subtle entrance animation — slight scale bounce in first 500ms
      const entranceElapsed = elapsed - APPEAR_DELAY_MS;
      let scaleAnim = 1;
      if (entranceElapsed < 500) {
        const t = entranceElapsed / 500;
        // Overshoot then settle
        scaleAnim = 1 + 0.08 * Math.sin(t * Math.PI);
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw semi-transparent dark background to hide the video feed behind the log
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(vr.x, vr.y, vr.w, vr.h);

      // Draw the log to cover the person's body
      // Position: centered horizontally in the video rect
      // Sized to cover most of the body height (90% of video rect height)
      const imgAspect = logImg.naturalWidth / logImg.naturalHeight;
      
      // The log should be tall (covering full body), size to fill ~90% of height
      const targetH = vr.h * 0.88 * scaleAnim;
      const targetW = targetH * imgAspect;
      
      // If the log is wider than the rect, fit to width instead
      let drawW: number, drawH: number;
      if (targetW > vr.w * 0.9) {
        drawW = vr.w * 0.9 * scaleAnim;
        drawH = drawW / imgAspect;
      } else {
        drawW = targetW;
        drawH = targetH;
      }
      
      // Center the log in the video rect
      const drawX = vr.x + (vr.w - drawW) / 2;
      const drawY = vr.y + (vr.h - drawH) / 2;

      ctx.drawImage(logImg, drawX, drawY, drawW, drawH);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [active, ready, videoElement, substitutionEndTime]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
  );
}
