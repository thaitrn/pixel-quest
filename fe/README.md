# Pixel Quest — Game Client (fe/)

Platformer retro 2D pixel art — Phaser 3 + TypeScript strict + Vite.
Scope M1–M2 theo production-plan.md: 10 level / 2 world, HUD, menu, pause, rewarded-ad revive (stub), responsive + mobile touch.

## Chạy

```bash
npm install
npm run dev        # dev server, mở URL in ra
npm run build      # tsc --noEmit + vite build → dist/ (~1.4MB, < 3MB)
npm run preview    # serve dist/
npm test           # vitest — 29 tests (FSM, save, score/stars, level gen)
```

## Điều khiển

- Web: ←/→ di chuyển, ↑ hoặc SPACE nhảy, P hoặc ESC pause
- Mobile (detect touch): overlay nút ◀ ▶ ▲ + pause — tap-to-act
- Coyote time 100ms, jump buffer 120ms (AC-02/03)

## Tính năng (map PRD F1–F10)

| F | Tính năng | Trạng thái |
|---|---|---|
| F1 | Platformer controls (coyote + buffer) | ✅ |
| F2 | Stomp enemy, patrol + chaser, i-frame 2s | ✅ |
| F3 | Coin, Heart, Star 5s, Speed 8s, DoubleJump 10s | ✅ |
| F4 | 2 world × 5 level, 3 sao (xong/100 coins/no-death), unlock tuần tự | ✅ |
| F5 | BOOT→MENU→LEVEL_SELECT→RUNNING⇄PAUSED→GAME_OVER/LEVEL_COMPLETE | ✅ |
| F6 | HUD hearts + score 6-digit + coins | ✅ |
| F7 | Leaderboard UI | ⏳ M3 (chờ BE server/ production) |
| F8 | Local save `retro_save_v1` (versioned) | ✅ |
| F9 | Rewarded ad revive 1 lần/run — stub UI (`src/systems/ads.ts`) | ✅ stub |
| F10 | 5 achievement seed, toast, idempotent | ✅ |

## Cấu trúc

```
src/
  main.ts              # boot Phaser (pixelArt, Scale.FIT responsive)
  scenes/              # Boot, Menu, LevelSelect, Game (pause/overlays in-scene)
  systems/             # fsm, save, score, touch, ads, textures (procedural)
  data/                # levels (deterministic gen), config (PHYS/POWERUPS), achievements
tests/                 # vitest: fsm, save, score, levels (29 tests)
```

Texture pixel-art được sinh procedural (Graphics → generateTexture) — không cần asset pack ở M1/M2; thay bằng sprite thật khi có style guide.

## Ghi chú kỹ thuật

- Level content: generator deterministic (mulberry32, seed = level id) — cùng level luôn giống nhau (BR-I3).
- DoD: tsc strict 0 error, vitest 29/29 pass, build 1.4MB < 3MB ✅.
- Còn thiếu cho M3: api/ client + zod (5 endpoint theo contract production-plan §3), leaderboard UI, ad SDK thật (PM chốt network).
