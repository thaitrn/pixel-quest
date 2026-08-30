// Leaderboard UI (F7) — xem top 20/level, hiển thị rank bản thân sau submit.
import Phaser from 'phaser';
import { GAME_W, GAME_H } from './BootScene';
import { LEVELS } from '../data/levels';
import { api, ApiError, LeaderboardEntry, GameMode } from '../api/client';
import { MODES, loadMode } from '../data/modes';
import { loadBestScore } from '../systems/bestScore';
import { createButton } from '../ui/button';
import { sfx } from '../systems/sfx';

export interface LeaderboardData { levelId: number; myRank?: number; myScore?: number; mode?: GameMode; }

export class LeaderboardScene extends Phaser.Scene {
  private data_!: LeaderboardData;
  private mode_!: GameMode;
  constructor() { super('Leaderboard'); }

  init(data: LeaderboardData): void {
    this.data_ = { levelId: Math.min(Math.max(data.levelId ?? 1, 1), LEVELS.length), myRank: data.myRank, myScore: data.myScore };
    // Ưu tiên mode truyền qua scene data; fallback registry retro_mode_v1
    this.mode_ = data.mode ?? loadMode();
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0e1a');
    const level = LEVELS[this.data_.levelId - 1];
    this.add.text(GAME_W / 2, 24, `LEADERBOARD · ${level.world}-${level.id}`, {
      fontFamily: 'monospace', fontSize: '24px', color: '#06d6a0',
    }).setOrigin(0.5);

    // Badge mode đang xem — NORMAL / HARD
    const hard = MODES[this.mode_].hearts === 1; // ARCH P1: mode check qua MODES lookup
    this.add.text(GAME_W / 2, 48, hard ? '🔥 HARD MODE' : 'NORMAL MODE', {
      fontFamily: 'monospace', fontSize: '14px',
      color: hard ? '#ef476f' : '#8a8aa0',
      backgroundColor: hard ? '#2a0a12' : '#1a1a2e', padding: { x: 8, y: 3 },
    }).setOrigin(0.5);

    const loading = this.add.text(GAME_W / 2, GAME_H / 2, 'LOADING...', {
      fontFamily: 'monospace', fontSize: '18px', color: '#8a8aa0',
    }).setOrigin(0.5);

    // PRD 1.3 G5: best score cá nhân theo mode — LUÔN hiện ở header (kể cả bảng trống)
    const best = loadBestScore(this.mode_);
    this.add.text(GAME_W / 2, 66,
      `BEST CỦA BẠN: ${best > 0 ? `${best} PTS` : 'CHƯA CÓ'} (${hard ? 'HARD' : 'NORMAL'})`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffd166',
      }).setOrigin(0.5);

    if (this.data_.myRank !== undefined) {
      this.add.text(GAME_W / 2, 84,
        `BẠN XẾP #${this.data_.myRank}${this.data_.myScore !== undefined ? ` · ${this.data_.myScore} pts` : ''}`, {
          fontFamily: 'monospace', fontSize: '16px', color: '#ffd166',
        }).setOrigin(0.5);
    }

    void api.getLeaderboard(this.data_.levelId, 20, this.mode_)
      .then(rows => {
        // ISSUE-2: tap back khi fetch đang chạy → scene đã shutdown; đừng vẽ tiếp
        if (!this.scene || !this.scene.isActive()) return;
        loading.destroy();
        this.renderRows(rows);
      })
      .catch((e: unknown) => {
        if (!this.scene || !this.scene.isActive()) return;
        const msg = e instanceof ApiError ? e.message : 'Lỗi tải leaderboard';
        loading.setText(`✖ ${msg}\n(ESC để quay lại)`).setColor('#ef476f');
      });

    // BUG-1: nút back cảm ứng (iPhone không có ESC) — footer row y≈424 như LevelSelect
    createButton(this, { label: '↩ DANH SÁCH', x: GAME_W / 2, y: 424, w: 280, h: 44,
      onTap: () => { sfx.click(); this.scene.start('LevelSelect'); } });

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('LevelSelect'));
  }

  private renderRows(rows: LeaderboardEntry[]): void {
    if (rows.length === 0) {
      this.add.text(GAME_W / 2, GAME_H / 2, 'CHƯA CÓ SCORE — HÃY LÀ NGƯỜI ĐẦU TIÊN!', {
        fontFamily: 'monospace', fontSize: '16px', color: '#8a8aa0',
      }).setOrigin(0.5);
      return;
    }
    rows.slice(0, 20).forEach((r, i) => {
      const y = 90 + i * 18;
      const color = r.rank === this.data_.myRank ? '#ffd166' : r.rank <= 3 ? '#06d6a0' : '#c0c0e0';
      const line = `#${String(r.rank).padStart(2, ' ')}  ${r.display_name.slice(0, 16).padEnd(16, ' ')}  ` +
        `${String(r.value).padStart(6, ' ')}  ${'★'.repeat(r.stars)}  ${r.duration_s}s`;
      this.add.text(80, y, line, { fontFamily: 'monospace', fontSize: '14px', color }).setOrigin(0, 0.5);
    });
    this.add.text(GAME_W / 2, GAME_H - 14, 'ESC back', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8a8aa0',
    }).setOrigin(0.5);
  }
}
