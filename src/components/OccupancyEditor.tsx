import { useRef } from 'react';
import type { Occupancy } from '@/types';
import { DAY_LABELS } from '@/types';
import { formatHour } from '@/lib/timeFormat';

interface Props {
  value: Occupancy; // [day][hour] true=수업
  dayCount: number;
  startHour: number;
  endHour: number;
  onChange: (next: Occupancy) => void;
}

// When2meet 식: 탭 = 토글, 드래그 = 시작 칸의 반대 상태로 칠하기.
export default function OccupancyEditor({ value, dayCount, startHour, endHour, onChange }: Props) {
  const hourCount = Math.max(1, endHour - startHour);
  const painting = useRef<{ to: boolean } | null>(null);

  function setCell(d: number, h: number, to: boolean) {
    if (value[d]?.[h] === to) return;
    const next = value.map((row) => row.slice());
    if (!next[d]) next[d] = [];
    next[d][h] = to;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink/60">
        <b>수업 있는 칸</b>을 칠해주세요. 칸을 탭하거나 쓸어서 바꿉니다. 나머지는 빈 시간으로
        계산돼요.
      </p>
      <div
        className="grid touch-none select-none"
        style={{ gridTemplateColumns: `2.5rem repeat(${dayCount}, 1fr)` }}
        onPointerUp={() => (painting.current = null)}
        onPointerLeave={() => (painting.current = null)}
      >
        <div />
        {DAY_LABELS.slice(0, dayCount).map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-bold">
            {d}
          </div>
        ))}
        {Array.from({ length: hourCount }).map((_, h) => (
          <div key={h} className="contents">
            <div className="tnum pr-1 text-right text-[11px] font-bold leading-7 text-ink/50">
              {formatHour(startHour + h)}
            </div>
            {Array.from({ length: dayCount }).map((_, d) => {
              const busy = value[d]?.[h] ?? false;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={busy}
                  className={`h-7 border border-white/70 transition-colors ${
                    busy ? 'bg-cta/35' : 'bg-free/25'
                  }`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const to = !busy;
                    painting.current = { to };
                    setCell(d, h, to);
                  }}
                  onPointerEnter={() => {
                    if (painting.current) setCell(d, h, painting.current.to);
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
          <span className="inline-block h-3 w-3 bg-cta/35" /> 수업 (안 되는 시간)
        </span>
      </div>
    </div>
  );
}
