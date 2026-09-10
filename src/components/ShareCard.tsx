import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/button';

interface Props {
  url: string;
  code?: string;
  label?: string;
  hint?: string;
  shareText?: string;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('복사하세요', text);
    return false;
  }
}

function useFlash() {
  const [on, setOn] = useState(false);
  return [on, () => {
    setOn(true);
    setTimeout(() => setOn(false), 1500);
  }] as const;
}

export default function ShareCard({
  url,
  code,
  label = '참여 링크',
  hint,
  shareText,
}: Props) {
  const [qr, setQr] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [linkCopied, flashLink] = useFlash();
  const [codeCopied, flashCode] = useFlash();

  useEffect(() => {
    if (!showQr) return;
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#1C231D', light: '#F3F5F0' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url, showQr]);

  function saveQr() {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'everyfreetime-qr.png';
    a.click();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-extrabold">{label}</div>
        <button
          type="button"
          onClick={async () => {
            await copyText(url);
            flashLink();
          }}
          className="flex items-center justify-between gap-2 rounded-md bg-ink/5 px-3 py-2 text-left transition-colors hover:bg-ink/10"
        >
          <span className="truncate text-xs text-ink/70">{url}</span>
          <span className="shrink-0 text-xs font-semibold text-ink/50">
            {linkCopied ? '복사됨' : '눌러서 복사'}
          </span>
        </button>
        <div className="mt-1 flex gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() =>
                navigator.share({ title: 'everyFreeTime', text: shareText, url }).catch(() => {})
              }
            >
              공유하기
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowQr((v) => !v)}>
            {showQr ? 'QR 숨기기' : 'QR 코드'}
          </Button>
        </div>
      </div>

      {code && (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-extrabold">방 코드</div>
          <button
            type="button"
            onClick={async () => {
              await copyText(code);
              flashCode();
            }}
            className="tnum flex items-center justify-between rounded-md bg-ink/5 px-3 py-2 text-left text-xl font-extrabold tracking-widest transition-colors hover:bg-ink/10"
          >
            <span>{code}</span>
            <span className="text-xs font-semibold tracking-normal text-ink/50">
              {codeCopied ? '복사됨' : '눌러서 복사'}
            </span>
          </button>
          <p className="text-xs text-ink/50">
            링크 대신 이 코드를 알려줘도 돼요. 받은 사람은 첫 화면 “이미 방이 있나요?”에 입력.
          </p>
        </div>
      )}

      {showQr && qr && (
        <div className="flex flex-col items-center gap-2">
          <img src={qr} alt="QR 코드" className="h-44 w-44" />
          <button className="text-xs text-ink/50 underline" onClick={saveQr}>
            QR 이미지 저장
          </button>
        </div>
      )}

      {hint && <p className="text-xs text-ink/50">{hint}</p>}
    </div>
  );
}
