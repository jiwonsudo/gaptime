import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

export interface RoomSettings {
  title: string;
  includeWeekend: boolean;
  startHour: number;
  endHour: number;
  expectedSize: number;
  ownerPinEnabled: boolean;
  ownerPin: string;
}

interface Props {
  value: RoomSettings;
  onChange: (v: RoomSettings) => void;
}

export default function TimeRangeForm({ value, onChange }: Props) {
  function set<K extends keyof RoomSettings>(key: K, v: RoomSettings[K]) {
    onChange({ ...value, [key]: v });
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

      <Checkbox
        label="토·일 포함"
        checked={value.includeWeekend}
        onChange={(e) => set('includeWeekend', e.target.checked)}
      />

      <label className="flex flex-col gap-1 text-sm font-semibold">
        시작 시각 <span className="font-normal text-ink/40">(에타 기본 8시)</span>
        <Input
          type="number"
          min={6}
          max={22}
          value={value.startHour}
          onChange={(e) => set('startHour', clamp(+e.target.value, 6, value.endHour - 1))}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        종료 시각 <span className="font-normal text-ink/40">(24 = 자정)</span>
        <Input
          type="number"
          min={9}
          max={24}
          value={value.endHour}
          onChange={(e) => set('endHour', clamp(+e.target.value, value.startHour + 1, 24))}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        예상 인원수 <span className="tnum font-normal text-ink/50">{value.expectedSize}명</span>
        <input
          type="range"
          min={2}
          max={30}
          value={value.expectedSize}
          onChange={(e) => set('expectedSize', +e.target.value)}
          className="accent-free"
        />
      </label>

      <Checkbox
        label="방장 PIN 설정 (다른 기기에서 방 관리할 때)"
        checked={value.ownerPinEnabled}
        onChange={(e) => onChange({ ...value, ownerPinEnabled: e.target.checked, ownerPin: '' })}
      />
      {value.ownerPinEnabled && (
        <Input
          inputMode="numeric"
          maxLength={4}
          placeholder="숫자 4자리"
          value={value.ownerPin}
          onChange={(e) => set('ownerPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      )}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isNaN(n) ? lo : n));
}
