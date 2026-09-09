// 최하단 광고 슬롯.
// TODO(수익화): Google AdSense 또는 쿠팡 파트너스 스크립트를 여기에 연결.
//  - AdSense: 승인 후 <ins class="adsbygoogle" .../> + push({})
//  - 지금은 레이아웃 자리만 잡아두는 플레이스홀더 (env로 on/off)
const AD_ENABLED = import.meta.env.VITE_ADS_ENABLED === '1';

export default function AdBanner() {
  if (!AD_ENABLED) return null;
  return (
    <div className="mx-auto mt-12 max-w-4xl px-5">
      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-ink/15 bg-white/40 text-xs text-ink/30">
        광고
      </div>
    </div>
  );
}
