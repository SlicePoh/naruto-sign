const MIN_SIZE = 120
const MAX_SIZE = 220
export const RASENGAN_DURATION_MS = 5000
const SCALE_IN_MS = 600

const RASENGAN_SOUND = "/effects/rasengan.mp3"

export interface RasenganPalmTarget {
  x: number
  y: number
}

interface Particle {
  angle: number
  radius: number
  speed: number
  size: number
}

export class RasenganEffect {

  private startTime = 0
  private _active = false
  private particles: Particle[] = []
  private audio: HTMLAudioElement | null = null

  constructor() {

    this.audio = new Audio(RASENGAN_SOUND)
    this.audio.preload = "auto"

    // particles
    for (let i = 0; i < 32; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.2 + Math.random() * 0.8,
        speed: 0.8 + Math.random() * 1.5,
        size: 1 + Math.random() * 2
      })
    }
  }

  start() {

    this._active = true
    this.startTime = performance.now()

    if (this.audio) {
      this.audio.currentTime = 0
      this.audio.play().catch(() => {})
    }
  }
  stop() {
    this._active = false
    this.audio?.pause()
  }
  get active() {
    return this._active
  }
  get finished() {
    return performance.now() - this.startTime > RASENGAN_DURATION_MS
  }
  draw(ctx: CanvasRenderingContext2D, palm: RasenganPalmTarget) {
    if (!this._active) return
    const elapsed = performance.now() - this.startTime
    const scaleT = Math.min(elapsed / SCALE_IN_MS, 1)
    const eased = 1 - Math.pow(1 - scaleT, 3)
    const size = MIN_SIZE + (MAX_SIZE - MIN_SIZE) * eased
    const r = size / 2
    const t = elapsed * 0.002
    ctx.save()
    // reset compositing to avoid artifacts
    ctx.globalCompositeOperation = "source-over"
    // clear local region
    ctx.clearRect( palm.x - size, palm.y - size, size * 2, size * 2 )
    ctx.globalCompositeOperation = "lighter"
    // glow
    const glow = ctx.createRadialGradient( palm.x, palm.y, r * 0.2, palm.x, palm.y, r * 1.4 )
    glow.addColorStop(0, "rgba(120,220,255,0.7)")
    glow.addColorStop(0.5, "rgba(80,160,255,0.4)")
    glow.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(palm.x, palm.y, r * 1.4, 0, Math.PI * 2)
    ctx.fill()
    // core sphere
    const core = ctx.createRadialGradient(
      palm.x,
      palm.y,
      r * 0.1,
      palm.x,
      palm.y,
      r
    )
    core.addColorStop(0, "rgba(200,255,255,1)")
    core.addColorStop(0.3, "rgba(120,220,255,0.9)")
    core.addColorStop(0.7, "rgba(80,150,255,0.7)")
    core.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(palm.x, palm.y, r, 0, Math.PI * 2)
    ctx.fill()
    // rotating rings
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const rot = t * (0.8 + i * 0.3)
      ctx.strokeStyle = `rgba(150,220,255,${0.6 - i * 0.2})`
      ctx.beginPath()
      for (let a = 0; a < Math.PI * 2; a += 0.15) {
        const rr =
          r * 0.65 +
          Math.sin(a * 4 + rot * 4) * 6
        const x = palm.x + Math.cos(a + rot) * rr
        const y = palm.y + Math.sin(a + rot) * rr
        if (a === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }
    // particles
    for (const p of this.particles) {
      p.angle += p.speed * 0.03
      const rr = r * p.radius
      const x = palm.x + Math.cos(p.angle + t) * rr
      const y = palm.y + Math.sin(p.angle + t) * rr
      ctx.fillStyle = "rgba(180,240,255,0.9)"
      ctx.beginPath()
      ctx.arc(x, y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  dispose() {
    this.audio?.pause()
    this.audio = null
  }
}
