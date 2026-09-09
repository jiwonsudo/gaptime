import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAY_LABELS } from '@/types';
import TimeRangeForm, { type RoomSettings } from './TimeRangeForm';
import ResultGrid from './ResultGrid';
import { Button } from './ui/button';
import { createRoom, isSupabaseConfigured } from '@/lib/supabase';

export default function RoomCreate() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RoomSettings>({
    dayCount: 5,
    startHour: 9,
    endHour: 18,
    expectedSize: 4,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(settings);
      navigate(`/r/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '방 생성에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="mb-1 text-2xl font-extrabold">에브리프리타임</h1>
      <p className="mb-8 text-sm text-ink/60">
        방을 만들고 링크를 공유하면, 각자 자기 기기에서 에타 시간표를 올려 모두의 빈 시간을
        실시간으로 찾아줍니다.
      </p>

      <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
        <div>
          <div className="mb-2 flex gap-1 text-sm font-bold text-ink/50">
            {DAY_LABELS.slice(0, settings.dayCount).map((d) => (
              <span key={d} className="flex-1 text-center">
                {d}
              </span>
            ))}
          </div>
          <ResultGrid
            dayCount={settings.dayCount}
            startHour={settings.startHour}
            endHour={settings.endHour}
            expectedSize={settings.expectedSize}
            submissions={[]}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold">방 설정</h2>
          <TimeRangeForm value={settings} onChange={setSettings} />
          {!isSupabaseConfigured && (
            <p className="text-xs text-cta">
              Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 설정되지 않았어요.
            </p>
          )}
          {error && <p className="text-xs text-cta">{error}</p>}
          <Button variant="cta" size="lg" disabled={busy} onClick={handleCreate}>
            {busy ? '만드는 중…' : '방 만들기'}
          </Button>
        </div>
      </div>
    </div>
  );
}
