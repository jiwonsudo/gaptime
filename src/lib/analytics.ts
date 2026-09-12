// GA4. VITE_GA_ID 없으면 전부 no-op (로컬 개발 기본값).
// IP는 GA 쪽에서 익명화(anonymize_ip). 개인 식별 정보(닉네임 등)는 절대 이벤트에 안 실음.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
let loaded = false;

function ensureLoaded() {
  if (loaded || !GA_ID || typeof window === 'undefined') return;
  loaded = true;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
}

export function trackPage(path: string) {
  if (!GA_ID) return;
  ensureLoaded();
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: document.title,
  });
}

export function track(name: string, params?: Record<string, string | number | boolean>) {
  if (!GA_ID) return;
  ensureLoaded();
  window.gtag?.('event', name, params);
}
