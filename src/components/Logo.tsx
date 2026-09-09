import { Link } from 'react-router-dom';

interface Props {
  className?: string;
}

// everyFreeTime™ — 프리텐다드, 전체 일반체 / "Free"만 볼드
export default function Logo({ className = 'text-2xl' }: Props) {
  return (
    <Link
      to="/"
      className={`font-normal tracking-tight text-ink ${className}`}
      aria-label="everyFreeTime 홈으로"
    >
      every<span className="font-bold">Free</span>Time™
    </Link>
  );
}
