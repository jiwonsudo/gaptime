import { useMemo, useState } from 'react';
import type { Submission } from '@/types';
import { DAY_LABELS } from '@/types';
import { combineSubmissions, teamSize, nameColor } from '@/lib/overlap';
import { buildExportText } from '@/lib/exportText';
import { formatHour } from '@/lib/timeFormat';
import { Button } from './ui/button';

interface Props {
  dayCount: number;
  startHour: number;
  endHour: number;
  expectedSize: number;
  submissions: Submission[];
  preview?: boolean; // 방 생성 화면 미리보기 — 안내 문구 숨김
  focus?: { name: string; onClear: () => void } | null; // 한 사람 시간표만 보기
}

const MAX_HOVER_NAMES = 8;

export default function ResultGrid({
  dayCount,
  startHour,
  endHour,
  expectedSize,
  submissions,
  preview = false,
  focus = null,
}: Props) {
  const hourCount = Math.max(1, endHour - startHour);
  const grid = useMemo(
    () => combineSubmissions(submissions, dayCount, hourCount),
    [submissions, dayCount, hourCount]
  );
  const team = teamSize(expectedSize, submissions.length);
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const hasData = submissions.length > 0;

  function shade(freeCount: number): string {
    if (!hasData || freeCount === 0) return '#E4E2DC';
    const t = team === 0 ? 0 : freeCount / team;
    const from = [228, 226, 220];
    const to = [63, 169, 104];
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  async function copyExport() {
    const text = buildExportText(grid, team, startHour);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('복사할 내용', text);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {focus && (
        <div className="flex items-center justify-between rounded-md bg-ink px-3 py-1.5 text-sm text-paper">
          <span>
            <b>{focus.name}</b>님 시간표만 보는 중
          </span>
          <button
            onClick={focus.onClear}
            aria-label="전체 시간표로 돌아가기"
            className="rounded px-1.5 text-base leading-none hover:bg-white/15"
          >
            ✕
          </button>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${dayCount}, 1fr)` }}>
        <div />
        {DAY_LABELS.slice(0, dayCount).map((d) => (
          <div key={d} className="pb-1 text-center text-sm font-bold">
            {d}
          </div>
        ))}
        {Array.from({ length: hourCount }).map((_, h) => (
          <div key={h} className="contents">
            <div className="tnum pr-2 text-right text-xs font-bold leading-8 text-ink/60">
              {formatHour(startHour + h)}
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
                  {hasData && !focus && (
                    <span className="tnum text-ink/70">
                      {cell.freeCount}/{team}
                    </span>
                  )}
                  {active && hasData && (
                    <div className="absolute left-1/2 top-full z-10 mt-1 w-48 -translate-x-1/2 rounded-md border border-ink/15 bg-white p-2 text-left text-xs shadow-lg">
                      <div className="mb-1 font-bold">
                        {DAY_LABELS[d]} {formatHour(startHour + h)}
                      </div>
                      {cell.freeCount === 0 ? (
                        <div className="text-ink/50">이 시간엔 다들 수업이 있어요</div>
                      ) : (
                        <>
                          <div className="mb-1 text-ink/60">
                            {team}명 중 {cell.freeCount}명이 비어요
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!hasData ? (
        preview ? null : (
          <p className="text-sm text-ink/50">아직 아무도 시간표를 올리지 않았어요.</p>
        )
      ) : focus ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyExport}>
            {copied ? '복사됐어요' : '문자로 복사하기'}
          </Button>
          <span className="tnum text-xs text-ink/50">
            지금까지 {submissions.length}명 올림 · {team}명 기준
          </span>
        </div>
      )}
    </div>
  );
}
