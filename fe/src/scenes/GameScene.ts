import Phaser from 'phaser';
import { GAME_W, touchInput } from './BootScene';
import { LEVELS, LevelDef, TILE, levelPalette } from '../data/levels';
import { characterById, loadCharacterId } from '../data/characters';
import { GameMode, MODES, loadMode } from '../data/modes';
import { THEME } from '../data/theme';
import { createButton } from '../ui/button';
import { PHYS, POWERUPS } from '../data/config';
import { loadSave, saveSave, recordLevelResult, grantAchievement, SaveData } from '../systems/save';
import { recordBestScore } from '../systems/bestScore';
import { calcStars, calcRunScore, padScore } from '../systems/score';
import { AdAdapter } from '../systems/ads';
import { api, ApiError } from '../api/client';
import { getPlayerId } from '../api/player';
import { statRoundStart, statSend, installUnloadFlush } from '../api/stats';
import { sfx, unlockAudio } from '../systems/sfx';
import { ensureMuteButton } from '../systems/sfxButton';

interface RunState {
  levelId: number;
  hearts: number;
  coins: number;
  stomps: number;
  deaths: number;
  timeStart: number;
  reviveUsed: boolean;
  iframesUntil: number;
  starUntil: number;
  speedUntil: number;
  djumpUntil: number;
}

export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private fsm = { running: true }; // paused flag đơn giản; scene-level FSM ở main.ts
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private flag!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private run!: RunState;
  private save!: SaveData;
  private mode: GameMode = 'normal';
  private palette = levelPalette(1);
  private charColor = 0xffffff;

  private hudHearts!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudCoins!: Phaser.GameObjects.Text;
  private hudMsg!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private overlayKind?: 'pause' | 'revive' | 'gameover' | 'complete';
  private toastUntil = 0; // deadline tự ẩn toast (1.5s) — chống text chồng khi loop đứng

  // Zones touch DOM: chỉ bật trong gameplay, tắt khi có overlay (che nút overlay)
  // hoặc khi rời GameScene (menu/level-select cần canvas nhận tap).
  private syncTouchZones(): void {
    const root = document.getElementById('touch-ui');
    if (!root) return;
    const inGame = true; // GameScene sống = đang chơi (shutdown sẽ remove class)
    root.classList.toggle('in-game', inGame);
    root.classList.toggle('overlay-open', this.overlayKind != null);
  }
  private coyoteUntil = 0;
  private endHintShown = false;
  private jumpBufferedAt = 0;
  private onGround = false;
  private jumpsUsed = 0;
  private ads = new AdAdapter();
  // Ngưỡng chết: dưới platform/ground thấp nhất + margin. Rơi hố (world bounds
  // cao hơn 64px so với camera) qua ngưỡng này => chết như bị enemy giết.
  private deathY = Number.POSITIVE_INFINITY;
  private spawnX = 64;
  private spawnY = 100;

  private readonly onTouchBtn = (btn: string, down: boolean): void => {
    if (btn === 'jump' && down) { this.jumpBufferedAt = this.time.now; this.tryJump(); }
    if (btn === 'pause' && down) this.togglePause();
  };

  constructor() { super('Game'); }

  init(data: { levelId: number; mode?: GameMode }): void {
    this.level = LEVELS[Phaser.Math.Clamp(data.levelId ?? 1, 1, LEVELS.length) - 1];
    this.mode = data.mode ?? loadMode();
    this.palette = levelPalette(this.level.id);
    this.charColor = characterById(loadCharacterId()).color;
    // BUG restart-frozen fix: scene.restart() tái dùng instance này (field
    // initializer KHÔNG chạy lại) nên mọi state sót sau gameOver()/pause()
    // phải reset ở đây, đặc biệt fsm.running (gameOver line ~362 set false).
    this.fsm.running = true;
    this.endHintShown = false;
    this.onGround = false;
    this.jumpsUsed = 0;
    this.coyoteUntil = 0;
    this.jumpBufferedAt = 0;
    this.lastRank = undefined;
    this.run = {
      levelId: this.level.id, hearts: MODES[this.mode].hearts, coins: 0, stomps: 0, deaths: 0,
      timeStart: this.time.now, reviveUsed: false, iframesUntil: 0,
      starUntil: 0, speedUntil: 0, djumpUntil: 0,
    };
    this.save = loadSave();
    this.overlay?.destroy();
    this.overlay = undefined;
    this.overlayKind = undefined;
    this.onboarding = false;
    this.input.enabled = true;
    if (this.input.keyboard) this.input.keyboard.enabled = true;
    this.syncTouchZones();
  }

  create(): void {
    this.cameras.main.fadeIn(150);
    // G7: mỗi lần vào màn = 1 round; hard = hearts 1 (MODES hard)
    statRoundStart(MODES[this.mode].hearts === 1);
    installUnloadFlush();
    unlockAudio();
    ensureMuteButton();
    this.buildParallax();
    this.physics.world.setBounds(0, 0, this.level.cols * TILE, this.level.rows * TILE + 64);
    this.cameras.main.setBounds(0, 0, this.level.cols * TILE, this.level.rows * TILE);
    this.cameras.main.setBackgroundColor(this.palette.sky);

    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.items = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group();

    let spawnX = 64, spawnY = 100;
    this.level.grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const wx = x * TILE, wy = y * TILE;
        switch (ch) {
          case '#': this.addPlatform('tile-ground', wx, wy, false); break;
          case '=': this.addPlatform('tile-plat', wx, wy, true); break;
          case '^': {
            const s = this.spikes.create(wx + TILE / 2, wy + 16, 'spike');
            s.setTint(this.palette.spike); // PRD 1.1 §3
            s.body.setSize(TILE - 8, 12).setOffset(4, 4);
            s.refreshBody();
            break;
          }
          case 'o': {
            // GameForge art: coin 16x16, anim gf-coin-spin (BootScene).
            const c = this.items.create(wx + 8, wy + 8, 'gf-coin') as Phaser.Physics.Arcade.Sprite;
            c.play('gf-coin-spin');
            c.setData('kind', 'coin');
            break;
          }
          case 'H': this.items.create(wx + 8, wy + 8, 'item-heart').setData('kind', 'heart'); break;
          case 'S': this.items.create(wx + 9, wy + 9, 'item-star').setData('kind', 'star'); break;
          case 'B': this.items.create(wx + 8, wy + 8, 'item-speed').setData('kind', 'speed'); break;
          case 'J': this.items.create(wx + 8, wy + 8, 'item-djump').setData('kind', 'djump'); break;
          case 'e': this.spawnEnemy(wx, wy, false); break;
          case 'c': this.spawnEnemy(wx, wy, true); break;
          case 'P': spawnX = wx; spawnY = wy; this.spawnX = wx; this.spawnY = wy; break;
          case 'F': {
            this.flag = this.physics.add.sprite(wx + TILE / 2, wy + TILE / 2, 'flag');
            this.flag.setGravity(0, 0).setImmovable(true);
            // BUG fix: body cũ mặc định của texture (16x32, đáy ở ~wy+32) nằm CAO hơn
            // thân player đi trên ground (player đáy = (GROUND_Y)*TILE) nên overlap
            // không bao giờ fire. Body mới: rộng cả tile, cao 2 tile, đáy chạm ground.
            const fb = this.flag.body as Phaser.Physics.Arcade.Body;
            fb.setSize(TILE, TILE * 2);
            fb.setOffset(fb.offset.x - (TILE - this.flag.width) / 2, this.flag.height - TILE * 2 + TILE);
            break;
          }
        }
      }
    });

    // PRD 1.1 §1: hard mode thêm enemy/spike ×1.5
    this.addHardExtras();

    // BUG 2 fix: ngưỡng chết = đáy tile nền/platform thấp nhất + margin 1.5 tile.
    // Player rơi hố (đậu trên đáy world bounds, dưới mọi platform) => gameOver.
    let lowestPlatBottom = 0;
    this.platforms.getChildren().forEach(o => {
      const b = (o as Phaser.GameObjects.GameObject).body;
      if (b) lowestPlatBottom = Math.max(lowestPlatBottom, (b as Phaser.Physics.Arcade.StaticBody).bottom);
    });
    this.deathY = lowestPlatBottom + TILE * 1.5;

    // Player
    // GameForge art: texture gf-hero 32x48, anim gf-hero-idle (BootScene).
    // Giữ hitbox cũ 12x22 (đặt giữa texture 32x48 thay vì 16x24 cũ).
    this.player = this.physics.add.sprite(spawnX, spawnY, 'gf-hero');
    this.player.play('gf-hero-idle');
    this.player.setSize(12, 22).setOffset(10, 13);
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(PHYS.maxSpeedX * 2, 800);
    this.physics.add.collider(this.player, this.platforms);

    // Enemy physics + patrol (PRD 1.1 §1: hard = 65 px/s)
    this.physics.add.collider(this.enemies, this.platforms);
    this.enemies.getChildren().forEach(o => {
      const e = o as Phaser.Physics.Arcade.Sprite;
      if (!e.getData('chaser')) {
        e.setVelocityX(this.enemySpeed() * (e.getData('dir') ?? 1));
        e.setBounce(0, 0);
      }
    });

    // Overlaps
    this.physics.add.overlap(this.player, this.items, (_p, itemObj) => this.collectItem(itemObj as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.hitEnemy(p as Phaser.Physics.Arcade.Sprite, e as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.spikes, () => this.damage());
    this.physics.add.overlap(this.player, this.flag, () => this.completeLevel());

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown-P', () => this.togglePause());
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard!.on('keydown-M', () => this.scene.pause());
    this.input.keyboard!.on('keydown-UP', () => { this.jumpBufferedAt = this.time.now; this.tryJump(); });
    this.input.keyboard!.on('keydown-SPACE', () => { this.jumpBufferedAt = this.time.now; this.tryJump(); });
    // Touch: lắng nghe trên GAME-level bus (BootScene emit ở đó) — scene bus
    // riêng không chia sẻ event. Tự dọn listener khi scene shutdown/restart.
    this.game.events.on('touch', this.onTouchBtn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('touch', this.onTouchBtn);
      const root = document.getElementById('touch-ui');
      root?.classList.remove('in-game', 'overlay-open');
    });
    // Camera follow
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 60);

    this.buildHud();
    this.syncTouchZones();
    // Designer L1: onboarding overlay lần ĐẦU vào màn 1
    if (this.level.id === 1 && GameScene.onboardNeeded()) this.beginOnboarding();
  }

  private addPlatform(key: string, x: number, y: number, oneWay: boolean): void {
    const img = this.add.tileSprite(x + TILE / 2, y + TILE / 2, TILE, TILE, key).setOrigin(0.5);
    img.setTint(this.palette.platform); // PRD 1.1 §3
    const body = this.physics.add.existing(img, true) as unknown as Phaser.Physics.Arcade.Image;
    const b = body.body as Phaser.Physics.Arcade.StaticBody;
    if (oneWay) {
      b.checkCollision.down = false;
      b.checkCollision.left = false;
      b.checkCollision.right = false;
    }
    this.platforms.add(body);
  }

  private spawnEnemy(x: number, y: number, chaser: boolean): void {
    // GameForge art: patrol=slime, chaser=bat (anims từ BootScene). Giữ hitbox cũ 20x16.
    const e = this.enemies.create(x + 10, y + 16, chaser ? 'gf-enemy-bat' : 'gf-enemy-slime');
    e.play(chaser ? 'gf-enemy-bat-fly' : 'gf-enemy-slime-walk');
    e.setData('chaser', chaser).setData('dir', 1);
    e.setSize(20, 16).setOffset(6, 8);
    e.setVelocityX(chaser ? 0 : MODES[this.mode].enemySpeed);
    e.setBounce(0, 0);
  }

  private enemySpeed(): number {
    // ARCH P1: tốc độ patrol theo mode config (MODES lookup)
    return MODES[this.mode].enemySpeed;
  }

  /** PRD 1.1 §1: hard thêm enemy/spike ×1.5 theo rng seed levelId+100. */
  private addHardExtras(): void {
    if (MODES[this.mode].extrasMul <= 1) return; // ARCH P1: theo extrasMul trong MODES
    // mulberry32 clone của levels.ts (seed = levelId + 100)
    let seed = (this.level.id + 100) | 0;
    const rand = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const GROUND_Y = 13;
    const g = this.level.grid;
    // ARCH P2: vùng cấm camp — bán kính 3 ô quanh cờ F, 2 ô quanh P start.
    const findChar = (ch: string) => {
      for (let y = 0; y < g.length; y++) { const x = g[y].indexOf(ch); if (x >= 0) return { x, y }; }
      return { x: -99, y: -99 };
    };
    const FLAG = findChar('F'), START = findChar('P');
    const dist2 = (x: number, y: number, p: { x: number; y: number }) => (x - p.x) ** 2 + (y - p.y) ** 2;
    const occupied = (x: number, y: number) =>
      (g[y]?.[x] ?? ' ') !== ' '
      || dist2(x, y, FLAG) <= 3 ** 2
      || dist2(x, y, START) <= 2 ** 2;
    const baseEnemies = this.enemies.getChildren().length;
    const wantEnemies = Math.ceil(baseEnemies * 1.5);
    const baseSpikes = this.spikes.getChildren().length;
    const wantSpikes = Math.ceil(baseSpikes * 1.5);
    let placedE = 0, placedS = 0, tries = 0;
    const COLS = this.level.cols;
    while ((placedE < wantEnemies - baseEnemies || placedS < wantSpikes - baseSpikes) && tries < 400) {
      tries++;
      const x = 6 + Math.floor(rand() * (COLS - 12));
      if (placedS < wantSpikes - baseSpikes
        && g[GROUND_Y][x] === '#' && g[GROUND_Y - 1][x] === ' ' && !occupied(x, GROUND_Y - 1)) {
        const s = this.spikes.create(x * TILE + TILE / 2, (GROUND_Y - 1) * TILE + 16, 'spike');
        s.setTint(this.palette.spike);
        s.body.setSize(TILE - 8, 12).setOffset(4, 4);
        s.refreshBody();
        placedS++;
      } else if (placedE < wantEnemies - baseEnemies
        && g[GROUND_Y][x] === '#' && g[GROUND_Y - 1][x] === ' ' && g[GROUND_Y - 2][x] === ' '
        && !occupied(x, GROUND_Y - 2)) {
        this.spawnEnemy(x * TILE, (GROUND_Y - 2) * TILE, rand() < 0.3);
        placedE++;
      }
    }
  }

  // ============ UPDATE LOOP ============
  update(_time: number, _delta: number): void {
    if (!this.fsm.running) return;
    const now = this.time.now;

    // Toast hết 1.5s → ẩn cứng (bảo hiểm khi tween bị treo theo loop)
    if (this.toastUntil && now > this.toastUntil) {
      this.toastUntil = 0;
      this.hudMsg.setAlpha(0);
      this.tweens.killTweensOf(this.hudMsg);
    }

    // Ground check + coyote
    const wasOnGround = this.onGround;
    this.onGround = this.player.body!.blocked.down || this.player.body!.touching.down;
    if (this.onGround) { this.coyoteUntil = now + PHYS.coyoteMs; this.jumpsUsed = 0; }
    void wasOnGround;

    // Move
    const speedMult = now < this.run.speedUntil ? POWERUPS.speed.mult : 1;
    const left = this.cursors.left.isDown || touchInput.isDown('left');
    const right = this.cursors.right.isDown || touchInput.isDown('right');
    if (left) this.player.setAccelerationX(-PHYS.moveAccel * speedMult);
    else if (right) this.player.setAccelerationX(PHYS.moveAccel * speedMult);
    else this.player.setAccelerationX(0);
    this.player.setMaxVelocity(PHYS.maxSpeedX * speedMult, 800);
    this.player.setFlipX(left && !right);

    // Jump buffer replay
    if (this.onGround && now - this.jumpBufferedAt < PHYS.bufferMs) this.tryJump();

    // BUG 1 fix (safety net): overlap flag có thể fail vì mọi lý do body/timing;
    // player vượt qua vị trí cờ (hoặc sát biên phải world) => chắc chắn complete.
    const goalX = this.flag ? this.flag.x : this.level.cols * TILE - 2 * TILE;
    if (this.player.x + this.player.body!.width / 2 >= goalX) this.completeLevel();

    // HUD hint: gần cuối level báo cho player biết đích ở phía trước
    if (!this.endHintShown && this.player.x > this.level.cols * TILE - 8 * TILE) {
      this.endHintShown = true;
      this.toast('→ ĐÍCH Ở PHÍA TRƯỚC!');
    }

    // BUG 2 fix: rơi hố — dưới ngưỡng chết => chết, qua revive/reviveUsed flow.
    if (this.fsm.running && this.player.y > this.deathY) this.gameOver();

    // i-frame blink: alpha flicker (đổi texture sẽ giết anim gf-hero)
    this.player.setAlpha(now < this.run.iframesUntil
      ? (Math.floor(now / 100) % 2 ? 0.3 : 1)
      : 1);

    // Hero anim state: idle/walk trên đất, jump trên không
    if (!this.onGround) {
      if (this.player.anims.currentAnim?.key !== 'gf-hero-jump') this.player.play('gf-hero-jump');
    } else if (left || right) {
      if (this.player.anims.currentAnim?.key !== 'gf-hero-walk') this.player.play('gf-hero-walk');
    } else if (this.player.anims.currentAnim?.key !== 'gf-hero-idle') {
      this.player.play('gf-hero-idle');
    }

    // Enemies: patrol turn / chaser
    this.enemies.getChildren().forEach(o => {
      const e = o as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      if (e.getData('chaser')) {
        const dx = this.player.x - e.x;
        if (Math.abs(dx) < 260) e.setVelocityX(Math.sign(dx) * 55);
        else e.setVelocityX(0);
      } else {
        const b = e.body as Phaser.Physics.Arcade.Body;
        const sp = this.enemySpeed();
        if (b.blocked.left || b.touching.left) e.setVelocityX(sp);
        else if (b.blocked.right || b.touching.right) e.setVelocityX(-sp);
      }
    });

    // HUD
    this.hudHearts.setText('♥'.repeat(this.run.hearts));
    this.hudScore.setText(padScore(calcRunScore(this.run.coins, this.run.stomps, false, 0)));
    this.hudCoins.setText(`${this.run.coins}`);
  }

  /** PRD 1.3 #3: nổ ≤10 hạt khi ăn coin — Phaser particles, lifespan ngắn,
   * chỉ chạy khi mode bật effects (MODES.effects). */
  private coinBurst(x: number, y: number): void {
    if (!MODES[this.mode].effects) return;
    if (!this.coinFx) {
      this.coinFx = this.add.particles(x, y, 'item-coin', {
        speed: { min: 50, max: 130 }, angle: { min: 200, max: 340 },
        lifespan: 280, scale: { start: 0.45, end: 0.05 },
        gravityY: 300, emitting: false,
      });
    }
    this.coinFx.emitParticleAt(x, y, 8); // 8 hạt ≤ 10
  }
  private coinFx?: Phaser.GameObjects.Particles.ParticleEmitter;

  private tryJump(): void {
    const now = this.time.now;
    const maxJumps = now < this.run.djumpUntil ? 2 : 1;
    const canFromGround = now < this.coyoteUntil;
    if (canFromGround && this.jumpsUsed === 0) {
      this.player.setVelocityY(PHYS.jumpVel);
      sfx.jump();
      this.jumpsUsed = 1;
      this.jumpBufferedAt = 0;
      this.coyoteUntil = 0;
    } else if (this.jumpsUsed < maxJumps && this.jumpsUsed >= 1) {
      this.player.setVelocityY(PHYS.jumpVel);
      sfx.djump();
      this.jumpsUsed++;
      this.jumpBufferedAt = 0;
    } else if (canFromGround) {
      this.player.setVelocityY(PHYS.jumpVel);
      sfx.jump();
      this.jumpsUsed = 1;
      this.jumpBufferedAt = 0;
    }
  }

  // ============ COMBAT & ITEMS ============
  private hitEnemy(p: Phaser.Physics.Arcade.Sprite, e: Phaser.Physics.Arcade.Sprite): void {
    if (!e.active || this.time.now < this.run.starUntil) { // star: giết enemy khi chạm
      if (e.active && this.time.now < this.run.starUntil) { e.destroy(); sfx.stomp(); this.run.stomps++; this.grantIf('first_blood'); }
      return;
    }
    const stomping = p.body!.velocity.y > 50 && (p.y + p.body!.height / 2) < e.y;
    if (stomping) {
      e.destroy();
      sfx.stomp();
      this.run.stomps++;
      p.setVelocityY(-280); // bounce nhẹ (AC-05)
      this.grantIf('first_blood');
    } else {
      this.damage();
    }
  }

  private damage(): void {
    const now = this.time.now;
    if (now < this.run.iframesUntil) return; // AC-07
    this.run.hearts--;
    sfx.hurt();
    this.run.iframesUntil = now + PHYS.iFrameS * 1000;
    this.player.setVelocity(-80, -200);
    if (this.run.hearts <= 0) this.gameOver();
  }

  private collectItem(item: Phaser.Physics.Arcade.Sprite): void {
    if (!item.active) return;
    const kind = item.getData('kind') as string;
    const now = this.time.now;
    item.destroy();
    switch (kind) {
      case 'coin':
        sfx.coin();
        this.run.coins++;
        this.coinBurst(item.x, item.y); // PRD 1.3 #3: juice
        if (this.run.coins >= 100) this.grantIf('collector');
        break;
      case 'heart':
        this.run.hearts = Math.min(this.run.hearts + 1, POWERUPS.maxHearts);
        break;
      case 'star': this.run.starUntil = now + POWERUPS.star.durationS * 1000; this.toast('STAR POWER!'); break;
      case 'speed': this.run.speedUntil = now + POWERUPS.speed.durationS * 1000; this.toast('SPEED BOOST!'); break;
      case 'djump': sfx.djump(); this.run.djumpUntil = now + POWERUPS.doubleJump.durationS * 1000; this.toast('DOUBLE JUMP!'); break;
    }
  }

  // ============ END STATES ============
  private completeLevel(): void {
    if (!this.fsm.running) return;
    this.fsm.running = false;
    sfx.complete();
    // time.now có thể NaN/undefined trong môi trường headless test → NaN propagated
    // qua JSON thành null → BE 400. Coerce về số an toàn.
    const rawS = (this.time.now || 0) - this.run.timeStart;
    const timeS = Math.max(1, Math.floor(Number.isFinite(rawS) ? rawS : 1000));
    const stars = calcStars(true, this.run.coins, this.run.deaths);
    const score = calcRunScore(this.run.coins, this.run.stomps, true, timeS);
    const { data } = recordLevelResult(this.save, this.level.id, stars, score, timeS);
    let next = data;
    // PRD 1.3 G5: phá đảo màn 10 ở hard => retro_hard_clear (badge LevelSelect)
    if (this.level.id === 10 && MODES[this.mode].hearts === 1) next = { ...next, hardClear: true };
    if (this.run.deaths === 0) { const r = grantAchievement(next, 'perfect_run'); next = r.data; if (r.granted) this.toast('★ Perfect Run!'); }
    if (timeS < 60) { const r = grantAchievement(next, 'speedrunner'); next = r.data; if (r.granted) this.toast('★ Speedrunner!'); }
    if (Object.keys(next.levels).length >= 10) next = grantAchievement(next, 'marathon').data;
    this.save = next;
    saveSave(this.save);
    recordBestScore(this.mode, score); // PRD 1.3 G5: retro_best_{mode}
    this.submitScoreOnline(score, stars, timeS);
    statSend(); // G7: flush metric lên /v1/stats khi complete màn (catch hết bên trong)
    this.showCompleteOverlay(stars, score, timeS);
  }

  /** PRD 1.1 §3: parallax 2 lớp — mây (0.3) + núi (0.6), texture sinh bằng
   *  graphics (không asset ngoài), depth -10/-5 dưới mọi object, theo camera x
   *  (tileSprite setScrollFactor tự trôi khi camera cuộn). */
  private buildParallax(): void {
    try { this.buildParallaxInner(); } catch { /* best-effort: HEADLESS/test không có renderer */ }
  }

  private buildParallaxInner(): void {
    const cam = this.cameras.main;
    const worldW = this.level.cols * TILE;
    const H = this.level.rows * TILE;
    // Lớp xa: mây — dải sáng hơn màu trời
    if (!this.textures.exists('bg-clouds')) {
      const g = this.add.graphics();
      g.fillStyle(Phaser.Display.Color.IntegerToColor(this.palette.sky).brighten(30).color, 1);
      for (let i = 0; i < 5; i++) {
        const cx = 30 + (i * 100) % 460, cy = 18 + (i * 37) % 90;
        g.fillCircle(cx, cy, 12 + (i % 3) * 4);
        g.fillCircle(cx + 16, cy + 4, 10);
        g.fillCircle(cx - 14, cy + 6, 9);
      }
      g.generateTexture('bg-clouds', 512, 128);
      g.destroy();
    }
    // Lớp gần: núi — màu platform làm tối
    if (!this.textures.exists('bg-hills')) {
      const g = this.add.graphics();
      const dark = Phaser.Display.Color.IntegerToColor(this.palette.platform).darken(25).color;
      g.fillStyle(dark, 1);
      for (let i = 0; i < 6; i++) {
        const bx = i * 96;
        g.fillTriangle(bx, 128, bx + 48, 34 + (i % 3) * 18, bx + 96, 128);
      }
      g.generateTexture('bg-hills', 576, 128);
      g.destroy();
    }
    this.bgClouds = this.add.tileSprite(0, 0, Math.max(worldW, cam.width), 128, 'bg-clouds')
      .setOrigin(0, 0).setScrollFactor(0.3).setDepth(-10);
    this.bgHills = this.add.tileSprite(0, H - 128, Math.max(worldW, cam.width), 128, 'bg-hills')
      .setOrigin(0, 0).setScrollFactor(0.6).setDepth(-5);
  }

  bgClouds?: Phaser.GameObjects.TileSprite; // public để Playwright verify scrollFactor
  bgHills?: Phaser.GameObjects.TileSprite;

  /** F7: submit run lên server (best-effort), lưu rank để hiển thị ở leaderboard. */
  private submitScoreOnline(score: number, stars: number, timeS: number): void {
    const playerId = getPlayerId();
    const name = this.save.playerName || 'Player';
    void api.registerPlayer(playerId, name)
      .catch(() => null) // offline/BE chưa chạy: vẫn chơi bình thường
      .then(() => api.submitScore({ player_id: playerId, level_id: this.level.id, value: score, stars, duration_s: Math.max(1, timeS), mode: this.mode }))
      .then(res => {
        this.lastRank = res.rank;
        this.toast(`RANK #${res.rank}`);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status !== 0) this.toast('SUBMIT LỖI');
      });
  }

  private lastRank?: number;

  // ===== Designer L1: onboarding lần đầu vào màn 1 =====
  private static readonly ONBOARD_KEY = 'retro_onboarded';
  private onboarding = false;

  private static onboardNeeded(): boolean {
    try { return localStorage.getItem(GameScene.ONBOARD_KEY) !== '1'; } catch { return false; }
  }

  private beginOnboarding(): void {
    this.onboarding = true;
    this.fsm.running = false; // game chờ người chơi giữ trái THẬT
    const cam = this.cameras.main;
    const cx = cam.width / 2, cy = cam.height / 2;
    this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.55).setScrollFactor(0).setDepth(880);
    this.add.text(cx, cy - 40,
      'GIỮ TRÁI ◀ ĐỂ CHẠY · TAP PHẢI ▲ ĐỂ NHẢY',
      { fontFamily: 'monospace', fontSize: '20px', color: '#ffd166', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(881);
    const sub = this.add.text(cx, cy + 10, '← GIỮ NÚT TRÁI ĐỂ BẮT ĐẦU',
      { fontFamily: 'monospace', fontSize: '16px', color: '#e0e0ff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(881);
    this.tweens.add({ targets: sub, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    this.startBtn = this.btn('▶ BẮT ĐẦU', cx, cy + 70, () => this.finishOnboarding());
    // đợi giữ trái thật (keyboard hoặc touch) — listener một lần
    const onStart = () => this.finishOnboarding();
    this.input.keyboard!.on('keydown-LEFT', onStart);
    this.input.keyboard!.on('keydown-RIGHT', onStart);
    this.onTouchStart = (btn: string, down: boolean) => {
      if (down && (btn === 'left' || btn === 'right')) this.finishOnboarding();
    };
    this.game.events.on('touch', this.onTouchStart);
  }

  private onTouchStart: (btn: string, down: boolean) => void = () => { /* gán trong beginOnboarding */ };
  private startBtn?: Phaser.GameObjects.Container;

  private finishOnboarding(): void {
    if (!this.onboarding) return;
    this.onboarding = false;
    this.game.events.off('touch', this.onTouchStart);
    try { localStorage.setItem(GameScene.ONBOARD_KEY, '1'); } catch { /* ignore */ }
    this.children.list.filter(o => o instanceof Phaser.GameObjects.Rectangle || o instanceof Phaser.GameObjects.Text)
      .forEach(o => { const d = (o as Phaser.GameObjects.Components.Depth).depth; if (d >= 880) o.destroy(); });
    this.startBtn?.destroy();
    this.fsm.running = true;
    this.run.timeStart = this.time.now;
    // hint in-game tự tắt sau 5s
    this.time.delayedCall(5000, () => {
      const root = document.getElementById('touch-ui');
      root?.querySelectorAll('.hint').forEach(h => ((h as HTMLElement).style.display = 'none'));
    });
  }

  private gameOver(): void {
    if (!this.fsm.running) return;
    this.fsm.running = false;
    this.run.deaths++;
    this.player.setTint(0x888888);
    // PRD 1.3 #3: screen shake 150ms giảm dần khi chết — không che gameplay
    // (player vẫn ở giữa camera vì startFollow giữ anchor; intensity nhẹ 0.008).
    if (MODES[this.mode].effects) this.cameras.main.shake(150, 0.008, true);
    if (!this.run.reviveUsed) this.showReviveOverlay();
    else this.showGameOverOverlay();
  }

  // ============ PAUSE ============
  private togglePause(): void {
    // Chỉ resume khi overlay hiện tại là PAUSE. Nếu đang ở overlay
    // REVIVE/GAMEOVER/COMPLETE thì bỏ qua — tránh resume game khi player đã chết/hoàn thành.
    if (this.overlayKind === 'pause') { this.resume(); return; }
    if (this.overlay || !this.fsm.running) return;
    this.fsm.running = false;
    this.physics.world.pause();
    this.showPauseOverlay();
  }

  private resume(): void {
    if (this.overlayKind !== 'pause') return; // chỉ resume từ pause overlay
    this.overlay?.destroy();
    this.overlay = undefined;
    this.overlayKind = undefined;
    this.physics.world.resume();
    this.fsm.running = true;
  }

  // ============ OVERLAYS (DOM-free, tất cả trong scene) ============
  private dim(): Phaser.GameObjects.Rectangle {
    const cam = this.cameras.main;
    // setScrollFactor(0) => tọa độ là SCREEN coords. Dùng cam.scrollX làm tâm
    // sẽ đẩy nút ra ngoài viewport khi camera đã cuộn (bug COMPLETE không click được).
    const r = this.add.rectangle(cam.width / 2, cam.height / 2,
      cam.width, cam.height, THEME.OVERLAY_BG, THEME.OVERLAY_ALPHA).setScrollFactor(0).setDepth(900);
    return r;
  }

  // Designer L2 (batch 3): btn() giờ wrap factory createButton (nền + hitbox
  // 300x52 ≥44px như batch 1, pressed đổi màu nhẹ). fixed=true để nút overlay
  // không trôi theo camera.
  private btn(text: string, x: number, y: number, cb: () => void): Phaser.GameObjects.Container {
    return createButton(this, { label: text, x, y, w: 300, h: 52, fixed: true, depth: 901, onTap: cb });
  }

  private showPauseOverlay(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const c = this.add.container(0, 0, [this.dim(),
      this.add.text(cx, cy - 90, '⏸ PAUSED', { fontFamily: 'monospace', fontSize: '36px', color: '#06d6a0' }).setOrigin(0.5).setScrollFactor(0).setDepth(901),
      this.btn('▶ RESUME', cx, cy - 20, () => this.resume()),
      this.btn('↻ RESTART', cx, cy + 30, () => this.scene.restart({ levelId: this.level.id, mode: this.mode })),
      this.btn('✖ QUIT TO MENU', cx, cy + 80, () => this.scene.start('LevelSelect')),
    ]);
    this.overlay = c;
    this.overlayKind = 'pause';
    this.syncTouchZones();
  }

  private showReviveOverlay(): void {
    const cam = this.cameras.main;
    const cx = cam.width / 2, cy = cam.height / 2;
    const c = this.add.container(0, 0, [this.dim(),
      this.add.text(cx, cy - 90, 'GAME OVER', { fontFamily: 'monospace', fontSize: '36px', color: '#ef476f' }).setOrigin(0.5).setScrollFactor(0).setDepth(901),
      this.add.text(cx, cy - 50, 'Hồi sinh bằng rewarded ad?', { fontFamily: 'monospace', fontSize: '16px', color: '#ffd166' }).setOrigin(0.5).setScrollFactor(0).setDepth(901),
      this.btn('▶ REVIVE (XEM AD)', cx, cy, async () => {
        this.btn_disableAll();
        const res = await this.ads.loadAndShow(); // stub UI — SDK M3
        if (res.ok) {
          this.run.reviveUsed = true; // BR-M1: 1 lần/run
          this.run.hearts = MODES[this.mode].hearts; // R5-1: revive hearts theo mode (MODES lookup)
          this.player.setTint(this.charColor); // giữ màu nhân vật sau revive
          // Rơi hố chết: respawn về spawn point, nếu không sẽ chết lại ngay.
          this.player.setPosition(this.spawnX, this.spawnY);
          this.player.setVelocity(0, 0);
          this.overlay?.destroy();
          this.overlay = undefined;
          this.overlayKind = undefined;
          this.syncTouchZones();
          this.fsm.running = true;
          this.run.iframesUntil = this.time.now + 3000;
          this.toast('REVIVED! ♥♥♥');
        }
      }),
      this.btn('✖ CHẤP NHẬN', cx, cy + 50, () => this.showGameOverOverlay()),
    ]);
    this.overlay = c;
    this.overlayKind = 'revive';
    this.syncTouchZones();
  }

  private btn_disableAll(): void {
    // Safety: sau overlay/restart đảm bảo input của scene luôn bật lại (pointer + keyboard).
    this.input.enabled = true;
    this.input.keyboard!.enabled = true;
  }

  private showGameOverOverlay(): void {
    this.overlay?.destroy();
    this.overlayKind = 'gameover';
    this.syncTouchZones();
    const cam = this.cameras.main;
    const cx = cam.width / 2, cy = cam.height / 2;
    const c = this.add.container(0, 0, [this.dim(),
      this.add.text(cx, cy - 60, 'GAME OVER', { fontFamily: 'monospace', fontSize: '40px', color: '#ef476f' }).setOrigin(0.5).setScrollFactor(0).setDepth(901),
      this.btn('↻ RETRY', cx, cy + 10, () => this.scene.restart({ levelId: this.level.id, mode: this.mode })),
      this.btn('✖ MENU', cx, cy + 60, () => this.scene.start('LevelSelect')),
    ]);
    this.overlay = c;
  }

  private showCompleteOverlay(stars: number, score: number, timeS: number): void {
    const cam = this.cameras.main;
    const cx = cam.width / 2, cy = cam.height / 2;
    const parts: Phaser.GameObjects.GameObject[] = [this.dim(),
      this.add.text(cx, cy - 100, 'LEVEL COMPLETE!', { fontFamily: 'monospace', fontSize: '34px', color: '#06d6a0' }).setOrigin(0.5).setScrollFactor(0).setDepth(901),
    ];
    for (let i = 0; i < 3; i++) {
      const st = this.add.image(cx - 40 + i * 40, cy - 40, i < stars ? 'star-hud' : 'star-empty').setScrollFactor(0).setDepth(901);
      parts.push(st);
      if (i < stars) this.tweens.add({ targets: st, scale: { from: 0.2, to: 1 }, duration: 300, delay: i * 150, ease: 'Back.easeOut' });
    }
    parts.push(
      this.add.text(cx, cy, `SCORE ${padScore(score)} · ${timeS}s`, { fontFamily: 'monospace', fontSize: '18px', color: '#ffd166' }).setOrigin(0.5).setScrollFactor(0).setDepth(901),
      this.btn(this.level.id < LEVELS.length ? '▶ NEXT LEVEL' : '▶ MENU', cx, cy + 60, () => {
        if (this.level.id < LEVELS.length) this.scene.restart({ levelId: this.level.id + 1, mode: this.mode });
        else this.scene.start('LevelSelect');
      }),
      this.btn('★ LEADERBOARD', cx, cy + 150, () =>
        this.scene.start('Leaderboard', { levelId: this.level.id, myRank: this.lastRank, mode: this.mode })),
      this.btn('✖ MENU', cx, cy + 105, () => this.scene.start('LevelSelect')),
    );
    this.overlay = this.add.container(0, 0, parts);
    this.overlayKind = 'complete';
    this.syncTouchZones();
  }

  // ============ HUD ============
  private buildHud(): void {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(800);
    // y≥26: ENVELOP crop mép trên ~18-24px trên mobile landscape (iPhone 844x390)
    const hudY = 30;
    const panelL = this.add.rectangle(6, hudY - 4, 200, 30, 0x000000, 0.6).setOrigin(0, 0);
    const label = this.add.text(12, hudY, 'HP', { fontFamily: 'monospace', fontSize: '16px', color: '#8a8aa0' });
    this.hudHearts = this.add.text(48, hudY, '♥♥♥', { fontFamily: 'monospace', fontSize: '16px', color: '#ef476f' });
    this.hudScore = this.add.text(GAME_W / 2, hudY, '000000', { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5, 0).setShadow(2, 2, '#000000', 4, true, true);
    const panelR = this.add.rectangle(GAME_W - 130, hudY - 4, 124, 30, 0x000000, 0.6).setOrigin(0, 0);
    const coinsIcon = this.add.image(GAME_W - 120, hudY + 11, 'item-coin');
    this.hudCoins = this.add.text(GAME_W - 108, hudY, '0', { fontFamily: 'monospace', fontSize: '18px', color: '#ffd166' });
    const levelTag = this.add.text(GAME_W - 60, hudY, `${this.level.world}-${this.level.id}`, { fontFamily: 'monospace', fontSize: '16px', color: '#8a8aa0' });
    hud.add([panelL, label, this.hudHearts, this.hudScore, panelR, coinsIcon, this.hudCoins, levelTag]);
    // PRD 1.1 §1: badge HARD khi chơi hard (MODES lookup: hearts===1 đặc trưng hard)
    if (MODES[this.mode].hearts === 1) {
      hud.add(this.add.text(GAME_W - 130, hudY + 34, '🔥 HARD', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ff5252',
        backgroundColor: '#2a0a12', padding: { x: 5, y: 2 },
      }).setOrigin(1, 0));
    }
    this.hudMsg = this.add.text(GAME_W / 2, 70, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffd166' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(801).setAlpha(0);
  }

  private toast(msg: string): void {
    // Tối đa 1 toast cùng lúc + tự ẩn sau 1.5s (tránh text chồng/garbled khi loop đứng).
    this.toastUntil = this.time.now + 1500;
    this.hudMsg.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.hudMsg);
    this.tweens.add({ targets: this.hudMsg, alpha: 0, delay: 900, duration: 500 });
  }

  private grantIf(id: string): void {
    const r = grantAchievement(this.save, id);
    if (r.granted) {
      this.save = r.data;
      saveSave(this.save);
      sfx.badge();
      this.toast(`★ ${id.replace('_', ' ').toUpperCase()}`);
    }
  }
}
