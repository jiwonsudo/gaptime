import * as React from 'react';
import { cn } from '@/lib/utils';
import { Shake, useShake } from './shake';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: React.ReactNode;
  value: string;
  // 에러 메시지를 반환하면 부적절한 값, null 이면 통과
  validate: (raw: string) => string | null;
  // 통과한 값만 위로 전달
  onCommit: (raw: string) => void;
  // 부적절한 값도 표시할지 (기본 true — 흔들고 빨간 테두리)
}

export function ValidatedInput({
  label,
  value,
  validate,
  onCommit,
  className,
  id,
  ...rest
}: Props) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const { shakeKey, shake } = useShake();

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  function handle(raw: string) {
    setDraft(raw);
    const err = validate(raw);
    if (err) {
      setError(err);
      shake();
    } else {
      setError(null);
      onCommit(raw);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label != null && (
        <label htmlFor={inputId} className="text-sm font-semibold">
          {label}
        </label>
      )}
      <Shake shakeKey={shakeKey}>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => {
            if (validate(draft)) {
              setDraft(value);
              setError(null);
            }
          }}
          className={cn(
            'h-10 w-full rounded-md border bg-white/60 px-3 text-sm outline-none transition-colors',
            error
              ? 'border-cta ring-2 ring-cta/30'
              : 'border-ink/20 focus:border-ink/50',
            className
          )}
          {...rest}
        />
      </Shake>
      {error && <p className="text-xs text-cta">{error}</p>}
    </div>
  );
}
