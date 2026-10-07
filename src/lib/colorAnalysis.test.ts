import { describe, it, expect } from 'vitest';
import {
  rgbToSaturation,
  isOccupied,
  sampleCellSaturation,
  DEFAULT_SATURATION_THRESHOLD,
} from './colorAnalysis';

// 테스트용 이미지: width x height 를 한 가지 색으로 채운다. (실제 이미지 파일 불필요)
function solidImage(w: number, h: number, rgb: [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
  }
  return data;
}

function setPixel(data: Uint8ClampedArray, w: number, x: number, y: number, rgb: [number, number, number]) {
  data.set([rgb[0], rgb[1], rgb[2], 255], (y * w + x) * 4);
}

describe('rgbToSaturation', () => {
  it('흰색·회색·검정 같은 무채색은 채도 0이다', () => {
    expect(rgbToSaturation(255, 255, 255)).toBe(0);
    expect(rgbToSaturation(128, 128, 128)).toBe(0);
    expect(rgbToSaturation(0, 0, 0)).toBe(0);
  });
});

describe('isOccupied (임계값 경계)', () => {
  it('임계값 기본값은 0.035다', () => {
    expect(DEFAULT_SATURATION_THRESHOLD).toBe(0.035);
  });

  it('임계값 바로 아래 채도는 빈 칸으로 판정한다', () => {
    expect(isOccupied(0.0349)).toBe(false);
  });

  it('임계값과 같은 채도는 수업 있는 칸으로 판정한다', () => {
    expect(isOccupied(0.035)).toBe(true);
  });

  it('임계값 바로 위 채도는 수업 있는 칸으로 판정한다', () => {
    expect(isOccupied(0.0351)).toBe(true);
  });

});

describe('sampleCellSaturation (절사평균)', () => {
  const W = 100;
  const H = 100;
  // 셀 = 이미지 전체. 샘플 지점은 안쪽 70% 영역(15~85)에 놓인다.
  const sample = (data: Uint8ClampedArray) => sampleCellSaturation(data, W, 0, 0, W, H);

  it('무채색 셀은 채도 0으로 계산해 빈 칸으로 판정된다', () => {
    const sat = sample(solidImage(W, H, [240, 240, 240]));
    expect(sat).toBe(0);
    expect(isOccupied(sat)).toBe(false);
  });

  it('에타 파스텔 색 셀은 채도가 낮아도 임계값을 넘어 수업 칸으로 판정된다', () => {
    // 채도 약 0.08 (파스텔: 0.05~0.11)
    const sat = sample(solidImage(W, H, [250, 230, 230]));
    expect(sat).toBeCloseTo(0.08, 2);
    expect(isOccupied(sat)).toBe(true);
  });

  it('빈 칸 안에 글자·테두리 같은 진한 픽셀이 몇 개 섞여도 빈 칸으로 판정한다', () => {
    const data = solidImage(W, H, [240, 240, 240]);
    // 샘플 지점(11x11=121개) 중 일부에 강한 유채색 이상치를 심는다. 20% 이하(24개 미만)이므로 버려져야 함.
    // 샘플 x 좌표: 15 + 70*i/10 → 15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85
    const xs = [15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85];
    const y = 50; // 한 줄(j=5) = 샘플 11개
    for (const x of xs) setPixel(data, W, x, y, [255, 0, 0]);
    expect(isOccupied(sample(data))).toBe(false);
  });

  it('수업 칸 안에 흰 글자 픽셀이 몇 개 섞여도 수업 칸으로 판정한다', () => {
    const data = solidImage(W, H, [250, 230, 230]);
    const xs = [15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85];
    for (const x of xs) setPixel(data, W, x, 50, [255, 255, 255]);
    expect(isOccupied(sample(data))).toBe(true);
  });



  it('빈 이미지(크기 0)도 에러 없이 0을 돌려준다', () => {
    expect(sampleCellSaturation(new Uint8ClampedArray(0), 0, 0, 0, 10, 10)).toBe(0);
  });
});
