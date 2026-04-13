const MIN_SIZE = 130;
const MAX_SIZE = 280;
const CHARGE_WINDOW_S = 2;
const CHARGE_PLAYBACK_RATE = 1;
const ACTIVE_PLAYBACK_RATE = 0.72;
export const RASENGAN_DURATION_MS = 5000;

const RASENGAN_VIDEO = '/effects/rasengan-alpha.webm';
const RASENGAN_VIDEO_FALLBACK = '/effects/rasengan.mp4';
const RASENGAN_AUDIO = '/effects/rasengan.mp4';
export interface RasenganPalmTarget {
  x: number;
  y: number;
  palmGapPx?: number;
}
interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
}

type RasenganMode = 'idle' | 'charging' | 'active';
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class RasenganEffect {
  private startTime = 0;
  private mode: RasenganMode = 'idle';
  private readonly particles: Particle[] = [];
  private readonly visual: HTMLVideoElement;
  private readonly audio: HTMLAudioElement;
  constructor() {
    this.visual = document.createElement('video');
    this.visual.src = RASENGAN_VIDEO;
    this.visual.preload = 'auto';
    this.visual.loop = false;
    this.visual.muted = true;
    this.visual.playsInline = true;
    this.visual.addEventListener('error', () => {
      if (this.visual.src.endsWith(RASENGAN_VIDEO_FALLBACK)) return;
      this.visual.src = RASENGAN_VIDEO_FALLBACK;
      this.visual.load();
    });
    this.audio = new Audio(RASENGAN_AUDIO);
    this.audio.preload = 'auto';
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.24 + Math.random() * 0.82,
        speed: 0.7 + Math.random() * 1.4,
        size: 1 + Math.random() * 2.4,
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
    return this.mode === 'active' && performance.now() - this.startTime > RASENGAN_DURATION_MS;
  }
  get chargeProgress() {
    const mediaTime = Math.min(this.visual.currentTime || 0, CHARGE_WINDOW_S);
    return clamp(mediaTime / CHARGE_WINDOW_S, 0, 1);
  }
  draw(ctx: CanvasRenderingContext2D, palm: RasenganPalmTarget) {
    if (!this.visible) return;

    if (this.charging && this.visual.currentTime >= CHARGE_WINDOW_S) {
      this.freezeCharge();
    }

    const progress = this.active ? 1 : Math.max(this.chargeProgress, 0.05);
    const baseFromHands = clamp((palm.palmGapPx ?? 120) * 1.18, MIN_SIZE, MAX_SIZE);
    const size = baseFromHands * (0.45 + progress * 0.65);
    const radius = size / 2;
    const elapsed = performance.now() - this.startTime;
    const swirlTime = elapsed * 0.0024;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const outerGlow = ctx.createRadialGradient(
      palm.x,
      palm.y,
      radius * 0.18,
      palm.x,
      palm.y,
      radius * 1.55,
    );
    outerGlow.addColorStop(0, `rgba(155, 230, 255, ${0.25 + progress * 0.25})`);
    outerGlow.addColorStop(0.6, `rgba(70, 150, 255, ${0.18 + progress * 0.24})`);
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(palm.x, palm.y, radius * 1.55, 0, Math.PI * 2);
    ctx.fill();

    this.drawVideoFrame(ctx, palm, size, progress);
    this.drawEnergyCore(ctx, palm, radius, swirlTime, progress);

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
    palm: RasenganPalmTarget,
    size: number,
    progress: number,
  ) {
    if (this.visual.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const alpha = 0.28 + progress * 0.72;
    const drawSize = size * 1.16;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `drop-shadow(0 0 ${12 + progress * 20}px rgba(80, 180, 255, 0.75))`;
    ctx.drawImage(this.visual, palm.x - drawSize / 2, palm.y - drawSize / 2, drawSize, drawSize);
    ctx.restore();
  }
  private drawEnergyCore(
    ctx: CanvasRenderingContext2D,
    palm: RasenganPalmTarget,
    radius: number,
    swirlTime: number,
    progress: number,
  ) {
    const core = ctx.createRadialGradient(
      palm.x,
      palm.y,
      radius * 0.08,
      palm.x,
      palm.y,
      radius,
    );
    core.addColorStop(0, 'rgba(235, 255, 255, 0.95)');
    core.addColorStop(0.28, `rgba(165, 235, 255, ${0.7 + progress * 0.2})`);
    core.addColorStop(0.72, `rgba(70, 135, 255, ${0.42 + progress * 0.24})`);
    core.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(palm.x, palm.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const rotation = swirlTime * (0.9 + i * 0.28);
      ctx.strokeStyle = `rgba(160, 225, 255, ${0.58 - i * 0.12})`;
      ctx.beginPath();
      for (let angle = 0; angle <= Math.PI * 2 + 0.15; angle += 0.15) {
        const wave = Math.sin(angle * 4 + rotation * 5) * (4 + i * 1.5);
        const rr = radius * (0.54 + i * 0.08) + wave;
        const x = palm.x + Math.cos(angle + rotation) * rr;
        const y = palm.y + Math.sin(angle + rotation * 1.1) * rr;
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (const particle of this.particles) {
      particle.angle += particle.speed * 0.025;
      const rr = radius * particle.radius;
      const x = palm.x + Math.cos(particle.angle + swirlTime) * rr;
      const y = palm.y + Math.sin(particle.angle * 1.1 + swirlTime) * rr;
      ctx.fillStyle = `rgba(195, 245, 255, ${0.45 + progress * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
