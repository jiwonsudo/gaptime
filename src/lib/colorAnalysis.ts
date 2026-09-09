// RGB → HSV 변환 후 saturation 값만 사용한다.
// 에타 시간표: 빈 시간 = 무채색(낮은 채도), 수업 = 유채색(높은 채도).

export function rgbToSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max; // 0..1
}

// 채도 threshold 기본값 18% (실측 스크린샷으로 튜닝 필요)
export const DEFAULT_SATURATION_THRESHOLD = 0.18;

// 셀 안쪽 60% 영역에서 5x5 포인트를 샘플링해 평균 채도를 구한다.
export function sampleCellSaturation(
  data: Uint8ClampedArray,
  imgWidth: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number
): number {
  const inset = 0.2; // 양쪽 20%씩 잘라 안쪽 60%만 사용
  const startX = cellX + cellW * inset;
  const startY = cellY + cellH * inset;
  const spanX = cellW * (1 - inset * 2);
  const spanY = cellH * (1 - inset * 2);

  let total = 0;
  let count = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const px = Math.floor(startX + (spanX * i) / 4);
      const py = Math.floor(startY + (spanY * j) / 4);
      const idx = (py * imgWidth + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      total += rgbToSaturation(r, g, b);
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

export function isOccupied(
  avgSaturation: number,
  threshold = DEFAULT_SATURATION_THRESHOLD
): boolean {
  return avgSaturation >= threshold;
}
