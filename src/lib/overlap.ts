import type { Occupancy, Submission } from '@/types';

export interface CellResult {
  freeNames: string[]; // 이 칸이 비어있는(가능한) 사람들
  freeCount: number;
}

// 여러 submission의 occupancy를 셀별 "가능 인원 수 + 이름 목록"으로 결합한다.
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
        if (!occupied) freeNames.push(sub.name);
      }
      row.push({ freeNames, freeCount: freeNames.length });
    }
    grid.push(row);
  }
  return grid;
}

// 분모: max(expected_size, 실제 제출 인원 수)
export function denominator(expectedSize: number, submissionCount: number): number {
  return Math.max(expectedSize, submissionCount);
}

// 이름 문자열 해시 → HSL hue (참가자 식별용 장식 점)
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
