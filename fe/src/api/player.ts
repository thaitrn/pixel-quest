// Player identity — UUID v4 cố định per device, lưu localStorage.
const PLAYER_KEY = 'retro_player_v1';

export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_KEY);
    if (existing && isUuidV4(existing)) return existing;
    const id = uuidV4();
    localStorage.setItem(PLAYER_KEY, id);
    return id;
  } catch {
    return '00000000-0000-4000-8000-000000000000'; // no-storage fallback (không submit được lên server thật)
  }
}

export function uuidV4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // fallback RFC4122 v4
  const h = '0123456789abcdef';
  const b = Array.from({ length: 36 }, (_, i) => {
    if (i === 8 || i === 13 || i === 18 || i === 23) return '-';
    if (i === 14) return '4';
    const r = (Math.random() * 16) | 0;
    if (i === 19) return h[(r & 3) | 8];
    return h[r];
  });
  return b.join('');
}

export function isUuidV4(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
