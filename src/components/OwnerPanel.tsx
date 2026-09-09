import { useEffect, useState } from 'react';
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
import { Collapsible } from './ui/collapsible';
import { ConfirmDialog } from './ui/confirm-dialog';

interface Props {
  room: Room;
  ownerToken: string;
  submissions: Submission[];
  onChanged: () => void;
}

export default function OwnerPanel({ room, ownerToken, submissions, onChanged }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 초안 상태 — "적용" 눌러야 반영
  const [title, setTitle] = useState(room.title);
  const [locked, setLocked] = useState(room.locked);
  const [size, setSize] = useState(room.expected_size);

  useEffect(() => {
    setTitle(room.title);
    setLocked(room.locked);
    setSize(room.expected_size);
  }, [room.title, room.locked, room.expected_size]);

  const dirty =
    title.trim() !== room.title || locked !== room.locked || size !== room.expected_size;
  const titleEmpty = title.trim() === '';

  const [delSub, setDelSub] = useState<Submission | null>(null);
  const [delRoom, setDelRoom] = useState(false);

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

  function apply() {
    if (titleEmpty) {
      setErr('방 이름은 비울 수 없어요');
      return;
    }
    run(() =>
      updateRoomAsOwner({
        roomId: room.id,
        ownerToken,
        title: title.trim(),
        locked,
        expectedSize: size,
      })
    );
  }

  return (
    <Collapsible title="방장 관리" tone="owner">
      <div className="flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1 font-semibold">
          방 이름
          <Input
            value={title}
            maxLength={60}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            className={titleEmpty ? 'border-cta ring-2 ring-cta/30' : undefined}
          />
        </label>

        <Checkbox
          label="제출 마감 (더 이상 시간표를 받지 않음)"
          checked={locked}
          disabled={busy}
          onChange={(e) => setLocked(e.target.checked)}
        />

        <label className="flex items-center justify-between gap-2 font-semibold">
          함께할 인원
          <input
            type="number"
            min={2}
            max={30}
            value={size}
            disabled={busy}
            className="h-8 w-20 rounded border border-ink/20 px-2"
            onChange={(e) => setSize(Math.max(2, Math.min(30, +e.target.value || room.expected_size)))}
          />
        </label>

        <Button
          size="sm"
          variant={dirty ? 'cta' : 'outline'}
          disabled={busy || !dirty || titleEmpty}
          onClick={apply}
        >
          {dirty ? '변경사항 적용' : '적용됨'}
        </Button>
        {dirty && (
          <p className="text-xs text-cta">아직 적용 안 됨 — “변경사항 적용”을 눌러주세요</p>
        )}

        {submissions.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-ink/10 pt-3">
            <span className="font-semibold">제출 목록</span>
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span>{s.display_name}</span>
                <button
                  className="text-xs text-cta underline"
                  disabled={busy}
                  onClick={() => setDelSub(s)}
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
          onClick={() => setDelRoom(true)}
          className="border-cta/40 text-cta"
        >
          방 삭제
        </Button>

        {err && <p className="text-xs text-cta">{err}</p>}
      </div>

      <ConfirmDialog
        open={!!delSub}
        title="제출 삭제"
        body={
          <>
            <b>{delSub?.display_name}</b> 님이 올린 시간표를 삭제할까요? 되돌릴 수 없어요.
          </>
        }
        confirmLabel="삭제"
        danger
        onCancel={() => setDelSub(null)}
        onConfirm={() => {
          const s = delSub;
          setDelSub(null);
          if (s) run(() => deleteSubmissionAsOwner(s.id, ownerToken));
        }}
      />

      <ConfirmDialog
        open={delRoom}
        title="방 삭제"
        body={
          <>
            방과 모든 제출이 <b>영구히</b> 삭제돼요. 되돌릴 수 없어요.
          </>
        }
        confirmLabel="이 방 삭제"
        danger
        confirmPhrase={room.title}
        onCancel={() => setDelRoom(false)}
        onConfirm={() => {
          setDelRoom(false);
          run(async () => {
            await deleteRoomAsOwner(room.id, ownerToken);
            clearOwnerToken(room.id);
            navigate('/');
          });
        }}
      />
    </Collapsible>
  );
}
