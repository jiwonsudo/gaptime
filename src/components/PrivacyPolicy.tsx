import Logo from './Logo';
import Footer from './Footer';

export default function PrivacyPolicy() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Logo className="text-base" />
        <h1 className="mb-6 mt-4 text-xl font-extrabold">개인정보처리방침</h1>

        <div className="flex flex-col gap-5 text-sm leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-1 font-bold text-ink">1. 수집하는 정보</h2>
            <p>
              everyFreeTime은 회원가입이 없습니다. 다음만 저장합니다.
            </p>
            <ul className="mt-1 list-disc pl-5">
              <li>방 설정값 (이름, 요일 수, 시간 범위, 인원 수)</li>
              <li>참가자가 직접 입력한 닉네임</li>
              <li>시간표에서 계산된 “빈 시간 / 수업” 여부 배열 (요일 × 시간)</li>
              <li>익명 사용 통계 (방 생성 수, 제출 수 등 — 개인 식별 정보 없음)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-bold text-ink">2. 수집하지 않는 것</h2>
            <p>
              에타(에브리타임) 시간표 스크린샷 원본은 <b>서버로 전송되지 않습니다</b>. 이미지 분석은
              100% 이용자 브라우저에서 처리되고, 처리 후 즉시 폐기됩니다. 과목명·교수명 등 시간표
              내용은 읽지 않습니다. 이름(실명), 이메일, 전화번호, 학번은 수집하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-bold text-ink">3. 이용 목적</h2>
            <p>방에 모인 사람들의 공통 가능 시간을 계산해 함께 보여주기 위해서만 사용합니다.</p>
          </section>

          <section>
            <h2 className="mb-1 font-bold text-ink">4. 보관 기간</h2>
            <p>
              방과 그 안의 모든 제출 데이터는 방 생성 후 <b>14일이 지나면 자동 삭제</b>됩니다. 방장이
              방을 직접 삭제하면 즉시 삭제됩니다. 익명 사용 통계는 개인을 식별할 수 없는 형태로
              보관됩니다.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-bold text-ink">5. 제3자 제공 및 처리 위탁</h2>
            <p>
              데이터는 데이터베이스 호스팅(Supabase) 및 정적 호스팅(Vercel) 서비스에 저장·전송됩니다.
              광고가 게재되는 경우 광고 제공사(예: Google AdSense)가 쿠키를 통해 비개인화/개인화
              광고를 제공할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-bold text-ink">6. 이용자 권리</h2>
            <p>
              참가자는 자신의 제출을 언제든지 수정·삭제할 수 있습니다(닉네임 + PIN 또는 개인 링크).
              방장은 방과 제출을 삭제할 수 있습니다. 문의는 아래 GitHub을 통해 받습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-bold text-ink">7. 문의</h2>
            <p>
              <a
                href="https://github.com/jiwonsudo/gaptime"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                github.com/jiwonsudo/gaptime
              </a>
            </p>
          </section>

          <p className="text-xs text-ink/40">최종 수정일: 2026-09-09</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
