# 에브리프리타임 — 상세 설계 (v2)

이 문서는 [CLAUDE.md](./CLAUDE.md)의 MVP 위에 실제 배포(학교 전체 대상)를 위해 확정한
추가 설계를 담는다. CLAUDE.md와 충돌하면 이 문서가 우선한다.

## 1. 방(Room)

| 항목 | 내용 |
|---|---|
| 방 이름 | 생성 시 입력(최대 60자). 링크 타고 온 멤버가 "무슨 방인지" 바로 알도록 모든 화면 상단에 노출 |
| 요일 | 월~금 5칸 고정 (MVP) |
| 시간 범위 | 시작 6\~22시 / 종료 9\~24시 입력. 기본 8\~22시(에타 기본 시작이 8시). 24시 = 자정, 그 이상은 다루지 않음 |
| 예상 인원 | 2\~30명, 기본 4명. "우리 팀 몇 명" 기준값으로 쓰임 |
| 만료 | 생성 후 30일. 만료된 방은 조회 불가, (선택) pg_cron으로 정리 |
| 잠금 | 방장이 제출 마감 토글. 잠기면 신규/수정 제출 불가, 히트맵은 계속 조회 가능 |

방 생성 → 6자 `room id` 발급 → `/(도메인)/r/<roomId>`.

## 2. 신원(닉네임 기반)

localStorage 식별자는 기기를 바꾸면 잃어버리므로 쓰지 않는다. **닉네임 + 개인 링크**로 간다.

### 닉네임 규칙
- 표시 이름: 2\~20자. 한글 / 영문 / 숫자 / 공백 / `_` / `-` 허용.
- 슬러그(링크용): 표시 이름을 정규화 — NFKC → 소문자 → 앞뒤 공백 제거 → 공백을 `-`로 → 허용 문자(`a-z 0-9 가-힣 _ -`) 외 제거 → 연속 `-` 축약. 결과가 2\~20자가 아니면 거부.
- 예약어 거부: `admin`, `administrator`, `관리자`, `운영`, `운영자`, `방장`, `host`, `owner`, `system`, `null`, `undefined`, `me`, `new`, `api`, `r`.
- 부적절어 필터: 기본 욕설/비속어 블록리스트(한/영, 완전하지 않음 — 방장이 개별 제출 삭제로 보완).
- 방 안에서 슬러그 **중복 금지**. 이미 있으면 "이미 쓰는 이름이에요" 안내.

### 수정 권한 — 닉네임 + 선택 PIN (하이브리드)

라이트 유저가 기기를 바꿔도(노트북 작성 → 폰 수정) 막히지 않도록:

- **첫 제출 시**: 닉네임(필수) + 4자리 PIN(선택). 서버가 `editor_token` 발급.
- **같은 기기**: localStorage에 `editor_token` 저장 → 자동 복원. 아무 입력 없이 수정.
- **다른 기기**: 방 페이지에서 "이미 올렸어요 · 수정" → 닉네임 입력
  - PIN 설정됨 → PIN 입력해 검증 → `editor_token` 재발급받아 수정
  - PIN 미설정 → 닉네임만으로 수정 허용(안내: "PIN을 설정하지 않아 닉네임만으로 열립니다")
- **개인 링크 / QR**: `/r/<roomId>/<slug>` + QR 을 "나에게 보내기"용으로 제공.
  폰으로 QR 스캔이 가장 쉬운 크로스 기기 경로.
- PIN·editor_token 모두 없고 링크도 잃음 → 방장이 제출 삭제 후 재제출.

PIN은 `pin_hash`(salt+sha256)로만 저장, 원문·해시 모두 클라이언트로 안 나감.
검증은 RPC `claim_editor(room_id, slug, pin)` 내부에서만.

## 3. 시간표 입력 플로우

`/r/<roomId>` 방 페이지에서 "내 시간표 올리기":

1. **닉네임 선택** — 입력 즉시 정규화·중복·예약어·부적절어 검사.
2. **입력 방식 선택**
   - (A) 에타 스크린샷 업로드 → 격자 맞추기(2점 드래그) → 채도로 자동 감지
   - (B) 이미지 없이 직접 입력 → 전부 "빈 시간"인 격자에서 시작
3. **격자 편집(항상)** — 감지 결과(또는 빈 격자)를 When2meet식으로 직접 수정.
   - 칸 탭 = 토글, 드래그 = 페인트(드래그 시작 칸의 반대 상태로 칠함)
   - 두 상태: "빈 시간"(초록 계열) / "수업"(회색)
4. **제출** — 표시 이름 + 슬러그 + occupancy 배열만 전송(이미지는 전송 안 됨).
5. **개인 링크 안내** — 복사 버튼 + "이 링크로 나중에 수정하세요".

이미지·격자 분석은 100% 클라이언트. 서버로 가는 건 occupancy(요일×시간 boolean) + 이름뿐.

### 격자 맞추기(캘리브레이터)
- 이미지를 컨테이너 폭에 맞춰 표시, 그 위에 DOM 핸들 2개(좌상단·우하단).
- 핸들 드래그 = 모서리 이동, 격자 안쪽 드래그 = 전체 이동.
- 격자선 미리보기(요일 수 × 시간 수)를 실시간 오버레이.

### 채도 판별 (CLAUDE.md 유지)
- RGB→HSV의 saturation만 사용. 셀 안쪽 60%에서 5×5 샘플 평균.
- threshold 기본 0.18, 실측 스크린샷으로 튜닝.

## 4. 결과 화면

- 상단 대부분을 히트맵이 차지. 요일 × 시간 격자.
- 칸 색: "빈 사람 수"가 많을수록 진한 초록(`#3FA968`), 0명이면 중립 회색(`#E4E2DC`).
- 칸 안에 `가능한 사람 수 / 전체` 숫자 항상 표기. **"분모" 같은 용어 안 씀** — hover 툴팁은 "N명 중 X명이 이 시간에 비어요"처럼 자연스러운 문장.
- 전체 = `max(예상 인원, 실제 제출 인원)`.
- hover 시 가능한 사람 이름 목록(상위 8명 + "외 N명", 스크롤).
- 새 제출이 실시간으로 들어오면 해당 칸 색이 트랜지션으로 바뀜(다른 등장 애니메이션 없음).
- 내보내기: "화 15\~17시 전원 가능, 목 13\~18시 28명 중 25명 가능" 같은 문장. 화살표·전각 대시·올캡 금지.

## 5. 방장 관리 (owner_token)

- 방 생성 시 서버가 `owner_token` 발급 → **생성자 브라우저 localStorage에만** 저장.
- `room_secrets` 테이블은 클라이언트가 직접 읽을 수 없고, 관리 작업은 토큰을 검증하는
  security definer RPC로만 수행.
- 방장이 할 수 있는 것:
  - 공유 링크 / QR 다시 보기
  - 제출 마감(잠금) 켜기·끄기
  - 예상 인원수 수정
  - 개별 제출 삭제 (장난·중복·오감지)
  - 방 삭제
- **요일/시간 범위는 방장도 수정 불가** — 기존 제출들의 occupancy가 그 격자 기준이라 깨짐.

## 6. 첫 방문 튜토리얼

- `/` 와 `/r/:id` 첫 방문 시 모달 튜토리얼 자동 표시 (4단계, "건너뛰기" 가능).
- 한 번 보면 `localStorage: gaptime:seenTutorial` 저장, 다시 안 뜸.
- 우측 상단 "사용법" 버튼으로 언제든 다시 열기.

## 7. 데이터 모델

```sql
rooms(
  id text pk, title text, day_count int, start_hour int, end_hour int,
  expected_size int, locked bool, created_at timestamptz, expires_at timestamptz
)
submissions(
  id uuid pk, room_id text fk, display_name text, slug text,
  occupancy jsonb, created_at timestamptz,
  unique(room_id, slug)
)
submission_editors(              -- 클라이언트 접근 불가
  submission_id uuid pk, room_id text, slug text,
  editor_token text, pin_hash text null, pin_salt text null
)
room_secrets(                    -- 클라이언트 접근 불가
  room_id text pk, owner_token text
)
```

RPC (전부 `security definer`, anon 실행 허용):
`create_room`, `submit_occupancy`, `delete_own_submission`, `verify_owner`,
`delete_submission_as_owner`, `update_room_as_owner`, `delete_room_as_owner`.

RLS: `rooms`/`submissions`는 select만 허용(방은 만료 전). `submission_editors`/`room_secrets`는
정책 없음(RPC 전용). insert/update/delete 권한은 anon에서 revoke.

## 8. 라우팅

| 경로 | 화면 |
|---|---|
| `/` | 방 생성 (빈 격자 + 설정 폼) |
| `/r/:roomId` | 방 페이지: 히트맵 + 내 시간표 올리기 + (방장) 관리 |
| `/r/:roomId?created=1` | 위와 동일 + 생성 직후 공유 카드 강조 |
| `/r/:roomId/:slug?k=token` | 개인 페이지: 내 제출 조회/수정/삭제 |

## 9. 용어 정리 (UI 노출 문구)

| 안 씀 | 씀 |
|---|---|
| 분모 / 모수 | "N명 중 X명" |
| occupancy / 배열 | (노출 안 함) |
| 캘리브레이션 | 격자 맞추기 |
| threshold | (노출 안 함) |
| submit / 서브미션 | 제출 / 내 시간표 |
| → , — (전각 대시), 올캡 | 쓰지 않음 (CLAUDE.md) |

## 10. MVP 대비 추가된 범위 (의도적)

CLAUDE.md에서 스트레치/비목표였지만 배포를 위해 앞당김:
- 제출 수정/재제출 (닉네임+토큰)
- 방 자동 만료
- 방장 관리 기능
- 수동 격자 편집 / 이미지 없이 직접 입력

자동 그리드 검출, 4점 perspective, OCR, 토·일 컬럼은 여전히 범위 밖.
