import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-ink/20 bg-white/60 px-3 text-sm outline-none focus:border-ink/50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
