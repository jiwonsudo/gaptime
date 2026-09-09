import * as React from 'react';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
  hint?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  name?: string;
  className?: string;
}

// 전체 톤에 맞춘 라디오 그룹 (체크박스와 동일한 시각 언어)
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  name,
  className,
}: Props<T>) {
  const auto = React.useId();
  const groupName = name ?? auto;
  return (
    <div className={cn('flex flex-col gap-1.5', className)} role="radiogroup">
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
              checked ? 'border-free bg-free/10' : 'border-ink/15 hover:bg-ink/5'
            )}
          >
            <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0">
              <input
                type="radio"
                name={groupName}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none"
              />
              <span className="pointer-events-none absolute inset-0 rounded-full border border-ink/30 bg-white/60 transition-colors peer-checked:border-free peer-focus-visible:ring-2 peer-focus-visible:ring-free/40" />
              <span className="pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-free opacity-0 transition-opacity peer-checked:opacity-100" />
            </span>
            <span className="flex flex-col">
              <span className="font-medium">{o.label}</span>
              {o.hint && <span className="text-xs text-ink/50">{o.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
