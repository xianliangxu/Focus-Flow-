import { useEffect, useRef } from 'react';
import { FluidGlassRenderer, qualityProfile, isQualityValue, type FluidCardConfig } from '@/lib/fluidGlassCore';

interface FluidGlassBackdropProps {
  theme: 'dark' | 'light';
  quality: string;
  particlesEnabled: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  twinkle: number;
  twinkleSpeed: number;
}

function makeSprite(rgb: string): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${rgb}, 0.95)`);
    grad.addColorStop(0.35, `rgba(${rgb}, 0.30)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  return sprite;
}

/**
 * 全窗口流体玻璃背景 + 粒子特效层。
 * 流体部分复用 fluidglass-ui 的 canonical shader（FluidGlassRenderer），
 * 粒子层为轻量 2D canvas，遵循质量档位 / prefers-reduced-motion / 页面隐藏暂停。
 */
export function FluidGlassBackdrop({ theme, quality, particlesEnabled }: FluidGlassBackdropProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const particleRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const requested = isQualityValue(quality) ? quality : 'auto';
    const profile = qualityProfile(requested);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- 流体玻璃层（canonical shader）----
    const config: FluidCardConfig = {
      key: 'backdrop',
      a: '#00e7d2',
      b: '#3cc8ff',
      c: '#075f68',
      preset: 'cyan',
      speed: 0.82,
      intensity: 1.0,
      pointer: 0.9,
      seed: 1.7,
      surface: theme === 'light' ? 0.16 : 0.08,
    };
    const renderer = new FluidGlassRenderer(host, config, 0, { profile });

    let raf = 0;
    let running = true;
    const startRender = (): void => {
      renderer.init();
      const loop = (now: number): void => {
        if (!running) return;
        raf = requestAnimationFrame(loop);
        renderer.render(now);
      };
      raf = requestAnimationFrame(loop);
    };
    startRender();

    // ---- 粒子特效层 ----
    const canvas = particleRef.current;
    let particleRaf = 0;
    let particleRunning = false;
    let ro: ResizeObserver | null = null;
    const onPointer = (event: PointerEvent): void => { pointer.x = event.clientX / Math.max(window.innerWidth, 1); pointer.y = event.clientY / Math.max(window.innerHeight, 1); pointer.active = true; };
    const onLeave = (): void => { pointer.active = false; };
    const pointer = { x: 0.5, y: 0.5, active: false };

    if (canvas && particlesEnabled && profile.name !== 'fallback' && !reduced) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        particleRunning = true;
        const isLight = theme === 'light';
        const count = profile.name === 'high' ? 90 : profile.name === 'eco' ? 26 : 55;
        const baseOpacity = isLight ? 0.5 : 0.85;
        const sprite = makeSprite(isLight ? '0,120,140' : '90,240,220');
        const particles: Particle[] = Array.from({ length: count }, () => ({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.00042,
          vy: (Math.random() - 0.5) * 0.00042,
          r: 2 + Math.random() * 5,
          alpha: baseOpacity * (0.35 + Math.random() * 0.65),
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.4 + Math.random() * 1.2,
        }));
        window.addEventListener('pointermove', onPointer, { passive: true });
        window.addEventListener('pointerleave', onLeave, { passive: true });

        const resize = (): void => {
          const rect = canvas.getBoundingClientRect();
          const dpr = profile.dpr;
          const width = Math.max(2, Math.round(rect.width * dpr));
          const height = Math.max(2, Math.round(rect.height * dpr));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
        };
        resize();
        ro = new ResizeObserver(resize);
        ro.observe(canvas);
        const interval = 1000 / Math.min(profile.fps, 45);
        let last = 0;

        const tick = (now: number): void => {
          if (!particleRunning) return;
          particleRaf = requestAnimationFrame(tick);
          if (document.hidden) return;
          if (now - last < interval) return;
          last = now;
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          for (const p of particles) {
            // 指针轻微扰动
            if (pointer.active) {
              const dx = p.x - pointer.x;
              const dy = p.y - pointer.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 0.06) {
                p.x += dx * 0.002;
                p.y += dy * 0.002;
              }
            }
            p.x += p.vx * (now / 16.67);
            p.y += p.vy * (now / 16.67);
            if (p.x < -0.05) p.x = 1.05;
            if (p.x > 1.05) p.x = -0.05;
            if (p.y < -0.05) p.y = 1.05;
            if (p.y > 1.05) p.y = -0.05;
            p.twinkle += p.twinkleSpeed * 0.016;
            const a = p.alpha * (0.55 + 0.45 * Math.sin(p.twinkle));
            const size = p.r * profile.dpr;
            ctx.globalAlpha = a;
            ctx.drawImage(sprite, p.x * w - size * 2, p.y * h - size * 2, size * 4, size * 4);
          }
          ctx.globalAlpha = 1;
        };
        particleRaf = requestAnimationFrame(tick);
      }
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      if (particleRunning) {
        particleRunning = false;
        cancelAnimationFrame(particleRaf);
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('pointerleave', onLeave);
        ro?.disconnect();
      }
      renderer.destroy();
    };
  }, [theme, quality, particlesEnabled]);

  return (
    <div ref={hostRef} className="fg-backdrop" data-theme={theme} aria-hidden="true">
      <canvas className="fg-fluid-canvas" />
      <div className="fg-fluid-fallback" />
      <div className="fg-noise" />
      <canvas ref={particleRef} className="fg-particles" />
    </div>
  );
}
