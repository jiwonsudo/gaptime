import { Input } from './ui/input';

export interface RoomSettings {
  dayCount: number;
  startHour: number;
  endHour: number;
  expectedSize: number;
}

interface Props {
  value: RoomSettings;
  onChange: (v: RoomSettings) => void;
}

// MVP: 요일 수는 5(월~금) 고정. 시작/종료 시각 + 예상 인원수만 조절.
export default function TimeRangeForm({ value, onChange }: Props) {
  function set<K extends keyof RoomSettings>(key: K, v: RoomSettings[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        시작 시각
        <Input
          type="number"
          min={0}
          max={22}
          value={value.startHour}
          onChange={(e) => set('startHour', clamp(+e.target.value, 0, value.endHour - 1))}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        종료 시각
        <Input
          type="number"
          min={1}
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
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isNaN(n) ? lo : n));
}
