import type { Occupancy } from '@/types';

export function emptyOccupancy(dayCount: number, hourCount: number): Occupancy {
  return Array.from({ length: dayCount }, () => Array.from({ length: hourCount }, () => false));
}

// 방 시간 범위가 바뀌었을 때 등, occupancy 크기를 맞춘다.
export function resizeOccupancy(
  occ: Occupancy,
  dayCount: number,
  hourCount: number
): Occupancy {
  return Array.from({ length: dayCount }, (_, d) =>
    Array.from({ length: hourCount }, (_, h) => occ?.[d]?.[h] ?? false)
  );
}
