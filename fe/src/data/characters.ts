// 4 nhân vật THUẦN COSMETIC (PRD 1.1 §2) — chỉ màu + tên/mô tả vui.
// BA G4: 2/4 nhân vật khóa, mở khi qua màn 5 (số level đã ghi trong save >= requiredLevels).
export interface CharacterDef { id: string; name: string; color: number; desc: string; requiredLevels: number; }

export const CHARACTERS: CharacterDef[] = [
  { id: 'red',    name: 'Đỏ',    color: 0xff5252, desc: 'Dũng cảm như tương ớt', requiredLevels: 0 },
  { id: 'blue',   name: 'Xanh',  color: 0x4fc3f7, desc: 'Lạnh lùng như cốc đá', requiredLevels: 0 },
  { id: 'green',  name: 'Xanh lá', color: 0x81c784, desc: 'Hòa bình như vườn rau', requiredLevels: 5 },
  { id: 'yellow', name: 'Vàng',  color: 0xffd166, desc: 'Sáng sủa như trứng tráng', requiredLevels: 5 },
];

/** BA G4: mở khóa khi đã hoàn thành >= requiredLevels màn (đếm số record trong save.levels). */
export function isCharacterUnlocked(c: CharacterDef, levelsDone: number): boolean {
  return levelsDone >= c.requiredLevels;
}

const KEY = 'retro_char_v1';

export function loadCharacterId(): string {
  try { return localStorage.getItem(KEY) ?? CHARACTERS[0].id; } catch { return CHARACTERS[0].id; }
}
export function saveCharacterId(id: string): void {
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
}
export function characterById(id: string): CharacterDef {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}
