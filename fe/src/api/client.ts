// API client — fetch + zod, contract theo production-plan.md §3.
// Base URL: VITE_API_BASE bắt buộc trên production (HTTPS canonical).
// Dev: localhost:8390. Production không fallback :8390/localhost.
import { z } from 'zod';

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE;
  if (typeof raw === 'string' && raw.trim()) return raw.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:8390';
  return '';
}

const BASE = resolveApiBase();

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, schemas: z.ZodType<T>, body?: unknown): Promise<T> {
  if (!BASE) throw new ApiError('NETWORK', 'Không kết nối được server', 0);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK', 'Không kết nối được server', 0);
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? `HTTP ${res.status}`, res.status);
  }
  const parsed = schemas.safeParse(json);
  if (!parsed.success) throw new ApiError('BAD_RESPONSE', 'Response không khớp contract', res.status);
  return parsed.data;
}

// ============ Schemas (contract §3) ============
const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
void errorSchema;

export const playerSchema = z.object({
  player_id: z.string().uuid(),
  display_name: z.string(),
});
export type Player = z.infer<typeof playerSchema>;

/** Mode chơi — tách bảng leaderboard (BE: POST /v1/scores field mode, GET ?mode=). */
export type GameMode = 'normal' | 'hard';

export const scoreSchema = z.object({
  score_id: z.number(),
  level_id: z.number().int(),
  value: z.number().int().nonnegative(),
  stars: z.number().int().min(0).max(3),
  rank: z.number().int().positive(),
});
export type ScoreResult = z.infer<typeof scoreSchema>;

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  display_name: z.string(),
  value: z.number().int().nonnegative(),
  stars: z.number().int().min(0).max(3),
  duration_s: z.number(),
  achieved_at: z.string(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
const leaderboardSchema = z.array(leaderboardEntrySchema);

// ============ Endpoints ============
export const api = {
  /** POST /v1/players — idempotent upsert thiết bị. */
  registerPlayer(playerId: string, displayName: string): Promise<Player> {
    return request('POST', '/v1/players', playerSchema, { player_id: playerId, display_name: displayName });
  },

  /** POST /v1/scores — submit run, trả rank. */
  submitScore(input: {
    player_id: string; level_id: number; value: number; stars: number; duration_s: number;
    mode?: GameMode; // BE default 'normal'
  }): Promise<ScoreResult> {
    return request('POST', '/v1/scores', scoreSchema, { mode: 'normal', ...input });
  },

  /** GET /v1/levels/:id/leaderboard?limit=20&mode= — top runs per player theo mode. */
  getLeaderboard(levelId: number, limit = 20, mode: GameMode = 'normal'): Promise<LeaderboardEntry[]> {
    return request('GET', `/v1/levels/${levelId}/leaderboard?limit=${limit}&mode=${mode}`, leaderboardSchema);
  },
};
