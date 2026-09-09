export type Occupancy = boolean[][]; // [day][hour] — true = 수업 있음(불가), false = 빈 시간

export interface Room {
  id: string;
  title: string;
  day_count: number;
  start_hour: number;
  end_hour: number;
  expected_size: number;
  locked: boolean;
  created_at: string;
  expires_at: string;
}

export interface Submission {
  id: string;
  room_id: string;
  display_name: string;
  slug: string;
  occupancy: Occupancy;
  created_at: string;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export const HOUR_MIN_START = 8; // 에타 시간표가 8시부터 렌더됨
export const HOUR_MAX_END = 24; // 자정
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 18;

// 에타 시간표 스크린샷은 항상 08~18시, 1시간 단위 10칸 고정.
export const EVERYTIME_IMAGE_START = 8;
export const EVERYTIME_IMAGE_END = 18;
