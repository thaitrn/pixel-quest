import { describe, it, expect } from 'vitest';
import { LEVELS, generateLevel, levelPalette } from '../src/data/levels';

describe('PRD 1.3: màn 11–15 procedural (world 3)', () => {
  it('đủ 15 level, 11–15 thuộc world 3', () => {
    expect(LEVELS).toHaveLength(15);
    LEVELS.filter(l => l.id >= 11).forEach(l => {
      expect(l.world).toBe(3);
      expect(l.name.length).toBeGreaterThan(0);
    });
  });

  it('seed cố định: vào màn 11 hai lần → grid giống nhau', () => {
    expect(generateLevel(11).grid).toEqual(generateLevel(11).grid);
    expect(generateLevel(13).grid).toEqual(generateLevel(13).grid);
    expect(generateLevel(11).grid).not.toEqual(generateLevel(12).grid);
  });

  it('mỗi màn 11–15 có đúng 1 P và 1 F, có coin + enemy', () => {
    LEVELS.filter(l => l.id >= 11).forEach(l => {
      const s = l.grid.join('');
      expect(s.split('P').length - 1).toBe(1);
      expect(s.split('F').length - 1).toBe(1);
      expect((s.match(/o/g) ?? []).length).toBeGreaterThan(10);
      expect((s.match(/[ec]/g) ?? []).length).toBeGreaterThan(0);
    });
  });

  it('density tăng theo id (enemy world 3 nhiều hơn world 2 trung bình)', () => {
    const avg = (ids: number[]) => ids.reduce((s, id) =>
      s + (generateLevel(id).grid.join('').match(/[ec]/g) ?? []).length, 0) / ids.length;
    const w2 = avg([6, 7, 8, 9, 10]);
    const w3 = avg([11, 12, 13, 14, 15]);
    expect(w3).toBeGreaterThan(w2);
  });

  it('palette 11–15 fallback vòng lặp không crash', () => {
    for (let id = 11; id <= 15; id++) expect(levelPalette(id).sky).toBeGreaterThan(0);
  });
});
