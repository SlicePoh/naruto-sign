export interface ClonePosition {
  x: number; // normalised 0-1
  y: number; // normalised 0-1
  scale: number; // relative to base scale
  alpha: number;
  blur: number; // px
}

/**
 * Generate a random set of clone positions (called once per activation).
 * Returns 2-10 positions spread across the canvas.
 */
export function generateClonePositions(): ClonePosition[] {
  const count = Math.floor(Math.random() * 9) + 2; // 2..10
  const positions: ClonePosition[] = [];

  for (let i = 0; i < count; i++) {
    // Spread clones horizontally with some vertical variance
    const x = 0.08 + Math.random() * 0.84; // keep within 8%-92% of width
    const y = 0.05 + Math.random() * 0.25;  // slight vertical jitter around the person
    const scale = 0.6 + Math.random() * 0.5; // 0.6x – 1.1x
    const alpha = 0.45 + Math.random() * 0.45; // 0.45 – 0.9
    const blur = Math.random() < 0.4 ? 0 : 1 + Math.random() * 3; // some sharp, some blurry
    positions.push({ x, y, scale, alpha, blur });
  }

  return positions;
}

/**
 * Render shadow clones onto the overlay canvas.
 *
 * @param clonePositions – pre-generated random positions (stable for the whole activation)
 */
export function renderShadowClones( ctx: CanvasRenderingContext2D, video: HTMLVideoElement, maskCanvas: HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  clonePositions: ClonePosition[],
) {
    if (!video.videoWidth || canvasWidth === 0 || canvasHeight === 0) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // ── Build a masked silhouette of the person ────────────────────
    const temp = document.createElement('canvas');
    temp.width = canvasWidth;
    temp.height = canvasHeight;
    const tctx = temp.getContext('2d');
    if (!tctx) return;

    // Draw mask scaled to canvas
    tctx.drawImage(
        maskCanvas,
        0, 0, maskCanvas.width, maskCanvas.height,
        0, 0, canvasWidth, canvasHeight,
    );

    // Binary-threshold the mask — use a low threshold so we capture
    // the full body outline rather than just the bright centre.
    const maskData = tctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = maskData.data;

    for (let i = 0; i < pixels.length; i += 4) {
    const prob = pixels[i]; // probability from mediapipe
    pixels[i + 3] = prob > 80 ? 255 : 0; // stronger threshold
    }

    tctx.putImageData(maskData, 0, 0);

    // soften jagged edges
    tctx.filter = 'blur(2px)';
    tctx.drawImage(temp, 0, 0);
    tctx.filter = 'none';

    // Composite the video through the mask
    tctx.globalCompositeOperation = 'source-in';
    tctx.drawImage(
        video,
        0, 0, video.videoWidth, video.videoHeight,
        0, 0, canvasWidth, canvasHeight,
    );

    // ── Crop to bounding box of the silhouette ─────────────────────
    const data = tctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

    let minX = canvasWidth;
    let minY = canvasHeight;
    let maxX = 0;
    let maxY = 0;

    // Sample every other pixel for speed
    for (let y = 0; y < canvasHeight; y += 2) {
        for (let x = 0; x < canvasWidth; x += 2) {
        const i = (y * canvasWidth + x) * 4;
        if (data[i + 3] > 0) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
        }
    }

    const cropW = maxX - minX;
    const cropH = maxY - minY;
    if (cropW <= 0 || cropH <= 0) return;

    const crop = document.createElement('canvas');
    crop.width = cropW;
    crop.height = cropH;
    const cctx = crop.getContext('2d');
    if (!cctx) return;
    cctx.drawImage(temp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    // ── Draw each clone, scaled so it fits inside the canvas ───────
    // Base scale: the clone height should be ~70% of the canvas height
    const baseScale = Math.min((canvasHeight * 0.65) / cropH, 1.3 );

    for (const pos of clonePositions) {
        const s = baseScale * pos.scale;
        const drawW = cropW * s;
        const drawH = cropH * s;

        // Position: pos.x/y are normalised. Offset so the clone is centred
        // on the point and clamped within the canvas.
        let drawX = pos.x * canvasWidth - drawW / 2;
        let drawY = pos.y * canvasHeight;

        // Clamp so the clone never overflows the canvas
        drawX = Math.max(0, Math.min(canvasWidth - drawW, drawX));
        drawY = Math.max(0, Math.min(canvasHeight - drawH, drawY));

        ctx.save();
        ctx.globalAlpha = pos.alpha;
        if (pos.blur > 0) {
        ctx.filter = `blur(${pos.blur.toFixed(1)}px)`;
        }
        ctx.drawImage(crop, drawX, drawY, drawW, drawH);
        ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.filter = 'none';
}
