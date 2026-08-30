import { describe, it, expect } from 'vitest';
import { LEVELS, generateLevel } from '../src/data/levels';

describe('levels (15 level / 3 world — PRD 1.3)', () => {
  it('đủ 15 level', () => expect(LEVELS).toHaveLength(15));

  it('world mapping: 1–5 w1, 6–10 w2, 11–15 w3', () => {
    LEVELS.forEach(l => expect(l.world).toBe(l.id <= 5 ? 1 : l.id <= 10 ? 2 : 3));
  });

  it('deterministic: cùng id → cùng grid (BR-I3)', () => {
    expect(generateLevel(3).grid).toEqual(generateLevel(3).grid);
    expect(generateLevel(3).grid).not.toEqual(generateLevel(4).grid);
  });

  it('mỗi level có đúng 1 player start và 1 flag', () => {
    LEVELS.forEach(l => {
      const p = l.grid.join('').split('P').length - 1;
      const f = l.grid.join('').split('F').length - 1;
      expect(p).toBe(1);
      expect(f).toBe(1);
    });
  });

  it('có coin và enemy', () => {
    LEVELS.forEach(l => {
      const s = l.grid.join('');
      expect((s.match(/o/g) ?? []).length).toBeGreaterThan(10);
      expect((s.match(/[ec]/g) ?? []).length).toBeGreaterThan(0);
    });
  });

  it('world 2 khó hơn world 1 (nhiều enemy hơn trung bình)', () => {
    const count = (w: number) => LEVELS.filter(l => l.world === w)
      .reduce((s, l) => s + (l.grid.join('').match(/[ec]/g) ?? []).length, 0);
    expect(count(2)).toBeGreaterThan(count(1));
  });
});
