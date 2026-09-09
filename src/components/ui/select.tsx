import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-10 w-full appearance-none rounded-md border border-ink/20 bg-white/60 pl-3 pr-8 text-sm outline-none focus:border-ink/50',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      viewBox="0 0 16 16"
      className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  </div>
));
Select.displayName = 'Select';
