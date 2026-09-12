import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface TourStep {
  selector: string; // 가리킬 요소 (없으면 이 단계는 건너뜀)
  title: string;
  body: string;
  autoExpand?: boolean; // 대상이 접힌 Collapsible 이면 자동으로 펼치고 보여줌
}

interface Props {
  steps: TourStep[];
  run: boolean;
  onClose: () => void;
}

const PAD = 8;
const MARGIN = 16; // 화면 가장자리 최소 여백
const GAP = 12; // 대상과 말풍선 사이 간격
const BUBBLE_W = 300;

export default function Coachmark({ steps, run, onClose }: Props) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (run) setI(0);
  }, [run]);

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
    setRect(el.getBoundingClientRect());
  }, [run, steps, i, resolveIndex, onClose]);

  // 대상이 접힌 Collapsible 이면 펼친 뒤(내용이 보이게) 스크롤·측정
  useLayoutEffect(() => {
    if (!run) return;
    const step = steps[i];
    const el = document.querySelector(step?.selector ?? '') as HTMLElement | null;
    let expandDelay = 0;
    if (step?.autoExpand && el) {
      const toggle = (
        el.matches('[aria-expanded]') ? el : el.querySelector('[aria-expanded]')
      ) as HTMLElement | null;
      if (toggle?.getAttribute('aria-expanded') === 'false') {
        toggle.click();
        expandDelay = 150;
      }
    }
    const t1 = setTimeout(() => {
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, expandDelay);
    const t2 = setTimeout(measure, expandDelay + 280);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, onClose]);

  // 말풍선 실제 높이를 재서 화면 안에 들어오도록 배치 (위/아래 자동, 클램프)
  useLayoutEffect(() => {
    if (!rect || !bubbleRef.current) return;
    const bh = bubbleRef.current.offsetHeight;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;

    let top: number;
    if (spaceBelow >= bh) top = rect.bottom + GAP;
    else if (spaceAbove >= bh) top = rect.top - GAP - bh;
    else top = Math.max(MARGIN, Math.min(rect.bottom + GAP, vh - bh - MARGIN));

    top = Math.max(MARGIN, Math.min(top, vh - bh - MARGIN));

    let left = rect.left + rect.width / 2 - BUBBLE_W / 2;
    left = Math.max(MARGIN, Math.min(left, vw - BUBBLE_W - MARGIN));

    setPos({ top, left });
  }, [rect, i]);

  if (!run || !rect) return null;

  const step = steps[i];
  const total = steps.filter((s) => document.querySelector(s.selector)).length;
  const shownIndex = steps.slice(0, i + 1).filter((s) => document.querySelector(s.selector)).length;
  const isLast = resolveIndex(i + 1, 1) === -1;
  const hasPrev = resolveIndex(i - 1, -1) !== -1;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
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
      <div
        ref={bubbleRef}
        className="absolute flex flex-col overflow-y-auto rounded-xl border border-ink/10 bg-paper p-4 shadow-2xl"
        style={{
          width: BUBBLE_W,
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          maxHeight: `calc(100vh - ${MARGIN * 2}px)`,
          visibility: pos ? 'visible' : 'hidden',
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
            disabled={!hasPrev}
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
