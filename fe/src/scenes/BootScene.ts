import Phaser from 'phaser';
import { createTextures } from '../systems/textures';
import { TouchInput } from '../systems/touch';

export const touchInput = new TouchInput();
export const GAME_W = 960, GAME_H = 480;

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  // GameForge art (fe/public/gf/*.png) — spritesheet dims khớp asset pack.
  // Vite base '/' + assetsInlineLimit 0 => PNG copy nguyên vẹn sang dist/gf/.
  preload(): void {
    this.load.path = '/gf/';
    this.load.spritesheet('gf-hero', 'gf-hero.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('gf-enemy-slime', 'gf-enemy-slime.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('gf-enemy-bat', 'gf-enemy-bat.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('gf-enemy-spike', 'gf-enemy-spike.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('gf-coin', 'gf-coin.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('gf-powerup', 'gf-powerup.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('gf-tileset', 'gf-tileset.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('gf-ui9', 'gf-ui9.png');
    this.load.path = '';
  }

  create(): void {
    createTextures(this);
    this.createGfAnims();
    // Emit lên GAME-level event bus (không phải bus của BootScene) để mọi
    // scene đang active (GameScene, ...) đều nhận được touch events.
    touchInput.attach((btn, down) => {
      this.game.events.emit('touch', btn, down);
    });
    this.scene.start('Menu');
  }

  /** Anims GameForge — global, tạo 1 lần (exists check chống restart). */
  private createGfAnims(): void {
    const mk = (key: string, tex: string, frames: number[], rate: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { frames }), frameRate: rate, repeat: -1 });
    };
    mk('gf-hero-idle', 'gf-hero', [0], 1);
    mk('gf-hero-walk', 'gf-hero', [1, 2], 8);
    mk('gf-hero-jump', 'gf-hero', [3], 1);
    mk('gf-enemy-slime-walk', 'gf-enemy-slime', [0, 1], 6);
    mk('gf-enemy-bat-fly', 'gf-enemy-bat', [0, 1], 8);
    mk('gf-coin-spin', 'gf-coin', [0, 1, 2, 3], 8);
  }
}
