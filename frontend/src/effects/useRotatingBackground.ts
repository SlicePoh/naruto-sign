import { useState, useEffect } from 'react';

/**
 * All Naruto background images in /background/.
 * Rotates every INTERVAL_MS milliseconds.
 */
const BACKGROUNDS = [
  '/background/naruto_swing.jpg',
  '/background/naruto%20swing%202.jpg',
  '/background/naruto%20meditaion.jpg',
  '/background/hashirama_madara_waterfall.jpg',
  '/background/hashirama_madara_waterfall%202.jpg',
  '/background/ichiraku%20ramen%20shop.jpg',
  '/background/Ichiraku%20ramen%20shop%202.jpg',
  '/background/mount%20rushmore.jpg',
  '/background/rain%20village.jpg',
] as const;

const INTERVAL_MS = 60_000; // 1 minute

/**
 * Returns the current background image URL, cycling every minute.
 */
export function useRotatingBackground(): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // Preload the next image so the transition isn't jarring
  useEffect(() => {
    const next = (index + 1) % BACKGROUNDS.length;
    const img = new Image();
    img.src = BACKGROUNDS[next];
  }, [index]);

  return BACKGROUNDS[index];
}
