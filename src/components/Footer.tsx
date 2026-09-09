import { Link } from 'react-router-dom';

const GITHUB = 'https://github.com/jiwonsudo';
const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ink/10">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-5 py-8 text-xs text-ink/45">
        <div className="font-normal tracking-tight text-ink/70">
          every<span className="font-bold">Free</span>Time
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>© {YEAR} jiwonsudo</span>
          <a href={GITHUB} target="_blank" rel="noreferrer" className="underline hover:text-ink/70">
            GitHub
          </a>
          <Link to="/privacy" className="underline hover:text-ink/70">
            개인정보처리방침
          </Link>
        </div>
        <p className="text-ink/35">
          시간표 이미지는 서버로 전송되지 않습니다. 빈 시간 정보와 닉네임만 저장돼요.
        </p>
      </div>
    </footer>
  );
}
