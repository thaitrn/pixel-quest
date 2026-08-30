// SFX Mario-style sinh bang WebAudio (khong file ngoai). KHONG nhac nen - chi SFX.
// Pattern theo maybay29 audio.ts: AudioContext singleton, unlock iOS o touch dau,
// muted luu localStorage. Test hook: window.__sfxCalls dem moi lenh sfx duoc goi.
const MUTE_KEY = 'pq_muted';

let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
    const Ctor = AC.AudioContext ?? AC.webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
  }
  return ctx;
}

/** Goi trong handler touch/click dau tien de resume AudioContext (iOS Safari). */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function isMuted(): boolean { return muted; }

export function toggleMuted(): boolean {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  return muted;
}


function track(name: string): void {
  try {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __sfxCalls?: Record<string, number> };
    if (!w.__sfxCalls) w.__sfxCalls = {};
    w.__sfxCalls[name] = (w.__sfxCalls[name] ?? 0) + 1;
  } catch { /* ignore */ }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number): void {
  if (muted) return;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, freq), t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Noise ngan (buffer white noise) - dung cho stomp. */
function noise(dur: number, gain: number, delay = 0): void {
  if (muted) return;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(1200, t0);
  filt.frequency.exponentialRampToValueAtTime(200, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** Nhay - "boing" square wave sweep len (Mario jump). */
  jump: () => { track('jump'); tone(200, 0.18, 'square', 0.12, 0, 640); },
  /** Double-jump / power-up - "vu" sweep cao hon, nhanh hon. */
  djump: () => { track('djump'); tone(320, 0.16, 'square', 0.12, 0, 980); tone(480, 0.14, 'triangle', 0.08, 0.04, 1320); },
  /** An xu - "ting" 2 not B-E cao (chuan Mario coin: B5->E6). */
  coin: () => { track('coin'); tone(988, 0.09, 'square', 0.12); tone(1319, 0.30, 'square', 0.12, 0.09); },
  /** Gian dich - stomp "thup": noise ngan + pitch xuong. */
  stomp: () => { track('stomp'); noise(0.12, 0.18); tone(300, 0.14, 'square', 0.14, 0, 90); },
  /** Mat mang / chet - jingle ngan 3 not xuong. */
  hurt: () => { track('hurt'); tone(494, 0.1, 'square', 0.14); tone(392, 0.1, 'square', 0.14, 0.1); tone(294, 0.22, 'square', 0.14, 0.2); },
  /** Hoan thanh man - fanfare 5 not len vui (kieu level clear). */
  complete: () => {
    track('complete');
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.13, i * 0.11));
    tone(1568, 0.4, 'triangle', 0.1, 0.55);
  },
  /** Badge/achievement - chime sang. */
  badge: () => { track('badge'); tone(1047, 0.12, 'triangle', 0.14); tone(1319, 0.12, 'triangle', 0.14, 0.1); tone(1568, 0.24, 'triangle', 0.12, 0.2); },
  /** Click nut menu / chon man. */
  click: () => { track('click'); tone(660, 0.06, 'square', 0.08); tone(880, 0.06, 'square', 0.06, 0.05); },
};
