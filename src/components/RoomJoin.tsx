import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Room, Submission } from '@/types';
import { getRoom, getSubmissions, subscribeRoom, verifyOwner } from '@/lib/supabase';
import { getOwnerToken } from '@/lib/roomAuth';
import ResultGrid from './ResultGrid';
import ShareCard from './ShareCard';
import SubmitFlow from './SubmitFlow';
import OwnerPanel from './OwnerPanel';
import Coachmark, { type TourStep } from './Coachmark';

interface Props {
  tour: boolean;
  onOpenTour: () => void;
  onCloseTour: () => void;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="share"]',
    title: '이 링크를 공유하세요',
    body: '“참여 링크”를 누르면 링크와 QR이 나와요. 단톡방에 뿌리면 받은 사람은 바로 자기 시간표를 올립니다.',
  },
  {
    selector: '[data-tour="heatmap"]',
    title: '결과는 실시간 히트맵',
    body: '진한 초록일수록 많은 사람이 비는 시간. 칸에 마우스를 올리면 누가 가능한지 이름이 나와요.',
  },
  {
    selector: '[data-tour="submit"]',
    title: '여기서 내 시간표를 올려요',
    body: '이름을 넣고 에타 스크린샷을 올린 뒤, 격자를 맞추고 틀린 칸을 손으로 고쳐 제출하면 끝. 다른 기기에서 고치려면 이름과 PIN을 쓰세요.',
  },
  {
    selector: '[data-tour="owner"]',
    title: '방장 전용',
    body: '이 방을 만든 브라우저에만 보여요. 제출을 마감하거나, 장난친 제출을 지우거나, 방을 삭제할 수 있어요.',
  },
];

export default function RoomJoin({ tour, onOpenTour, onCloseTour }: Props) {
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
          <button data-tour="share" className="underline" onClick={() => setShowShare((v) => !v)}>
            {showShare ? '링크 숨기기' : '참여 링크'}
          </button>
          <button className="underline" onClick={onOpenTour}>
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
        <div data-tour="heatmap">
          <ResultGrid
            dayCount={room.day_count}
            startHour={room.start_hour}
            endHour={room.end_hour}
            expectedSize={room.expected_size}
            submissions={submissions}
          />
        </div>

        <div className="flex flex-col gap-5">
          {showShare && (
            <ShareCard
              url={shareUrl}
              hint="링크를 받은 사람은 바로 자기 시간표를 올릴 수 있어요."
            />
          )}
          {ownerToken && (
            <div data-tour="owner">
              <OwnerPanel
                room={room}
                ownerToken={ownerToken}
                submissions={submissions}
                onChanged={refresh}
              />
            </div>
          )}
          <div data-tour="submit">
            <SubmitFlow
              room={room}
              submissions={submissions}
              editTarget={editTarget}
              onChanged={refresh}
            />
          </div>
        </div>
      </div>

      <Coachmark steps={STEPS} run={tour} onClose={onCloseTour} />
    </div>
  );
}
