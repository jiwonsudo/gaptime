// /room/* 요청에 방별 공유 미리보기(OG) 태그를 넣어서 index.html 을 돌려준다.
//
// 카톡·트위터 같은 크롤러는 JS 를 실행하지 않으므로 클라이언트에서 meta 를 바꿔봐야
// 미리보기에 반영되지 않는다. 그래서 이 경로만 함수가 가로채 HTML 을 만들어 준다.

export const config = { runtime: 'edge' };

const SITE = 'https://everyfreetime.cloud';

interface Room {
  title: string | null;
  host_name: string | null;
}

// 사용자가 쓴 방 이름·닉네임이 그대로 HTML 에 들어가므로 반드시 이스케이프한다.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchRoom(roomId: string): Promise<Room | null> {
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  const url =
    `${base}/rest/v1/rooms?id=eq.${encodeURIComponent(roomId)}` +
    `&select=title,host_name&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Room[];
  return rows[0] ?? null;
}

function ogTags(room: Room, roomId: string, pageUrl: string): string {
  const host = (room.host_name ?? '').trim();
  const title = (room.title ?? '').trim();

  const heading = host
    ? `everyFreeTime - ${host}님의 ${title} 방 · ${roomId}`
    : `everyFreeTime - ${title} 방 · ${roomId}`;
  const desc = host
    ? `${host}님이 everyFreeTime에서 ${title}방을 만들었어요. 다들 확인해주세요.`
    : `everyFreeTime에서 ${title}방이 열렸어요. 다들 확인해주세요.`;

  return [
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="everyFreeTime" />',
    `<meta property="og:title" content="${esc(heading)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:image" content="${SITE}/og.png" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(heading)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${SITE}/og.png" />`,
  ].join('\n    ');
}

export function injectOg(html: string, room: Room, roomId: string, pageUrl: string): string {
  const heading = ogTags(room, roomId, pageUrl);
  const replaced = html.replace(
    /<!-- og:start[\s\S]*?<!-- og:end -->/,
    `<!-- og:start -->\n    ${heading}\n    <!-- og:end -->`
  );
  const host = (room.host_name ?? '').trim();
  const title = (room.title ?? '').trim();
  const tabTitle = host
    ? `everyFreeTime - ${host}님의 ${title} 방 · ${roomId}`
    : `everyFreeTime - ${title} 방 · ${roomId}`;
  return replaced.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(tabTitle)}</title>`);
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const roomId = url.pathname.match(/^\/room\/([^/]+)/)?.[1] ?? '';

  // 정적 index.html 을 그대로 가져와 head 만 갈아끼운다 (번들 경로가 바뀌어도 따라감)
  const shell = await fetch(new URL('/index.html', url.origin), {
    headers: { accept: 'text/html' },
  });
  let html = await shell.text();

  if (roomId) {
    try {
      const room = await fetchRoom(roomId);
      if (room) html = injectOg(html, room, roomId, `${SITE}${url.pathname}`);
    } catch {
      /* 방 정보를 못 읽으면 기본 태그 그대로 — 페이지 자체는 정상 동작해야 한다 */
    }
  }

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
