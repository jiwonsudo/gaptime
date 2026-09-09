const USES = [
  {
    t: '팀플 시간 잡기',
    d: '조원들 시간표 캡처 받아서 눈으로 대조하지 마세요. 링크만 뿌리면 겹치는 공강이 자동으로 나와요.',
  },
  {
    t: '스터디 · 과외 시간 조율',
    d: '매주 가능한 요일을 정할 때. 30분 단위까지 촘촘하게 볼 수 있어요.',
  },
  {
    t: '동아리 · 학회 회의',
    d: '최대 30명까지. 전원 가능한 시간이 없으면 “27명 가능” 같은 차선책도 바로 보여줘요.',
  },
];

const STEPS = [
  { n: 1, t: '방 만들기', d: '이름과 시간 범위만 정하면 끝. 로그인 없어요.' },
  { n: 2, t: '링크 공유', d: '단톡방에 링크(또는 방 코드) 붙여넣기.' },
  {
    n: 3,
    t: '각자 시간표 올리기',
    d: '에타 시간표 스크린샷을 올리면 브라우저에서 바로 분석. 이미지는 서버로 안 가요.',
  },
];

export const FAQ = [
  {
    q: '에타(에브리타임) 시간표를 어떻게 올리나요?',
    a: '시간표 화면을 캡처하거나 “이미지 저장”으로 받은 파일을 업로드하면 돼요. 격자 모서리 두 점만 맞추면 수업 시간이 자동으로 인식됩니다.',
  },
  {
    q: '시간표 이미지가 서버에 저장되나요?',
    a: '아니요. 이미지 분석은 100% 이용자 브라우저에서 처리하고 바로 폐기합니다. 서버로는 “빈 시간 / 수업” 여부와 닉네임만 전송돼요. 과목명·교수명은 읽지 않습니다.',
  },
  {
    q: 'When2meet이랑 뭐가 다른가요?',
    a: 'When2meet은 가능한 시간을 일일이 칠해야 하지만, everyFreeTime은 에타 시간표 스크린샷 한 장으로 끝나요. 한국어이고 무료입니다.',
  },
  {
    q: '회원가입이 필요한가요?',
    a: '없습니다. 방 링크가 곧 접근 권한이에요. 다른 기기에서 내 시간표를 고치고 싶으면 제출할 때 PIN 4자리를 걸면 됩니다.',
  },
  {
    q: '방은 얼마나 유지되나요?',
    a: '만든 지 7일이 지나면 방과 제출 데이터가 자동으로 삭제됩니다. 방장이 직접 삭제할 수도 있어요.',
  },
];

export default function LandingContent() {
  return (
    <section className="mt-16 flex flex-col gap-14 border-t border-ink/10 pt-12">
      <div>
        <h2 className="text-lg font-extrabold">이럴 때 쓰세요</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {USES.map((u) => (
            <div key={u.t} className="flex flex-col gap-1">
              <div className="text-sm font-bold">{u.t}</div>
              <p className="text-sm leading-relaxed text-ink/60">{u.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-extrabold">3단계면 끝</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">
                {s.n}
              </span>
              <div>
                <span className="text-sm font-bold">{s.t}</span>
                <span className="text-sm text-ink/60"> — {s.d}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="text-lg font-extrabold">자주 묻는 질문</h2>
        <dl className="mt-4 flex flex-col divide-y divide-ink/10">
          {FAQ.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="text-sm font-bold">{f.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink/60">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
