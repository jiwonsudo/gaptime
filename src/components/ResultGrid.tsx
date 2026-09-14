import { useMemo, useState } from 'react';
import type { Submission } from '@/types';
import { DAY_LABELS } from '@/types';
import { combineSubmissions, teamSize, nameColor } from '@/lib/overlap';
import { buildExportText, buildRuns, runCountLabel, runLabel } from '@/lib/exportText';
import { formatSlot } from '@/lib/timeFormat';
import { Button } from './ui/button';
import { track } from '@/lib/analytics';

interface Props {
  dayCount: number;
  startHour: number;
  slotCount: number;
  slotMinutes: number;
  expectedSize: number;
  submissions: Submission[];
  preview?: boolean; // 방 생성 화면 미리보기 — 안내 문구 숨김
  focus?: { name: string; onClear: () => void } | null; // 한 사람 시간표만 보기
}

const MAX_HOVER_NAMES = 8;
const PER_PAGE = 5;

export default function ResultGrid({
  dayCount,
  startHour,
  slotCount,
  slotMinutes,
  expectedSize,
  submissions,
  preview = false,
  focus = null,
}: Props) {
  const grid = useMemo(
    () => combineSubmissions(submissions, dayCount, slotCount),
    [submissions, dayCount, slotCount]
  );
  const team = teamSize(expectedSize, submissions.length);
  const allNames = useMemo(() => submissions.map((s) => s.display_name), [submissions]);
  const runs = useMemo(() => buildRuns(grid, allNames), [grid, allNames]);
  const [hover, setHover] = useState<{ d: number; s: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [page, setPage] = useState(0);
  const hasData = submissions.length > 0;
  const perHour = 60 / slotMinutes;
  const rowH = slotMinutes === 30 ? 'h-5' : 'h-8';
  const rowLead = slotMinutes === 30 ? 'leading-5' : 'leading-8';

  function shade(freeCount: number): string {
    if (!hasData || freeCount === 0) return '#E4E2DC';
    const t = team === 0 ? 0 : freeCount / team;
    const from = [228, 226, 220];
    const to = [63, 169, 104];
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  async function copyExport() {
    const text = buildExportText(grid, team, startHour, slotMinutes, allNames);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('복사할 내용', text);
    }
    track('export_copied');
  }

  return (
    <div className="flex flex-col gap-3">
      {focus && (
        <div className="flex items-center justify-between rounded-md bg-ink px-3 py-1.5 text-sm text-paper">
          <span>
            <b>{focus.name}</b>님 시간표
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
        {Array.from({ length: slotCount }).map((_, s) => (
          <div key={s} className="contents">
            <div
              className={`tnum pr-2 text-right text-[11px] font-bold text-ink/60 ${rowH} ${rowLead}`}
            >
              {s % perHour === 0 ? formatSlot(startHour, s, slotMinutes) : ''}
            </div>
            {Array.from({ length: dayCount }).map((_, d) => {
              const cell = grid[d][s];
              const active = hover?.d === d && hover?.s === s;
              const hourStart = s % perHour === 0;
              return (
                <div
                  key={d}
                  className={`relative border-x border-white/70 text-center text-[11px] font-semibold transition-colors ${rowH} ${rowLead} ${
                    hourStart ? 'border-t border-t-white/70' : 'border-t border-t-white/30'
                  }`}
                  style={{ background: shade(cell.freeCount) }}
                  onMouseEnter={() => setHover({ d, s })}
                  onMouseLeave={() => setHover(null)}
                >
                  {hasData && !focus && slotMinutes === 60 && (
                    <span className="tnum text-ink/70">
                      {cell.freeCount}/{team}
                    </span>
                  )}
                  {active && hasData && (
                    <div className="absolute left-1/2 top-full z-10 mt-1 w-48 -translate-x-1/2 rounded-md border border-ink/15 bg-white p-2 text-left text-xs shadow-lg">
                      <div className="mb-1 font-bold">
                        {DAY_LABELS[d]} {formatSlot(startHour, s, slotMinutes)}
                      </div>
                      {focus ? (
                        <div className="text-ink/60">
                          {cell.freeCount > 0
                            ? `${focus.name}님은 이 시간이 가능해요`
                            : `${focus.name}님은 이 시간에 일정이 있어요`}
                        </div>
                      ) : cell.freeCount === 0 ? (
                        <div className="text-ink/50">이 시간엔 다들 일정이 있어요</div>
                      ) : (
                        <>
                          <div className="mb-1 text-ink/60">
                            {team}명 중 {cell.freeCount}명이 가능해요
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-expanded={showRanking}
              onClick={() => {
                setPage(0);
                setShowRanking((v) => !v);
                if (!showRanking) track('ranking_opened');
              }}
            >
              {showRanking ? '우선순위 접기' : '가능한 시간 우선순위'}
            </Button>
            <Button size="sm" variant="outline" onClick={copyExport}>
              {copied ? '복사됐어요' : '문자로 복사하기'}
            </Button>
            <span className="tnum text-xs text-ink/50">
              지금까지 {submissions.length}명 올림 · {team}명 기준
            </span>
          </div>

          {showRanking &&
            (runs.length === 0 ? (
              <p className="text-sm text-ink/50">아직 겹치는 시간이 없어요.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <ol className="flex flex-col gap-1.5">
                  {runs.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((r, i) => (
                    <li
                      key={`${r.day}-${r.fromSlot}`}
                      className="flex gap-2 border-t border-ink/10 pt-2 text-sm first:border-t-0 first:pt-0"
                    >
                      <span className="tnum w-5 shrink-0 pt-0.5 text-xs font-bold text-ink/40">
                        {page * PER_PAGE + i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <b>{runLabel(r, startHour, slotMinutes)}</b>
                          <span
                            className={`tnum text-xs font-bold ${
                              r.count >= team ? 'text-free' : 'text-ink/50'
                            }`}
                          >
                            {runCountLabel(r, team)}
                          </span>
                        </div>
                        {r.busyNames.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink/50">
                            <span>안 되는 사람</span>
                            {r.busyNames.slice(0, MAX_HOVER_NAMES).map((n) => (
                              <span key={n} className="flex items-center gap-1">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ background: nameColor(n) }}
                                />
                                {n}
                              </span>
                            ))}
                            {r.busyNames.length > MAX_HOVER_NAMES && (
                              <span>외 {r.busyNames.length - MAX_HOVER_NAMES}명</span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {runs.length > PER_PAGE && (
                  <div className="flex items-center gap-2 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      이전
                    </Button>
                    <span className="tnum text-ink/50">
                      {page + 1} / {Math.ceil(runs.length / PER_PAGE)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={page >= Math.ceil(runs.length / PER_PAGE) - 1}
                      onClick={() =>
                        setPage((p) => Math.min(Math.ceil(runs.length / PER_PAGE) - 1, p + 1))
                      }
                    >
                      다음
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
