import { useEffect, useMemo, useState } from 'react';
import type { Occupancy, Room, Submission } from '@/types';
import { imageToImageData } from '@/lib/imageData';
import { computeOccupancy } from '@/lib/gridSampler';
import { emptyOccupancy, resizeOccupancy, roomSlotCount } from '@/lib/occupancy';
import { errMessage } from '@/lib/errors';
import {
  claimEditor,
  deleteOwnSubmission,
  editorHasPin,
  submitOccupancy,
} from '@/lib/supabase';
import {
  getLocalEditor,
  setLocalEditor,
  clearLocalEditor,
} from '@/lib/roomAuth';
import { checkNickname, isValidPin } from '@/lib/nickname';
import ImageUploader from './ImageUploader';
import GridCalibrator from './GridCalibrator';
import OccupancyEditor from './OccupancyEditor';
import NicknamePicker from './NicknamePicker';
import ShareCard from './ShareCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ConfirmDialog } from './ui/confirm-dialog';

interface Props {
  room: Room;
  submissions: Submission[];
  editTarget?: { slug: string; token: string | null } | null;
  presetNickname?: string | null; // 방장: 이름을 다시 묻지 않음
  onChanged: () => void;
}

type Stage = 'menu' | 'nickname' | 'source' | 'upload' | 'calibrate' | 'edit' | 'reclaim' | 'done';

export default function SubmitFlow({
  room,
  submissions,
  editTarget,
  presetNickname,
  onChanged,
}: Props) {
  const slotCount = roomSlotCount(room);
  const takenSlugs = useMemo(() => submissions.map((s) => s.slug), [submissions]);

  const [stage, setStage] = useState<Stage>('menu');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [setPin, setSetPin] = useState<string | null>(null);
  const [editorToken, setEditorToken] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [occ, setOcc] = useState<Occupancy>(() => emptyOccupancy(room.day_count, slotCount));
  const [err, setErr] = useState<string | null>(null);
  const [personalUrl, setPersonalUrl] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  // 같은 기기에 저장된 내 제출 → 바로 수정 진입
  const local = useMemo(() => getLocalEditor(room.id), [room.id]);

  useEffect(() => {
    const target = editTarget ?? (local ? { slug: local.slug, token: local.token } : null);
    if (!target) return;
    const sub = submissions.find((s) => s.slug === target.slug);
    if (!sub) return;
    setDisplayName(sub.display_name);
    setSlug(sub.slug);
    setOcc(resizeOccupancy(sub.occupancy, room.day_count, slotCount));
    if (target.token) {
      setEditorToken(target.token);
      setStage('edit');
    } else {
      setStage('reclaim');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTarget, submissions.length]);

  function reset() {
    setStage('menu');
    setImage(null);
    setErr(null);
    setEditorToken(null);
    setSetPin(null);
    setDisplayName('');
    setSlug('');
    setOcc(emptyOccupancy(room.day_count, slotCount));
  }

  // "내 시간표 올리기" — 방장은 이름을 이미 알므로 닉네임 단계를 건너뛴다
  function startNew() {
    const preset = presetNickname ? checkNickname(presetNickname) : null;
    if (preset?.ok) {
      setDisplayName(preset.displayName);
      setSlug(preset.slug);
      setSetPin(null);
      setStage('source');
    } else {
      setStage('nickname');
    }
  }

  async function doSubmit() {
    setErr(null);
    setStage('edit');
    try {
      const token = await submitOccupancy({
        roomId: room.id,
        displayName,
        slug,
        occupancy: occ,
        editorToken,
        setPin,
      });
      setEditorToken(token);
      setLocalEditor(room.id, { slug, token });
      const url = `${window.location.origin}/room/${room.id}/${encodeURIComponent(slug)}`;
      setPersonalUrl(url);
      setStage('done');
      onChanged();
    } catch (e) {
      setErr(msg(e));
    }
  }

  async function doDelete() {
    if (!editorToken) return;
    try {
      await deleteOwnSubmission(room.id, slug, editorToken);
      clearLocalEditor(room.id);
      reset();
      onChanged();
    } catch (e) {
      setErr(msg(e));
    }
  }

  if (room.locked && stage === 'menu') {
    return <p className="text-sm text-ink/50">방장이 제출을 마감했어요. 결과만 볼 수 있어요.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-extrabold">
        {stage === 'done' ? '올렸어요' : editorToken || stage === 'reclaim' ? '내 시간표 수정' : '내 시간표 올리기'}
      </h2>

      {stage === 'menu' && (
        <div className="flex flex-col gap-2">
          <Button variant="cta" onClick={startNew}>
            내 시간표 올리기
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStage('reclaim')}>
            이미 올린 시간표 수정하기
          </Button>
        </div>
      )}

      {stage === 'nickname' && (
        <NicknamePicker
          takenSlugs={takenSlugs}
          onCancel={() => setStage('menu')}
          onConfirm={(v) => {
            setDisplayName(v.displayName);
            setSlug(v.slug);
            setSetPin(v.setPin);
            setStage('source');
          }}
        />
      )}

      {stage === 'source' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink/60">시간표를 어떻게 넣을까요?</p>
          <Button variant="cta" onClick={() => setStage('upload')}>
            에타 스크린샷 올리기
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setOcc(emptyOccupancy(room.day_count, slotCount));
              setStage('edit');
            }}
          >
            이미지 없이 직접 입력
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStage('nickname')}>
            이름 다시
          </Button>
        </div>
      )}

      {stage === 'upload' && (
        <>
          <div className="rounded-md border border-cta/30 bg-cta/5 p-3 text-xs leading-relaxed text-ink/70">
            <b>잠깐!</b> PC라면 브라우저 캡처 말고, 에타 시간표에서{' '}
            <b>이미지 저장 → PC용</b>으로 받은 파일을 올려주세요. 캡처 이미지는 인식이 잘 안 돼요.
            휴대폰은 그냥 스크린샷으로 괜찮아요.
          </div>
          <ImageUploader
            onImage={(img) => {
              setImage(img);
              setStage('calibrate');
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => setStage('source')}>
            뒤로
          </Button>
        </>
      )}

      {stage === 'calibrate' && image && (
        <GridCalibrator
          image={image}
          roomStartHour={room.start_hour}
          roomEndHour={room.end_hour}
          weekend={room.day_count >= 7}
          onBack={() => {
            setImage(null);
            setStage('upload');
          }}
          onConfirm={(r) => {
            try {
              const data = imageToImageData(image);
              setOcc(
                computeOccupancy(data, r.box, {
                  dayCount: room.day_count,
                  slotMinutes: room.slot_minutes,
                  roomStartHour: room.start_hour,
                  roomEndHour: room.end_hour,
                  imageStartHour: r.imageStartHour,
                  imageEndHour: r.imageEndHour,
                })
              );
              setImage(null);
              setStage('edit');
            } catch (e) {
              setErr(msg(e));
            }
          }}
        />
      )}

      {stage === 'edit' && (
        <>
          <OccupancyEditor
            value={occ}
            dayCount={room.day_count}
            startHour={room.start_hour}
            slotCount={slotCount}
            slotMinutes={room.slot_minutes}
            onChange={setOcc}
          />
          <div className="flex gap-2">
            <Button variant="cta" className="flex-1" onClick={doSubmit}>
              {editorToken ? '수정 저장' : '제출'}
            </Button>
            {editorToken && (
              <Button variant="outline" onClick={() => setConfirmDel(true)}>
                삭제
              </Button>
            )}
            {!editorToken && (
              <Button variant="ghost" onClick={() => setStage('source')}>
                뒤로
              </Button>
            )}
          </div>
        </>
      )}

      {stage === 'reclaim' && (
        <Reclaim
          roomId={room.id}
          takenSlugs={takenSlugs}
          onCancel={() => setStage('menu')}
          onClaimed={({ slug: s, token }) => {
            const sub = submissions.find((x) => x.slug === s);
            setSlug(s);
            setDisplayName(sub?.display_name ?? s);
            setOcc(
              sub ? resizeOccupancy(sub.occupancy, room.day_count, slotCount)
                  : emptyOccupancy(room.day_count, slotCount)
            );
            setEditorToken(token);
            setLocalEditor(room.id, { slug: s, token });
            setStage('edit');
          }}
        />
      )}

      {stage === 'done' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-free">시간표가 올라갔어요. 히트맵이 갱신됐어요.</p>
          <ShareCard
            url={personalUrl}
            label="내 수정 링크"
            hint="이 링크(또는 QR)를 나에게 보내두면 다른 기기에서도 바로 수정할 수 있어요."
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStage('edit')}>
              수정 또는 삭제
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              다른 사람 올리기
            </Button>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-cta">{err}</p>}

      <ConfirmDialog
        open={confirmDel}
        title="내 시간표 삭제"
        body="이 방에서 내가 올린 시간표를 삭제할까요? 다시 올릴 수 있어요."
        confirmLabel="삭제"
        danger
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          setConfirmDel(false);
          doDelete();
        }}
      />
    </div>
  );
}

function Reclaim({
  roomId,
  takenSlugs,
  onClaimed,
  onCancel,
}: {
  roomId: string;
  takenSlugs: string[];
  onClaimed: (v: { slug: string; token: string }) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState('');
  const [pin, setPin] = useState('');
  const [needPin, setNeedPin] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const check = useMemo(() => checkNickname(raw), [raw]);
  const exists = check.ok && takenSlugs.includes(check.slug);

  async function probe() {
    setErr(null);
    if (!check.ok) return;
    try {
      setNeedPin(await editorHasPin(roomId, check.slug));
    } catch (e) {
      setErr(msg(e));
    }
  }

  async function go() {
    setErr(null);
    try {
      const token = await claimEditor(roomId, check.slug, needPin ? pin : null);
      onClaimed({ slug: check.slug, token });
    } catch (e) {
      setErr(msg(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        올릴 때 쓴 이름
        <Input value={raw} onChange={(e) => setRaw(e.target.value)} onBlur={probe} />
      </label>
      {check.ok && !exists && raw && <p className="text-xs text-cta">그 이름으로 올린 시간표가 없어요</p>}
      {needPin && (
        <Input
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="PIN 4자리"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      )}
      {needPin === false && exists && (
        <p className="text-xs text-ink/50">PIN을 설정하지 않아 이름만으로 열려요</p>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button
          variant="cta"
          size="sm"
          disabled={!exists || (!!needPin && !isValidPin(pin))}
          onClick={go}
        >
          불러오기
        </Button>
      </div>
      {err && <p className="text-xs text-cta">{err}</p>}
    </div>
  );
}

const msg = (e: unknown) => errMessage(e, '문제가 생겼어요. 잠시 후 다시 시도해주세요.');
