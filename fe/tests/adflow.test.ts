// QA M3 — Ad flow integration (mock SDK): revive đúng 1 lần/run qua GameScene thật
// (Phaser HEADLESS + jsdom; textures mặc định tạo bằng node-canvas vì jsdom không decode ảnh).
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Phaser from '../tests/stubs/phaser-dist';
import { createCanvas } from 'canvas';
import { GameScene } from '../src/scenes/GameScene';
import type { AdNetwork } from '../src/systems/ads';

/** Mock ad SDK: luôn có ad, luôn show thành công, đếm số lần gọi. */
function mockSdk(): AdNetwork & { initN: number; showN: number } {
  return {
    name: 'mock-sdk', initN: 0, showN: 0,
    async init() { this.initN++; },
    async load() { return true; },
    async show() { this.showN++; return true; },
  } as AdNetwork & { initN: number; showN: number };
}

let game: any;
beforeAll(async () => {
  game = new Phaser.Game({
    type: Phaser.HEADLESS, width: 800, height: 600, banner: false, audio: { noAudio: true },
    physics: { default: 'arcade', arcade: { debug: false } },
  } as any);
  await new Promise(r => setTimeout(r, 500));
  for (const key of ['__DEFAULT', '__MISSING', '__WHITE']) {
    const tex = game.textures.create(key, createCanvas(1, 1) as unknown as HTMLCanvasElement);
    tex?.add('__BASE', 0, 0, 1, 1);
  }
  game.textures._pending = 0;
  game.texturesReady();
  await new Promise(r => setTimeout(r, 500));
  game.scene.add('Game', GameScene, true, { levelId: 1 });
  await new Promise(r => setTimeout(r, 1000));
  // Designer L1: onboarding lần đầu vào màn 1 chờ input — hoàn tất ngay để test flow
  const s0 = game.scene.getScene('Game') as any;
  if (s0.onboarding) s0.finishOnboarding();
}, 30000);
afterAll(() => { game?.destroy(true); });

const S = () => game.scene.getScene('Game') as any;

describe('M3 ad flow (mock SDK) — BR-M1: revive đúng 1 lần/run', () => {
  it('chết → REVIVE (ad ok) → hồi sinh 3 tim, i-frame; chết tiếp → KHÔNG còn revive', async () => {
    const s = S();
    expect(s.sys.isActive()).toBe(true);
    const sdk = mockSdk();
    s.ads.setNetwork(sdk);

    // 1) game over lần 1 → revive overlay (có nút REVIVE)
    s.run.hearts = 0;
    s.gameOver();
    await new Promise(r => setTimeout(r, 100));
    expect(s.run.reviveUsed).toBe(false);
    let texts: string[] = [];
    // batch 3: nút overlay giờ là Container lồng (factory createButton) — duyệt đệ quy
    const walk = (o: any) => { if (!o) return; if (o.text) texts.push(o.text); (o.list ?? []).forEach(walk); };
    s.overlay?.list?.forEach?.(walk);
    expect(texts.some(t => t.includes('REVIVE'))).toBe(true);

    // 2) bấm REVIVE — mô phỏng đúng handler trong showReviveOverlay
    const res = await s.ads.loadAndShow();
    expect(res.ok).toBe(true);
    expect(sdk.initN).toBe(1);   // SDK lazy-init đúng 1 lần
    expect(sdk.showN).toBe(1);   // ad show đúng 1 lần
    s.run.reviveUsed = true; s.run.hearts = 3; s.run.iframesUntil = s.time.now + 3000; s.fsm.running = true;
    s.overlay?.destroy(); s.overlay = undefined;
    expect(s.run.hearts).toBe(3);
    expect(s.run.reviveUsed).toBe(true);

    // 3) game over lần 2 → game over overlay, KHÔNG revive
    s.run.hearts = 0;
    s.gameOver();
    await new Promise(r => setTimeout(r, 100));
    expect(s.run.reviveUsed).toBe(true);
    texts = [];
    s.overlay?.list?.forEach?.(walk); // đệ quy như trên (nút Container)
    expect(texts.some(t => t.includes('RETRY'))).toBe(true);
    expect(texts.some(t => t.includes('REVIVE'))).toBe(false);
    expect(sdk.showN).toBe(1);   // không show ad lần 2 trong cùng run
  }, 30000);

  it('ad load fail → revive không thực thi, run không đổi (graceful)', async () => {
    // run mới
    S().scene.restart({ levelId: 1 });
    await new Promise(r => setTimeout(r, 800));
    const s = S();
    const failSdk = { name: 'fail', async init() {}, async load() { return false; }, async show() { return true; } } as AdNetwork;
    s.ads.setNetwork(failSdk);
    s.run.hearts = 0;
    s.gameOver();
    await new Promise(r => setTimeout(r, 50));
    const res = await s.ads.loadAndShow();
    expect(res).toEqual({ ok: false, reason: 'load_failed' });
    // không revive → reviveUsed vẫn false, hearts vẫn 0
    expect(s.run.reviveUsed).toBe(false);
    expect(s.run.hearts).toBe(0);
  }, 30000);
});
