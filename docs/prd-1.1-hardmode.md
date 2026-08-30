# PRD 1.1 — Hard Mode, Nhân vật & Đổi cảnh

Mục tiêu: game "cuốn hơn" cho sếp + con sếp đã phá đảo 10 vòng. MVP, không Ad SDK, không i18n.

## 1. Hard Mode
Chọn Normal/Hard ở MenuScene lúc bấm Play (2 nút: ▶ Normal / 🔥 Hard). Hard chỉ đổi thông số GameplayScene, map giữ nguyên (seed cố định).

Thông số Hard (Normal → Hard):
- Tốc độ enemy patrol: 40 → 65 px/s
- Số enemy: ×1.5 (mỗi level thêm ~2 enemy theo rng seed levelId+100)
- Số spike: ×1.5 (tương tự)
- Số mạng: 3 → 1

## 2. Chọn nhân vật
- 4 nhân vật, THUẦN COSMETIC (khuyến nghị: không đổi stats — giữ cân bằng, effort thấp): mỗi nhân vật 1 màu + mô tả 1 dòng vui (VD: "Red — dũng cảm như tương ớt").
- UI: hàng 4 nút ở LevelSelectScene, chọn xong vào level. Lưu lựa chọn vào registry.
- Nguồn độ khó đa dạng thật là Hard Mode; nhân vật chỉ để gắn cảm tình.

## 3. Đổi cảnh mỗi round
- generateLevel(id) đã có rng seed theo level → thêm levelPalette(id) trả palette (sky, platform, spike, accent) + background variant đơn giản (trời màu + vài shape mây/núi theo seed).
- Effort thấp nhất: chỉ đổi màu (sky fill, tint platform/spike) — đã đạt cảm giác "đổi round"; parallax 2 lớp là bonus.

## 4. Acceptance criteria
- Hard Mode: chọn ở Menu, Hard áp đủ 4 thông số trên, có badge "HARD" trong game; Normal không đổi.
- Nhân vật: chọn 1/4, màu trong game đúng lựa chọn, lưu qua restart.
- Đổi cảnh: 10 level có ≥8 palette khác nhau rõ ràng, không crash khi chuyển level.
- Không tăng thời gian load, không thêm dependency.

## 5. Design artifact update (2026-08-30)

- CEO đã duyệt ngày 2026-08-30: **Red Comet Explorer**, bốn cosmetic skin đỏ/xanh dương/xanh lá/vàng; không thay đổi stats hoặc unlock rule.
- Meowa source/job, palette, asset manifest, GameHub icon/cover, accessibility, selection rationale và risk log được quản lý tại `docs/prd-1.3.md` mục “Design gate — Meowa asset direction”.
- Contact sheet: `assets/meowa/contact-sheet.png`; machine manifest: `assets/meowa/manifest.json`.
- Trạng thái: **PRD-APPROVED**. CEO chấp nhận ngoại lệ Meowa 72 credits, yêu cầu dừng paid generation và chọn repo hiện có `https://github.com/thaitrn/pixel-quest` làm source-of-truth. Handoff FE được phép mở dưới task riêng; runtime integration vẫn phải giữ hitbox/unlock rule và qua playtest.
