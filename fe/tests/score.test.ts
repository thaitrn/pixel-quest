import { describe, it, expect } from 'vitest';
import { calcStars, calcRunScore, clampScore, padScore } from '../src/systems/score';

describe('score/stars (BR-L3 — 3 sao độc lập)', () => {
  it('chưa xong: chỉ tính sao coins + no-death', () => expect(calcStars(false, 150, 0)).toBe(2));
  it('chưa xong, không coin, có chết → 0 sao', () => expect(calcStars(false, 50, 2)).toBe(0));
  it('1 sao hoàn thành', () => expect(calcStars(true, 0, 2)).toBe(1));
  it('2 sao: xong + 100 coins', () => expect(calcStars(true, 100, 1)).toBe(2));
  it('3 sao: xong + coins + no-death', () => expect(calcStars(true, 120, 0)).toBe(3));
  it('coin <100 không tính sao 2', () => expect(calcStars(true, 99, 0)).toBe(2));
});

describe('calcRunScore', () => {
  it('coin×10 + stomp×50', () => expect(calcRunScore(10, 2, false, 0)).toBe(200));
  it('complete bonus + time bonus', () => {
    const s = calcRunScore(0, 0, true, 30); // 1000 + max(0,500-300)=200
    expect(s).toBe(1200);
  });
});

describe('clamp/pad', () => {
  it('clamp âm & NaN → 0', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(NaN)).toBe(0);
  });
  it('clamp trên 999999', () => expect(clampScore(1_500_000)).toBe(999999));
  it('pad 6 digit', () => expect(padScore(42)).toBe('000042'));
});
