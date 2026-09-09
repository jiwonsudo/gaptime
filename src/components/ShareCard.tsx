import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/button';

interface Props {
  url: string;
  code?: string;
  label?: string;
  hint?: string;
  shareText?: string;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('복사하세요', text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return { copied, copy };
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
  const link = useCopy();
  const codeCopy = useCopy();
  const linkRef = useRef<HTMLInputElement>(null);

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
      <div className="flex flex-col gap-2">
        <div className="text-sm font-extrabold">{label}</div>
        <input
          ref={linkRef}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md bg-ink/5 px-3 py-2 text-xs text-ink/70"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="cta" className="flex-1" onClick={() => link.copy(url)}>
            {link.copied ? '복사됐어요' : '링크 복사'}
          </Button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigator
                  .share({ title: 'everyFreeTime', text: shareText, url })
                  .catch(() => {})
              }
            >
              공유
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowQr((v) => !v)}>
            {showQr ? 'QR 숨기기' : 'QR'}
          </Button>
        </div>
      </div>

      {code && (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-extrabold">방 코드</div>
          <div className="flex items-center gap-2">
            <span className="tnum flex-1 rounded-md bg-ink/5 px-3 py-2 text-2xl font-extrabold tracking-widest">
              {code}
            </span>
            <Button size="sm" variant="outline" onClick={() => codeCopy.copy(code)}>
              {codeCopy.copied ? '복사됨' : '복사'}
            </Button>
          </div>
          <p className="text-xs text-ink/50">
            링크 대신 이 코드를 알려줘도 돼요. 받은 사람은 첫 화면에서 “이미 방이 있나요?”에 입력.
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
