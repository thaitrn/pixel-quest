// Score & stars calculation — BR-L3: 3 sao độc lập
// ★1 hoàn thành, ★2 ≥100 coins trong run, ★3 no-death
export function calcStars(completed: boolean, coins: number, deaths: number): number {
  let stars = 0;
  if (completed) stars++;
  if (coins >= 100) stars++;
  if (deaths === 0) stars++;
  return stars;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), 999999); // HUD 6-digit + sanity bound
}

export function padScore(value: number): string {
  return clampScore(value).toString().padStart(6, '0');
}

// Điểm run: coin×10 + enemy stomp×50 + complete bonus 1000 + time bonus (càng nhanh càng cao, cap 500)
export function calcRunScore(coins: number, stomps: number, completed: boolean, timeS: number): number {
  let s = coins * 10 + stomps * 50;
  if (completed) s += 1000 + Math.max(0, 500 - Math.floor(timeS) * 10);
  return clampScore(s);
}
