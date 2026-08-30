// Touch input — 3 hành động (kén UI §5):
//  - Nửa TRÁI giữ = chạy trái (lùi)
//  - Nửa PHẢI giữ = chạy phải (tới)
//  - Nửa PHẢI tap ngắn (<200ms) = nhảy
// Không nút to che gameplay — chỉ 2 hint mờ ở góc + nút pause nhỏ.
export type TouchButton = 'left' | 'right' | 'jump' | 'pause';

const TAP_MS = 200;

export class TouchInput {
  private held = new Set<TouchButton>();
  private taps: TouchButton[] = [];
  private onChange?: (b: TouchButton, down: boolean) => void;

  attach(onChange?: (b: TouchButton, down: boolean) => void): void {
    this.onChange = onChange;
    const root = document.getElementById('touch-ui');
    if (!root) return;
    if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
    root.classList.add('visible');

    // Nửa trái: giữ đơn thuần = chạy trái. Track MỖI touch id riêng để
    // multi-touch không ghi đè: chỉ clear 'left' khi ngón cuối trong zone thả.
    const zl = document.getElementById('zone-left');
    if (zl) {
      const ids = new Set<number>();
      const down = (e: Event) => {
        e.preventDefault();
        if (e instanceof TouchEvent) for (const t of e.changedTouches) ids.add(t.identifier);
        const first = !this.held.has('left');
        if (first) { this.held.add('left'); this.onChange?.('left', true); }
      };
      const up = (e: Event) => {
        e.preventDefault();
        if (e instanceof TouchEvent) for (const t of e.changedTouches) ids.delete(t.identifier);
        else ids.clear();
        if (ids.size === 0 && this.held.has('left')) {
          this.held.delete('left'); this.onChange?.('left', false);
        }
      };
      zl.addEventListener('touchstart', down, { passive: false });
      zl.addEventListener('touchend', up, { passive: false });
      zl.addEventListener('touchcancel', up, { passive: false });
      zl.addEventListener('mousedown', down);
      zl.addEventListener('mouseup', up);
      zl.addEventListener('mouseleave', up);
    }

    // Nửa phải: giữ = chạy phải; thả sớm <TAP_MS = tap 'jump'.
    // TouchStream chỉ cần ~1 frame giữ để velocity đảo chiều nên down
    // 'right' ngay lập tức rồi thu hồi khi enough tap là mượt (không lag).
    const zr = document.getElementById('zone-right');
    if (zr) {
      // Track MỖI touch id riêng. Tap-vs-hold tính từ thời điểm ngón ĐẦU TIÊN
      // chạm zone; 'right' chỉ clear khi ngón cuối cùng trong zone thả.
      // Fix bug: trước đây flag `active` đơn lẻ + touchend của ngón khác có
      // thể clear held nhưng để active=true → mọi down sau bị nuốt (input chết).
      const ids = new Set<number>();
      let downAt = 0;
      const end = (e: Event) => {
        e.preventDefault();
        if (e instanceof TouchEvent) for (const t of e.changedTouches) ids.delete(t.identifier);
        else ids.clear();
        if (ids.size === 0 && this.held.has('right')) {
          this.held.delete('right');
          this.onChange?.('right', false);
          if (performance.now() - downAt < TAP_MS) {
            this.taps.push('jump');
            this.onChange?.('jump', true);
          }
        }
      };
      const down = (e: Event) => {
        e.preventDefault();
        if (e instanceof TouchEvent) for (const t of e.changedTouches) ids.add(t.identifier);
        const first = !this.held.has('right');
        if (first) {
          downAt = performance.now();
          this.held.add('right');
          this.onChange?.('right', true);
        }
      };
      zr.addEventListener('touchstart', down, { passive: false });
      zr.addEventListener('touchend', end, { passive: false });
      zr.addEventListener('touchcancel', end, { passive: false });
      zr.addEventListener('mousedown', down);
      zr.addEventListener('mouseup', end);
      zr.addEventListener('mouseleave', end);
    }

    const pb = document.getElementById('btn-pause');
    if (pb) {
      const down = (e: Event) => { e.preventDefault(); this.onChange?.('pause', true); };
      pb.addEventListener('touchstart', down, { passive: false });
      pb.addEventListener('mousedown', down);
    }
    // hint-* là pointer-events:none (chỉ visual) — không cần listener
  }

  isDown(b: TouchButton): boolean { return this.held.has(b); }
  drainTaps(): TouchButton[] { const t = this.taps; this.taps = []; return t; }
}
