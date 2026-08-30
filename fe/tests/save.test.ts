import { describe, it, expect, beforeEach } from 'vitest';
import { loadSave, saveSave, recordLevelResult, grantAchievement, defaultSave } from '../src/systems/save';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

let storage: MemStorage;
beforeEach(() => { storage = new MemStorage(); });

describe('save', () => {
  it('default save khi trống', () => {
    const s = loadSave(storage);
    expect(s.unlockedLevel).toBe(1);
    expect(s.achievements).toEqual([]);
  });

  it('save/load roundtrip', () => {
    const s = defaultSave();
    s.totalCoins = 42;
    saveSave(s, storage);
    expect(loadSave(storage).totalCoins).toBe(42);
  });

  it('corrupt JSON → default', () => {
    storage.setItem('retro_save_v1', '{oops');
    expect(loadSave(storage).unlockedLevel).toBe(1);
  });

  it('recordLevelResult: unlock level kế (BR-L1/L2)', () => {
    const s = defaultSave();
    const { data, newUnlock } = recordLevelResult(s, 1, 3, 1500, 40);
    expect(newUnlock).toBe(true);
    expect(data.unlockedLevel).toBe(2);
    expect(data.levels[1].stars).toBe(3);
    expect(data.levels[1].bestTimeS).toBe(40);
  });

  it('recordLevelResult: giữ best (stars/score max, time min)', () => {
    let s = defaultSave();
    s = recordLevelResult(s, 1, 1, 500, 90).data;
    s = recordLevelResult(s, 1, 3, 400, 60).data;
    expect(s.levels[1].stars).toBe(3);
    expect(s.levels[1].bestScore).toBe(500);
    expect(s.levels[1].bestTimeS).toBe(60);
  });

  it('không unlock vượt quá 15 (PRD 1.3: cap mới)', () => {
    const { data } = recordLevelResult(defaultSave(), 10, 3, 9999, 30);
    expect(data.unlockedLevel).toBe(11); // qua 10 mở 11
  });

  // PRD 1.3 batch 4
  it('qua màn 10 mở màn 11 (unlock tối đa 15)', () => {
    const { data, newUnlock } = recordLevelResult(defaultSave(), 10, 3, 9999, 30);
    expect(newUnlock).toBe(true);
    expect(data.unlockedLevel).toBe(11);
    const last = recordLevelResult(data, 15, 3, 9999, 30);
    expect(last.data.unlockedLevel).toBe(15);
  });

  it('default save có hardClear=false', () => {
    expect(defaultSave().hardClear).toBe(false);
  });

  it('grantAchievement idempotent (BR-A1)', () => {
    let s = defaultSave();
    const r1 = grantAchievement(s, 'first_blood');
    const r2 = grantAchievement(r1.data, 'first_blood');
    expect(r1.granted).toBe(true);
    expect(r2.granted).toBe(false);
    expect(r2.data.achievements).toEqual(['first_blood']);
  });
});
