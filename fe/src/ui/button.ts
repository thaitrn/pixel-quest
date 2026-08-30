import Phaser from 'phaser';
import { THEME } from '../data/theme';

// ============ Designer L2 (batch 3): Button factory dùng chung ============
// Thay các btn()/menuButton() text-only rải rác bằng MỘT factory.
// Giữ hitbox ≥44px (batch 1): mặc định 280x56, min clamp 44x44 — hitbox là
// hình chữ nhật NỀN (không phải text), nên tap lệch tâm vẫn ăn.
export interface ButtonOpts {
  label: string;
  color?: string;            // màu viền + chữ (default PRIMARY)
  x: number; y: number;
  w?: number; h?: number;    // default 280x56
  onTap: () => void;
  /** GameScene overlay cần scrollFactor(0) để nút không trôi theo camera. */
  fixed?: boolean;
  depth?: number;
}

export function createButton(scene: Phaser.Scene, o: ButtonOpts): Phaser.GameObjects.Container {
  const w = Math.max(o.w ?? 280, 44);
  const h = Math.max(o.h ?? 56, 44);
  const color = o.color ?? THEME.PRIMARY;
  const stroke = Phaser.Display.Color.HexStringToColor(color).color;

  const box = scene.add.rectangle(0, 0, w, h, THEME.BTN_BG, 1).setStrokeStyle(2, stroke);
  const txt = scene.add.text(0, 0, o.label, {
    fontFamily: 'monospace', fontSize: '22px', color,
  }).setOrigin(0.5);

  const c = scene.add.container(o.x, o.y, [box, txt]).setSize(w, h);
  if (o.fixed) c.setScrollFactor(0);
  if (o.depth !== undefined) c.setDepth(o.depth);
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains);

  // FIX bug tap nhanh không ăn (viewport 932x430, touch thật): trigger CHÍNH trên
  // pointerdown (bấm là ăn ngay — mobile-first) + FALLBACK pointerup (một số môi
  // trường touch nuốt GameObject pointerdown, chỉ tới up). `armed` chặn double-fire:
  // nếu down đã chạy onTap thì up không chạy lại; up chỉ bù khi down chưa tới.
  let armed = true; // false nghĩa là gesture này đã fire — chặn up bắn lại sau down
  const fire = () => { if (!armed) return; armed = false; o.onTap(); };

  // Hover: nền sáng nhẹ; Pressed: nền đậm nhẹ (feedback nhấn xuống)
  box.on('pointerover', () => box.setFillStyle(THEME.BTN_BG_HOVER));
  box.on('pointerout', () => box.setFillStyle(THEME.BTN_BG));
  c.on('pointerdown', () => {
    armed = true; // gesture mới bắt đầu — cho phép fire 1 lần
    box.setFillStyle(THEME.BTN_BG_PRESSED);
    fire();
  });
  c.on('pointerup', () => {
    box.setFillStyle(THEME.BTN_BG);
    fire();
  });

  // WORKAROUND Phaser 3.90 FIT bug: canvas CSS width >780px (viewport ≥850,
  // iPhone landscape 932x430) → InputPlugin.hitTest trả 0 objects dù pointer
  // tới đúng tọa độ → GameObject events KHÔNG BAO GIỜ bắn. Bù bằng fallback
  // Ở CẤP SCENE: mọi pointerdown đều qua handler này, tự kiểm tra rect nút
  // bằng tọa độ pointer (KHÔNG dùng hitTest). Chống double-fire 2 đường: nếu
  // GameObject event đã fire gesture này (armed=false) thì bỏ qua; scene-level
  // fire xong re-arm sau timeout ngắn để gesture sau vẫn ăn.
  const onScenePointerDown = (pointer: Phaser.Input.Pointer) => {
    if (!c.active || !pointer) return;
    // tọa độ MÀN HÌNH của nút: trừ camera scroll theo scrollFactor
    // (nút fixed scrollFactor=0 → không trừ gì; nút thường trừ scroll đầy đủ)
    const cam = scene.cameras.main;
    const sx = c.x - cam.scrollX * c.scrollFactorX;
    const sy = c.y - cam.scrollY * c.scrollFactorY;
    if (pointer.x < sx - w / 2 || pointer.x > sx + w / 2) return;
    if (pointer.y < sy - h / 2 || pointer.y > sy + h / 2) return;
    if (!armed) return; // GameObject event đã fire gesture này
    armed = false;
    box.setFillStyle(THEME.BTN_BG_PRESSED);
    o.onTap();
    // re-arm sau timeout: chờ gesture hiện tại kết thúc (down+up ~60-150ms),
    // tránh pointerup GameObject (nếu có) bắn lại ngay gesture này.
    scene.time.delayedCall(400, () => { armed = true; });
  };
  scene.input.on('pointerdown', onScenePointerDown);
  // tránh leak listener khi scene restart/shutdown
  scene.events.once('shutdown', () => {
    scene.input.off('pointerdown', onScenePointerDown);
  });
  return c;
}
