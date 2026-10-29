import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '@/types';

interface CalendarPanelProps {
  tasks: Task[];
  selectedDate?: string;            // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  className?: string;
}

const WEEK_CN = ['一', '二', '三', '四', '五', '六', '日'];
const WEEK_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 月历面板：展示当月、高亮今天、可点选日期；有单日计划任务的日期打点 */
export function CalendarPanel({ tasks, selectedDate, onSelectDate, className }: CalendarPanelProps) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => {
    const d = new Date();
    return toYMD(d);
  }, []);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const isZh = i18n.language?.startsWith('zh');
  const weekHeaders = isZh ? WEEK_CN : WEEK_EN;

  // 有任务的日期集合
  const taskDates = useMemo(() => {
    const set = new Set<string>();
    for (const task of tasks) {
      for (const d of task.plannedDates ?? []) set.add(d);
    }
    return set;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(viewDate.y, viewDate.m, 1);
    // 周一为一周开始（JS getDay: 0=周日）
    let startOffset = (first.getDay() + 6) % 7;
    const out: Array<{ day: number; date: string; isToday: boolean; inMonth: boolean; hasTasks: boolean }> = [];
    // 前一个月的补位
    const prevLast = new Date(viewDate.y, viewDate.m, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = prevLast - i;
      const d = new Date(viewDate.y, viewDate.m - 1, day);
      const date = toYMD(d);
      out.push({ day, date, isToday: date === today, inMonth: false, hasTasks: taskDates.has(date) });
    }
    const daysInMonth = new Date(viewDate.y, viewDate.m + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewDate.y, viewDate.m, i);
      const date = toYMD(d);
      out.push({ day: i, date, isToday: date === today, inMonth: true, hasTasks: taskDates.has(date) });
    }
    // 补足 6×7=42
    let next = 1;
    while (out.length < 42) {
      const d = new Date(viewDate.y, viewDate.m + 1, next);
      const date = toYMD(d);
      out.push({ day: next, date, isToday: date === today, inMonth: false, hasTasks: taskDates.has(date) });
      next++;
    }
    return out.slice(0, 42);
  }, [viewDate, today, taskDates]);

  const goPrev = () => {
    setViewDate((v) => {
      const d = new Date(v.y, v.m - 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const goNext = () => {
    setViewDate((v) => {
      const d = new Date(v.y, v.m + 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const goToday = () => {
    const d = new Date();
    setViewDate({ y: d.getFullYear(), m: d.getMonth() });
    onSelectDate(today);
  };

  return (
    <div className={`calendar-panel ${className ?? ''}`}>
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={goPrev} title={t('time.calendar.prevMonth') || 'Prev'}>
          <ChevronLeft size={13} />
        </button>
        <div className="calendar-title">
          <span>{viewDate.y} · {viewDate.m + 1}</span>
          <button className="calendar-today-btn" onClick={goToday} title={t('time.calendar.today') || 'Today'}>
            {t('time.calendar.today') || '今天'}
          </button>
        </div>
        <button className="calendar-nav-btn" onClick={goNext} title={t('time.calendar.nextMonth') || 'Next'}>
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekHeaders.map((w) => (
          <div key={w} className="calendar-weekday">{w}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell) => {
          const selected = cell.date === selectedDate;
          return (
            <button
              key={cell.date}
              className={[
                'calendar-cell',
                !cell.inMonth ? 'dim' : '',
                cell.isToday ? 'is-today' : '',
                selected ? 'is-selected' : '',
              ].join(' ')}
              onClick={() => onSelectDate(cell.date)}
              title={cell.date}
            >
              <span className="calendar-cell-day">{cell.day}</span>
              {cell.hasTasks && <span className="calendar-cell-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
