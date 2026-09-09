// 에타 시간표: 빈 시간 = 무채색(회색/흰색, 채도≈0), 수업 = 파스텔 유채색(채도 낮지만 0은 아님).
// PC 저장 이미지는 압축으로 채도가 더 낮아지므로 임계값을 낮게 잡고,
// 텍스트/테두리 픽셀에 흔들리지 않도록 셀 안쪽을 조밀하게 샘플링해 중앙값에 가까운 평균을 쓴다.

export function rgbToSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max; // 0..1
}

// 파스텔 색도 잡히도록 낮게. (에타 파스텔: 채도 0.05~0.11, 빈칸: ≈0)
export const DEFAULT_SATURATION_THRESHOLD = 0.035;

// 셀 안쪽 70%를 11x11로 샘플링, 위아래 20%(테두리·글자 픽셀)를 버린 평균 채도.
export function sampleCellSaturation(
  data: Uint8ClampedArray,
  imgWidth: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number
): number {
  const imgHeight = imgWidth > 0 ? Math.floor(data.length / 4 / imgWidth) : 0;
  const inset = 0.15;
  const startX = cellX + cellW * inset;
  const startY = cellY + cellH * inset;
  const spanX = cellW * (1 - inset * 2);
  const spanY = cellH * (1 - inset * 2);
  const N = 11;

  const vals: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const px = Math.min(imgWidth - 1, Math.max(0, Math.round(startX + (spanX * i) / (N - 1))));
      const py = Math.min(imgHeight - 1, Math.max(0, Math.round(startY + (spanY * j) / (N - 1))));
      const idx = (py * imgWidth + px) * 4;
      vals.push(rgbToSaturation(data[idx], data[idx + 1], data[idx + 2]));
    }
  }
  vals.sort((a, b) => a - b);
  const lo = Math.floor(vals.length * 0.2);
  const hi = Math.ceil(vals.length * 0.8);
  const trimmed = vals.slice(lo, hi);
  const sum = trimmed.reduce((a, b) => a + b, 0);
  return trimmed.length > 0 ? sum / trimmed.length : 0;
}

export function isOccupied(
  avgSaturation: number,
  threshold = DEFAULT_SATURATION_THRESHOLD
): boolean {
  return avgSaturation >= threshold;
}
