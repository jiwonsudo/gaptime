import type { BoundingBox, Occupancy } from '@/types';
import { EVERYTIME_IMAGE_DAYS } from '@/types';
import {
  sampleCellSaturation,
  isOccupied,
  DEFAULT_SATURATION_THRESHOLD,
} from './colorAnalysis';

export interface ScanOptions {
  dayCount: number;
  slotMinutes: number; // 방 시간 단위 (30 | 60)
  roomStartHour: number;
  roomEndHour: number;
  imageStartHour: number; // 스크린샷 격자 맨 위 시각 (보통 8)
  imageEndHour: number; // 스크린샷 격자 맨 아래 시각 (보통 18, PC 저장은 더 길 수 있음)
  threshold?: number;
}

// 에타 격자는 월~금 5열. bounding box 는 그 격자([imageStartHour, imageEndHour]) 전체를 감싼다.
// 방 시간대 × 방 시간 단위(슬롯)에 맞춰 잘라서 occupancy 를 만든다.
//  - 방이 12시 시작이면 앞부분 버림
//  - 스크린샷 범위 밖(시각·토·일)은 빈 시간으로 두고 수동 편집
export function computeOccupancy(
  imageData: ImageData,
  box: BoundingBox,
  opts: ScanOptions
): Occupancy {
  const {
    dayCount,
    slotMinutes,
    roomStartHour,
    roomEndHour,
    imageStartHour,
    imageEndHour,
    threshold = DEFAULT_SATURATION_THRESHOLD,
  } = opts;

  const { data, width } = imageData;
  const imgSlots = Math.max(1, ((imageEndHour - imageStartHour) * 60) / slotMinutes);
  const roomSlots = Math.max(1, ((roomEndHour - roomStartHour) * 60) / slotMinutes);
  const offsetSlots = ((roomStartHour - imageStartHour) * 60) / slotMinutes;

  const boxW = box.x1 - box.x0;
  const boxH = box.y1 - box.y0;
  const cellW = boxW / EVERYTIME_IMAGE_DAYS;
  const cellH = boxH / imgSlots;

  const result: Occupancy = [];
  for (let d = 0; d < dayCount; d++) {
    const dayRow: boolean[] = [];
    for (let s = 0; s < roomSlots; s++) {
      const imgRow = offsetSlots + s;
      if (d >= EVERYTIME_IMAGE_DAYS || imgRow < 0 || imgRow >= imgSlots) {
        dayRow.push(false);
        continue;
      }
      const cellX = box.x0 + cellW * d;
      const cellY = box.y0 + cellH * imgRow;
      const sat = sampleCellSaturation(data, width, cellX, cellY, cellW, cellH);
      dayRow.push(isOccupied(sat, threshold));
    }
    result.push(dayRow);
  }
  return result;
}
