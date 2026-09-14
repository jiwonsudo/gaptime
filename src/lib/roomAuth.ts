// 브라우저에 남기는 건 방장 토큰뿐이다(방 관리 권한).
// 제출자는 아무것도 저장하지 않는다 — 수정·삭제할 때마다 이름(+PIN)으로 본인 확인을 거친다.

const OWNER = (roomId: string) => `gaptime:owner:${roomId}`;
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

// ── 튜토리얼 ──
export const hasSeenTutorial = () => read(SEEN_TUTORIAL) === '1';
export const markTutorialSeen = () => write(SEEN_TUTORIAL, '1');
