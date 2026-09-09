// 닉네임: 표시 이름과 링크용 슬러그를 함께 다룬다.

const RESERVED = new Set([
  'admin',
  'administrator',
  '관리자',
  '운영',
  '운영자',
  '방장',
  'host',
  'owner',
  'system',
  'null',
  'undefined',
  'me',
  'new',
  'api',
  'r',
]);

// 완전하지 않은 기본 블록리스트. 방장이 개별 제출 삭제로 보완.
const PROFANITY = [
  '시발',
  '씨발',
  '병신',
  '지랄',
  '좆',
  '개새끼',
  '새끼',
  '꺼져',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'nigger',
  'faggot',
];

export interface NicknameCheck {
  ok: boolean;
  slug: string;
  displayName: string;
  error?: string;
}

export function normalizeDisplayName(raw: string): string {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 20);
}

export function toSlug(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function checkNickname(raw: string): NicknameCheck {
  const displayName = normalizeDisplayName(raw);
  const slug = toSlug(displayName);

  if (displayName.length < 2) {
    return { ok: false, slug, displayName, error: '2자 이상 입력해주세요' };
  }
  if ([...displayName].length > 20) {
    return { ok: false, slug, displayName, error: '20자 이하로 입력해주세요' };
  }
  if (slug.length < 2 || [...slug].length > 20) {
    return { ok: false, slug, displayName, error: '링크로 쓸 수 있는 이름이 아니에요 (한글·영문·숫자 위주로)' };
  }
  if (RESERVED.has(slug)) {
    return { ok: false, slug, displayName, error: '쓸 수 없는 이름이에요' };
  }
  const lowered = displayName.toLowerCase().replace(/\s/g, '');
  if (PROFANITY.some((w) => lowered.includes(w))) {
    return { ok: false, slug, displayName, error: '부적절한 표현이 포함돼 있어요' };
  }
  return { ok: true, slug, displayName };
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
