export interface ClonePosition {
  /** Horizontal offset as a fraction of canvas width (negative = left) */
  offsetX: number;
}

// ── Easing ────────────────────────────────────────────────────────
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Duration (ms) of the clone burst animation. */
const BURST_DURATION_MS = 400;

/**
 * Generate clone positions (called once per activation).
 * Always exactly 2 clones — one left, one right.
 */
export function generateClonePositions(): ClonePosition[] {
  const offset = 0.25 + Math.random() * 0.06; // ~25-31% of canvas width
  return [
    { offsetX: -offset },
    { offsetX:  offset },
  ];
}

/**
 * Render shadow clones onto the overlay canvas.
 *
 * Draws the masked person twice with horizontal offsets — one left, one right.
 * No cropping, no bounding boxes, no rescaling.
 */
export function renderShadowClones( ctx: CanvasRenderingContext2D, video: HTMLVideoElement, 
        maskCanvas: HTMLCanvasElement, canvasWidth: number, canvasHeight: number, 
        clonePositions: ClonePosition[], activationTime: number
    ) {
    if (!video.videoWidth || canvasWidth === 0 || canvasHeight === 0) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    // ── 1. Build masked person canvas ─────────────────────────────
    const temp = document.createElement("canvas");
    temp.width = canvasWidth;
    temp.height = canvasHeight;
    const tctx = temp.getContext("2d");
    if (!tctx) return;
    // Draw segmentation mask
    tctx.drawImage( maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height, 0, 
            0, canvasWidth, canvasHeight );
    // Use mask as alpha
    tctx.globalCompositeOperation = "source-in";
    tctx.globalAlpha = 1.2;
    // Mirror the video while compositing
    tctx.save();
    tctx.scale(-1, 1);
    tctx.drawImage( video, 0, 0, video.videoWidth, video.videoHeight, -canvasWidth,
            0, canvasWidth, canvasHeight );
    tctx.filter = "contrast(1.2)";
    tctx.restore();
    tctx.globalCompositeOperation = "source-over";

    // ── 2. Compute animation progress ────────────────────────────
    const elapsed = Date.now() - activationTime;
    const t = Math.min(elapsed / BURST_DURATION_MS, 1);
    const ease = easeOut(t);

    // ── 3. Draw 2 clones with horizontal offsets ─────────────────
    for (const pos of clonePositions) {
        const dx = pos.offsetX * canvasWidth * ease;
        ctx.drawImage(temp, dx, 0, canvasWidth, canvasHeight);
    }
}
