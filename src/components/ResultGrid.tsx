import { useMemo, useState } from 'react';
import type { Submission } from '@/types';
import { DAY_LABELS } from '@/types';
import { combineSubmissions, denominator, nameColor } from '@/lib/overlap';
import { buildExportText } from '@/lib/exportText';
import { Button } from './ui/button';

interface Props {
  dayCount: number;
  startHour: number;
  endHour: number;
  expectedSize: number;
  submissions: Submission[];
}

const MAX_HOVER_NAMES = 8;

export default function ResultGrid({
  dayCount,
  startHour,
  endHour,
  expectedSize,
  submissions,
}: Props) {
  const hourCount = Math.max(1, endHour - startHour);
  const grid = useMemo(
    () => combineSubmissions(submissions, dayCount, hourCount),
    [submissions, dayCount, hourCount]
  );
  const denom = denominator(expectedSize, submissions.length);
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const [copied, setCopied] = useState(false);

  function shade(freeCount: number): string {
    if (submissions.length === 0) return '#E4E2DC';
    const t = denom === 0 ? 0 : freeCount / denom;
    if (t === 0) return '#E4E2DC';
    // #E4E2DC → #3FA968 보간
    const from = [228, 226, 220];
    const to = [63, 169, 104];
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  async function copyExport() {
    const text = buildExportText(grid, denom, startHour);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('복사할 텍스트', text);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${dayCount}, 1fr)` }}>
        <div />
        {DAY_LABELS.slice(0, dayCount).map((d) => (
          <div key={d} className="pb-1 text-center text-sm font-bold">
            {d}
          </div>
        ))}
        {Array.from({ length: hourCount }).map((_, h) => (
          <Row key={h}>
            <div className="tnum pr-2 text-right text-xs font-bold leading-8 text-ink/60">
              {startHour + h}
            </div>
            {Array.from({ length: dayCount }).map((_, d) => {
              const cell = grid[d][h];
              const active = hover?.d === d && hover?.h === h;
              return (
                <div
                  key={d}
                  className="relative h-8 border border-white/70 text-center text-[11px] font-semibold leading-8 transition-colors"
                  style={{ background: shade(cell.freeCount) }}
                  onMouseEnter={() => setHover({ d, h })}
                  onMouseLeave={() => setHover(null)}
                >
                  {submissions.length > 0 && (
                    <span className="tnum text-ink/70">
                      {cell.freeCount}/{denom}
                    </span>
                  )}
                  {active && cell.freeNames.length > 0 && (
                    <div className="absolute left-1/2 top-full z-10 mt-1 w-44 -translate-x-1/2 rounded-md border border-ink/15 bg-white p-2 text-left text-xs shadow-lg">
                      <div className="mb-1 font-bold">
                        {DAY_LABELS[d]} {startHour + h}시 · 가능 {cell.freeCount}명
                      </div>
                      <ul className="max-h-40 space-y-0.5 overflow-auto">
                        {cell.freeNames.slice(0, MAX_HOVER_NAMES).map((n) => (
                          <li key={n} className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ background: nameColor(n) }}
                            />
                            {n}
                          </li>
                        ))}
                      </ul>
                      {cell.freeNames.length > MAX_HOVER_NAMES && (
                        <div className="mt-1 text-ink/50">
                          외 {cell.freeNames.length - MAX_HOVER_NAMES}명
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Row>
        ))}
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-ink/50">아직 아무도 시간표를 올리지 않았어요.</p>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyExport}>
            {copied ? '복사됨' : '텍스트로 내보내기'}
          </Button>
          <span className="tnum text-xs text-ink/50">제출 {submissions.length}명 · 분모 {denom}</span>
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}
