// 서버(RPC) 에러를 사용자에게 보여줄 문장으로 바꾼다.
//
// 우리 RPC 는 의도한 검증 실패를 전부 `raise exception '...'` (PostgreSQL code P0001)로 던진다.
// 그 메시지만 그대로 노출하고, 그 외(제약조건 위반·타입 오류·함수 시그니처 불일치 등
// 내부 구조가 새어나갈 수 있는 에러)는 일반 문구로 감춘다.
export function errMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const err = e as { message?: unknown; code?: unknown };

    // PostgREST/PostgreSQL: RAISE EXCEPTION → code 'P0001'
    if (err.code === 'P0001' && typeof err.message === 'string' && err.message.trim() !== '') {
      return err.message;
    }

    // 네트워크/오프라인 등 일반 Error (code 없음) — 짧은 메시지면 노출
    if (
      err.code === undefined &&
      typeof err.message === 'string' &&
      err.message.length > 0 &&
      err.message.length < 120 &&
      !/[;{}]|select |insert |from |relation |function |schema /i.test(err.message)
    ) {
      return err.message;
    }
  }
  return fallback;
}
