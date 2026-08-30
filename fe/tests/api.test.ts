import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from '../src/api/client';
import { AdAdapter, AdNetwork } from '../src/systems/ads';
import { isUuidV4, uuidV4 } from '../src/api/player';

const ok = (body: unknown) => ({ ok: true, status: 201, json: async () => body } as Response);

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('registerPlayer: parse zod OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      ok({ player_id: '6f1c0b7e-4a2e-4c8f-9d3a-111111111111', display_name: 'Jack' })));
    const p = await api.registerPlayer(uuidV4(), 'Jack');
    expect(p.display_name).toBe('Jack');
  });

  it('submitScore: trả rank', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      ok({ score_id: 1, level_id: 2, value: 1500, stars: 3, rank: 7 })));
    const r = await api.submitScore({ player_id: uuidV4(), level_id: 2, value: 1500, stars: 3, duration_s: 42 });
    expect(r.rank).toBe(7);
  });

  it('leaderboard: parse array entry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok([
      { rank: 1, display_name: 'Ace', value: 9999, stars: 3, duration_s: 30, achieved_at: '2026-08-22T10:00:00Z' },
    ])));
    const rows = await api.getLeaderboard(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(9999);
  });

  it('error contract {error:{code,message}} → ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 400, json: async () => ({ error: { code: 'INVALID_VALUE', message: 'value 0..1000000' } }),
    } as Response)));
    await expect(api.submitScore({ player_id: uuidV4(), level_id: 1, value: -5, stars: 0, duration_s: 1 }))
      .rejects.toMatchObject({ code: 'INVALID_VALUE', status: 400 });
  });

  it('network fail → ApiError NETWORK status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch fail'); }));
    await expect(api.getLeaderboard(1)).rejects.toBeInstanceOf(ApiError);
  });

  it('response sai schema → BAD_RESPONSE', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ nope: true })));
    await expect(api.getLeaderboard(1)).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });
});

describe('player id', () => {
  it('uuidV4 hợp lệ format v4', () => {
    for (let i = 0; i < 20; i++) expect(isUuidV4(uuidV4())).toBe(true);
  });
});

describe('AdAdapter', () => {
  const mk = (loadOk: boolean, showOk: boolean, failInit = false): AdNetwork & { initCalled: number; loadCalled: number } => ({
    name: 'test', initCalled: 0, loadCalled: 0,
    async init() { this.initCalled++; if (failInit) throw new Error('sdk'); },
    async load() { this.loadCalled++; return loadOk; },
    async show() { return showOk; },
  } as AdNetwork & { initCalled: number; loadCalled: number });

  it('ok flow: init lazy 1 lần, load rồi show', async () => {
    const n = mk(true, true);
    const a = new AdAdapter();
    a.setNetwork(n);
    expect((await a.loadAndShow()).ok).toBe(true);
    expect((await a.loadAndShow()).ok).toBe(true);
    expect(n.initCalled).toBe(1); // lazy: init đúng 1 lần
    expect(n.loadCalled).toBe(2);
  });

  it('load fail → load_failed, không show', async () => {
    const a = new AdAdapter();
    a.setNetwork(mk(false, true));
    expect(await a.loadAndShow()).toEqual({ ok: false, reason: 'load_failed' });
  });

  it('user cancel show → cancelled', async () => {
    const a = new AdAdapter();
    a.setNetwork(mk(true, false));
    expect(await a.loadAndShow()).toEqual({ ok: false, reason: 'cancelled' });
  });

  it('busy guard: không chạy song song', async () => {
    const a = new AdAdapter();
    a.setNetwork(mk(true, true));
    const p1 = a.loadAndShow();
    const p2 = a.loadAndShow();
    expect((await p2).reason).toBe('busy');
    expect((await p1).ok).toBe(true);
  });

  it('init throw → load_failed, không crash', async () => {
    const a = new AdAdapter();
    a.setNetwork(mk(true, true, true));
    expect(await a.loadAndShow()).toEqual({ ok: false, reason: 'load_failed' });
  });
});
