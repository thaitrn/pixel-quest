import Phaser from 'phaser';
import { TILE } from '../data/levels';

// Sinh texture pixel-art procedural — không cần asset pack cho M1/M2
export function createTextures(scene: Phaser.Scene): void {
  const px = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // Tiles
  px('tile-ground', TILE, TILE, g => {
    g.fillStyle(0x3e8948); g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x265c42); g.fillRect(0, 0, TILE, 4); g.fillRect(0, TILE - 4, TILE, 4);
    g.fillStyle(0x1e4a34); g.fillRect(6, 10, 4, 4); g.fillRect(20, 18, 4, 4);
  });
  px('tile-plat', TILE, TILE, g => {
    g.fillStyle(0x8b5a2b); g.fillRect(0, 0, TILE, 12);
    g.fillStyle(0xc48b54); g.fillRect(0, 0, TILE, 4);
  });
  px('spike', TILE, 16, g => {
    g.fillStyle(0xd0d0d8);
    g.fillTriangle(2, 16, 16, 0, 30, 16);
    g.fillStyle(0x808090); g.fillRect(2, 13, 28, 3);
  });

  // Player (16x24)
  px('player', 16, 24, g => {
    g.fillStyle(0xffd166); g.fillRect(2, 2, 12, 12);            // head
    g.fillStyle(0x1b1b2f); g.fillRect(4, 6, 3, 3); g.fillRect(9, 6, 3, 3); // eyes
    g.fillStyle(0xef476f); g.fillRect(2, 14, 12, 8);            // body
    g.fillStyle(0x2b2d42); g.fillRect(2, 22, 5, 2); g.fillRect(9, 22, 5, 2); // feet
  });
  px('player-blink', 16, 24, g => {
    g.fillStyle(0xffffff); g.fillRect(2, 2, 12, 12);
    g.fillStyle(0x1b1b2f); g.fillRect(4, 6, 3, 3); g.fillRect(9, 6, 3, 3);
    g.fillStyle(0xef476f); g.fillRect(2, 14, 12, 8);
    g.fillStyle(0x2b2d42); g.fillRect(2, 22, 5, 2); g.fillRect(9, 22, 5, 2);
  });

  // Enemies
  px('enemy-patrol', 20, 16, g => {
    g.fillStyle(0x9b5de5); g.fillRect(0, 0, 20, 16);
    g.fillStyle(0xffffff); g.fillRect(3, 4, 4, 4); g.fillRect(13, 4, 4, 4);
    g.fillStyle(0x000000); g.fillRect(4, 5, 2, 2); g.fillRect(14, 5, 2, 2);
    g.fillStyle(0x5a189a); g.fillRect(0, 12, 20, 4);
  });
  px('enemy-chaser', 20, 16, g => {
    g.fillStyle(0xf15bb5); g.fillRect(0, 0, 20, 16);
    g.fillStyle(0xffee32); g.fillRect(3, 4, 4, 4); g.fillRect(13, 4, 4, 4);
    g.fillStyle(0x000000); g.fillRect(4, 5, 2, 2); g.fillRect(14, 5, 2, 2);
    g.fillStyle(0x9d0208); g.fillRect(0, 12, 20, 4);
  });

  // Items
  const coin = (g: Phaser.GameObjects.Graphics) => {
    g.fillStyle(0xffd700); g.fillCircle(8, 8, 7);
    g.fillStyle(0xdaa520); g.fillCircle(8, 8, 4);
  };
  px('item-coin', 16, 16, coin);
  px('item-heart', 16, 16, g => {
    g.fillStyle(0xef476f);
    g.fillRect(2, 3, 5, 5); g.fillRect(9, 3, 5, 5);
    g.fillTriangle(2, 6, 14, 6, 8, 14);
  });
  px('item-star', 18, 18, g => {
    g.fillStyle(0xffee32);
    g.fillTriangle(9, 0, 0, 8, 18, 8);
    g.fillTriangle(9, 18, 0, 8, 18, 8);
    g.fillRect(6, 8, 6, 8);
  });
  px('item-speed', 16, 16, g => {
    g.fillStyle(0x00f5d4); g.fillTriangle(2, 2, 14, 8, 2, 14);
  });
  px('item-djump', 16, 16, g => {
    g.fillStyle(0x00bbf9); g.fillRect(5, 1, 6, 10); g.fillTriangle(2, 9, 8, 16, 14, 9);
  });
  px('flag', 16, 32, g => {
    g.fillStyle(0xc9ada7); g.fillRect(0, 0, 3, 32);
    g.fillStyle(0x06d6a0); g.fillTriangle(3, 2, 16, 8, 3, 14);
  });
  px('heart-hud', 16, 16, g => {
    g.fillStyle(0xef476f);
    g.fillRect(2, 3, 5, 5); g.fillRect(9, 3, 5, 5);
    g.fillTriangle(2, 6, 14, 6, 8, 14);
  });
  px('star-hud', 18, 18, g => {
    g.fillStyle(0xffd700);
    g.fillTriangle(9, 0, 0, 8, 18, 8);
    g.fillTriangle(9, 18, 0, 8, 18, 8);
    g.fillRect(6, 8, 6, 8);
  });
  px('star-empty', 18, 18, g => {
    g.fillStyle(0x3a3a4a);
    g.fillTriangle(9, 0, 0, 8, 18, 8);
    g.fillTriangle(9, 18, 0, 8, 18, 8);
    g.fillRect(6, 8, 6, 8);
  });
}
