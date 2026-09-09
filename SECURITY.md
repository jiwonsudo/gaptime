# 보안 모델

## 신뢰 경계

everyFreeTime은 **계정이 없다.** 접근 통제는 세 가지 비밀값으로만 이뤄진다.

| 비밀값 | 부여 대상 | 저장 위치 | 무엇을 할 수 있나 |
|---|---|---|---|
| `room id` (8 hex, 32비트) | 방 링크를 받은 사람 | URL | 방 조회, 시간표 제출 |
| `owner_token` (18 byte hex) | 방 생성자 | 생성자 브라우저 localStorage | 방 관리(이름·인원·마감·삭제, 제출 삭제) |
| `owner PIN` (선택, 4자리) | 방장 | `room_secrets` 에 salt+sha256 해시로만 | 다른 기기에서 `owner_token` 재취득 |
| `editor_token` (18 byte hex) | 제출자 | 제출자 브라우저 localStorage | 자기 제출 수정·삭제 |
| 제출 PIN (선택, 4자리) | 제출자 | `submission_editors` 에 해시로만 | 다른 기기에서 `editor_token` 재취득 |

## 데이터베이스

- **모든 쓰기는 `security definer` RPC 로만.** `rooms`/`submissions` 는 `SELECT` 만 허용
  (`rooms` 는 `expires_at > now()` 조건). `submission_editors`/`room_secrets`/`usage_events`
  는 RLS 정책이 없어 anon 이 직접 못 읽고, `INSERT/UPDATE/DELETE` 권한도 revoke.
- 토큰·PIN 해시는 **클라이언트로 절대 나가지 않는다.** RPC 내부 비교에만 쓰인다.
- PIN 은 salt + SHA-256. 온라인 무차별 대입은 **5회 실패 시 15분 잠금**
  (`pin_fails` / `pin_lock_until`, `_pin_locked()`).
- `claim_editor` 는 PIN 이 없는 제출에 대해 토큰을 회전하지 않는다 — 회전하면 트롤이
  반복 호출로 원 사용자의 로컬 토큰을 무효화할 수 있어서.
- `submit_occupancy` 는 occupancy jsonb 의 구조(요일 수 × 시간 수)와 크기(4KB)를 검증한다.
- 함수 `search_path` 는 전부 고정(`public, extensions` 또는 `pg_catalog`).

## XSS / injection

- 렌더링은 전부 React (자동 이스케이프). `dangerouslySetInnerHTML` / `eval` / `innerHTML` 없음.
- 사용자 입력(닉네임·방 이름)은 서버에서 정규식·예약어·길이 검증. 클라이언트도 동일 검증.
- SQL 은 파라미터 바인딩(RPC 인자)만 사용.

## 프라이버시

- 에타 시간표 **원본 이미지는 서버로 전송되지 않는다.** 브라우저에서 채도 분석 후 폐기,
  요일×시간 boolean 배열 + 닉네임만 전송.
- 방과 제출은 생성 14일 뒤 자동 만료(조회 불가). 정리는 `pg_cron` 권장:
  `select cron.schedule('gaptime-purge','0 4 * * *',$$delete from rooms where expires_at<=now()$$);`
- `usage_events` 는 개인 식별 정보 없는 집계(방 생성 수, 제출 수)만.

## 알려진 한계 (수용됨)

- **신뢰 모드 편집**: PIN 을 설정하지 않은 제출은, 같은 방에 있는 누구나(슬러그는 공개)
  덮어쓸 수 있다. When2meet 과 같은 모델 — 방 링크가 곧 신뢰 경계이고, 방장이 잠금·삭제로
  대응한다. 보호를 원하면 제출 시 PIN 을 건다.
- **방 생성 스팸**: RPC 레벨 IP 제한이 없다. 14일 만료로 상한이 있지만, 배포 시
  Cloudflare / Vercel 앞단 레이트리밋 또는 Supabase Edge Function 도입을 권장.
- **room id 열거**: 32비트라 대량 스캔이 이론상 가능하나(활성 방 한정, 저가치 타깃),
  비용 대비 실익이 낮다. 필요 시 자릿수를 늘린다(`create_room` 의 `substr(...,1,8)`).
- **방장 토큰 분실**: PIN 미설정 시 다른 기기로 옮길 수 없다. 방을 새로 만들어야 한다.

## 신고

취약점은 https://github.com/jiwonsudo/gaptime 이슈로.
