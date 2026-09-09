import type { CellResult } from './overlap';
import { DAY_LABELS } from '@/types';
import { formatSlotRange } from './timeFormat';

// 예: "화 15시~17시 전원 가능, 목 13:00~18:00 30명 중 25명 가능"
export function buildExportText(
  grid: CellResult[][],
  team: number,
  startHour: number,
  slotMinutes: number
): string {
  const parts: string[] = [];
  const slotCount = grid[0]?.length ?? 0;

  for (let d = 0; d < grid.length; d++) {
    let runStart = 0;
    let runCount = grid[d][0]?.freeCount ?? 0;
    for (let s = 1; s <= slotCount; s++) {
      const c = s < slotCount ? grid[d][s].freeCount : -1;
      if (c !== runCount) {
        if (runCount > 0) {
          const range = formatSlotRange(startHour, runStart, s, slotMinutes);
          const label = runCount >= team ? '전원 가능' : `${team}명 중 ${runCount}명 가능`;
          parts.push(`${DAY_LABELS[d]} ${range} ${label}`);
        }
        runStart = s;
        runCount = c;
      }
    }
  }

  return parts.length > 0 ? parts.join(', ') : '아직 겹치는 시간이 없어요.';
}
