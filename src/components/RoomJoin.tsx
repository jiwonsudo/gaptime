import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Room, Submission } from '@/types';
import { getRoom, getSubmissions, subscribeRoom, verifyOwner } from '@/lib/supabase';
import { getOwnerToken } from '@/lib/roomAuth';
import ResultGrid from './ResultGrid';
import ShareCard from './ShareCard';
import SubmitFlow from './SubmitFlow';
import OwnerPanel from './OwnerPanel';

interface Props {
  onOpenTutorial: () => void;
}

export default function RoomJoin({ onOpenTutorial }: Props) {
  const { roomId = '', slug } = useParams();
  const [params] = useSearchParams();
  const justCreated = params.get('created') === '1';
  const editToken = params.get('k');

  const [room, setRoom] = useState<Room | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [ownerToken, setOwnerTokenState] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(justCreated);

  const refresh = useCallback(() => {
    if (!roomId) return;
    getSubmissions(roomId).then(setSubmissions).catch(() => {});
    getRoom(roomId).then((r) => r && setRoom(r)).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    let alive = true;
    getRoom(roomId)
      .then(async (r) => {
        if (!alive) return;
        if (!r) {
          setLoadErr('없는 방이거나 만료된 방이에요.');
          return;
        }
        setRoom(r);
        const stored = getOwnerToken(roomId);
        if (stored && (await verifyOwner(roomId, stored))) {
          setOwnerTokenState(stored);
        }
      })
      .catch((e) => alive && setLoadErr(e instanceof Error ? e.message : '방을 못 불러왔어요.'));
    refresh();
    const unsub = subscribeRoom(roomId, refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, [roomId, refresh]);

  const editTarget = useMemo(
    () => (slug ? { slug, token: editToken } : null),
    [slug, editToken]
  );

  const shareUrl = `${window.location.origin}/r/${roomId}`;

  if (loadErr) {
    return <div className="mx-auto max-w-2xl px-5 py-16 text-sm text-cta">{loadErr}</div>;
  }
  if (!room) {
    return <div className="mx-auto max-w-2xl px-5 py-16 text-sm text-ink/50">불러오는 중</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-extrabold">{room.title || '이름 없는 방'}</h1>
        <div className="flex shrink-0 gap-3 text-xs text-ink/50">
          <button className="underline" onClick={() => setShowShare((v) => !v)}>
            {showShare ? '링크 숨기기' : '참여 링크'}
          </button>
          <button className="underline" onClick={onOpenTutorial}>
            사용법
          </button>
        </div>
      </div>
      <p className="mb-6 text-xs text-ink/40">에브리프리타임 · 방 {roomId}</p>

      {justCreated && (
        <p className="mb-4 rounded-md bg-free/10 px-3 py-2 text-sm text-ink/70">
          방이 만들어졌어요. 아래 링크나 QR을 단톡방에 공유하세요. 이 브라우저가 방장으로
          기억됩니다.
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <ResultGrid
          dayCount={room.day_count}
          startHour={room.start_hour}
          endHour={room.end_hour}
          expectedSize={room.expected_size}
          submissions={submissions}
        />

        <div className="flex flex-col gap-5">
          {showShare && (
            <ShareCard
              url={shareUrl}
              hint="링크를 받은 사람은 바로 자기 시간표를 올릴 수 있어요."
            />
          )}
          {ownerToken && (
            <OwnerPanel
              room={room}
              ownerToken={ownerToken}
              submissions={submissions}
              onChanged={refresh}
            />
          )}
          <SubmitFlow
            room={room}
            submissions={submissions}
            editTarget={editTarget}
            onChanged={refresh}
          />
        </div>
      </div>
    </div>
  );
}
