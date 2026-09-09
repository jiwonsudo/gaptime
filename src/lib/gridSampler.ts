import type { BoundingBox, Occupancy } from '@/types';
import {
  sampleCellSaturation,
  isOccupied,
  DEFAULT_SATURATION_THRESHOLD,
} from './colorAnalysis';

// 캘리브레이션으로 확정된 bounding box를 요일 수 × 시간 수로 균등 분할한다.
export function computeOccupancy(
  imageData: ImageData,
  box: BoundingBox,
  dayCount: number,
  startHour: number,
  endHour: number,
  threshold = DEFAULT_SATURATION_THRESHOLD
): Occupancy {
  const hourCount = Math.max(1, endHour - startHour);
  const { data, width } = imageData;

  const boxW = box.x1 - box.x0;
  const boxH = box.y1 - box.y0;
  const cellW = boxW / dayCount;
  const cellH = boxH / hourCount;

  const result: Occupancy = [];
  for (let d = 0; d < dayCount; d++) {
    const dayRow: boolean[] = [];
    for (let h = 0; h < hourCount; h++) {
      const cellX = box.x0 + cellW * d;
      const cellY = box.y0 + cellH * h;
      const sat = sampleCellSaturation(data, width, cellX, cellY, cellW, cellH);
      dayRow.push(isOccupied(sat, threshold));
    }
    result.push(dayRow);
  }
  return result;
}
