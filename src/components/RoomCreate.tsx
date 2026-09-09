import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_END_HOUR, DEFAULT_START_HOUR } from '@/types';
import TimeRangeForm, { type RoomSettings } from './TimeRangeForm';
import ResultGrid from './ResultGrid';
import Logo from './Logo';
import Footer from './Footer';
import AdBanner from './AdBanner';
import Coachmark, { type TourStep } from './Coachmark';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Modal } from './ui/modal';
import { Shake, useShake } from './ui/shake';
import { createRoom, isSupabaseConfigured } from '@/lib/supabase';
import { setOwnerToken } from '@/lib/roomAuth';

interface Props {
  tour: boolean;
  onOpenTour: () => void;
  onCloseTour: () => void;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="grid-preview"]',
    title: '이 표가 결과 화면이에요',
    body: '지금은 비어 있어요. 팀원들이 시간표를 올리면 여기가 초록색으로 채워지고, 진할수록 많이 비는 시간이에요.',
  },
  {
    selector: '[data-tour="room-settings"]',
    title: '방을 설정하세요',
    body: '방 이름은 링크를 받은 사람이 무슨 방인지 알게 해줘요. 에타 시간표에 맞춰 시간 범위를 정하고, 함께할 인원(본인 포함)도 정하세요.',
  },
  {
    selector: '[data-tour="create-btn"]',
    title: '만들면 링크와 방 코드가 나와요',
    body: '방을 만들면 공유 링크·QR·방 코드가 생겨요. 그걸 단톡방에 뿌리면 각자 자기 폰에서 시간표를 올립니다.',
  },
  {
    selector: '[data-tour="owner-pin"]',
    title: '다른 기기에서도 관리하려면',
    body: '방장 권한은 이 브라우저에만 저장돼요. 노트북에서 만들고 폰에서도 방을 관리하려면 여기 "방장 PIN"을 꼭 설정하세요. (방을 만든 뒤 나오는 방 코드도 따로 저장해두면 좋아요)',
  },
];

export default function RoomCreate({ tour, onOpenTour, onCloseTour }: Props) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RoomSettings>({
    title: '',
    hostName: '',
    includeWeekend: false,
    startHour: DEFAULT_START_HOUR,
    endHour: DEFAULT_END_HOUR,
    expectedSize: 4,
    ownerPinEnabled: false,
    ownerPin: '',
  });
  const dayCount = settings.includeWeekend ? 7 : 5;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [code, setCode] = useState('');
  const { shakeKey, shake } = useShake();

  const titleEmpty = settings.title.trim() === '';
  const hostEmpty = settings.hostName.trim() === '';
  const pinInvalid = settings.ownerPinEnabled && !/^\d{4}$/.test(settings.ownerPin);

  async function handleCreate() {
    if (titleEmpty || hostEmpty) {
      setError(titleEmpty ? '방 이름을 입력해주세요.' : '내 이름을 입력해주세요.');
      shake();
      return;
    }
    if (pinInvalid) {
      setError('방장 PIN은 숫자 4자리여야 해요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { room, ownerToken } = await createRoom({
        title: settings.title.trim(),
        hostName: settings.hostName.trim(),
        dayCount,
        startHour: settings.startHour,
        endHour: settings.endHour,
        expectedSize: settings.expectedSize,
        ownerPin: settings.ownerPinEnabled ? settings.ownerPin : null,
      });
      setOwnerToken(room.id, ownerToken);
      navigate(`/r/${room.id}?created=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '방을 만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <Logo className="text-2xl" />
          <div className="flex shrink-0 gap-3 text-xs text-ink/50">
            <button className="underline" onClick={() => setHelp(true)}>
              이미 방이 있나요?
            </button>
            <button className="underline" onClick={onOpenTour}>
              사용법
            </button>
          </div>
        </div>
        <p className="mb-8 text-sm text-ink/60">
          방을 만들고 링크를 공유하면, 팀원들이 각자 자기 기기에서 에타 시간표를 올려 모두의 빈
          시간을 실시간으로 찾아줍니다. 로그인 없어요.
        </p>

        <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
          <div data-tour="grid-preview">
            <ResultGrid
              dayCount={dayCount}
              startHour={settings.startHour}
              endHour={settings.endHour}
              expectedSize={settings.expectedSize}
              submissions={[]}
              preview
            />
          </div>

          <div className="flex flex-col gap-4" data-tour="room-settings">
            <h2 className="text-sm font-extrabold">방 설정</h2>
            <TimeRangeForm value={settings} onChange={setSettings} />
            <p className="text-xs text-ink/40">이 방은 만든 지 14일이 지나면 자동으로 사라져요.</p>
            {!isSupabaseConfigured && (
              <p className="text-xs text-cta">
                Supabase 환경변수가 설정되지 않았어요 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
              </p>
            )}
            {error && <p className="text-xs text-cta">{error}</p>}
            <Shake shakeKey={shakeKey}>
              <Button
                data-tour="create-btn"
                variant="cta"
                size="lg"
                className="w-full"
                disabled={busy || pinInvalid}
                onClick={handleCreate}
              >
                {busy ? '만드는 중' : '방 만들기'}
              </Button>
            </Shake>
          </div>
        </div>

        <AdBanner />
        <Coachmark steps={STEPS} run={tour} onClose={onCloseTour} />

        <Modal open={help} onClose={() => setHelp(false)}>
          <h3 className="text-base font-extrabold">이미 방이 있나요?</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            받은 <b>방 코드</b>를 입력하면 그 방으로 바로 들어가요. 주소창에 직접
            <span className="mx-1 rounded bg-ink/5 px-1 py-0.5 text-xs">…/r/방코드</span>
            를 입력해도 됩니다.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="방 코드 (예: ab3f9k)"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && code && navigate(`/r/${code}`)}
            />
            <Button size="md" variant="cta" disabled={!code} onClick={() => navigate(`/r/${code}`)}>
              들어가기
            </Button>
          </div>
        </Modal>
      </div>
      <Footer />
    </>
  );
}
