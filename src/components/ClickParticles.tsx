import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { particles } from '@/lib/particles';

/**
 * 全局交互粒子层：
 * - 点击任意按钮 / 任务 / 视图 → 点击处爆发一小簇粒子
 * - 拖动设置里的滑块（Radix Slider thumb / input range）→ 粒子轨迹跟随
 * 开关跟随 设置 → 外观 → 粒子特效。
 */
export function ClickParticles() {
  const enabled = useAppStore((s) => s.settings.particlesEnabled);
  const draggingRef = useRef<{ down: boolean; lastX: number; lastY: number; t: number }>({
    down: false,
    lastX: 0,
    lastY: 0,
    t: 0,
  });

  useEffect(() => {
    const dragState = draggingRef.current;

    const isDraggable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      // Radix slider thumb 或原生 range input
      return !!node.closest?.('[data-slot="slider-thumb"], input[type="range"], [role="slider"]');
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isDraggable(e.target)) return;
      dragState.down = true;
      dragState.lastX = e.clientX;
      dragState.lastY = e.clientY;
      dragState.t = 0;
      if (enabled) {
        particles.emitBurst(e.clientX, e.clientY, { count: 5, color: '#00e7d2', size: 2 });
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState.down) return;
      const dx = e.clientX - dragState.lastX;
      const dy = e.clientY - dragState.lastY;
      dragState.t += 1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // 每移动一段距离才发射，避免过量
      if (dist > 3 && dragState.t % 2 === 0) {
        dragState.lastX = e.clientX;
        dragState.lastY = e.clientY;
        if (enabled) {
          particles.emitTrail(e.clientX, e.clientY, { count: 2, color: '#3cc8ff', size: 1.8 });
        }
      }
    };

    const onPointerUp = () => {
      dragState.down = false;
    };

    const onClick = (e: MouseEvent) => {
      if (!enabled) return;
      if (isDraggable(e.target)) return; // 拖动场景已单独处理
      // 忽略文本输入区、纯文本区域，避免干扰
      const node = e.target as HTMLElement | null;
      if (!node) return;
      if (node.closest?.('input, textarea, select')) return;
      particles.emitBurst(e.clientX, e.clientY, { count: 8, color: '#3cc8ff', size: 2.4 });
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('click', onClick, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('click', onClick, { capture: true });
    };
  }, [enabled]);

  return null;
}
