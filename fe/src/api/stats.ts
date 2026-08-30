// G7 metric session→BE: đếm round/giây chơi/hard_ratio, POST /v1/stats
// best-effort — KHÔNG bao giờ chặn gameplay khi fail.
import { getPlayerId } from './player';

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE;
  if (typeof raw === 'string' && raw.trim()) return raw.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:8390';
  return '';
}

const BASE = resolveApiBase();

const state = { rounds: 0, hard: 0, start: 0 };

export function __statState(): { rounds: number; hard: number; start: number } {
  return { ...state };
}

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Gọi mỗi lần VÀO màn (create). hard=true khi mode hard (hearts===1). */
export function statRoundStart(hard: boolean): void {
  state.rounds++;
  if (hard) state.hard++;
  if (!state.start) state.start = Date.now();
}

/** Flush metric lên BE (complete màn hoặc unload). Reset sau khi gửi. */
export function statSend(): void {
  try {
    if (state.rounds <= 0 || !state.start) return;
    if (!BASE) return;
    const body = JSON.stringify({
      player_id: getPlayerId(),
      date: localDate(),
      rounds: state.rounds,
      play_seconds: Math.max(0, Math.round((Date.now() - state.start) / 1000)),
      hard_ratio: state.hard / state.rounds,
    });
    state.rounds = 0; state.hard = 0; state.start = Date.now();
    // BE yêu cầu player đã register trước khi nhận stats (PLAYER_NOT_FOUND).
    // register best-effort trước (id player được BE upsert display_name), rồi POST stats.
    const send = (): void => {
      void fetch(`${BASE}/v1/stats`, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body,
      }).catch(() => {
        try {
          navigator.sendBeacon(`${BASE}/v1/stats`, new Blob([body], { type: 'application/json' }));
        } catch { /* bỏ qua */ }
      });
    };
    void fetch(`${BASE}/v1/players`, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: getPlayerId(), display_name: 'Player' }),
    }).catch(() => null).finally(send);
  } catch { /* G7: metric KHÔNG chặn gameplay */ }
}

/** Đăng ký flush khi rời trang (pagehide/beforeunload) — idempotent. */
export function installUnloadFlush(): void {
  if (typeof window === 'undefined' || (window as unknown as { __pqStatsFlush?: boolean }).__pqStatsFlush) return;
  (window as unknown as { __pqStatsFlush?: boolean }).__pqStatsFlush = true;
  window.addEventListener('pagehide', statSend);
  window.addEventListener('beforeunload', statSend);
}
