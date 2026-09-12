import { HOUR_MAX_END, HOUR_MIN_START } from '@/types';
import { formatHour } from '@/lib/timeFormat';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Select } from './ui/select';
import { RadioGroup } from './ui/radio';
import { Collapsible } from './ui/collapsible';

export interface RoomSettings {
  title: string;
  hostName: string;
  includeWeekend: boolean;
  startHour: number;
  endHour: number;
  slotMinutes: 30 | 60;
  expectedSize: number;
  ownerPinEnabled: boolean;
  ownerPin: string;
}

interface Props {
  value: RoomSettings;
  onChange: (v: RoomSettings) => void;
}

// 8, 9, ... 24
const HOURS = Array.from(
  { length: HOUR_MAX_END - HOUR_MIN_START + 1 },
  (_, i) => HOUR_MIN_START + i
);

export default function TimeRangeForm({ value, onChange }: Props) {
  function set<K extends keyof RoomSettings>(key: K, v: RoomSettings[K]) {
    onChange({ ...value, [key]: v });
  }

  function setStart(h: number) {
    onChange({ ...value, startHour: h, endHour: Math.max(value.endHour, h + 1) });
  }
  function setEnd(h: number) {
    onChange({ ...value, endHour: h, startHour: Math.min(value.startHour, h - 1) });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        방 이름
        <Input
          placeholder="예: 알고리즘 스터디 시간 조율"
          maxLength={60}
          value={value.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        내 이름
        <Input
          placeholder="예: 김프리"
          maxLength={20}
          value={value.hostName}
          onChange={(e) => set('hostName', e.target.value)}
        />
        <span className="text-xs font-normal text-ink/40">
          남들에게도 보이니 신중히 작성해주세요. 방장이 시간표 올릴 때도 이 이름을 써요.
        </span>
      </label>

      <div data-tour="advanced-settings">
        <Collapsible title="세부 설정 (시간대·인원·PIN)">
          <div className="flex flex-col gap-4">
            <Checkbox
              label="토·일 포함"
              checked={value.includeWeekend}
              onChange={(e) => set('includeWeekend', e.target.checked)}
            />

            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">볼 시간대</span>
              <div className="flex items-center gap-2">
                <Select
                  aria-label="시작 시각"
                  value={value.startHour}
                  onChange={(e) => setStart(Number(e.target.value))}
                >
                  {HOURS.filter((h) => h < HOUR_MAX_END).map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </Select>
                <span className="text-sm text-ink/40">~</span>
                <Select
                  aria-label="종료 시각"
                  value={value.endHour}
                  onChange={(e) => setEnd(Number(e.target.value))}
                >
                  {HOURS.filter((h) => h > HOUR_MIN_START).map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">시간 단위</span>
              <RadioGroup
                value={String(value.slotMinutes)}
                onChange={(v) => set('slotMinutes', v === '30' ? 30 : 60)}
                options={[
                  { value: '60', label: '1시간' },
                  { value: '30', label: '30분', hint: '더 촘촘하게 시간을 잡을 수 있어요' },
                ]}
              />
            </div>

            <label className="flex flex-col gap-1 text-sm font-semibold">
              함께할 인원 <span className="font-normal text-ink/40">(본인 포함)</span>
              <span className="tnum text-sm font-normal text-ink/50">{value.expectedSize}명</span>
              <input
                type="range"
                min={2}
                max={30}
                value={value.expectedSize}
                onChange={(e) => set('expectedSize', +e.target.value)}
                className="accent-free"
              />
            </label>

            <div className="flex flex-col gap-2">
              <Checkbox
                label="방장 PIN 설정 (다른 기기에서 방 관리할 때)"
                checked={value.ownerPinEnabled}
                onChange={(e) =>
                  onChange({ ...value, ownerPinEnabled: e.target.checked, ownerPin: '' })
                }
              />
              {value.ownerPinEnabled && (
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="숫자 4자리"
                  value={value.ownerPin}
                  onChange={(e) => set('ownerPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              )}
            </div>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
