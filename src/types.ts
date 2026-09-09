export type Occupancy = boolean[][]; // [day][hour] — true = 수업 있음(불가)

export interface Room {
  id: string;
  day_count: number;
  start_hour: number;
  end_hour: number;
  expected_size: number;
  created_at: string;
}

export interface Submission {
  id: string;
  room_id: string;
  name: string;
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
