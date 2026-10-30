import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square, SkipForward, Coffee, Brain, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimerMode } from '@/types';

interface PomodoroClockProps {
  mode: TimerMode;
  formattedTime: string;
  timeRemaining: number;
  isRunning: boolean;
  progress: number;
  completedSessions: number;
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkip: () => void;
  onUpdateTime?: (seconds: number, mode: TimerMode) => void;
  onSetMode?: (mode: TimerMode) => void;
}

const MODE_COLORS: Record<TimerMode, { stroke: string; glow: string; label: string; dot: string }> = {
  work: { stroke: '#38bdf8', glow: 'rgba(56,189,248,0.55)', label: 'bg-blue-500/15 text-sky-300 border-blue-500/30', dot: '#38bdf8' },
  break: { stroke: '#34d399', glow: 'rgba(52,211,153,0.55)', label: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: '#34d399' },
  longBreak: { stroke: '#a78bfa', glow: 'rgba(167,139,250,0.55)', label: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dot: '#a78bfa' },
  idle: { stroke: '#64748b', glow: 'rgba(100,116,139,0.4)', label: 'bg-slate-500/15 text-slate-300 border-slate-500/30', dot: '#64748b' },
};

export function PomodoroClock({
  mode,
  formattedTime,
  timeRemaining,
  isRunning,
  progress,
  completedSessions,
  workDuration,
  breakDuration,
  longBreakDuration,
  onStart,
  onPause,
  onResume,
  onStop,
  onSkip,
  onUpdateTime,
  onSetMode,
}: PomodoroClockProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editMinutes, setEditMinutes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const palette = MODE_COLORS[mode];

  // 秒针驱动（仅运行时更新，降低重渲染频率）
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [isRunning]);

  // 表盘环绕粒子（半径随实际尺寸自适应）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(2, Math.round(rect.width * dpr));
      canvas.height = Math.max(2, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    type P = { a: number; r: number; speed: number; size: number; color: string; drift: number };
    const makeParticles = (): P[] => {
      const rect = canvas.getBoundingClientRect();
      const baseR = (Math.min(rect.width, rect.height) || 104) * 0.42; // 环绕半径（表盘外缘附近，随实际尺寸缩放）
      const arr: P[] = [];
      for (let i = 0; i < 22; i++) {
        arr.push({
          a: Math.random() * Math.PI * 2,
          r: baseR + Math.random() * 3,
          speed: (0.08 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
          size: 0.7 + Math.random() * 1.2,
          color: Math.random() > 0.5 ? '#3cc8ff' : '#00e7d2',
          drift: Math.random() * Math.PI * 2,
        });
      }
      return arr;
    };
    const particles = makeParticles();

    const tick = () => {
      if (!running) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;
      for (const p of particles) {
        p.a += p.speed * 0.012;
        const wobble = Math.sin(t * 0.7 + p.drift) * 1.4;
        const x = cx + Math.cos(p.a) * (p.r + wobble);
        const y = cy + Math.sin(p.a) * (p.r * 0.92);
        const alpha = 0.28 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.1 + p.drift));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running && !reduced) {
        running = true;
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mode]);

  // 编辑时间
  const handleTimeClick = () => {
    if (isRunning || !onUpdateTime) return;
    setEditMinutes(Math.floor(timeRemaining / 60).toString());
    setIsEditing(true);
  };
  const handleTimeSubmit = () => {
    setIsEditing(false);
    const mins = parseInt(editMinutes);
    if (!isNaN(mins) && mins > 0 && onUpdateTime) {
      onUpdateTime(mins * 60, mode === 'idle' ? 'work' : mode);
    }
  };
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 指针角度
  const minuteDeg = Math.min(100, Math.max(0, progress)) * 3.6; // 已完成进度，从 12 点顺时针
  const totalSeconds =
    mode === 'work' ? workDuration : mode === 'break' ? breakDuration : mode === 'longBreak' ? longBreakDuration : workDuration;
  const elapsedSeconds = Math.min(totalSeconds, Math.max(0, totalSeconds - timeRemaining));
  const secondsInMinute = isRunning ? Math.floor(((nowMs / 1000) % 60)) : (elapsedSeconds % 60);
  const secondDeg = secondsInMinute * 6;

  const modeText =
    mode === 'work' ? t('timer.work') : mode === 'break' ? t('timer.break') : mode === 'longBreak' ? t('timer.longBreak') : t('timer.idle');
  const modeIcon =
    mode === 'work' ? <Brain size={12} /> : mode === 'break' || mode === 'longBreak' ? <Coffee size={12} /> : <Timer size={12} />;

  const polar = (deg: number, r: number, cx = 60, cy = 60) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  return (
    <div className="pomodoro-clock">
      {/* 左：圆形指针表盘 + 环绕粒子（v2.7 压至 56px） */}
      <div className="clock-stage">
        <canvas ref={canvasRef} className="clock-particles" aria-hidden="true" />

        <svg className="clock-face" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="clockFaceFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
            </linearGradient>
            <radialGradient id="clockGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="70%" stopColor={palette.glow} stopOpacity="0" />
              <stop offset="100%" stopColor={palette.glow} />
            </radialGradient>
          </defs>

          {/* 外发光 */}
          <circle cx="60" cy="60" r="59" fill="url(#clockGlow)" opacity="0.5" />
          {/* 表盘 */}
          <circle cx="60" cy="60" r="56" fill="url(#clockFaceFill)" stroke="rgba(160,255,238,0.35)" strokeWidth="0.8" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" strokeDasharray="1 2" />

          {/* 刻度 */}
          {Array.from({ length: 60 }, (_, i) => {
            const major = i % 5 === 0;
            const a = polar(i * 6, major ? 48 : 49.5, 60, 60);
            const b = polar(i * 6, 51.5, 60, 60);
            const isQuarter = i % 15 === 0;
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isQuarter ? palette.stroke : major ? 'rgba(200,240,255,0.55)' : 'rgba(200,240,255,0.25)'}
                strokeWidth={isQuarter ? 1.5 : major ? 1.1 : 0.6}
                strokeLinecap="round"
              />
            );
          })}

          {/* 数字 12/3/6/9 */}
          {[12, 3, 6, 9].map((n) => {
            const p = polar(n === 12 ? 0 : n * 30, 41, 60, 60);
            return (
              <text
                key={n}
                x={p.x} y={p.y + 3}
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                fill="rgba(230,250,255,0.75)"
              >
                {n}
              </text>
            );
          })}

          {/* 进度弧（已完成） */}
          <circle
            cx="60" cy="60" r="53"
            fill="none"
            stroke={palette.stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * (2 * Math.PI * 53)} ${2 * Math.PI * 53}`}
            transform="rotate(-90 60 60)"
            opacity="0.55"
            style={{ transition: 'stroke-dasharray 0.3s linear' }}
          />

          {/* 分针（进度） */}
          <g transform={`rotate(${minuteDeg} 60 60)`}>
            <line x1="60" y1="64" x2="60" y2="23" stroke={palette.stroke} strokeWidth="2.6" strokeLinecap="round" />
          </g>
          {/* 秒针 */}
          {isRunning && (
            <g transform={`rotate(${secondDeg} 60 60)`}>
              <line x1="60" y1="66" x2="60" y2="17" stroke="#ff6b6b" strokeWidth="0.9" strokeLinecap="round" opacity="0.9" />
            </g>
          )}

          {/* 中心 */}
          <circle cx="60" cy="60" r="4.5" fill="#0c1016" stroke={palette.stroke} strokeWidth="1.2" />
          <circle cx="60" cy="60" r="1.2" fill={palette.stroke} />
        </svg>
      </div>

      {/* 中：数字钟（点击可编辑）+ 会话点（v2.7 隐藏模式标签，模式由右侧标签指示） */}
      <div className="clock-digital" onClick={handleTimeClick} title={isRunning ? t('timer.runningNoEdit') || '' : t('timer.clickToEdit') || ''}>
        <div className={`clock-mode-tag ${palette.label}`}>
          {modeIcon}
          <span>{modeText}</span>
        </div>
        {isEditing ? (
          <div className="flex items-center justify-center gap-1">
            <Input
              ref={inputRef}
              type="number"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              onBlur={handleTimeSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTimeSubmit()}
              className="clock-time-edit"
              min={1}
              max={120}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="clock-time-unit">min</span>
          </div>
        ) : (
          <div className="clock-digital-time" style={{ color: palette.stroke }}>
            {formattedTime}
          </div>
        )}
        <div className="clock-sessions">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`clock-session-dot ${i < completedSessions % 4 ? 'active' : ''}`} style={i < completedSessions % 4 ? { background: palette.stroke } : undefined} />
          ))}
        </div>
      </div>

      {/* 右：模式按钮组（常驻）+ 主控制（v2.7 一行布局） */}
      <div className="clock-side">
        <div className="clock-modes">
          <button className={`clock-mode-btn ${mode === 'work' ? 'active' : ''}`} onClick={() => onSetMode?.('work')}>
            <Brain size={11} /> {t('timer.work')}
          </button>
          <button className={`clock-mode-btn ${mode === 'break' ? 'active' : ''}`} onClick={() => onSetMode?.('break')}>
            <Coffee size={11} /> {t('timer.break')}
          </button>
          <button className={`clock-mode-btn ${mode === 'longBreak' ? 'active' : ''}`} onClick={() => onSetMode?.('longBreak')}>
            <Coffee size={11} /> {t('timer.longBreak')}
          </button>
        </div>

        <div className={mode === 'idle' ? 'clock-main' : 'clock-main clock-main-running'}>
          {mode === 'idle' ? (
            <Button className="clock-start-btn" onClick={onStart}>
              <Play size={15} className="clock-start-icon" />
              <span className="clock-start-label">{t('timer.startFocus')}</span>
            </Button>
          ) : (
            <div className="clock-running-row">
              <Button size="sm" variant="outline" className="clock-side-btn" onClick={isRunning ? onPause : onResume}>
                {isRunning ? <Pause size={12} className="mr-1" /> : <Play size={12} className="mr-1" />}
                {isRunning ? t('timer.pause') : t('timer.resume')}
              </Button>
              <Button size="sm" variant="outline" className="control-btn" onClick={onStop} title={t('timer.stop')}>
                <Square size={12} />
              </Button>
              <Button size="sm" variant="outline" className="control-btn" onClick={onSkip} title={t('timer.skip')}>
                <SkipForward size={12} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
