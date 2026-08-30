import Phaser from 'phaser';
import { GAME_W, GAME_H } from './BootScene';
import { loadSave, saveSave } from '../systems/save';
import { GameMode, MODES, loadMode, saveMode } from '../data/modes';
import { THEME } from '../data/theme';
import { createButton } from '../ui/button';
import { sfx, unlockAudio } from '../systems/sfx';
import { ensureMuteButton } from '../systems/sfxButton';

// Note: GameMode + loadMode/saveMode đã chuyển sang src/data/modes.ts (ARCH P1).
// MenuScene không còn check chuỗi 'hard' — mọi thông số qua MODES lookup.
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    unlockAudio();
    ensureMuteButton();
    const save = loadSave();
    this.cameras.main.setBackgroundColor(THEME.BG);

    const title = this.add.text(GAME_W / 2, 110, 'PIXEL QUEST', {
      fontFamily: 'monospace', fontSize: '64px', color: THEME.PRIMARY,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 155, '★ RETRO PLATFORMER ★', {
      fontFamily: 'monospace', fontSize: '18px', color: THEME.GOLD,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });

    // PRD 1.1 §1: 2 nút to touch-friendly ▶ Normal / 🔥 Hard — label/màu từ MODES
    createButton(this, { label: MODES.normal.label, color: MODES.normal.color,
      x: GAME_W / 2, y: 250, onTap: () => this.pick(save, 'normal') });
    createButton(this, { label: MODES.hard.label, color: MODES.hard.color,
      x: GAME_W / 2, y: 330, onTap: () => this.pick(save, 'hard') });
    this.add.text(GAME_W / 2, 385, 'Hard: địch nhanh hơn, nhiều hơn · 1 mạng 💀', {
      fontFamily: 'monospace', fontSize: '14px', color: THEME.TEXT_DIM,
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown-ENTER', () => this.pick(save, loadMode()));
    this.input.keyboard!.on('keydown-SPACE', () => this.pick(save, loadMode()));
    this.input.keyboard!.on('keydown-H', () => this.pick(save, 'hard'));
    this.input.keyboard!.on('keydown-N', () => this.pick(save, 'normal'));

    const hasProgress = save.unlockedLevel > 1;
    this.add.text(GAME_W / 2, GAME_H - 58, hasProgress
      ? `Continue: Level ${save.unlockedLevel} · ★ total ${Object.values(save.levels).reduce((s, l) => s + l.stars, 0)}`
      : 'New adventure awaits!', { fontFamily: 'monospace', fontSize: '14px', color: THEME.TEXT_DIM }).setOrigin(0.5);
    // BA G2 (batch 3): thông báo tiến trình dùng chung giữa 2 chế độ
    this.add.text(GAME_W / 2, GAME_H - 40, 'Tiến trình dùng chung 2 chế độ', {
      fontFamily: 'monospace', fontSize: '12px', color: THEME.GOLD,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, GAME_H - 18,
      'CHỌN ĐỘ KHÓ · M MUTE', { fontFamily: 'monospace', fontSize: '12px', color: THEME.TEXT_DIM }).setOrigin(0.5);
  }

  private pick(save: ReturnType<typeof loadSave>, mode: GameMode): void {
    sfx.click();
    saveMode(mode);
    saveSave(save);
    this.scene.start('LevelSelect');
  }
}
