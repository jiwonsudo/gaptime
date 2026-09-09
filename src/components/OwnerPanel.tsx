import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Room, Submission } from '@/types';
import {
  deleteRoomAsOwner,
  deleteSubmissionAsOwner,
  updateRoomAsOwner,
} from '@/lib/supabase';
import { clearOwnerToken } from '@/lib/roomAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface Props {
  room: Room;
  ownerToken: string;
  submissions: Submission[];
  onChanged: () => void;
}

export default function OwnerPanel({ room, ownerToken, submissions, onChanged }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패했어요');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-cta/30 bg-cta/5 p-4">
      <button
        className="flex w-full items-center justify-between text-sm font-extrabold"
        onClick={() => setOpen((v) => !v)}
      >
        방장 관리 {open ? '−' : '+'}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4 text-sm">
          <label className="flex flex-col gap-1 font-semibold">
            방 이름
            <Input
              defaultValue={room.title}
              maxLength={60}
              disabled={busy}
              onBlur={(e) => {
                const t = e.target.value.trim();
                if (t && t !== room.title)
                  run(() => updateRoomAsOwner({ roomId: room.id, ownerToken, title: t }));
              }}
            />
          </label>

          <Checkbox
            label="제출 마감 (더 이상 시간표를 받지 않음)"
            checked={room.locked}
            disabled={busy}
            onChange={(e) =>
              run(() =>
                updateRoomAsOwner({ roomId: room.id, ownerToken, locked: e.target.checked })
              )
            }
          />

          <label className="flex items-center justify-between gap-2">
            예상 인원수
            <input
              type="number"
              min={2}
              max={30}
              defaultValue={room.expected_size}
              disabled={busy}
              className="h-8 w-20 rounded border border-ink/20 px-2"
              onBlur={(e) => {
                const n = Math.max(2, Math.min(30, +e.target.value || room.expected_size));
                if (n !== room.expected_size)
                  run(() => updateRoomAsOwner({ roomId: room.id, ownerToken, expectedSize: n }));
              }}
            />
          </label>

          {submissions.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="font-semibold">제출 목록</span>
              {submissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span>{s.display_name}</span>
                  <button
                    className="text-xs text-cta underline"
                    disabled={busy}
                    onClick={() =>
                      confirm(`${s.display_name} 제출을 삭제할까요?`) &&
                      run(() => deleteSubmissionAsOwner(s.id, ownerToken))
                    }
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (!confirm('방을 삭제하면 모든 제출이 사라져요. 계속할까요?')) return;
              run(async () => {
                await deleteRoomAsOwner(room.id, ownerToken);
                clearOwnerToken(room.id);
                navigate('/');
              });
            }}
          >
            방 삭제
          </Button>

          {err && <p className="text-xs text-cta">{err}</p>}
        </div>
      )}
    </div>
  );
}
