// Local save — localStorage key `retro_save_v1`, versioned (BR-S2)
export interface LevelRecord { completed: boolean; stars: number; bestScore: number; bestTimeS: number | null; }
export interface SaveData {
  version: 1;
  unlockedLevel: number;              // 1..10
  totalCoins: number;
  levels: Record<number, LevelRecord>;
  achievements: string[];
  playerName: string;
  reviveUsedLastRun: boolean;
  /** PRD 1.3 G5: đã phá đảo màn 10 ở chế độ hard. */
  hardClear: boolean;
}

const KEY = 'retro_save_v1';
// BA G2 (chốt chính sách batch 3): MỘT key dùng CHUNG cho cả normal và hard —
// tiến trình/mở màn/nhân vật là của người chơi, không tách theo mode. Menu hiển thị
// "Tiến trình dùng chung 2 chế độ". Nếu sau này cần tách, bump version key (retro_save_v2_mode).

export function defaultSave(): SaveData {
  return {
    version: 1, unlockedLevel: 1, totalCoins: 0,
    levels: {}, achievements: [], playerName: '', reviveUsedLastRun: false,
    hardClear: false,
  };
}

export function loadSave(storage: Storage | null = safeStorage()): SaveData {
  const s = storage ?? null;
  if (!s) return defaultSave();
  try {
    const raw = s.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== 1) return defaultSave();
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function saveSave(data: SaveData, storage: Storage | null = safeStorage()): void {
  try { storage?.setItem(KEY, JSON.stringify(data)); } catch { /* quota/private mode: ignore */ }
}

export function recordLevelResult(
  data: SaveData, levelId: number, stars: number, score: number, timeS: number,
): { data: SaveData; newUnlock: boolean } {
  const prev = data.levels[levelId] ?? { completed: false, stars: 0, bestScore: 0, bestTimeS: null };
  const rec: LevelRecord = {
    completed: prev.completed || true,
    stars: Math.max(prev.stars, stars),
    bestScore: Math.max(prev.bestScore, score),
    bestTimeS: prev.bestTimeS === null ? timeS : Math.min(prev.bestTimeS, timeS),
  };
  const levels = { ...data.levels, [levelId]: rec };
  // PRD 1.3 #1: unlock tối đa 15 màn (world 3 procedural 11–15)
  const MAX_LEVEL = 15;
  const newUnlock = levelId >= data.unlockedLevel && data.unlockedLevel < MAX_LEVEL;
  return {
    data: { ...data, levels, unlockedLevel: newUnlock ? Math.min(levelId + 1, MAX_LEVEL) : data.unlockedLevel },
    newUnlock,
  };
}

export function grantAchievement(data: SaveData, id: string): { data: SaveData; granted: boolean } {
  if (data.achievements.includes(id)) return { data, granted: false };
  return { data: { ...data, achievements: [...data.achievements, id] }, granted: true };
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
