// ============ ARCH P1 (batch 3): Mode config tập trung ============
// Toàn bộ thông số khác biệt giữa 2 chế độ nằm ở ĐÂY — duy nhất một nguồn sự thật.
// Các scene không được so sánh chuỗi mode trực tiếp nữa (không `mode === 'hard'`),
// mà lookup MODES[mode] và đọc thuộc tính.
export type GameMode = 'normal' | 'hard';

export interface ModeDef {
  /** Số mạng khởi đầu / hồi sinh (normal 3, hard 1). */
  hearts: number;
  /** Tốc độ enemy patrol px/s (normal 60, hard 65). */
  enemySpeed: number;
  /** Hệ số thêm enemy/spike (normal 1.0, hard 1.5). */
  extrasMul: number;
  /** Label nút chọn mode ở Menu. */
  label: string;
  /** Màu nhận diện mode. */
  color: string;
  /** PRD 1.3 #3 (juice): bật/tắt hiệu ứng particle coin + screen shake chết. */
  effects: boolean;
}

export const MODES: Record<GameMode, ModeDef> = {
  normal: { hearts: 3, enemySpeed: 60, extrasMul: 1.0, label: '▶  NORMAL', color: '#06d6a0', effects: true },
  hard: { hearts: 1, enemySpeed: 65, extrasMul: 1.5, label: '🔥  HARD', color: '#ef476f', effects: true },
};

// ---- Persist mode chọn ở localStorage (key riêng, không dính save data) ----
const MODE_KEY = 'retro_mode_v1';

export function loadMode(): GameMode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    // So sánh chuỗi chỉ nằm trong file modes.ts này (parser), không ở scene.
    return m !== null && m in MODES ? (m as GameMode) : 'normal';
  } catch { return 'normal'; }
}
export function saveMode(m: GameMode): void {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
}
