// 24 = 자정. 그 이상은 다루지 않는다.
export function formatHour(hour: number): string {
  if (hour === 24 || hour === 0) return '자정';
  return `${hour}시`;
}

// 슬롯 인덱스 → 시각 라벨. 60분이면 "8시", 30분이면 "8:00" / "8:30".
export function formatSlot(startHour: number, slotIndex: number, slotMinutes: number): string {
  const totalMin = startHour * 60 + slotIndex * slotMinutes;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (slotMinutes === 60) return formatHour(h);
  if (h === 24 && m === 0) return '자정';
  return `${h % 24}:${String(m).padStart(2, '0')}`;
}

// 슬롯 구간 "8시~10시" 또는 "8:30~10:00"
export function formatSlotRange(
  startHour: number,
  fromSlot: number,
  toSlot: number,
  slotMinutes: number
): string {
  return `${formatSlot(startHour, fromSlot, slotMinutes)}~${formatSlot(startHour, toSlot, slotMinutes)}`;
}
