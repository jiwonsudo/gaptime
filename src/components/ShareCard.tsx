import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/button';

interface Props {
  url: string;
  label?: string;
  hint?: string;
}

export default function ShareCard({ url, label = '참여 링크', hint }: Props) {
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#1C231D', light: '#F3F5F0' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('복사할 링크', url);
    }
  }

  function share() {
    if (navigator.share) navigator.share({ url }).catch(() => {});
    else copy();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white/60 p-4">
      <div className="text-sm font-extrabold">{label}</div>
      {qr && <img src={qr} alt="QR 코드" className="mx-auto h-40 w-40" />}
      <div className="break-all rounded-md bg-ink/5 px-3 py-2 text-xs text-ink/70">{url}</div>
      <div className="flex gap-2">
        <Button size="sm" variant="cta" className="flex-1" onClick={copy}>
          {copied ? '복사됐어요' : '링크 복사'}
        </Button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button size="sm" variant="outline" onClick={share}>
            공유
          </Button>
        )}
      </div>
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
    </div>
  );
}
