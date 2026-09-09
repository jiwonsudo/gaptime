import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BoundingBox } from '@/types';
import { DAY_LABELS, EVERYTIME_IMAGE_DAYS } from '@/types';
import { formatHour } from '@/lib/timeFormat';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { RadioGroup } from './ui/radio';

export interface CalibrationResult {
  box: BoundingBox; // 원본 이미지 픽셀 좌표
  imageStartHour: number;
  imageEndHour: number;
}

interface Props {
  image: HTMLImageElement;
  roomStartHour: number;
  roomEndHour: number;
  weekend: boolean;
  onConfirm: (r: CalibrationResult) => void;
  onBack: () => void;
}

const MAX_W = 520;
const IMG_COLS = EVERYTIME_IMAGE_DAYS; // 5 (월~금)
type DragMode = { kind: 'tl' | 'br' | 'move'; startX: number; startY: number; box: BoundingBox };
type Preset = 'a' | 'b' | 'custom';

export default function GridCalibrator({
  image,
  roomStartHour,
  roomEndHour,
  weekend,
  onConfirm,
  onBack,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [preset, setPreset] = useState<Preset>(roomEndHour > 18 ? 'b' : 'a');
  const [customStart, setCustomStart] = useState(8);
  const [customEnd, setCustomEnd] = useState(Math.max(roomEndHour, 20));

  const imgStart = preset === 'custom' ? customStart : 8;
  const imgEnd = preset === 'a' ? 18 : preset === 'b' ? 24 : customEnd;
  const imgRows = Math.max(1, imgEnd - imgStart);

  const [dispW, setDispW] = useState(() => Math.min(MAX_W, image.width));
  const scale = dispW / image.width;
  const dispH = Math.round(image.height * scale);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setDispW(Math.min(MAX_W, image.width, el.clientWidth || MAX_W));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [image]);

  const [box, setBox] = useState<BoundingBox>({ x0: 0, y0: 0, x1: 0, y1: 0 });
  const initedFor = useRef(0);
  useEffect(() => {
    if (initedFor.current === dispW) return;
    initedFor.current = dispW;
    setBox({ x0: dispW * 0.12, y0: dispH * 0.14, x1: dispW * 0.96, y1: dispH * 0.94 });
  }, [dispW, dispH]);

  const geom = useRef({ dispW, dispH });
  geom.current = { dispW, dispH };

  function startDrag(kind: DragMode['kind']) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const d: DragMode = { kind, startX: e.clientX, startY: e.clientY, box };
      const onMove = (ev: PointerEvent) => {
        ev.preventDefault();
        const { dispW: W, dispH: H } = geom.current;
        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;
        const b = d.box;
        const clamp = (v: number, hi: number) => Math.max(0, Math.min(v, hi));
        if (kind === 'tl') {
          setBox({
            ...b,
            x0: clamp(Math.min(b.x0 + dx, b.x1 - 20), W),
            y0: clamp(Math.min(b.y0 + dy, b.y1 - 20), H),
          });
        } else if (kind === 'br') {
          setBox({
            ...b,
            x1: clamp(Math.max(b.x1 + dx, b.x0 + 20), W),
            y1: clamp(Math.max(b.y1 + dy, b.y0 + 20), H),
          });
        } else {
          const w = b.x1 - b.x0;
          const h = b.y1 - b.y0;
          const nx0 = Math.max(0, Math.min(b.x0 + dx, W - w));
          const ny0 = Math.max(0, Math.min(b.y0 + dy, H - h));
          setBox({ x0: nx0, y0: ny0, x1: nx0 + w, y1: ny0 + h });
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dispW === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(image, 0, 0, dispW, dispH);

    const { x0, y0, x1, y1 } = box;
    const bw = x1 - x0;
    const bh = y1 - y0;
    ctx.save();

    const from = Math.max(0, roomStartHour - imgStart);
    const to = Math.min(imgRows, roomEndHour - imgStart);
    if (to > from) {
      ctx.fillStyle = 'rgba(63,169,104,0.18)';
      ctx.fillRect(x0, y0 + (bh * from) / imgRows, bw, (bh * (to - from)) / imgRows);
    }

    ctx.strokeStyle = '#FF6B4A';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, bw, bh);

    ctx.strokeStyle = 'rgba(28,35,29,0.35)';
    ctx.lineWidth = 1;
    for (let d = 1; d < IMG_COLS; d++) {
      const x = x0 + (bw * d) / IMG_COLS;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
    for (let h = 1; h < imgRows; h++) {
      const y = y0 + (bh * h) / imgRows;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    ctx.restore();
  }, [box, image, dispW, dispH, roomStartHour, roomEndHour, imgStart, imgRows]);

  function confirm() {
    onConfirm({
      box: {
        x0: box.x0 / scale,
        y0: box.y0 / scale,
        x1: box.x1 / scale,
        y1: box.y1 / scale,
      },
      imageStartHour: imgStart,
      imageEndHour: imgEnd,
    });
  }

  const handle =
    'absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-cta shadow-md active:cursor-grabbing';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">스크린샷 격자의 시간 범위</span>
        <RadioGroup
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'a', label: '오전 8시 ~ 오후 6시', hint: '모바일 캡처 기본' },
            { value: 'b', label: '오전 8시 ~ 자정', hint: '저녁까지 수업이 보이는 이미지' },
            { value: 'custom', label: '직접 맞추기' },
          ]}
        />
        {preset === 'custom' && (
          <div className="mt-1 flex items-center gap-2">
            <Select
              aria-label="이미지 시작 시각"
              value={customStart}
              onChange={(e) => setCustomStart(Number(e.target.value))}
            >
              {Array.from({ length: 9 }, (_, i) => 8 + i).map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </Select>
            <span className="text-xs text-ink/40">~</span>
            <Select
              aria-label="이미지 끝 시각"
              value={customEnd}
              onChange={(e) => setCustomEnd(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => 12 + i).map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <p className="text-sm text-ink/60">
        주황색 두 점을 시간표 격자의 <b>왼쪽 위</b>·<b>오른쪽 아래</b> 모서리에 맞춰주세요. 초록
        부분이 이 방에서 볼 시간대예요.
        {weekend && ' 토·일 칸은 다음 단계에서 직접 칠하면 돼요.'}
      </p>

      <div ref={wrapRef} className="relative w-full select-none" style={{ maxWidth: MAX_W }}>
        <canvas
          ref={canvasRef}
          width={dispW}
          height={dispH}
          className="block w-full rounded-md border border-ink/15"
        />
        <div
          className="absolute touch-none"
          style={{
            left: box.x0,
            top: box.y0,
            width: Math.max(0, box.x1 - box.x0),
            height: Math.max(0, box.y1 - box.y0),
            cursor: 'move',
          }}
          onPointerDown={startDrag('move')}
        />
        <div className={handle} style={{ left: box.x0, top: box.y0 }} onPointerDown={startDrag('tl')} />
        <div className={handle} style={{ left: box.x1, top: box.y1 }} onPointerDown={startDrag('br')} />
      </div>

      <div className="text-xs text-ink/40">{DAY_LABELS.slice(0, IMG_COLS).join(' ')}</div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          다시 업로드
        </Button>
        <Button variant="cta" className="flex-1" onClick={confirm}>
          이 격자로 계산
        </Button>
      </div>
    </div>
  );
}
