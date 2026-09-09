import type { CellResult } from './overlap';
import { DAY_LABELS } from '@/types';

// 예: "화 15~17시 (전원 가능), 목 13~18시 (28/30명 가능)"
// 각 요일별로 "가능 인원 수가 같은 연속 구간"을 묶어 출력한다.
export function buildExportText(
  grid: CellResult[][],
  denom: number,
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
          const from = startHour + runStart;
          const to = startHour + h;
          const label =
            runCount >= denom ? '전원 가능' : `${runCount}/${denom}명 가능`;
          parts.push(`${DAY_LABELS[d]} ${from}~${to}시 (${label})`);
        }
        runStart = h;
        runCount = c;
      }
    }
  }

  return parts.length > 0 ? parts.join(', ') : '겹치는 가능 시간이 없어요.';
}
