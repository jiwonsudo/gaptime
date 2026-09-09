import { useEffect, useRef, useState } from 'react';
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
type Handle = 'tl' | 'br' | null;

export default function GridCalibrator({
  image,
  dayCount,
  startHour,
  endHour,
  onConfirm,
  onBack,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = Math.min(1, MAX_W / image.width);
  const dispW = Math.round(image.width * scale);
  const dispH = Math.round(image.height * scale);

  // display 좌표계 기준 bounding box (초기 추정: 이미지 중앙 80%)
  const [box, setBox] = useState<BoundingBox>({
    x0: dispW * 0.12,
    y0: dispH * 0.14,
    x1: dispW * 0.95,
    y1: dispH * 0.92,
  });
  const dragging = useRef<Handle>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(image, 0, 0, dispW, dispH);

    const { x0, y0, x1, y1 } = box;
    ctx.strokeStyle = '#FF6B4A';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

    // 그리드 미리보기
    ctx.strokeStyle = 'rgba(63,169,104,0.6)';
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

    // 핸들
    ctx.fillStyle = '#FF6B4A';
    for (const [hx, hy] of [
      [x0, y0],
      [x1, y1],
    ]) {
      ctx.beginPath();
      ctx.arc(hx, hy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [box, image, dispW, dispH, dayCount, startHour, endHour]);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent) {
    const { x, y } = pos(e);
    const dTL = Math.hypot(x - box.x0, y - box.y0);
    const dBR = Math.hypot(x - box.x1, y - box.y1);
    dragging.current = dTL < dBR ? 'tl' : 'br';
    if (Math.min(dTL, dBR) > 40) dragging.current = null;
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const { x, y } = pos(e);
    const cx = Math.max(0, Math.min(dispW, x));
    const cy = Math.max(0, Math.min(dispH, y));
    setBox((b) =>
      dragging.current === 'tl'
        ? { ...b, x0: Math.min(cx, b.x1 - 10), y0: Math.min(cy, b.y1 - 10) }
        : { ...b, x1: Math.max(cx, b.x0 + 10), y1: Math.max(cy, b.y0 + 10) }
    );
  }

  function confirm() {
    onConfirm({
      x0: box.x0 / scale,
      y0: box.y0 / scale,
      x1: box.x1 / scale,
      y1: box.y1 / scale,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/60">
        주황색 두 점을 드래그해서 시간표 격자의 좌상단·우하단 모서리에 맞춰주세요.
        {' '}({DAY_LABELS.slice(0, dayCount).join('')} · {startHour}시~{endHour}시)
      </p>
      <canvas
        ref={canvasRef}
        width={dispW}
        height={dispH}
        className="touch-none rounded-md border border-ink/15"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (dragging.current = null)}
      />
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
