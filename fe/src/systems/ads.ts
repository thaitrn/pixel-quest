// Rewarded ad adapter (F9) — SDK chỉ load khi user chọn revive (PRD §8, plan §8 risk).
// M3: stub network adapter; PM chốt ad network thì implement AdNetwork bên dưới,
// KHÔNG import SDK ở top-level — lazy-load trong loadSdk() để không ảnh hưởng bundle/perf.
export interface AdResult { ok: boolean; reason?: 'load_failed' | 'cancelled' | 'busy'; }

export interface AdNetwork {
  name: string;
  /** Lazy-load SDK script nếu cần. Chỉ gọi khi user bấm revive. */
  init(): Promise<void>;
  /** Load rewarded ad. false = không có ad. */
  load(): Promise<boolean>;
  /** Show ad, resolve khi xong. false = user skip / lỗi. */
  show(): Promise<boolean>;
}

/** Stub network cho M3 — giả lập load 1.2s, luôn có ad. */
export const stubNetwork: AdNetwork = {
  name: 'stub',
  async init() { /* stub: không cần SDK ngoài */ },
  async load() { await new Promise(r => setTimeout(r, 600)); return true; },
  async show() { await new Promise(r => setTimeout(r, 600)); return true; },
};

export class AdAdapter {
  private network: AdNetwork | null = null;
  private inited = false;
  private busy = false;
  /** Test seam: cài network thật/stub. */
  setNetwork(n: AdNetwork): void { this.network = n; }

  private async net(): Promise<AdNetwork> {
    if (!this.network) this.network = stubNetwork; // M3: PM chốt network thì đổi ở đây
    if (!this.inited) {
      await this.network.init().catch(() => { throw new Error('init_failed'); });
      this.inited = true;
    }
    return this.network;
  }

  async loadAndShow(): Promise<AdResult> {
    if (this.busy) return { ok: false, reason: 'busy' };
    this.busy = true;
    try {
      let net: AdNetwork;
      try {
        net = await this.net();
      } catch {
        return { ok: false, reason: 'load_failed' };
      }
      const loaded = await net.load().catch(() => false);
      if (!loaded) return { ok: false, reason: 'load_failed' };
      const shown = await net.show().catch(() => false);
      return shown ? { ok: true } : { ok: false, reason: 'cancelled' };
    } finally {
      this.busy = false;
    }
  }
}
