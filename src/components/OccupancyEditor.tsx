import { useRef } from 'react';
import type { Occupancy } from '@/types';
import { DAY_LABELS } from '@/types';
import { formatSlot } from '@/lib/timeFormat';

interface Props {
  value: Occupancy; // [day][slot] true=수업
  dayCount: number;
  startHour: number;
  slotCount: number;
  slotMinutes: number;
  onChange: (next: Occupancy) => void;
}

// When2meet 식: 탭 = 토글, 드래그 = 시작 칸의 반대 상태로 칠하기.
export default function OccupancyEditor({
  value,
  dayCount,
  startHour,
  slotCount,
  slotMinutes,
  onChange,
}: Props) {
  const painting = useRef<{ to: boolean } | null>(null);
  const perHour = 60 / slotMinutes;
  const rowH = slotMinutes === 30 ? 'h-4' : 'h-7';

  function setCell(d: number, s: number, to: boolean) {
    if (value[d]?.[s] === to) return;
    const next = value.map((row) => row.slice());
    if (!next[d]) next[d] = [];
    next[d][s] = to;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink/60">
        자동 입력을 확인하고, <b>추가로 불가능한 시간</b>을 칠해주세요. 탭하거나 쓸어서 바꿔요.
      </p>
      <div
        className="grid touch-none select-none"
        style={{ gridTemplateColumns: `2.75rem repeat(${dayCount}, 1fr)` }}
        // 카카오톡 등 인앱 브라우저는 Pointer Events 지원이 불완전한 경우가 있어
        // 훨씬 오래되고 보편적으로 지원되는 Touch/Mouse 이벤트를 직접 쓴다.
        onMouseUp={() => (painting.current = null)}
        onMouseLeave={() => (painting.current = null)}
        onTouchEnd={() => (painting.current = null)}
        onTouchCancel={() => (painting.current = null)}
        onTouchMove={(e) => {
          if (!painting.current) return;
          const t = e.touches[0];
          if (!t) return;
          const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
          const cell = el?.closest<HTMLElement>('[data-d]');
          if (!cell) return;
          setCell(Number(cell.dataset.d), Number(cell.dataset.s), painting.current.to);
        }}
      >
        <div />
        {DAY_LABELS.slice(0, dayCount).map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-bold">
            {d}
          </div>
        ))}
        {Array.from({ length: slotCount }).map((_, s) => (
          <div key={s} className="contents">
            <div
              className={`tnum pr-1 text-right text-[10px] font-bold text-ink/50 ${rowH}`}
              style={{ lineHeight: slotMinutes === 30 ? '1rem' : '1.75rem' }}
            >
              {s % perHour === 0 ? formatSlot(startHour, s, slotMinutes) : ''}
            </div>
            {Array.from({ length: dayCount }).map((_, d) => {
              const busy = value[d]?.[s] ?? false;
              const hourStart = s % perHour === 0;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={busy}
                  data-d={d}
                  data-s={s}
                  className={`${rowH} touch-none border-x border-white/70 transition-colors ${
                    hourStart ? 'border-t border-t-white/70' : 'border-t border-t-white/30'
                  } ${busy ? 'bg-cta/35' : 'bg-free/25'}`}
                  style={{ touchAction: 'none' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const to = !busy;
                    painting.current = { to };
                    setCell(d, s, to);
                  }}
                  onMouseEnter={() => {
                    if (painting.current) setCell(d, s, painting.current.to);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const to = !busy;
                    painting.current = { to };
                    setCell(d, s, to);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-ink/50">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 bg-free/25" /> 빈 시간
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 bg-cta/35" /> 수업 또는 안 되는 시간
        </span>
      </div>
    </div>
  );
}
