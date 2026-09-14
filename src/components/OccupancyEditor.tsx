import { useEffect, useRef } from 'react';
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
  const gridRef = useRef<HTMLDivElement>(null);
  const painting = useRef<{ to: boolean } | null>(null);
  const perHour = 60 / slotMinutes;
  const rowH = slotMinutes === 30 ? 'h-4' : 'h-7';

  // 드래그 중 touchmove는 리렌더보다 빠르게 연속으로 들어온다. 렌더 시점의 value를
  // 그대로 쓰면 각 이벤트가 같은 낡은 배열을 기준으로 덮어써서 마지막 칸만 남는다.
  // 항상 직전 결과 위에 쌓이도록 ref로 최신값을 들고 간다.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    function setCell(d: number, s: number, to: boolean) {
      const cur = valueRef.current;
      if (cur[d]?.[s] === to) return;
      const next = cur.map((row) => row.slice());
      if (!next[d]) next[d] = [];
      next[d][s] = to;
      valueRef.current = next;
      onChangeRef.current(next);
    }

    // 터치는 touchstart 시점 요소에 암묵적으로 캡처되어 이후 이벤트의 target이
    // 계속 첫 칸으로 고정된다 — 좌표로 직접 어느 칸인지 찾는다.
    function cellAt(x: number, y: number) {
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;
      const cell = hit?.closest<HTMLElement>('[data-d]');
      if (!cell || !el?.contains(cell)) return null;
      return { d: Number(cell.dataset.d), s: Number(cell.dataset.s) };
    }

    function start(x: number, y: number) {
      const c = cellAt(x, y);
      if (!c) return;
      const to = !(valueRef.current[c.d]?.[c.s] ?? false);
      painting.current = { to };
      setCell(c.d, c.s, to);
    }

    function move(x: number, y: number) {
      if (!painting.current) return;
      const c = cellAt(x, y);
      if (!c) return;
      setCell(c.d, c.s, painting.current.to);
    }

    function end() {
      painting.current = null;
    }

    // React 합성 이벤트는 touchstart/touchmove를 passive로 등록해서 그 안의
    // preventDefault가 무시된다 → 네이티브로 직접 붙여야 스크롤과 "터치 후
    // 합성되는 mouse 이벤트"(같은 칸을 한 번 더 토글해 원복시킴)를 실제로 막을 수 있다.
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      start(t.clientX, t.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t || !painting.current) return;
      e.preventDefault();
      move(t.clientX, t.clientY);
    }

    function onMouseDown(e: MouseEvent) {
      e.preventDefault();
      start(e.clientX, e.clientY);
    }

    function onMouseMove(e: MouseEvent) {
      move(e.clientX, e.clientY);
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', end);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', end);
    };
  }, []);

  function toggle(d: number, s: number) {
    const cur = valueRef.current;
    const next = cur.map((row) => row.slice());
    if (!next[d]) next[d] = [];
    next[d][s] = !(cur[d]?.[s] ?? false);
    valueRef.current = next;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink/60">
        자동 입력을 확인하고, <b>추가로 불가능한 시간</b>을 칠해주세요. 탭하거나 쓸어서 바꿔요.
      </p>
      <div
        ref={gridRef}
        className="grid touch-none select-none"
        style={{ gridTemplateColumns: `2.75rem repeat(${dayCount}, 1fr)`, touchAction: 'none' }}
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
                // 네이티브 <button>은 iOS 사파리에서 누른 채 움직일 때 자체 하이라이트·
                // 제스처 처리가 끼어들어 touchmove가 끊기는 경우가 있어 div로 둔다.
                <div
                  key={d}
                  role="button"
                  tabIndex={0}
                  aria-pressed={busy}
                  data-d={d}
                  data-s={s}
                  className={`${rowH} cursor-pointer touch-none border-x border-white/70 transition-colors ${
                    hourStart ? 'border-t border-t-white/70' : 'border-t border-t-white/30'
                  } ${busy ? 'bg-cta/35' : 'bg-free/25'}`}
                  style={{ touchAction: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(d, s);
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
