import * as React from 'react';
import { cn } from '@/lib/utils';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

// 전체 톤에 맞춘 체크박스: 사각형, 체크 시 free 그린 채움
export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ label, className, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 text-sm">
        <span className="relative inline-flex h-4 w-4 shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn('peer absolute inset-0 h-full w-full cursor-pointer appearance-none', className)}
            {...props}
          />
          <span className="pointer-events-none absolute inset-0 rounded-[4px] border border-ink/30 bg-white/60 transition-colors peer-checked:border-free peer-checked:bg-free peer-focus-visible:ring-2 peer-focus-visible:ring-free/40" />
          <svg
            viewBox="0 0 12 12"
            className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
          </svg>
        </span>
        {label != null && <span>{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
