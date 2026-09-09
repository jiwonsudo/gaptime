import type { BoundingBox, Occupancy } from '@/types';
import {
  sampleCellSaturation,
  isOccupied,
  DEFAULT_SATURATION_THRESHOLD,
} from './colorAnalysis';

// bounding box는 스크린샷에 보이는 격자 전체([imageStartHour, imageEndHour])를 감싼다.
// 방 시간대([roomStartHour, roomEndHour])에 해당하는 행만 잘라서 반환한다.
// (예: 에타는 항상 8시부터 렌더되지만 방이 12시 시작이면 앞 4시간은 버린다)
export function computeOccupancy(
  imageData: ImageData,
  box: BoundingBox,
  dayCount: number,
  imageStartHour: number,
  imageEndHour: number,
  roomStartHour: number,
  roomEndHour: number,
  threshold = DEFAULT_SATURATION_THRESHOLD
): Occupancy {
  const imgHours = Math.max(1, imageEndHour - imageStartHour);
  const roomHours = Math.max(1, roomEndHour - roomStartHour);
  const { data, width } = imageData;

  const boxW = box.x1 - box.x0;
  const boxH = box.y1 - box.y0;
  const cellW = boxW / dayCount;
  const cellH = boxH / imgHours;

  const result: Occupancy = [];
  for (let d = 0; d < dayCount; d++) {
    const dayRow: boolean[] = [];
    for (let rh = 0; rh < roomHours; rh++) {
      const imgRow = roomStartHour + rh - imageStartHour;
      if (imgRow < 0 || imgRow >= imgHours) {
        dayRow.push(false); // 스크린샷 범위 밖 — 수동 편집으로 보정
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
