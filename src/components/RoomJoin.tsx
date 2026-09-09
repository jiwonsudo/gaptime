import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { BoundingBox, Room, Submission } from '@/types';
import {
  getRoom,
  getSubmissions,
  submitOccupancy,
  subscribeSubmissions,
} from '@/lib/supabase';
import { imageToImageData } from '@/lib/imageData';
import { computeOccupancy } from '@/lib/gridSampler';
import ResultGrid from './ResultGrid';
import ImageUploader from './ImageUploader';
import GridCalibrator from './GridCalibrator';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Step = 'name' | 'upload' | 'calibrate' | 'done';

export default function RoomJoin() {
  const { roomId = '' } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!roomId) return;
    getSubmissions(roomId).then(setSubmissions).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    getRoom(roomId)
      .then((r) => {
        if (!r) setLoadErr('존재하지 않는 방이에요.');
        else setRoom(r);
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : '방을 불러오지 못했어요.'));
    refresh();
    const unsub = subscribeSubmissions(roomId, refresh);
    return unsub;
  }, [roomId, refresh]);

  async function handleConfirm(box: BoundingBox) {
    if (!room || !image) return;
    setSubmitErr(null);
    try {
      const data = imageToImageData(image);
      const occupancy = computeOccupancy(
        data,
        box,
        room.day_count,
        room.start_hour,
        room.end_hour
      );
      await submitOccupancy({ roomId: room.id, name: name.trim(), occupancy });
      setImage(null);
      setStep('done');
      refresh();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : '제출에 실패했어요.');
    }
  }

  if (loadErr) {
    return <div className="mx-auto max-w-2xl px-5 py-16 text-sm text-cta">{loadErr}</div>;
  }
  if (!room) {
    return <div className="mx-auto max-w-2xl px-5 py-16 text-sm text-ink/50">불러오는 중…</div>;
  }

  const shareUrl = `${window.location.origin}/r/${room.id}`;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="mb-1 text-2xl font-extrabold">에브리프리타임</h1>
      <button
        className="mb-8 text-xs text-ink/50 underline"
        onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
      >
        방 링크 복사: {shareUrl}
      </button>

      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <ResultGrid
          dayCount={room.day_count}
          startHour={room.start_hour}
          endHour={room.end_hour}
          expectedSize={room.expected_size}
          submissions={submissions}
        />

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold">내 시간표 올리기</h2>

          {step === 'name' && (
            <>
              <Input
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                variant="cta"
                disabled={!name.trim()}
                onClick={() => setStep('upload')}
              >
                다음
              </Button>
            </>
          )}

          {step === 'upload' && (
            <>
              <ImageUploader
                onImage={(img) => {
                  setImage(img);
                  setStep('calibrate');
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => setStep('name')}>
                이름 다시 입력
              </Button>
            </>
          )}

          {step === 'calibrate' && image && (
            <GridCalibrator
              image={image}
              dayCount={room.day_count}
              startHour={room.start_hour}
              endHour={room.end_hour}
              onConfirm={handleConfirm}
              onBack={() => {
                setImage(null);
                setStep('upload');
              }}
            />
          )}

          {step === 'done' && (
            <>
              <p className="text-sm text-free">제출 완료. 히트맵이 갱신됐어요.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setName('');
                  setStep('name');
                }}
              >
                다른 사람 이어서 올리기
              </Button>
            </>
          )}

          {submitErr && <p className="text-xs text-cta">{submitErr}</p>}
        </div>
      </div>
    </div>
  );
}
