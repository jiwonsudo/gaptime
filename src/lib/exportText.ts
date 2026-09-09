import type { CellResult } from './overlap';
import { DAY_LABELS } from '@/types';
import { formatSlotRange } from './timeFormat';

interface Run {
  day: number;
  fromSlot: number;
  toSlot: number;
  count: number;
}

// 1명 이상 가능한 연속 구간을 모아, 가능 인원 많은 순 → 같으면 요일·시간순으로 불릿 나열.
export function buildExportText(
  grid: CellResult[][],
  team: number,
  startHour: number,
  slotMinutes: number
): string {
  const slotCount = grid[0]?.length ?? 0;
  const runs: Run[] = [];

  for (let d = 0; d < grid.length; d++) {
    let runStart = 0;
    let runCount = grid[d][0]?.freeCount ?? 0;
    for (let s = 1; s <= slotCount; s++) {
      const c = s < slotCount ? grid[d][s].freeCount : -1;
      if (c !== runCount) {
        if (runCount >= 1) runs.push({ day: d, fromSlot: runStart, toSlot: s, count: runCount });
        runStart = s;
        runCount = c;
      }
    }
  }

  if (runs.length === 0) return '아직 겹치는 시간이 없어요.';

  runs.sort((a, b) => b.count - a.count || a.day - b.day || a.fromSlot - b.fromSlot);

  return runs
    .map((r) => {
      const range = formatSlotRange(startHour, r.fromSlot, r.toSlot, slotMinutes);
      const label = r.count >= team ? '전원 가능' : `${team}명 중 ${r.count}명 가능`;
      return `- ${DAY_LABELS[r.day]} ${range} ${label}`;
    })
    .join('\n');
}
