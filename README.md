# gaptime (에브리프리타임)

여러 명이 각자 자기 기기에서 에타 시간표 스크린샷을 올리면, 방(room) 링크 하나로
실시간 취합되어 가능 인원 수 히트맵을 보여주는 웹 서비스. 자세한 배경은 [CLAUDE.md](./CLAUDE.md).

## 개발

```bash
pnpm install
cp .env.example .env   # Supabase URL / anon key 입력
pnpm dev
```

## Supabase 준비

`supabase/schema.sql`을 Supabase SQL Editor에서 실행하면 `rooms` / `submissions`
테이블과 RLS 정책, Realtime publication이 생성됩니다.

## 배포

- Vercel 정적 호스팅 (`vercel.json`에 SPA rewrite 포함)
- 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정

## 프라이버시

원본 스크린샷은 브라우저를 벗어나지 않습니다. 캘리브레이션과 채도 분석은 100%
클라이언트에서 처리하고, 서버로는 occupancy 배열(요일×시간 boolean)과 이름만 전송됩니다.

## 구조

- `src/lib/colorAnalysis.ts` — RGB→HSV, saturation 판별
- `src/lib/gridSampler.ts` — bounding box → 셀 분할 → occupancy 배열
- `src/lib/overlap.ts` — 여러 occupancy를 셀별 가능 인원 수로 결합
- `src/lib/supabase.ts` — 방/제출 CRUD + Realtime 구독
- `src/components/GridCalibrator.tsx` — 2점 드래그 캘리브레이션
- `src/components/ResultGrid.tsx` — When2meet 스타일 히트맵 + hover + export
