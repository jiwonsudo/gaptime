import { useEffect, useState } from 'react';
import { claimOwner, roomHasOwnerPin } from '@/lib/supabase';
import { setOwnerToken } from '@/lib/roomAuth';
import { isValidPin } from '@/lib/nickname';
import { errMessage } from '@/lib/errors';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Props {
  roomId: string;
  onClaimed: (token: string) => void;
}

// 방장이 다른 기기에서 PIN으로 관리 권한 되찾기
export default function OwnerClaim({ roomId, onClaimed }: Props) {
  const [open, setOpen] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && hasPin === null) roomHasOwnerPin(roomId).then(setHasPin).catch(() => setHasPin(false));
  }, [open, hasPin, roomId]);

  async function go() {
    setErr(null);
    try {
      const token = await claimOwner(roomId, pin);
      setOwnerToken(roomId, token);
      onClaimed(token);
    } catch (e) {
      setErr(errMessage(e, 'PIN 확인에 실패했어요'));
    }
  }

  if (!open) {
    return (
      <button className="text-xs text-ink/40 underline" onClick={() => setOpen(true)}>
        방장이신가요?
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-white/50 p-3">
      <span className="text-sm font-semibold">방장 PIN으로 관리 권한 받기</span>
      {hasPin === false ? (
        <p className="text-xs text-cta">이 방은 방장 PIN을 설정하지 않았어요. 처음 만든 기기에서만 관리할 수 있어요.</p>
      ) : (
        <>
          <Input
            inputMode="numeric"
          autoComplete="off"
            maxLength={4}
            placeholder="PIN 4자리"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button variant="cta" size="sm" disabled={!isValidPin(pin)} onClick={go}>
              확인
            </Button>
          </div>
        </>
      )}
      {err && <p className="text-xs text-cta">{err}</p>}
    </div>
  );
}
