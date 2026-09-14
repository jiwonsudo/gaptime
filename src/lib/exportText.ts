import type { CellResult } from './overlap';
import { DAY_LABELS } from '@/types';
import { formatSlotRange } from './timeFormat';

export interface Run {
  day: number;
  fromSlot: number;
  toSlot: number; // 끝 슬롯(미포함)
  count: number;
  freeNames: string[];
  busyNames: string[]; // 올린 사람 중 이 시간에 안 되는 사람
}

// 같은 사람들이 계속 비어 있는 구간만 하나로 묶는다.
// 인원 수만 같고 사람이 바뀌면 "누가 안 되는지"가 달라지므로 끊는다.
function sameNames(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

// 1명 이상 가능한 연속 구간을 가능 인원 많은 순 → 요일 → 시간순으로.
export function buildRuns(grid: CellResult[][], allNames: string[]): Run[] {
  const slotCount = grid[0]?.length ?? 0;
  const runs: Run[] = [];

  for (let d = 0; d < grid.length; d++) {
    let start = 0;
    for (let s = 1; s <= slotCount; s++) {
      const prev = grid[d][s - 1];
      const cur = s < slotCount ? grid[d][s] : null;
      if (cur && sameNames(prev.freeNames, cur.freeNames)) continue;
      if (prev.freeCount >= 1) {
        runs.push({
          day: d,
          fromSlot: start,
          toSlot: s,
          count: prev.freeCount,
          freeNames: prev.freeNames,
          busyNames: allNames.filter((n) => !prev.freeNames.includes(n)),
        });
      }
      start = s;
    }
  }

  runs.sort((a, b) => b.count - a.count || a.day - b.day || a.fromSlot - b.fromSlot);
  return runs;
}

export function runLabel(run: Run, startHour: number, slotMinutes: number): string {
  const range = formatSlotRange(startHour, run.fromSlot, run.toSlot, slotMinutes);
  return `${DAY_LABELS[run.day]}요일 ${range}`;
}

export function runCountLabel(run: Run, team: number): string {
  return run.count >= team ? '전원 가능' : `${team}명 중 ${run.count}명 가능`;
}

export function buildExportText(
  grid: CellResult[][],
  team: number,
  startHour: number,
  slotMinutes: number,
  allNames: string[]
): string {
  const runs = buildRuns(grid, allNames);
  if (runs.length === 0) return '아직 겹치는 시간이 없어요.';

  return runs
    .map((r) => {
      const busy = r.busyNames.length > 0 ? ` (안 되는 사람: ${r.busyNames.join(', ')})` : '';
      return `- ${runLabel(r, startHour, slotMinutes)} ${runCountLabel(r, team)}${busy}`;
    })
    .join('\n');
}
