// 24 = 자정. 그 이상은 다루지 않는다.
export function formatHour(hour: number): string {
  if (hour === 24 || hour === 0) return '자정';
  return `${hour}시`;
}

// "8시~10시" 처럼 구간 표기
export function formatRange(fromHour: number, toHour: number): string {
  return `${formatHour(fromHour)}~${formatHour(toHour)}`;
}
