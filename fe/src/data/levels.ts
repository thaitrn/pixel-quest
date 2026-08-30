// Level content — 10 level / 2 world (PRD §4 chốt). Grid ASCII, tile 32px.
// Legend: '#' ground, '=' one-way platform, 'P' player, 'F' flag, 'o' coin, 'H' heart,
//         'S' star, 'B' speed boost, 'J' double jump, 'e' patrol enemy, 'c' chaser, '^' spike
export interface LevelDef {
  id: number; world: number; name: string; difficulty: number;
  grid: string[]; cols: number; rows: number;
}

const COLS = 48, ROWS = 15, GROUND_Y = 13;

// Deterministic PRNG (mulberry32) — level giống nhau mỗi lần chơi (BR-I3: config, không random runtime)
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// PRD 1.3 #1: màn 11–15 procedural (world 3) — seed cố định theo levelId (tái lập),
// density enemy/platform tăng theo id (difficulty world 3 = 6..10, nối tiếp world 2).
export function generateLevel(id: number): LevelDef {
  const world = id <= 5 ? 1 : id <= 10 ? 2 : 3;
  const difficulty = world === 1 ? id : world === 2 ? id - 5 : 5 + (id - 10); // 1..5, 1..5, 6..10
  const rand = rng(id * 7919);
  const g: string[][] = Array.from({ length: ROWS }, () => Array<string>(COLS).fill(' '));

  const put = (x: number, y: number, ch: string) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) g[y][x] = ch; };

  // Ground với gaps (world 2 gap nhiều & rộng hơn)
  const gapEvery = world === 1 ? 10 - difficulty : 8 - Math.min(difficulty, 3);
  const gapW = world === 1 ? 2 : 3;
  let x = 0;
  while (x < COLS) {
    if (x > 4 && x < COLS - 4 && x % Math.max(gapEvery, 5) === 0) { x += gapW; continue; }
    for (let dx = 0; dx < 1; dx++) put(x + dx, GROUND_Y, '#');
    put(x, GROUND_Y + 1, '#');
    x++;
  }
  // Platform bầu trời
  const plats = 4 + difficulty;
  for (let i = 0; i < plats; i++) {
    const px = 4 + Math.floor(rand() * (COLS - 10));
    const py = GROUND_Y - 3 - Math.floor(rand() * 5);
    const w = 3 + Math.floor(rand() * 3);
    for (let dx = 0; dx < w; dx++) put(px + dx, py, '=');
    if (rand() < 0.7) put(px + 1, py - 1, 'o');
    if (rand() < 0.25) put(px + 2, py - 1, world === 2 && rand() < 0.5 ? 'S' : 'H');
  }
  // Spikes (world 2 + difficulty cao)
  // ARCH P2: cấm spike/enemy trong bán kính 3 ô quanh cờ F và 2 ô quanh P start.
  const FLAG = { x: COLS - 3, y: GROUND_Y - 2 };
  const START = { x: 2, y: GROUND_Y - 2 };
  const dist2 = (x: number, y: number, p: { x: number; y: number }) => (x - p.x) ** 2 + (y - p.y) ** 2;
  const occupied = (x: number, y: number) =>
    (g[y]?.[x] ?? ' ') !== ' '
    || dist2(x, y, FLAG) <= 3 ** 2
    || dist2(x, y, START) <= 2 ** 2;
  const spikes = world === 1 ? difficulty - 1 : world === 2 ? difficulty : difficulty - 1;
  for (let i = 0; i < spikes; i++) {
    const sx = 6 + Math.floor(rand() * (COLS - 12));
    if (g[GROUND_Y][sx] === '#' && g[GROUND_Y - 1][sx] === ' ' && !occupied(sx, GROUND_Y - 1)) put(sx, GROUND_Y - 1, '^');
  }
  // Enemies — retry đến khi đặt đủ (tránh bị spike/gap chiếm chỗ + vùng cấm camp)
  // World 3: +1 enemy so world 2 cùng difficulty nhánh (density tăng theo id)
  const enemies = world === 1 ? 2 + difficulty : 3 + difficulty + (world === 3 ? 1 : 0);
  let placed = 0, tries = 0;
  while (placed < enemies && tries < 200) {
    tries++;
    const ex = 6 + Math.floor(rand() * (COLS - 12));
    if (g[GROUND_Y][ex] === '#' && g[GROUND_Y - 1][ex] === ' ' && g[GROUND_Y - 2][ex] === ' '
      && !occupied(ex, GROUND_Y - 2)) {
      put(ex, GROUND_Y - 2, world === 2 && rand() < 0.4 ? 'c' : 'e');
      placed++;
    }
  }
  // Coins trên mặt đất + power-ups
  for (let i = 0; i < 18 + difficulty * 4; i++) {
    const cx = 2 + Math.floor(rand() * (COLS - 4));
    const cy = GROUND_Y - 2 - Math.floor(rand() * 2);
    if (g[GROUND_Y][cx] === '#' && g[cy][cx] === ' ') put(cx, cy, 'o');
  }
  put(3 + Math.floor(rand() * 3), GROUND_Y - 2, 'o'); // đảm bảo coin gần start
  const boosts = 1 + Math.floor(difficulty / 3);
  for (let i = 0; i < boosts; i++) {
    const bx = 8 + Math.floor(rand() * (COLS - 14));
    if (g[GROUND_Y - 2][bx] === ' ') put(bx, GROUND_Y - 2, rand() < 0.5 ? 'B' : 'J');
  }
  // Start & flag
  put(2, GROUND_Y - 2, 'P');
  put(COLS - 3, GROUND_Y - 2, 'F');
  // Đảm bảo ground dưới start & flag
  put(2, GROUND_Y, '#'); put(2, GROUND_Y + 1, '#');
  put(COLS - 3, GROUND_Y, '#'); put(COLS - 3, GROUND_Y + 1, '#');

  const grid = g.map(r => r.join(''));
  const name = world === 1
    ? ['Green Hills', 'Cave Dweller', 'Sky Steps', 'Spike Valley', 'Fortress Gate'][difficulty - 1]
    : world === 2
      ? ['Neon City', 'Rust Factory', 'Grid Maze', 'Core Reactor', 'Final Tower'][difficulty - 1]
      : ['Void Rift', 'Crystal Deep', 'Storm Gate', 'Inferno Loop', 'Infinity Core'][id - 11];
  return { id, world, name, difficulty, grid, cols: COLS, rows: ROWS };
}

// PRD 1.3: 15 màn (thêm world 3 procedural 11–15)
export const LEVELS: LevelDef[] = Array.from({ length: 15 }, (_, i) => generateLevel(i + 1));
export const TILE = 32;

// ============ PRD 1.1 §3: palette mỗi level ============
export interface LevelPalette { sky: number; platform: number; spike: number; accent: number; }

const PALETTES: LevelPalette[] = [
  { sky: 0x9ad9ea, platform: 0x4caf50, spike: 0x8d6e63, accent: 0xffd166 }, // 1 xanh biếc
  { sky: 0x3e2723, platform: 0x795548, spike: 0xc0ca33, accent: 0xffab91 }, // 2 hang tối
  { sky: 0xb3e5fc, platform: 0xef6c00, spike: 0x546e7a, accent: 0xffffff }, // 3 trời cao
  { sky: 0x7b1fa2, platform: 0x00bcd4, spike: 0xff5252, accent: 0x69f0ae }, // 4 tím neon
  { sky: 0x37474f, platform: 0x90a4ae, spike: 0xff1744, accent: 0xffea00 }, // 5 thành lạnh
  { sky: 0x1a0033, platform: 0xd500f9, spike: 0x00e5ff, accent: 0xff4081 }, // 6 neon city
  { sky: 0x1a237e, platform: 0xff7043, spike: 0x9e9d24, accent: 0xffca28 }, // 7 nhà máy rỉ (designer: xanh đêm đậm #1a237e, tách khỏi màn 2 hang tối #3e2723)
  { sky: 0x004d40, platform: 0x26a69a, spike: 0xff8a65, accent: 0xa7ffeb }, // 8 lưới ngọc
  { sky: 0x0d47a1, platform: 0x2979ff, spike: 0xffd600, accent: 0x00e5ff }, // 9 lò phản ứng
  { sky: 0x000000, platform: 0x616161, spike: 0xff5252, accent: 0xffd740 }, // 10 tháp cuối
];

export function levelPalette(id: number): LevelPalette {
  // PRD 1.3: id 11–15 tái sử dụng palette theo vòng lặp (10 palette / 15 màn)
  const i = Math.max(0, (id - 1) % PALETTES.length);
  return PALETTES[i];
}
