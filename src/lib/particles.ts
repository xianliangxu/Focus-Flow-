/**
 * 轻量粒子发射器（点击 / 拖动反馈用）
 * - 单例全屏 canvas overlay，pointer-events: none
 * - emitBurst：一次性爆发（点击）
 * - emitTrail：拖动轨迹跟随
 * - 尊重 prefers-reduced-motion；页面隐藏时暂停
 */
export interface ParticleOptions {
  count?: number;
  color?: string;
  speed?: number;
  size?: number;
  ttl?: number;        // 寿命 ms
  gravity?: number;    // 每帧 y 加速度（px）
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;   // 每帧 alpha 衰减
  ttl: number;
  age: number;
  gravity: number;
}

class ParticleSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: P[] = [];
  private running = false;
  private lastFrame = 0;
  private rafId = 0;
  private enabled = true;
  private dpr = 1;

  constructor() {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.enabled = !reduced;
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.resume();
      }
    });
  }

  private ensureCanvas() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-particles-overlay';
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
  }

  private resize() {
    if (!this.canvas || !this.ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  emitBurst(x: number, y: number, opts: ParticleOptions = {}) {
    if (!this.enabled) return;
    this.ensureCanvas();
    this.resize();
    const count = opts.count ?? 10;
    const color = opts.color ?? '#3cc8ff';
    const speed = opts.speed ?? 2.2;
    const size = opts.size ?? 2.5;
    const ttl = opts.ttl ?? 650;
    const gravity = opts.gravity ?? 0.035;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - 0.6,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        alpha: 0.9,
        decay: 0.012 + Math.random() * 0.02,
        ttl: ttl * (0.6 + Math.random() * 0.4),
        age: 0,
        gravity,
      });
    }
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }
    this.resume();
  }

  emitTrail(x: number, y: number, opts: ParticleOptions = {}) {
    if (!this.enabled) return;
    this.ensureCanvas();
    this.resize();
    const color = opts.color ?? '#00e7d2';
    const count = opts.count ?? 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 0.8,
        vy: Math.sin(angle) * 0.8 - 0.2,
        size: (opts.size ?? 1.8) * (0.6 + Math.random() * 0.7),
        color,
        alpha: 0.6,
        decay: 0.03 + Math.random() * 0.03,
        ttl: (opts.ttl ?? 380) * (0.6 + Math.random() * 0.5),
        age: 0,
        gravity: 0.02,
      });
    }
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }
    this.resume();
  }

  private tick = (now: number) => {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const dt = Math.min(32, now - this.lastFrame || 16);
    this.lastFrame = now;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const live: P[] = [];
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.ttl) continue;
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.vy += p.gravity * (dt / 16.67);
      p.alpha = Math.max(0, p.alpha - p.decay * (dt / 16.67));
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, p.size), 0, Math.PI * 2);
      ctx.fill();
      if (p.alpha > 0) live.push(p);
    }
    this.particles = live;
    if (live.length > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };

  private resume() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.lastFrame = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

export const particles = new ParticleSystem();
