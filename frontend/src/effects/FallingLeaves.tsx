import { useRef, useEffect } from 'react';

/** Two leaf assets with transparent backgrounds. */
const LEAF_SRCS = ['/leaf%201.png', '/leaf%202.png'] as const;
const LEAF_COUNT = 18;
const LEAF_OPACITY = 0.32;

interface Leaf {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  fallSpeed: number;
  swayAmplitude: number;
  swayFrequency: number;
  swayOffset: number;
  imgIndex: number;
}

function createLeaf(canvasW: number, canvasH: number, startAbove = false): Leaf {
  return {
    x: Math.random() * canvasW,
    y: startAbove ? -(Math.random() * canvasH * 0.4 + 40) : Math.random() * canvasH,
    size: 18 + Math.random() * 22,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    fallSpeed: 0.3 + Math.random() * 0.55,
    swayAmplitude: 20 + Math.random() * 40,
    swayFrequency: 0.0008 + Math.random() * 0.0012,
    swayOffset: Math.random() * 10000,
    imgIndex: Math.random() < 0.5 ? 0 : 1,
  };
}

/**
 * Full-screen falling leaf particles rendered behind all content.
 * Uses two leaf images with low opacity.
 */
export function FallingLeaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leafImagesRef = useRef<HTMLImageElement[]>([]);
  const leavesRef = useRef<Leaf[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    // Preload leaf images
    const images = LEAF_SRCS.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    leafImagesRef.current = images;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    // Initialise leaves
    leavesRef.current = Array.from({ length: LEAF_COUNT }, () =>
      createLeaf(canvas.width, canvas.height, false),
    );

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = LEAF_OPACITY;

      const now = performance.now();

      for (const leaf of leavesRef.current) {
        leaf.y += leaf.fallSpeed;
        leaf.rotation += leaf.rotationSpeed;
        const sway = Math.sin((now + leaf.swayOffset) * leaf.swayFrequency) * leaf.swayAmplitude;
        const drawX = leaf.x + sway;

        // Recycle leaf that goes off-screen
        if (leaf.y > canvas.height + leaf.size) {
          Object.assign(leaf, createLeaf(canvas.width, canvas.height, true));
        }

        const img = images[leaf.imgIndex];
        if (!img.complete || img.naturalWidth === 0) continue;

        ctx.save();
        ctx.translate(drawX, leaf.y);
        ctx.rotate(leaf.rotation);
        ctx.drawImage(img, -leaf.size / 2, -leaf.size / 2, leaf.size, leaf.size);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="falling-leaves"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 1,
      }}
    />
  );
}
