import type { BoundingBox, Occupancy } from '@/types';
import {
  EVERYTIME_IMAGE_START,
  EVERYTIME_IMAGE_END,
  EVERYTIME_IMAGE_DAYS,
} from '@/types';
import {
  sampleCellSaturation,
  isOccupied,
  DEFAULT_SATURATION_THRESHOLD,
} from './colorAnalysis';

// 에타 스크린샷은 항상 월~금 5칸 × 08~18시 10칸으로 렌더된다 (행·열 고정).
// bounding box는 그 5×10 격자 전체를 감싼다.
// 방 시간대([roomStartHour, roomEndHour])의 행만, 방 요일 수(dayCount)만큼 열을 만들어 반환한다.
//  - 방이 12시 시작이면 앞 4칸은 버림
//  - 18시를 넘는 시간, 그리고 토·일(d >= 5)은 스크린샷에 없으므로 빈 시간으로 두고 수동 보정
export function computeOccupancy(
  imageData: ImageData,
  box: BoundingBox,
  dayCount: number,
  roomStartHour: number,
  roomEndHour: number,
  threshold = DEFAULT_SATURATION_THRESHOLD
): Occupancy {
  const imgHours = EVERYTIME_IMAGE_END - EVERYTIME_IMAGE_START; // 10
  const roomHours = Math.max(1, roomEndHour - roomStartHour);
  const { data, width } = imageData;

  const boxW = box.x1 - box.x0;
  const boxH = box.y1 - box.y0;
  const cellW = boxW / EVERYTIME_IMAGE_DAYS; // 항상 5등분
  const cellH = boxH / imgHours;

  const result: Occupancy = [];
  for (let d = 0; d < dayCount; d++) {
    const dayRow: boolean[] = [];
    for (let rh = 0; rh < roomHours; rh++) {
      const imgRow = roomStartHour + rh - EVERYTIME_IMAGE_START;
      if (d >= EVERYTIME_IMAGE_DAYS || imgRow < 0 || imgRow >= imgHours) {
        dayRow.push(false); // 스크린샷(월~금 · 08~18시) 밖 — 수동 편집으로 보정
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
