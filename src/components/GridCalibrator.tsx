import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BoundingBox } from '@/types';
import { DAY_LABELS } from '@/types';
import { Button } from './ui/button';

interface Props {
  image: HTMLImageElement;
  dayCount: number;
  startHour: number;
  endHour: number;
  onConfirm: (box: BoundingBox) => void;
  onBack: () => void;
}

const MAX_W = 520;
type DragMode = { kind: 'tl' | 'br' | 'move'; startX: number; startY: number; box: BoundingBox };

export default function GridCalibrator({
  image,
  dayCount,
  startHour,
  endHour,
  onConfirm,
  onBack,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 컨테이너 폭에 맞춘 표시 크기
  const [dispW, setDispW] = useState(() => Math.min(MAX_W, image.width));
  const scale = dispW / image.width;
  const dispH = Math.round(image.height * scale);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const w = Math.min(MAX_W, image.width, el.clientWidth || MAX_W);
      setDispW(w);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [image]);

  // 표시 좌표계 기준 bounding box (초기 추정: 이미지 중앙부)
  const [box, setBox] = useState<BoundingBox>({ x0: 0, y0: 0, x1: 0, y1: 0 });
  const initedFor = useRef(0);
  useEffect(() => {
    if (initedFor.current === dispW) return;
    initedFor.current = dispW;
    setBox({
      x0: dispW * 0.12,
      y0: dispH * 0.14,
      x1: dispW * 0.96,
      y1: dispH * 0.94,
    });
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

  // 캔버스: 이미지 + 격자 미리보기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dispW === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(image, 0, 0, dispW, dispH);

    const { x0, y0, x1, y1 } = box;
    ctx.save();
    ctx.strokeStyle = '#FF6B4A';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

    ctx.strokeStyle = 'rgba(63,169,104,0.65)';
    ctx.lineWidth = 1;
    const hourCount = Math.max(1, endHour - startHour);
    for (let d = 1; d < dayCount; d++) {
      const x = x0 + ((x1 - x0) * d) / dayCount;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
    for (let h = 1; h < hourCount; h++) {
      const y = y0 + ((y1 - y0) * h) / hourCount;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    ctx.restore();
  }, [box, image, dispW, dispH, dayCount, startHour, endHour]);

  function confirm() {
    onConfirm({
      x0: box.x0 / scale,
      y0: box.y0 / scale,
      x1: box.x1 / scale,
      y1: box.y1 / scale,
    });
  }

  const handle =
    'absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-cta shadow-md active:cursor-grabbing';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/60">
        주황색 두 점을 드래그해서 시간표 격자의 <b>좌상단·우하단 모서리</b>에 맞춰주세요. 격자 안쪽을
        끌면 전체가 함께 움직입니다. ({DAY_LABELS.slice(0, dayCount).join('')} · {startHour}시~{endHour}시)
      </p>

      <div ref={wrapRef} className="relative w-full select-none" style={{ maxWidth: MAX_W }}>
        <canvas
          ref={canvasRef}
          width={dispW}
          height={dispH}
          className="block w-full rounded-md border border-ink/15"
        />
        {/* 격자 안쪽: 전체 이동 */}
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

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          다시 업로드
        </Button>
        <Button variant="cta" onClick={confirm}>
          이 격자로 계산
        </Button>
      </div>
    </div>
  );
}
