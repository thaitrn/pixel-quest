/**
 * FE watchdog chống đứng game (bug Safari iOS qua tunnel: main thread treo khi tap nhảy nhanh).
 * Cứ 3s kiểm tra: nếu tab visible + đang ở scene 'Game' mà
 *   - actualFps < 10, HOẶC
 *   - RAF đứng (game.loop.frame không tăng giữa 2 lần đo)
 * thì hồi phục: lần 1 nhẹ (sleep/resume loop + reset input stuck),
 * lần 2 liên tiếp: location.reload() (sếp xác nhận reload là chữa được).
 * KHÔNG đụng touch.ts, KHÔNG reload ở menu/scene khác.
 */

export interface WatchdogHandle { stop(): void; }

/** Test hook: nếu intervalFn cung cấp, nó nhận (tick) và tự điều khiển nhịp. */
export interface WatchdogDeps {
  setIntervalFn?: (fn: () => void, ms: number) => unknown;
  clearIntervalFn?: (id: unknown) => void;
  reloadFn?: () => void;
  warnFn?: (...args: unknown[]) => void;
  intervalMs?: number;
}

export function startWatchdog(game: Phaser.Game, deps: WatchdogDeps = {}): WatchdogHandle {
  const setIntervalFn = deps.setIntervalFn ?? ((fn: () => void, ms: number) => setInterval(fn, ms));
  const clearIntervalFn = deps.clearIntervalFn ?? ((id: unknown) => clearInterval(id as ReturnType<typeof setInterval>));
  const reload = deps.reloadFn ?? (() => location.reload());
  const warn = deps.warnFn ?? ((...a: unknown[]) => console.warn(...a));

  let lastFrame = -1;
  let strikes = 0;

  const inGameScene = (): boolean =>
    game.scene.isActive('Game') || game.scene.getScenes(true).some(s => s.scene.key === 'Game');

  const resetInput = (): void => {
    try {
      if (game.input.keyboard && typeof (game.input.keyboard as unknown as { resetKeys?: () => void }).resetKeys === 'function') {
        (game.input.keyboard as unknown as { resetKeys: () => void }).resetKeys();
      }
    } catch { /* ignore */ }
  };

  const tick = (): void => {
    // Chỉ chạy khi tab visible và đang ở scene Game — không reload giữa menu.
    if (document.visibilityState !== 'visible') return;
    if (!inGameScene()) { strikes = 0; lastFrame = -1; return; }

    const loop = game.loop as unknown as { frame: number; actualFps: number; sleep(): void; resume(): void; running: boolean };
    const frozen = loop.frame === lastFrame; // RAF đứng: frame không tăng
    lastFrame = loop.frame;
    const lowFps = loop.actualFps < 10;
    if (!frozen && !lowFps) { strikes = 0; return; }

    strikes++;
    if (strikes === 1) {
      // Lần 1: biện pháp nhẹ — sleep/resume loop + giải phóng phím held.
      warn('[watchdog] recovered (soft: loop sleep/resume + reset input)', { fps: loop.actualFps, frozen });
      try { if (loop.running) loop.sleep(); } catch { /* ignore */ }
      try { loop.resume(); } catch { /* ignore */ }
      resetInput();
    } else {
      // Lần 2 liên tiếp: reload trang.
      warn('[watchdog] recovered (reload)', { fps: loop.actualFps, frozen });
      reload();
    }
  };

  const id = setIntervalFn(tick, deps.intervalMs ?? 3000);
  return { stop: () => clearIntervalFn(id) };
}
