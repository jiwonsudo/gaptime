import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/button';

interface Props {
  url: string;
  label?: string;
  hint?: string;
}

export default function ShareCard({ url, label = '참여 링크', hint }: Props) {
  const [qr, setQr] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showQr) return;
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#1C231D', light: '#F3F5F0' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url, showQr]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      linkRef.current?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function saveQr() {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'gaptime-qr.png';
    a.click();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white/60 p-4">
      <div className="text-sm font-extrabold">{label}</div>

      <input
        ref={linkRef}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md bg-ink/5 px-3 py-2 text-xs text-ink/70"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="cta" className="flex-1" onClick={copy}>
          {copied ? '복사됐어요' : '링크 복사'}
        </Button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button size="sm" variant="outline" onClick={() => navigator.share({ url }).catch(() => {})}>
            공유
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowQr((v) => !v)}>
          {showQr ? 'QR 숨기기' : 'QR 코드'}
        </Button>
      </div>

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
