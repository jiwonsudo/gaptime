# 에브리프리타임 — 상세 설계 (v2)

이 문서는 [CLAUDE.md](./CLAUDE.md)의 MVP 위에 실제 배포(학교 전체 대상)를 위해 확정한
추가 설계를 담는다. CLAUDE.md와 충돌하면 이 문서가 우선한다. 보안 모델은 [SECURITY.md](./SECURITY.md).

## 1. 방(Room)

| 항목 | 내용 |
|---|---|
| 방 이름 | 생성 시 **필수**(빈칸 금지, 최대 60자). 링크 타고 온 멤버가 "무슨 방인지" 바로 알도록 모든 화면 상단에 노출. 방장이 관리에서 재설정 가능 |
| 방장 이름 | 생성 시 **필수**(최대 20자). 공유 메시지("○○님이 '방이름' 폼을 만들었어요…")와 방 페이지에 표시 |
| 요일 | 기본 월~금 5칸. 방 생성 시 또는 **방장 관리에서** "토·일 포함" 체크하면 7칸 (`day_count` 5 또는 7). 에타 스캔은 항상 월~금만, 토·일은 수동 편집 |
| 시간 범위 | 시작 8\~23시 / 종료 9\~24시 (드롭다운). 기본 8\~18시 |
| 시간 단위 | 60분(기본) 또는 30분 (라디오). occupancy 슬롯 수 = (end−start)×60/slot. 방장 관리에서도 변경 가능(제출 없을 때만) |
| 예상 인원 | 2\~30명, 기본 4명. "우리 팀 몇 명" 기준값으로 쓰임 |
| 만료 | 생성 후 **7일** (무료). pg_cron 매시 정리. 생성 화면에 안내. 남용 방어는 [SECURITY.md](./SECURITY.md) §스팸 |
| 잠금 | 방장이 제출 마감 토글. 잠기면 신규/수정 제출 불가, 히트맵은 계속 조회 가능 |

방 생성 → 8자 hex `room id` 발급(32비트, 추측 불가) → `/(도메인)/room/<roomId>`.

## 2. 신원(닉네임 기반)

localStorage 식별자는 기기를 바꾸면 잃어버리므로 쓰지 않는다. **닉네임 + 개인 링크**로 간다.

### 닉네임 규칙
- 표시 이름: 2\~20자. 한글 / 영문 / 숫자 / 공백 / `_` / `-` 허용.
- 슬러그(링크용): 표시 이름을 정규화 — NFKC → 소문자 → 앞뒤 공백 제거 → 공백을 `-`로 → 허용 문자(`a-z 0-9 가-힣 _ -`) 외 제거 → 연속 `-` 축약. 결과가 2\~20자가 아니면 거부.
- 예약어 거부: `admin`, `administrator`, `관리자`, `운영`, `운영자`, `방장`, `host`, `owner`, `system`, `null`, `undefined`, `me`, `new`, `api`, `room`, `privacy`.
- 부적절어 필터: 기본 욕설/비속어 블록리스트(한/영, 완전하지 않음 — 방장이 개별 제출 삭제로 보완).
- 방 안에서 슬러그 **중복 금지**. 이미 있으면 "이미 쓰는 이름이에요" 안내.
- 닉네임은 **방에 참여한 모두에게 보인다** (히트맵 hover, 올린 사람 목록). 입력 화면에 명시.

### 수정 권한 — 닉네임 + 선택 PIN (하이브리드)

라이트 유저가 기기를 바꿔도(노트북 작성 → 폰 수정) 막히지 않도록:

- **첫 제출 시**: 닉네임(필수) + 4자리 PIN(선택). 서버가 `editor_token` 발급.
- **같은 기기**: localStorage에 `editor_token` 저장 → 자동 복원. 아무 입력 없이 수정.
- **다른 기기**: 방 페이지에서 "이미 올렸어요 · 수정" → 닉네임 입력
  - PIN 설정됨 → PIN 입력해 검증 → `editor_token` 재발급받아 수정
  - PIN 미설정 → 닉네임만으로 수정 허용(안내: "PIN을 설정하지 않아 닉네임만으로 열립니다")
- **개인 링크 / QR**: `/room/<roomId>/<slug>` 링크를 "나에게 보내기"용으로 제공.
  링크 복사가 1순위, QR은 "QR 코드" 버튼을 눌러야 나오고 이미지 저장 가능.
- PIN·editor_token 모두 없고 링크도 잃음 → 방장이 제출 삭제 후 재제출.

PIN은 `pin_hash`(salt+sha256)로만 저장, 원문·해시 모두 클라이언트로 안 나감.
검증은 RPC `claim_editor(room_id, slug, pin)` 내부에서만.

## 3. 시간표 입력 플로우

`/room/<roomId>` 방 페이지에서 "내 시간표 올리기":

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
- 업로드 전 안내: **PC는 에타 "이미지 저장 → PC용"** 파일을 올려야 함(브라우저 캡처는 인식 불량).
  모바일은 스크린샷 OK.
- 에타 격자는 **월~금 5열** 고정(`EVERYTIME_IMAGE_DAYS`). 세로 시간 범위 라디오 2개:
  `에타 캡처 기본(8~18시)` / `직접 시간 범위 선택`(시작·끝 드롭다운).
- `computeOccupancy(imageData, box, ScanOptions)` 가 box를 가로 5등분, 세로는 방 슬롯 단위로
  나눠 방 시간대만 잘라낸다. 방이 12시 시작이면 앞부분 버림. 범위 밖(시각·토·일)은 수동 편집.
- 미리보기에 방 시간대 밴드를 초록으로 강조. 방 범위가 이미지보다 좁으면
  "이 방은 X~Y시만 보므로 초록 부분만 결과에 들어가요" 문구.

### 채도 판별 (v2)
- 에타 파스텔 색: 채도 0.05\~0.11, 빈칸 ≈0. PC 저장 이미지는 압축으로 더 낮음.
- 셀 안쪽 70%를 11×11 샘플 → 위아래 20%(테두리·글자) 버린 **절사 평균 채도**.
- 임계값 `DEFAULT_SATURATION_THRESHOLD = 0.035` (파스텔도 잡히게 낮게).

### 수동 격자 편집기 색
- 빈 시간 = 초록(`#3FA968` 계열), **수업(안 되는 시간) = 빨강(`#FF6B4A` 계열)**.
  결과 히트맵의 초록 스케일과 헷갈리지 않도록 편집기에서만 빨강을 쓴다.

### 채도 판별 (CLAUDE.md 유지)
- RGB→HSV의 saturation만 사용. 셀 안쪽 60%에서 5×5 샘플 평균.
- threshold 기본 0.18, 실측 스크린샷으로 튜닝.

## 4. 결과 화면

- 상단 대부분을 히트맵이 차지. 요일 × 시간 격자.
- 칸 색: "빈 사람 수"가 많을수록 진한 초록(`#3FA968`), 0명이면 중립 회색(`#E4E2DC`).
- 칸 안에 `가능한 사람 수 / 전체` 숫자 항상 표기. **"분모" 같은 용어 안 씀** — hover 툴팁은 "N명 중 X명이 이 시간에 비어요"처럼 자연스러운 문장.
- 전체 = `max(예상 인원, 실제 제출 인원)`.
- hover 시 가능한 사람 이름 목록(상위 8명 + "외 N명", 스크롤).
- 히트맵 아래에 **올린 사람 목록**(닉네임 칩 + 색점)을 항상 노출. 이름을 누르면 그 사람
  시간표만 보이고(1인 뷰), 상단에 ✕ 로 전체 뷰 복귀. `제출 수 / max(예상 인원, 제출 수)` 표기.
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
  - 방 이름 재설정
  - **제출이 하나도 없을 때만**: 토·일 포함 / 30분 단위 / 볼 시간대 변경 가능.
    제출이 생기면 이 항목들은 잠기고(체크박스 disabled + 취소선, 🔒 배지) 서버도 거부.
  - 방 삭제
- 방장도 자기 시간표를 올려야 결과에 반영된다. 단 닉네임은 방 생성 시 넣은 "내 이름(host_name)"을
  그대로 쓰므로 다시 묻지 않는다 (`SubmitFlow presetNickname`).
- **방장 PIN (선택)**: 방 생성 시 4자리 PIN을 걸면, 다른 기기에서 방 링크 열고
  "방장이신가요?" → PIN 입력 → `claim_owner` RPC 가 owner_token 을 내려줘서 관리 권한 획득.
  토큰은 회전하지 않아 원래 만든 기기도 계속 방장. PIN 미설정 시 만든 기기에서만 관리.

## 6. 첫 방문 튜토리얼 (코치마크)

- 중앙 모달이 아니라 **실제 UI 요소를 가리키는 말풍선(coachmark)** 방식.
- 대상 요소에 `data-tour="..."` 표시 → `Coachmark` 컴포넌트가 스포트라이트(주변을 어둡게)
  + 말풍선(제목/설명/이전·다음·건너뛰기)을 그 옆에 띄운다. 스크롤로 요소를 화면 중앙에 맞춤.
- 페이지별 단계:
  - `/` : 결과 표 미리보기 → 방 설정 → 방 만들기 버튼
  - `/room/:id` **방장**(방 생성 직후 또는 owner_token 보유): 링크 공유 → 방장도 올리기 → 히트맵 → 방장 관리
  - `/room/:id` **멤버**(링크로 진입): 내 시간표 올리기 → 결과 → 나중에 수정하기
- 대상 요소가 없는 단계는 자동 건너뜀.

### 체크박스
- 네이티브 체크박스 대신 `ui/checkbox.tsx` — 사각형, 체크 시 `#3FA968` 채움 + 흰 체크,
  포커스 링. TimeRangeForm / OwnerPanel 등 전부 이걸 사용.
- 한 번 완료/건너뛰면 `localStorage: gaptime:seenTutorial` 저장. 우측 상단 "사용법"으로 재실행.

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
  submission_id uuid pk, room_id text, slug text, editor_token text,
  pin_hash text null, pin_salt text null, pin_fails int, pin_lock_until timestamptz null
)
room_secrets(                    -- 클라이언트 접근 불가
  room_id text pk, owner_token text, owner_pin_hash text null, owner_pin_salt text null,
  pin_fails int, pin_lock_until timestamptz null
)
create_throttle(                 -- 방 생성 남용 카운터. 클라이언트 접근 불가
  bucket text pk, count int, window_start timestamptz
)
usage_daily(                    -- 일별 집계만. 하루 몇 행이라 영구 보관. 개인정보 없음
  day date, kind text, count bigint, primary key(day, kind)
)
```

RPC (전부 `security definer`, anon 실행 허용):
`create_room`, `claim_owner`, `room_has_owner_pin`, `submit_occupancy`, `claim_editor`,
`editor_has_pin`, `delete_own_submission`, `verify_owner`, `delete_submission_as_owner`,
`update_room_as_owner`, `delete_room_as_owner`.

RLS: `rooms`/`submissions`는 select만 허용(방은 만료 전). `submission_editors`/`room_secrets`는
정책 없음(RPC 전용). insert/update/delete 권한은 anon에서 revoke.

## 8. 라우팅

| 경로 | 화면 |
|---|---|
| `/` | 방 생성 (빈 격자 + 설정 폼). 헤더 "이미 방이 있나요?" → 방 코드 입력해 `/room/코드`로 이동 |
| `/privacy` | 개인정보처리방침 |
| `/room/:roomId` | 방 페이지: 히트맵 + 내 시간표 올리기 + (방장) 관리 |
| `/room/:roomId?created=1` | 위와 동일 + 생성 직후 공유 카드 강조 |
| `/room/:roomId/:slug?k=token` | 개인 페이지: 내 제출 조회/수정/삭제 |

## 8.5. UI 공용 컴포넌트 / 상호작용 규칙

- **폼 검증 모션**: `ui/shake.tsx`(`useShake`/`<Shake>`) + `ui/validated-input.tsx`.
  부적절한 값(범위 밖 시각, 빈 필수값 등) 입력 시 필드가 흔들리고(`animate-shake`)
  빨간 테두리 + 에러 메시지. 값이 유효해질 때까지 유지. 모든 폼에서 재사용.
- **모달**: `ui/modal.tsx` + `ui/confirm-dialog.tsx`. `window.alert/confirm/prompt` 금지.
  파괴적 작업은 `confirmPhrase`(방 이름 타이핑)로 잠금 해제 — GitHub 저장소 삭제 방식.
- **접기 섹션**: `ui/collapsible.tsx` — 회전하는 화살표(∨) 버튼. "참여 링크·방 코드"와
  "방장 관리" 둘 다 이걸로 통일. `+/−` 텍스트 토글 안 씀. "링크 숨기기" 같은 별도 버튼 없음.
- **체크박스 / 라디오**: `ui/checkbox.tsx`, `ui/radio.tsx` (동일한 시각 언어, free 그린).
- **방장 관리 적용 패턴**: 방 이름/마감/인원은 초안 상태로 두고 "변경사항 적용" 눌러야 반영.
  변경 있는데 미적용이면 빨간 안내, 변경 없으면 버튼 비활성("적용됨").
- **코치마크 클리핑 방지**: 대상 요소를 `scrollIntoView({block:'center'})` 후, 말풍선 실제
  높이를 재서 화면 안(상하 16px 여백)에 들어오도록 위/아래 자동 배치 + 클램프,
  `maxHeight: calc(100vh - 32px)` + 내부 스크롤.

## 9. 용어 정리 (UI 노출 문구)

| 안 씀 | 씀 |
|---|---|
| 분모 / 모수 | "N명 중 X명" |
| 예상 인원 | "함께할 인원 (본인 포함)" — 초과 가능(초과 시 실제 인원 기준) |
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

자동 그리드 검출, 4점 perspective, OCR은 여전히 범위 밖.

## 11. 수익화 (일부 미구현)

- **최하단 광고 배너** (`AdBanner`): `VITE_ADS_ENABLED=1` 일 때만 뜨는 플레이스홀더.
  실제 연결은 Google AdSense(사이트 승인 + 개인정보처리방침 필요 → `/privacy` 마련함)
  또는 쿠팡 파트너스. 방/캘리브레이션 중심부는 안 건드리고 페이지 맨 아래에만.
- **익명 통계** `usage_daily`: 방 생성/제출을 일별로 +1 집계(`_tally`). 원본 로그는 안 남김 → 성장 추이로
  결제 도입 여부 판단 근거.
- **20명 초과 100원 결제**: 미구현. PG 연동 부담 크고 초반 결제 장벽은 확산 방해.
  통계 보고 재검토.
- **푸터**: 저작권(© jiwonsudo), GitHub, 개인정보처리방침 링크. 로고 포함, 톤 유지.

## 12. 공유 미리보기

- **OG 카드**(`public/og.png`, 1200×630): 흰 배경 + `everyFreeTime` 워드마크 + 한 줄 설명.
  전 페이지 공통(SPA라 방별 동적 OG는 SSR 필요 → 안 함). `index.html` 에 og:* / twitter 메타.
  `og:url`/`og:image` 는 `https://everyfreetime.cloud` 절대주소.
- **공유 버튼**(Web Share API): `text` 에 "○○님이 '방이름' 폼을 만들었어요. 에타 시간표
  스크린샷으로 간편하게 일정을 알려주세요." + url. 카톡 등에서 이 문구가 메시지 본문으로 들어감.
- og.png 는 `public/og.svg` 를 sharp 로 래스터화한 것 (빌드타임 산출물, 커밋함).
