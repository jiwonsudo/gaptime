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
  // 터치 후 브라우저가 합성해서 쏘는 호환용 mouse 이벤트를 걸러내기 위한 타임스탬프.
  // (사파리는 Pointer Events만으로는 안정적으로 안 먹혀서 touch+mouse를 같이 쓰되,
  //  터치 직후 한동안의 mouse 이벤트는 같은 제스처의 중복으로 보고 무시한다)
  const lastTouchAt = useRef(0);
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
        style={{ gridTemplateColumns: `2.75rem repeat(${dayCount}, 1fr)`, touchAction: 'none' }}
        onMouseUp={() => (painting.current = null)}
        onMouseLeave={() => (painting.current = null)}
        onTouchEnd={() => (painting.current = null)}
        onTouchCancel={() => (painting.current = null)}
        onTouchMove={(e) => {
          // 드래그 중엔 touchstart 시점 요소에 암묵 캡처가 걸려 있어 터치가 다른
          // 칸으로 넘어가도 그 칸의 이벤트가 안 뜬다 — elementFromPoint로 직접 찾는다.
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
                // 네이티브 <button>은 iOS 사파리에서 손가락으로 누른 채 움직일 때
                // 자체 하이라이트/제스처 처리 때문에 touchmove가 안정적으로 안 뜨는
                // 경우가 있어(탭은 되는데 드래그가 안 먹히는 원인), 일반 div로 대체한다.
                <div
                  key={d}
                  role="button"
                  tabIndex={0}
                  aria-pressed={busy}
                  data-d={d}
                  data-s={s}
                  className={`${rowH} touch-none cursor-pointer border-x border-white/70 transition-colors ${
                    hourStart ? 'border-t border-t-white/70' : 'border-t border-t-white/30'
                  } ${busy ? 'bg-cta/35' : 'bg-free/25'}`}
                  style={{ touchAction: 'none' }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    lastTouchAt.current = Date.now();
                    const to = !busy;
                    painting.current = { to };
                    setCell(d, s, to);
                  }}
                  onMouseDown={(e) => {
                    // 터치 직후 브라우저가 호환용으로 합성해서 쏘는 mouseDown은
                    // 같은 제스처의 중복이므로 무시 (안 그러면 토글이 바로 원복됨)
                    if (Date.now() - lastTouchAt.current < 800) return;
                    e.preventDefault();
                    const to = !busy;
                    painting.current = { to };
                    setCell(d, s, to);
                  }}
                  onMouseEnter={() => {
                    if (Date.now() - lastTouchAt.current < 800) return;
                    if (painting.current) setCell(d, s, painting.current.to);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCell(d, s, !busy);
                    }
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
