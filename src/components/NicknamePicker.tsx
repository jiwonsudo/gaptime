import { useMemo, useState } from 'react';
import { checkNickname, isValidPin } from '@/lib/nickname';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface Props {
  takenSlugs: string[];
  onConfirm: (v: { displayName: string; slug: string; setPin: string | null }) => void;
  onCancel?: () => void;
}

export default function NicknamePicker({ takenSlugs, onConfirm, onCancel }: Props) {
  const [raw, setRaw] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);

  const check = useMemo(() => checkNickname(raw), [raw]);
  const taken = check.ok && takenSlugs.includes(check.slug);
  const pinOk = !usePin || isValidPin(pin);
  const ready = check.ok && !taken && pinOk;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        이름 (닉네임)
        <Input
          autoFocus
          placeholder="한글 또는 영문, 2~20자"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </label>
      {raw.length > 0 && !check.ok && <p className="text-xs text-cta">{check.error}</p>}
      {taken && <p className="text-xs text-cta">이 방에서 이미 사용중인 이름이에요</p>}
      {check.ok && !taken && (
        <p className="text-xs text-ink/50">링크에는 “{check.slug}” (으)로 들어가요</p>
      )}
      <p className="text-xs text-ink/40">이 이름은 방에 참여한 사람들 모두에게 보여요. 조심해서 작성해주세요.</p>

      <Checkbox
        label="PIN 4자리 설정 (다른 기기에서 수정할 때 사용)"
        checked={usePin}
        onChange={(e) => setUsePin(e.target.checked)}
      />
      {usePin && (
        <Input
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="숫자 4자리"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button
          variant="cta"
          size="sm"
          disabled={!ready}
          onClick={() =>
            onConfirm({
              displayName: check.displayName,
              slug: check.slug,
              setPin: usePin ? pin : null,
            })
          }
        >
          다음
        </Button>
      </div>
    </div>
  );
}
