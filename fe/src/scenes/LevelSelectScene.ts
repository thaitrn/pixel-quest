import Phaser from 'phaser';
import { GAME_W } from './BootScene';
import { LEVELS } from '../data/levels';
import { loadSave } from '../systems/save';
import { MODES } from '../data/modes';
import { CHARACTERS, loadCharacterId, saveCharacterId, isCharacterUnlocked } from '../data/characters';
import { GameMode, loadMode } from '../data/modes';
import { createButton } from '../ui/button';
import { sfx, unlockAudio } from '../systems/sfx';
import { ensureMuteButton } from '../systems/sfxButton';

export class LevelSelectScene extends Phaser.Scene {
  private charButtons: Phaser.GameObjects.Rectangle[] = [];

  constructor() { super('LevelSelect'); }

  create(): void {
    unlockAudio();
    ensureMuteButton();
    const save = loadSave();
    this.cameras.main.setBackgroundColor('#0b0e1a');
    this.add.text(GAME_W / 2, 18, 'SELECT LEVEL', {
      fontFamily: 'monospace', fontSize: '22px', color: '#06d6a0',
    }).setOrigin(0.5);
    // Badge mode hiện hành — hiển thị khi mode khác default normal (MODES lookup)
    const currentMode: GameMode = loadMode();
    if (currentMode !== 'normal') {
      this.add.text(GAME_W - 30, 26, `🔥 ${MODES[currentMode].label.replace('🔥  ', '').trim()}`, {
        fontFamily: 'monospace', fontSize: '16px', color: MODES[currentMode].color,
        backgroundColor: '#2a0a12', padding: { x: 6, y: 3 },
      }).setOrigin(1, 0.5);
    }

    // Badge "Phá đảo Hard" (PRD 1.3 G5) — hiện khi save.hardClear (qua màn 10 hard)
    if (save.hardClear) {
      this.add.text(30, 26, '🏆 PHÁ ĐẢO HARD', {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffd166',
        backgroundColor: '#2a2107', padding: { x: 6, y: 3 },
      }).setOrigin(0, 0.5);
    }

    LEVELS.forEach(level => {
      // PRD 1.3 #1: 15 thẻ — hàng theo world (1: 5, 2: 5, 3: 5), cột trong world.
      const col = (level.id - 1) % 5;
      const rowIdx = level.world - 1;
      const x = 110 + col * 160;
      const y = 74 + rowIdx * 94;
      const unlocked = level.id <= save.unlockedLevel;
      const rec = save.levels[level.id];

      const box = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 130, 84, unlocked ? 0x1e2a4a : 0x16162a,
        1).setStrokeStyle(2, unlocked ? 0x06d6a0 : 0x333355);
      const label = this.add.text(0, -26, `${level.world}-${level.id}`, {
        fontFamily: 'monospace', fontSize: '18px', color: unlocked ? '#ffd166' : '#444',
      }).setOrigin(0.5);
      const name = this.add.text(0, -7, unlocked ? level.name : '???', {
        fontFamily: 'monospace', fontSize: '11px', color: unlocked ? '#c0c0e0' : '#444',
        align: 'center', wordWrap: { width: 120 },
      }).setOrigin(0.5);
      box.add([bg, label, name]);

      for (let s = 0; s < 3; s++) {
        box.add(this.add.image(-24 + s * 24, 20,
          unlocked && rec && rec.stars > s ? 'star-hud' : 'star-empty').setScale(0.8));
      }

      if (unlocked) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.startLevel(level.id));
        box.add(this.add.text(0, 34, '▶ PLAY', {
          fontFamily: 'monospace', fontSize: '11px', color: '#06d6a0',
        }).setOrigin(0.5));
      } else {
        box.add(this.add.text(0, 34, '🔒 LOCKED', {
          fontFamily: 'monospace', fontSize: '11px', color: '#8a8aa0',
        }).setOrigin(0.5));
      }
    });

    // ===== PRD 1.1 §2: hàng 4 nút chọn nhân vật (cosmetic) =====
    const cy = 352;
    this.add.text(GAME_W / 2, cy - 36, 'CHỌN NHÂN VẬT', {
      fontFamily: 'monospace', fontSize: '14px', color: '#8a8aa0',
    }).setOrigin(0.5);
    let selectedId = loadCharacterId();
    this.charButtons = [];
    const levelsDone = Object.keys(save.levels).length; // BA G4
    CHARACTERS.forEach((c, i) => {
      const unlocked = isCharacterUnlocked(c, levelsDone);
      const bx = GAME_W / 2 - 270 + i * 180;
      const box = this.add.rectangle(bx, cy, 150, 52, unlocked ? 0x1e2a4a : 0x14141f, 1);
      const dot = this.add.circle(bx - 55, cy, 9, c.color);
      if (!unlocked) dot.setAlpha(0.35);
      const nm = this.add.text(bx + 14, cy - 10, unlocked ? c.name : c.name + ' 🔒', {
        fontFamily: 'monospace', fontSize: '14px', color: unlocked ? '#e0e0ff' : '#666680',
      }).setOrigin(0.5);
      const ds = this.add.text(bx + 14, cy + 10, unlocked ? c.desc : `Qua ${c.requiredLevels} màn`, {
        fontFamily: 'monospace', fontSize: '10px', color: unlocked ? '#8a8aa0' : '#55556a',
      }).setOrigin(0.5);
      if (!unlocked) nm.setAlpha(0.6);
      const refresh = () => {
        const on = selectedId === c.id && unlocked;
        box.setStrokeStyle(on ? 3 : 1, on ? c.color : (unlocked ? 0x333355 : 0x222238));
        box.setFillStyle(on ? 0x2a3a6a : (unlocked ? 0x1e2a4a : 0x14141f));
      };
      refresh();
      this.charButtons.push(box);
      if (unlocked) {
        box.setInteractive({ useHandCursor: true });
        dot.setInteractive({ useHandCursor: true });
        [box, dot, nm, ds].forEach(o => o.on('pointerdown', () => {
          selectedId = c.id; sfx.click(); saveCharacterId(c.id);
          this.scene.restart();
        }));
      }
    });
    void selectedId;

    // Keyboard: Enter chơi level đang mở, Esc về menu
    let cursor = Math.min(save.unlockedLevel, LEVELS.length) - 1;
    void cursor;
    this.input.keyboard!.on('keydown-ENTER', () => this.startLevel(Math.min(cursor + 1, save.unlockedLevel)));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Menu'));

    // Nút về menu (đổi NORMAL/HARD) — đặt cạnh LEADERBOARD dưới màn, tránh đè badge header
    createButton(this, { label: '↩ ĐỘ KHÓ', x: 110, y: 424, w: 170, h: 44,
      onTap: () => { sfx.click(); this.scene.start('Menu'); } });

    // Leaderboard nhanh — nút factory (hitbox ≥44px giữ từ batch 1)
    createButton(this, { label: '★ LEADERBOARD', x: GAME_W - 110, y: 424, w: 300, h: 44,
      onTap: () => { sfx.click(); this.scene.start('Leaderboard', { levelId: Math.min(save.unlockedLevel, LEVELS.length), mode: loadMode() }); } });

    this.add.text(GAME_W / 2, 456, 'Chọn nhân vật + tap level để chơi · ESC về menu', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8a8aa0',
    }).setOrigin(0.5);
  }

  // ARCH P1 (batch 3): truyền mode TƯỜNG MINH qua scene data — GameScene không
  // phải dựa fallback loadMode() nữa (fallback chỉ giữ làm safety net cho restart flow cũ).
  private startLevel(id: number): void {
    sfx.click();
    const mode = loadMode();
    // FIX: camera fade → scene.start trong 'camerafadeoutcomplete' giết physics
    // world ở scene kế tiếp (Phaser 3.90). Start NGAY, fade-in ở GameScene create.
    this.scene.start('Game', { levelId: id, mode });
  }
}
