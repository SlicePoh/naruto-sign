import { useRef, useEffect, useCallback, useState } from 'react';
import { useSelfieSegmentation } from './useSelfieSegmentation';
import {
  renderShadowClones,
  generateClonePositions,
  type ClonePosition,
} from './renderShadowClones';

interface ShadowCloneProps {
  videoElement: HTMLVideoElement;
  active: boolean;
}

/**
 * Compute the CSS rect (in px) of the video plane inside the Three.js canvas.
 *
 * The Three.js scene uses:
 *   camera  – position [0,0,5], fov 50°
 *   plane   – position [0,0,0], width 4, height 4/videoAspect
 *
 * We replicate that projection math here so the shadow-clone canvas
 * only covers the region where the video is actually visible.
 */
function getVideoRect(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
): { x: number; y: number; w: number; h: number } {
  const videoAspect = (videoW / videoH) || 16 / 9;
  const containerAspect = containerW / containerH;

  // Three.js camera params
  const fovRad = (50 * Math.PI) / 180;
  const cameraZ = 5;
  // Visible height of the frustum at z = 0 (where the plane sits)
  const frustumH = 2 * cameraZ * Math.tan(fovRad / 2);
  const frustumW = frustumH * containerAspect;

  // Plane world-space size
  const planeW = 4;
  const planeH = planeW / videoAspect;

  // Fraction of the frustum occupied by the plane
  const fracW = planeW / frustumW;
  const fracH = planeH / frustumH;

  // Pixel size on screen
  const rectW = fracW * containerW;
  const rectH = fracH * containerH;

  // Centred in the container
  const rectX = (containerW - rectW) / 2;
  const rectY = (containerH - rectH) / 2;

  return { x: rectX, y: rectY, w: rectW, h: rectH };
}

export function ShadowClone({ videoElement, active }: ShadowCloneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Generate random clone positions once per activation
  const [clonePositions, setClonePositions] = useState<ClonePosition[]>([]);

  useEffect(() => {
    if (active) {
      const positions = generateClonePositions();
      console.log(`🥷 Spawning ${positions.length} shadow clones`);
      setClonePositions(positions);
    } else {
      setClonePositions([]);
    }
  }, [active]);

  // Start/stop segmentation based on `active` flag
  const { maskCanvas, ready: segReady } = useSelfieSegmentation(
    videoElement,
    active,
  );

  // Rendering loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const mask = maskCanvas.current;
    if (!canvas || !mask || !active || clonePositions.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size the canvas to match the visible video rectangle, not the whole container
    const parent = canvas.parentElement;
    if (!parent) return;
    const containerRect = parent.getBoundingClientRect();
    const vr = getVideoRect(
      containerRect.width,
      containerRect.height,
      videoElement.videoWidth,
      videoElement.videoHeight,
    );

    // Round to whole pixels
    const cw = Math.round(vr.w);
    const ch = Math.round(vr.h);
    if (cw <= 0 || ch <= 0) return;

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // Position the canvas over the video area via CSS
    canvas.style.left = `${Math.round(vr.x)}px`;
    canvas.style.top = `${Math.round(vr.y)}px`;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    renderShadowClones(
      ctx,
      videoElement,
      mask,
      cw,
      ch,
      clonePositions,
    );
  }, [active, videoElement, maskCanvas, clonePositions]);

  // Animation frame loop — only runs while active + segmenter ready
  useEffect(() => {
    if (!active || !segReady || clonePositions.length === 0) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      // Clear canvas on deactivation
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [active, segReady, draw, clonePositions]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="shadow-clone-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
}
