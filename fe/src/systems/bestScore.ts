// PRD 1.3 G5: best score cá nhân theo mode, lưu localStorage riêng khi submit.
// LeaderboardScene luôn hiện ở header (kể cả bảng trống) — đích đo tiến bộ persona A.
import { GameMode } from '../data/modes';

const key = (mode: GameMode) => `retro_best_${mode}`;

export function loadBestScore(mode: GameMode): number {
  try {
    const v = localStorage.getItem(key(mode));
    return v !== null && Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : 0;
  } catch { return 0; }
}

export function recordBestScore(mode: GameMode, score: number): number {
  const prev = loadBestScore(mode);
  const best = Math.max(prev, Math.floor(score));
  try { localStorage.setItem(key(mode), String(best)); } catch { /* ignore */ }
  return best;
}
