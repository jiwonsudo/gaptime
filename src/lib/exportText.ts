import type { CellResult } from './overlap';
import { DAY_LABELS } from '@/types';
import { formatRange } from './timeFormat';

// 예: "화 15시~17시 전원 가능, 목 13시~18시 30명 중 25명 가능"
export function buildExportText(
  grid: CellResult[][],
  team: number,
  startHour: number
): string {
  const parts: string[] = [];
  const hourCount = grid[0]?.length ?? 0;

  for (let d = 0; d < grid.length; d++) {
    let runStart = 0;
    let runCount = grid[d][0]?.freeCount ?? 0;
    for (let h = 1; h <= hourCount; h++) {
      const c = h < hourCount ? grid[d][h].freeCount : -1;
      if (c !== runCount) {
        if (runCount > 0) {
          const range = formatRange(startHour + runStart, startHour + h);
          const label = runCount >= team ? '전원 가능' : `${team}명 중 ${runCount}명 가능`;
          parts.push(`${DAY_LABELS[d]} ${range} ${label}`);
        }
        runStart = h;
        runCount = c;
      }
    }
  }

  return parts.length > 0 ? parts.join(', ') : '아직 겹치는 시간이 없어요.';
}
