import Phaser from 'phaser';
import { BootScene, GAME_W, GAME_H } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { startWatchdog } from './systems/watchdog';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0e1a',
  scale: {
    // FIT thay ENVELOP: ENVELOP làm canvas tràn viewport đỉnh (margin âm y=-24),
    // Phaser 3.90 InputManager transform pointer sai → hit-test miss nút (bug "menu đơ").
    // FIT: canvas luôn nằm trong viewport, letterbox nhỏ — hit-test đúng mọi viewport.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
    max: { width: GAME_W * 2, height: GAME_H * 2 },
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 900 }, debug: false },
  },
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, LeaderboardScene],
});

// Expose cho E2E/QA (Playwright) — đọc trạng thái scene, không ảnh hưởng gameplay.
(window as unknown as { game: Phaser.Game }).game = game;

// FE watchdog: tự hồi phục khi game đứng (fps<10 hoặc RAF đứng) ở scene Game, tab visible.
startWatchdog(game);
