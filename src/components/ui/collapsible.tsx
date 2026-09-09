import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'owner';
}

// 접기/펼치기 섹션. 화살표로 버튼임을 분명히 한다.
export function Collapsible({
  title,
  defaultOpen = false,
  children,
  className,
  tone = 'default',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        'rounded-lg border',
        tone === 'owner' ? 'border-cta/30 bg-cta/5' : 'border-ink/10 bg-white/50',
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-extrabold"
      >
        {title}
        <svg
          viewBox="0 0 16 16"
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && <div className="border-t border-ink/10 px-4 py-3">{children}</div>}
    </div>
  );
}
