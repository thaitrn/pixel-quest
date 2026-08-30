// Watchdog unit test — chống đứng game (fps thấp / RAF đứng), hồi phục 2 tầng.
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { startWatchdog } from '../src/systems/watchdog';

/** Fake Phaser.Game: chỉ những phần watchdog dùng (loop + scene + input). */
function fakeGame(opts: { fps?: number; gameScene?: boolean } = {}) {
  const loop = {
    frame: 1000,
    actualFps: opts.fps ?? 60,
    running: true,
    sleep: vi.fn(),
    resume: vi.fn(),
  };
  const scenes = opts.gameScene === false ? [] : [{ scene: { key: 'Game' } }];
  const resetKeys = vi.fn();
  return {
    loop, resetKeys,
    game: {
      loop,
      scene: {
        isActive: (k: string) => k === 'Game' && opts.gameScene !== false,
        getScenes: () => scenes as never[],
      },
      input: { keyboard: { resetKeys } },
    } as never,
  };
}

/** startWatchdog với interval giả — trả về hàm tick thủ công. */
function manual(game: unknown, deps: Record<string, unknown> = {}) {
  let tick: () => void = () => {};
  const h = startWatchdog(game as never, {
    setIntervalFn: (fn) => { tick = fn; return 1; },
    clearIntervalFn: () => {},
    ...deps,
  });
  return { h, tick: () => tick() };
}

describe('watchdog', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('fps bình thường → không can thiệp (không sleep/reload)', () => {
    const f = fakeGame({ fps: 60 });
    const reload = vi.fn();
    const { h, tick } = manual(f.game, { reloadFn: reload });
    for (let i = 0; i < 5; i++) { f.loop.frame += 60; tick(); }
    expect(reload).not.toHaveBeenCalled();
    expect(f.loop.sleep).not.toHaveBeenCalled();
    h.stop();
  });

  it('RAF đứng (frame không tăng) lần 1 → sleep/resume + resetKeys, không reload', () => {
    const f = fakeGame({ fps: 60 });
    const reload = vi.fn();
    const { h, tick } = manual(f.game, { reloadFn: reload });
    tick(); tick(); // frame không tăng giữa 2 lần đo → frozen
    expect(f.loop.sleep).toHaveBeenCalledTimes(1);
    expect(f.loop.resume).toHaveBeenCalledTimes(1);
    expect(f.resetKeys).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    h.stop();
  });

  it('đứng 2 lần liên tiếp → reload', () => {
    const f = fakeGame({ fps: 2 });
    const reload = vi.fn();
    const { h, tick } = manual(f.game, { reloadFn: reload });
    tick(); f.loop.frame += 60; // strike 1 (fps thấp)
    tick(); f.loop.frame += 60; // strike 2 → reload
    expect(reload).toHaveBeenCalledTimes(1);
    h.stop();
  });

  it('không ở scene Game → không can thiệp (không reload giữa menu)', () => {
    const f = fakeGame({ fps: 1, gameScene: false });
    const reload = vi.fn();
    const { h, tick } = manual(f.game, { reloadFn: reload });
    tick(); tick(); tick();
    expect(reload).not.toHaveBeenCalled();
    expect(f.loop.sleep).not.toHaveBeenCalled();
    h.stop();
  });
});
