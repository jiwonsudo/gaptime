import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export interface TourStep {
  selector: string; // 가리킬 요소 (없으면 이 단계는 건너뜀)
  title: string;
  body: string;
}

interface Props {
  steps: TourStep[];
  run: boolean;
  onClose: () => void;
}

interface Placed {
  rect: DOMRect;
  bubbleTop: number;
  bubbleLeft: number;
  arrow: 'up' | 'down';
}

const PAD = 8;
const BUBBLE_W = 300;

export default function Coachmark({ steps, run, onClose }: Props) {
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<Placed | null>(null);

  // run 이 켜질 때 처음부터
  useEffect(() => {
    if (run) setI(0);
  }, [run]);

  // 현재 단계의 유효한 요소를 찾을 때까지 전진
  const resolveIndex = useCallback(
    (from: number, dir: 1 | -1): number => {
      let n = from;
      while (n >= 0 && n < steps.length) {
        if (document.querySelector(steps[n].selector)) return n;
        n += dir;
      }
      return -1;
    },
    [steps]
  );

  const measure = useCallback(() => {
    if (!run) return;
    const step = steps[i];
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      const next = resolveIndex(i, 1);
      if (next === -1) onClose();
      else setI(next);
      return;
    }
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const arrow: 'up' | 'down' = spaceBelow > 180 ? 'up' : 'down';
    const bubbleTop = arrow === 'up' ? rect.bottom + PAD + 10 : rect.top - PAD - 10;
    let bubbleLeft = rect.left + rect.width / 2 - BUBBLE_W / 2;
    bubbleLeft = Math.max(12, Math.min(bubbleLeft, window.innerWidth - BUBBLE_W - 12));
    setPlaced({ rect, bubbleTop, bubbleLeft, arrow });
  }, [run, steps, i, resolveIndex, onClose]);

  useLayoutEffect(() => {
    if (!run) return;
    const el = document.querySelector(steps[i]?.selector ?? '') as HTMLElement | null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(measure, 260);
    return () => clearTimeout(t);
  }, [run, i, steps, measure]);

  useEffect(() => {
    if (!run) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [run, measure]);

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, onClose]);

  if (!run || !placed) return null;

  const step = steps[i];
  const total = steps.filter((s) => document.querySelector(s.selector)).length;
  const shownIndex =
    steps.slice(0, i + 1).filter((s) => document.querySelector(s.selector)).length;
  const isLast = resolveIndex(i + 1, 1) === -1;
  const { rect } = placed;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      {/* 스포트라이트 */}
      <div
        className="pointer-events-none absolute rounded-lg transition-all duration-200"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: '0 0 0 9999px rgba(28,35,29,0.55)',
        }}
      />
      {/* 말풍선 */}
      <div
        className="absolute rounded-xl border border-ink/10 bg-paper p-4 shadow-2xl"
        style={{
          width: BUBBLE_W,
          left: placed.bubbleLeft,
          top: placed.bubbleTop,
          transform: placed.arrow === 'down' ? 'translateY(-100%)' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="tnum text-xs font-bold text-ink/40">
            {shownIndex} / {total}
          </span>
          <button className="text-xs text-ink/40 underline" onClick={onClose}>
            건너뛰기
          </button>
        </div>
        <h3 className="mt-2 text-sm font-extrabold">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink/70">{step.body}</p>
        <div className="mt-3 flex justify-between">
          <button
            className="text-sm text-ink/50 disabled:opacity-30"
            disabled={resolveIndex(i - 1, -1) === -1}
            onClick={() => {
              const p = resolveIndex(i - 1, -1);
              if (p !== -1) setI(p);
            }}
          >
            이전
          </button>
          <button
            className="rounded-md bg-cta px-3 py-1 text-sm font-semibold text-white"
            onClick={() => {
              if (isLast) onClose();
              else setI(resolveIndex(i + 1, 1));
            }}
          >
            {isLast ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
