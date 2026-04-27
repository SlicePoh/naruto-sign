const MIN_SIZE = 120;
const MAX_SIZE = 260;
const CHARGE_WINDOW_S = 2;
const CHARGE_PLAYBACK_RATE = 1;
const ACTIVE_PLAYBACK_RATE = 0.72;
export const CHIDORI_DURATION_MS = 5000;

const CHIDORI_VIDEO = '/effects/chidori-alpha.webm';
const CHIDORI_VIDEO_FALLBACK = '/effects/chidori.mp4';
const CHIDORI_AUDIO = '/effects/chidori.mp4';

export interface ChidoriPalmTarget {
  x: number;
  y: number;
  palmGapPx?: number;
}

interface Spark {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  flicker: number;
}

type ChidoriMode = 'idle' | 'charging' | 'active';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class ChidoriEffect {
  private startTime = 0;
  private mode: ChidoriMode = 'idle';
  private readonly sparks: Spark[] = [];
  private readonly visual: HTMLVideoElement;
  private readonly audio: HTMLAudioElement;

  constructor() {
    this.visual = document.createElement('video');
    this.visual.src = CHIDORI_VIDEO;
    this.visual.preload = 'auto';
    this.visual.loop = false;
    this.visual.muted = true;
    this.visual.playsInline = true;
    this.visual.addEventListener('error', () => {
      if (this.visual.src.endsWith(CHIDORI_VIDEO_FALLBACK)) return;
      this.visual.src = CHIDORI_VIDEO_FALLBACK;
      this.visual.load();
    });

    this.audio = new Audio(CHIDORI_AUDIO);
    this.audio.preload = 'auto';

    // Lightning sparks instead of swirl particles
    for (let i = 0; i < 50; i++) {
      this.sparks.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.2 + Math.random() * 0.9,
        speed: 1.2 + Math.random() * 2,
        size: 1 + Math.random() * 2.8,
        flicker: Math.random() * Math.PI * 2,
      });
    }
  }

  beginCharge() {
    if (this.mode === 'charging') return;
    if (this.mode === 'idle') {
      this.resetMedia(0);
    }
    this.mode = 'charging';
    this.startTime = performance.now();
    this.syncMedia(CHARGE_PLAYBACK_RATE, false);
  }

  activate() {
    if (this.mode === 'active') return;
    this.mode = 'active';
    this.startTime = performance.now();
    if (this.visual.readyState >= HTMLMediaElement.HAVE_METADATA) {
      this.visual.currentTime = Math.max(this.visual.currentTime, CHARGE_WINDOW_S);
    }
    try {
      this.audio.currentTime = Math.max(this.audio.currentTime, CHARGE_WINDOW_S);
    } catch {
      // ignore seeks before metadata is available
    }
    this.syncMedia(ACTIVE_PLAYBACK_RATE, false);
  }

  stop() {
    this.mode = 'idle';
    this.visual.pause();
    this.audio.pause();
    this.resetMedia(0);
  }

  freezeCharge() {
    if (this.mode !== 'charging') return;
    this.visual.pause();
    this.audio.pause();
    this.resetMedia(CHARGE_WINDOW_S);
  }

  get active() {
    return this.mode === 'active';
  }

  get visible() {
    return this.mode !== 'idle';
  }

  get charging() {
    return this.mode === 'charging';
  }

  get finished() {
    return this.mode === 'active' && performance.now() - this.startTime > CHIDORI_DURATION_MS;
  }

  get chargeProgress() {
    const mediaTime = Math.min(this.visual.currentTime || 0, CHARGE_WINDOW_S);
    return clamp(mediaTime / CHARGE_WINDOW_S, 0, 1);
  }

  draw(ctx: CanvasRenderingContext2D, palm: ChidoriPalmTarget) {
    if (!this.visible) return;

    if (this.charging && this.visual.currentTime >= CHARGE_WINDOW_S) {
      this.freezeCharge();
    }

    const progress = this.active ? 1 : Math.max(this.chargeProgress, 0.05);
    const baseFromHands = clamp((palm.palmGapPx ?? 110) * 1.18, MIN_SIZE, MAX_SIZE);
    const size = baseFromHands * (0.45 + progress * 0.65);
    const radius = size / 2;
    const elapsed = performance.now() - this.startTime;
    const swirlTime = elapsed * 0.003;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Outer lightning glow — bright white/blue
    const outerGlow = ctx.createRadialGradient(
      palm.x, palm.y, radius * 0.15,
      palm.x, palm.y, radius * 1.6,
    );
    outerGlow.addColorStop(0, `rgba(200, 220, 255, ${0.3 + progress * 0.3})`);
    outerGlow.addColorStop(0.5, `rgba(100, 140, 255, ${0.2 + progress * 0.25})`);
    outerGlow.addColorStop(0.8, `rgba(60, 60, 220, ${0.1 + progress * 0.15})`);
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(palm.x, palm.y, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Video frame
    this.drawVideoFrame(ctx, palm, size, progress);

    // Lightning energy core
    this.drawLightningCore(ctx, palm, radius, swirlTime, progress);

    // Lightning bolts
    this.drawLightningBolts(ctx, palm, radius, swirlTime, progress);

    ctx.restore();
  }

  dispose() {
    this.visual.pause();
    this.audio.pause();
    this.visual.removeAttribute('src');
    this.visual.load();
    this.audio.src = '';
  }

  private syncMedia(playbackRate: number, loop: boolean) {
    this.visual.playbackRate = playbackRate;
    this.audio.playbackRate = playbackRate;
    this.visual.loop = loop;

    this.visual.play().catch(() => {});
    this.audio.play().catch(() => {});
  }

  private resetMedia(time: number) {
    const safeTime = Math.max(0, time);
    if (this.visual.readyState >= HTMLMediaElement.HAVE_METADATA) {
      this.visual.currentTime = safeTime;
    }
    try {
      this.audio.currentTime = safeTime;
    } catch {
      // ignore seeks before metadata is available
    }
  }

  private drawVideoFrame(
    ctx: CanvasRenderingContext2D,
    palm: ChidoriPalmTarget,
    size: number,
    progress: number,
  ) {
    if (this.visual.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const alpha = 0.28 + progress * 0.72;
    const drawSize = size * 1.16;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `drop-shadow(0 0 ${14 + progress * 22}px rgba(120, 140, 255, 0.8))`;
    ctx.drawImage(this.visual, palm.x - drawSize / 2, palm.y - drawSize / 2, drawSize, drawSize);
    ctx.restore();
  }

  private drawLightningCore(
    ctx: CanvasRenderingContext2D,
    palm: ChidoriPalmTarget,
    radius: number,
    swirlTime: number,
    progress: number,
  ) {
    // Bright white-blue core
    const core = ctx.createRadialGradient(
      palm.x, palm.y, radius * 0.06,
      palm.x, palm.y, radius,
    );
    core.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    core.addColorStop(0.2, `rgba(200, 220, 255, ${0.8 + progress * 0.15})`);
    core.addColorStop(0.5, `rgba(100, 120, 255, ${0.5 + progress * 0.3})`);
    core.addColorStop(0.8, `rgba(60, 40, 200, ${0.25 + progress * 0.2})`);
    core.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(palm.x, palm.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Flickering lightning sparks
    for (const spark of this.sparks) {
      spark.angle += spark.speed * 0.03;
      spark.flicker += 0.15;
      const flickerAlpha = 0.3 + Math.abs(Math.sin(spark.flicker)) * 0.7;
      const rr = radius * spark.radius;
      const x = palm.x + Math.cos(spark.angle + swirlTime * 1.5) * rr;
      const y = palm.y + Math.sin(spark.angle * 1.2 + swirlTime) * rr;

      ctx.fillStyle = `rgba(180, 200, 255, ${flickerAlpha * progress})`;
      ctx.beginPath();
      ctx.arc(x, y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLightningBolts(
    ctx: CanvasRenderingContext2D,
    palm: ChidoriPalmTarget,
    radius: number,
    swirlTime: number,
    progress: number,
  ) {
    const boltCount = 4 + Math.floor(progress * 4);
    ctx.lineWidth = 1.5 + progress * 1.5;

    for (let b = 0; b < boltCount; b++) {
      const baseAngle = (b / boltCount) * Math.PI * 2 + swirlTime * 0.8;
      const segments = 4 + Math.floor(Math.random() * 4);
      const boltLength = radius * (0.6 + progress * 0.5);

      ctx.strokeStyle = `rgba(180, 200, 255, ${0.5 + progress * 0.4})`;
      ctx.shadowColor = 'rgba(100, 140, 255, 0.8)';
      ctx.shadowBlur = 8 + progress * 6;
      ctx.beginPath();

      let px = palm.x;
      let py = palm.y;
      ctx.moveTo(px, py);

      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const jitterX = (Math.random() - 0.5) * boltLength * 0.3;
        const jitterY = (Math.random() - 0.5) * boltLength * 0.3;
        px = palm.x + Math.cos(baseAngle) * boltLength * t + jitterX;
        py = palm.y + Math.sin(baseAngle) * boltLength * t + jitterY;
        ctx.lineTo(px, py);
      }

      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}
