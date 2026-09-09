import type { Occupancy, Room } from '@/types';

type SlotRoom = Pick<Room, 'start_hour' | 'end_hour' | 'slot_minutes'>;

// 방의 시간 칸(슬롯) 수
export function roomSlotCount(room: SlotRoom): number {
  return Math.max(1, ((room.end_hour - room.start_hour) * 60) / room.slot_minutes);
}

export function emptyOccupancy(dayCount: number, slotCount: number): Occupancy {
  return Array.from({ length: dayCount }, () => Array.from({ length: slotCount }, () => false));
}

// 방 격자가 바뀌었을 때 등, occupancy 크기를 맞춘다.
export function resizeOccupancy(occ: Occupancy, dayCount: number, slotCount: number): Occupancy {
  return Array.from({ length: dayCount }, (_, d) =>
    Array.from({ length: slotCount }, (_, s) => occ?.[d]?.[s] ?? false)
  );
}
