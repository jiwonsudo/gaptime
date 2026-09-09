import { HOUR_MAX_END, HOUR_MIN_START } from '@/types';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { ValidatedInput } from './ui/validated-input';

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

      <ValidatedInput
        label="시작 시각"
        type="number"
        inputMode="numeric"
        value={String(value.startHour)}
        validate={(raw) => {
          const n = Number(raw);
          if (raw.trim() === '' || Number.isNaN(n)) return '숫자를 입력해주세요';
          if (n < HOUR_MIN_START) return `${HOUR_MIN_START}시부터 정할 수 있어요`;
          if (n >= value.endHour) return '종료 시각보다 빨라야 해요';
          return null;
        }}
        onCommit={(raw) => set('startHour', Number(raw))}
      />

      <ValidatedInput
        label="종료 시각"
        type="number"
        inputMode="numeric"
        value={String(value.endHour)}
        validate={(raw) => {
          const n = Number(raw);
          if (raw.trim() === '' || Number.isNaN(n)) return '숫자를 입력해주세요';
          if (n > HOUR_MAX_END) return `${HOUR_MAX_END}시(자정)까지만 가능해요`;
          if (n <= value.startHour) return '시작 시각보다 늦어야 해요';
          return null;
        }}
        onCommit={(raw) => set('endHour', Number(raw))}
      />

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

      <Checkbox
        label="방장 PIN 설정 (다른 기기에서 방 관리할 때)"
        checked={value.ownerPinEnabled}
        onChange={(e) => onChange({ ...value, ownerPinEnabled: e.target.checked, ownerPin: '' })}
      />
      {value.ownerPinEnabled && (
        <ValidatedInput
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="숫자 4자리"
          value={value.ownerPin}
          validate={(raw) => {
            if (raw === '') return null;
            if (!/^\d{0,4}$/.test(raw)) return '숫자만 입력해주세요';
            return null;
          }}
          onCommit={(raw) => set('ownerPin', raw.replace(/\D/g, '').slice(0, 4))}
        />
      )}
    </div>
  );
}
