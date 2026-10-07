import { describe, it, expect } from 'vitest';
import { combineSubmissions, teamSize } from './overlap';
import type { Submission } from '@/types';

function sub(name: string, occupancy: boolean[][]): Submission {
  return {
    id: name,
    room_id: 'room',
    display_name: name,
    slug: name,
    occupancy,
    created_at: '',
  };
}

describe('combineSubmissions (여러 명 겹치기)', () => {
  it('제출이 하나도 없으면 모든 칸의 가능 인원이 0명이다', () => {
    const grid = combineSubmissions([], 2, 3);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(3);
    expect(grid.flat().every((c) => c.freeCount === 0 && c.freeNames.length === 0)).toBe(true);
  });

  it('한 명만 제출하면 그 사람의 빈 칸만 가능 1명으로 센다', () => {
    // 월: [수업, 빈, 빈], 화: [빈, 빈, 수업]
    const grid = combineSubmissions([sub('가', [[true, false, false], [false, false, true]])], 2, 3);
    expect(grid[0].map((c) => c.freeCount)).toEqual([0, 1, 1]);
    expect(grid[1].map((c) => c.freeCount)).toEqual([1, 1, 0]);
    expect(grid[0][1].freeNames).toEqual(['가']);
  });

  it('여러 명이 겹치면 칸마다 가능한 사람 수와 이름을 센다', () => {
    const grid = combineSubmissions(
      [
        sub('가', [[true, false, false]]),
        sub('나', [[false, false, true]]),
        sub('다', [[false, false, false]]),
      ],
      1,
      3
    );
    expect(grid[0].map((c) => c.freeCount)).toEqual([2, 3, 2]);
    expect(grid[0][0].freeNames).toEqual(['나', '다']);
    expect(grid[0][2].freeNames).toEqual(['가', '다']);
  });



  it('제출한 occupancy가 방 격자보다 작으면 모자란 칸은 빈 시간으로 본다', () => {
    const grid = combineSubmissions([sub('가', [[true]])], 2, 2);
    expect(grid[0].map((c) => c.freeCount)).toEqual([0, 1]);
    expect(grid[1].map((c) => c.freeCount)).toEqual([1, 1]);
  });
});

describe('teamSize (분모 계산)', () => {
  it('분모는 예상 인원과 제출 인원 중 큰 값이다', () => {
    expect(teamSize(5, 3)).toBe(5);
    expect(teamSize(4, 6)).toBe(6);
  });

});
