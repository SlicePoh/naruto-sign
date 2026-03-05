import { useEffect, useRef, useCallback, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import type { Results } from '@mediapipe/selfie_segmentation';

/**
 * Custom hook that runs MediaPipe Selfie Segmentation on each video frame.
 * Returns a mask canvas that isolates the person from the background.
 */
export function useSelfieSegmentation(
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
) {
  const segmenterRef = useRef<SelfieSegmentation | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  // Initialise the segmenter once
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const segmenter = new SelfieSegmentation({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    segmenter.setOptions({
      modelSelection: 1, // landscape model — better quality
      selfieMode: true,
    });

    segmenter.onResults((results: Results) => {
      if (cancelled) return;

      // Ensure we have a mask canvas of the correct size
      if (!maskCanvasRef.current) {
        maskCanvasRef.current = document.createElement('canvas');
      }
      const mc = maskCanvasRef.current;
      if (
        mc.width !== results.image.width ||
        mc.height !== results.image.height
      ) {
        mc.width = results.image.width;
        mc.height = results.image.height;
      }

      const ctx = mc.getContext('2d');
      if (!ctx) return;

      // Draw the segmentation mask (white = person, black = background)
      ctx.clearRect(0, 0, mc.width, mc.height);
      ctx.drawImage(results.segmentationMask, 0, 0, mc.width, mc.height);
    });

    segmenter
      .initialize()
      .then(() => {
        if (!cancelled) {
          segmenterRef.current = segmenter;
          setReady(true);
        }
      })
      .catch((err: unknown) =>
        console.error('Selfie segmentation init failed:', err),
      );

    return () => {
      cancelled = true;
      segmenter.close();
      segmenterRef.current = null;
      setReady(false);
    };
  }, [enabled]);

  // Per-frame send loop — feeds the video into the segmenter
  const sendFrame = useCallback(async () => {
    const seg = segmenterRef.current;
    if (!seg || !videoElement || videoElement.readyState < 2) {
      return;
    }

    try {
      await seg.send({ image: videoElement });
    } catch {
      // Segmenter may throw if frames arrive too fast; silently skip
    }
  }, [videoElement]);

  // Animation-frame loop
  useEffect(() => {
    if (!enabled || !ready) return;

    let running = true;

    const loop = async () => {
      if (!running) return;
      await sendFrame();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, ready, sendFrame]);

  return { maskCanvas: maskCanvasRef, ready };
}
