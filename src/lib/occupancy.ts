import type { Occupancy, Room } from '@/types';

// 방의 시간 칸 수 (여러 컴포넌트에서 재사용)
export function roomHourCount(room: Pick<Room, 'start_hour' | 'end_hour'>): number {
  return Math.max(1, room.end_hour - room.start_hour);
}

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
