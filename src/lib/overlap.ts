import type { Occupancy, Submission } from '@/types';

export interface CellResult {
  freeNames: string[]; // 이 시간에 비어있는 사람들의 표시 이름
  freeCount: number;
}

// 여러 제출을 셀별 "비어있는 사람 수 + 이름"으로 합친다.
export function combineSubmissions(
  submissions: Submission[],
  dayCount: number,
  hourCount: number
): CellResult[][] {
  const grid: CellResult[][] = [];
  for (let d = 0; d < dayCount; d++) {
    const row: CellResult[] = [];
    for (let h = 0; h < hourCount; h++) {
      const freeNames: string[] = [];
      for (const sub of submissions) {
        const occ: Occupancy = sub.occupancy;
        const occupied = occ?.[d]?.[h] ?? false;
        if (!occupied) freeNames.push(sub.display_name);
      }
      row.push({ freeNames, freeCount: freeNames.length });
    }
    grid.push(row);
  }
  return grid;
}

// 기준 인원 = max(예상 인원, 실제 제출 인원)
export function teamSize(expectedSize: number, submissionCount: number): number {
  return Math.max(expectedSize, submissionCount);
}

// 이름 해시 → HSL hue. hover 목록에서 이름 옆 작은 점 장식용.
export function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function nameColor(name: string): string {
  return `hsl(${nameToHue(name)}, 55%, 55%)`;
}
