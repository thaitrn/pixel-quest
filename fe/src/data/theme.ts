// ============ Designer L2 (batch 3): palette token màu chung ============
// Một nơi duy nhất định nghĩa màu hệ thống — các scene import từ đây,
// không hardcode hex rải rác.
export const THEME = {
  /** Màu chính (CTA, tiêu đề, link). */
  PRIMARY: '#06d6a0',
  /** Màu phụ / nhấn (warning, hard mode). */
  SECONDARY: '#ef476f',
  /** Nền app (menu, level select). */
  BG: '#0b0e1a',
  /** Nền nút mặc định + hover + pressed (pressed = đậm hơn nhẹ). */
  BTN_BG: 0x1e2a4a,
  BTN_BG_HOVER: 0x2a3a6a,
  BTN_BG_PRESSED: 0x16203a,
  /** Nền overlay mờ trên game. */
  OVERLAY_BG: 0x000000,
  OVERLAY_ALPHA: 0.7,
  /** Chữ nút / chữ phụ. */
  TEXT: '#e0e0ff',
  TEXT_DIM: '#8a8aa0',
  GOLD: '#ffd166',
} as const;
