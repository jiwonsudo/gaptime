// 방장 토큰 / 제출자 토큰은 서버가 발급하고 이 브라우저에만 저장한다.
// 서버 재요청 시에만 쓰이며 다른 사람은 볼 수 없다. 크로스 기기는 닉네임+PIN 또는 개인 링크로.

const OWNER = (roomId: string) => `gaptime:owner:${roomId}`;
const EDITOR = (roomId: string) => `gaptime:editor:${roomId}`; // JSON { slug, token }
const SEEN_TUTORIAL = 'gaptime:seenTutorial';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode 등 */
  }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// ── 방장 ──
export const getOwnerToken = (roomId: string) => read(OWNER(roomId));
export const setOwnerToken = (roomId: string, token: string) => write(OWNER(roomId), token);
export const clearOwnerToken = (roomId: string) => remove(OWNER(roomId));

// ── 제출자 (같은 기기 자동 복원) ──
export interface LocalEditor {
  slug: string;
  token: string;
}
export function getLocalEditor(roomId: string): LocalEditor | null {
  const raw = read(EDITOR(roomId));
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v.slug === 'string' && typeof v.token === 'string') return v;
  } catch {
    /* noop */
  }
  return null;
}
export function setLocalEditor(roomId: string, editor: LocalEditor) {
  write(EDITOR(roomId), JSON.stringify(editor));
}
export function clearLocalEditor(roomId: string) {
  remove(EDITOR(roomId));
}

// ── 튜토리얼 ──
export const hasSeenTutorial = () => read(SEEN_TUTORIAL) === '1';
export const markTutorialSeen = () => write(SEEN_TUTORIAL, '1');
