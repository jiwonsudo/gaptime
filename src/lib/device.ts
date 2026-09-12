// 아주 러프한 모바일 판별 — PC 전용 안내문 노출 여부 정도에만 씀.
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent);
}
