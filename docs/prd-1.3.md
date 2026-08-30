# Mini-PRD 1.3 — Batch 4: Giữ chân 2 personas

Ngày: 2026-08-23 · PM. Ngữ cảnh: Batch 1–3 đã/lưu hành ship hitbox, leaderboard tách mode, unlockable, onboarding, contrast, anti-camp, mode config, design system, palette 7, save policy. Batch 4 nhắm giữ chân: con sếp 10 tuổi đã phá đảo 10 vòng → nguy cơ chán (ưu tiên #1); sếp lớn cần đo được tiến bộ.

## Thứ tự ưu tiên (theo giá trị giữ chân)

### 1. Nội dung cấp cao — màn 11–15 procedural (từ ứng viên c)
Thêm màn 11–15 sinh procedural (tăng dần density enemy/platform, seed cố định/lưu).
- AC: Qua màn 10 → mở 11–15; độ khó tăng dần; chơi lại cùng màn giống nhau (seed).
- Estimate: vừa.
- Lý do: giải trực tiếp nguy cơ chán của persona B; MVP nhanh hơn endless/boss. Endless/boss để 1.4 tùy metric.

### 2. G5 — Best score cá nhân + huy hiệu (a)
Hiển thị best score của mình cố định trên leaderboard trống; badge "Phá đảo Hard".
- AC: Best score/mode hiện ở header bảng; badge hiện trên LevelSelect sau khi qua màn 10 Hard; persist.
- Estimate: nhỏ.
- Lý do: bảng 2 người chơi trống → thiếu đích; badge cho persona B "khoe", best score cho persona A đo tiến bộ.

### 3. Juice nhẹ (d)
Particle khi ăn coin, screen shake nhẹ khi chết.
- AC: Particle nổ coin ≤10 hạt, không lag; shake 150ms giảm dần, không che gameplay; tắt được qua mode config.
- Estimate: nhỏ.
- Lý do: rẻ, tăng cảm giác tức thì cho cả 2 personas, giữ nhịp "phần thưởng tức thì".

### 4. G7 — Metric engagement cơ bản (b)
Đếm client: số round/ngày, thời gian chơi/buổi, tỷ lệ chọn Hard → gửi BE kèm score hiện có.
- AC: 3 số liệu ghi được cho mỗi phiên; BE lưu/log được; dashboard mini hoặc export JSON.
- Estimate: nhỏ–vừa.
- Lý do: số liệu quyết định 1.4 (endless vs boss vs thêm world); không có metric thì cứ đoán.

### 5. Parallax background 2 lớp (e) — dở từ PRD 1.1 mục 3
2 lớp nền cuộn tốc độ khác nhau theo camera.
- AC: Lớp xa chậm 0.3x, lớp gần 0.6x; không che platform/enemy; palette 7 hiện hành.
- Estimate: nhỏ.
- Lý do: thuần thẩm mỹ, "biến hóa hình ảnh" cho persona B; để cuối vì không thêm nội dung/gameplay.

## Đã loại khỏi batch 4
- Endless mode, boss cuối world: giá trị cao nhưng effort lớn; chờ metric G7 (#4) quyết định hướng 1.4.

## AC tổng batch 4
Ship 5 mục trên; metric G7 chạy thật ≥3 buổi trước khi chốt scope 1.4.

## Design gate — Meowa asset direction (2026-08-30)

Trạng thái: **PRD-APPROVED** bởi CEO Jack.T ngày 2026-08-30. Art direction và selected assets dưới đây được chốt làm đầu vào cho handoff FE. GitHub source-of-truth được chọn là `https://github.com/thaitrn/pixel-quest`; việc tích hợp runtime vẫn phải qua task FE riêng và playtest theo các ràng buộc accessibility/hitbox bên dưới.

### Visual Direction

- Phong cách: platformer pixel-art nguyên bản, silhouette to/rõ, viền navy đậm, mảng màu giới hạn; tránh mô phỏng trực tiếp IP/game cụ thể.
- Nhân vật chính được chọn: **Red Comet Explorer** — nhà thám hiểm nhỏ hướng phải, dấu nhận diện đỏ/coral. Bốn skin đỏ/xanh dương/xanh lá/vàng là cosmetic, giữ nguyên business rule PRD 1.1: không đổi stats; green/yellow vẫn khóa tới khi qua 5 màn.
- Hazard family: moss slime (patrol), cave bat (chaser), crystal spike (static damage), ánh xạ đúng gameplay hiện hành.
- Reward family: coin, heart, star, speed và double-jump; mỗi icon có silhouette khác nhau để không phụ thuộc màu.
- HUD motif: panel navy, outline mint, accent coral/gold; control glyph không chữ để dùng được trên mobile.
- Palette chuẩn: `navy #0b0e1a`, `panel #1e2a4a`, `mint #06d6a0`, `coral #ef476f`, `gold #ffd166`, `text #e0e0ff`, `sky #17295b`. Palette này kế thừa token trong `fe/src/data/theme.ts`; chưa yêu cầu FE đổi code.

### Mobile readability & accessibility

- Chỉ dùng asset gameplay sau khi FE tạo runtime cells phù hợp hitbox hiện tại (hero 32×48, enemy 32×32, coin 16×16); bản chọn ở đây là source design, không được scale mượt hoặc tự ép méo.
- Khi hậu xử lý pixel-art chỉ dùng nearest-neighbor ở hệ số nguyên. Duy trì outline tối + contrast sáng/tối; collectible phân biệt bằng hình dạng, không chỉ màu.
- Touch target vẫn tối thiểu 44×44 CSS px theo design system hiện hành; glyph có thể nhỏ hơn nhưng hit area không được nhỏ theo ảnh.
- App icon và cover là opaque để tránh halo trên nền GameHub; sprite source là RGBA có alpha thật.

### Asset manifest đã chọn

| Asset | Kích thước | Mục đích |
|---|---:|---|
| `assets/meowa/selected/hero-red.png` | 85×135 RGBA | Hero mặc định / app identity |
| `assets/meowa/selected/hero-blue.png` | 81×135 RGBA | Cosmetic blue |
| `assets/meowa/selected/hero-green.png` | 82×135 RGBA | Cosmetic unlock level 5 |
| `assets/meowa/selected/hero-yellow.png` | 83×135 RGBA | Cosmetic unlock level 5 |
| `assets/meowa/selected/hazard-slime.png` | 81×72 RGBA | Patrol enemy |
| `assets/meowa/selected/hazard-bat.png` | 100×74 RGBA | Chaser enemy |
| `assets/meowa/selected/hazard-spike.png` | 61×69 RGBA | Static hazard |
| `assets/meowa/selected/collectible-coin.png` | 62×63 RGBA | Score coin |
| `assets/meowa/selected/collectible-heart.png` | 65×57 RGBA | Heal |
| `assets/meowa/selected/collectible-star.png` | 63×60 RGBA | Star power |
| `assets/meowa/selected/collectible-speed.png` | 67×61 RGBA | Speed boost |
| `assets/meowa/selected/collectible-double-jump.png` | 63×67 RGBA | Double jump |
| `assets/meowa/selected/ui-controls.png` | 78×138 RGBA | Control/HUD motif source |
| `assets/meowa/selected/gamehub-app-icon-512.png` | 512×512 RGBA opaque | GameHub app icon |
| `assets/meowa/selected/gamehub-cover-1200x630.png` | 1200×630 RGBA opaque | GameHub cover |

Máy đọc được đầy đủ tại `assets/meowa/manifest.json`; preview duyệt tập trung tại `assets/meowa/contact-sheet.png`.

### Provenance, hậu xử lý và credits

- Meowa capability: `pixel-universal-gen-run`, normal speed; job ID `job_54ad3775080a40119d5c2835ca2bf44b`.
- Source duy nhất do Meowa trả về: `assets/meowa/source/core-pack/An_original_bright_16-bit_side-scrolling_platformer_asset_sheet_one_small_red_comet_explorer_hero_facing_right_2f29a205/sprite_00.png`, 540×387 RGBA. `final_outputs.json` cùng thư mục là manifest tải xuống đã sanitize.
- Hậu xử lý local có kiểm soát: crop theo bbox, ghép icon/cover, scale integer bằng nearest-neighbor; không có generative edit. Script tái lập: `assets/meowa/postprocess.py`.
- Balance đo thật: **190 trước → 118 sau = 72 credits**. Một job đã tính 72 credits, vượt cap task 40 credits 32 credits; reserve vẫn 118 (>30). CEO đã chấp nhận ngoại lệ này ngày 2026-08-30. Quyết định bắt buộc: dừng toàn bộ paid generation tiếp theo và giữ balance 118 làm reserve; không dùng fast mode hoặc tạo thêm variant trong scope này.

### Selection rationale & rejected directions

- Chọn sheet này vì bao phủ đúng entity đang chạy trong code (4 cosmetic hero, patrol/chaser/spike, 5 reward, controls) trong một style/palette nhất quán; đủ tạo icon và cover mà không phát sinh thêm paid job.
- Không dùng trực tiếp sheet tổng trong runtime: cell không đồng kích thước, chưa có animation frame và chưa được playtest ở kích thước 32×48/32×32/16×16.
- Loại hướng prompt “Mario style” trong prompt pack cũ vì tạo phụ thuộc thị giác vào IP khác; direction mới là Red Comet Explorer nguyên bản.
- Không tạo/re-roll biến thể Meowa sau job đầu: charge 72 credits đã vượt budget. Vì vậy không có variant trả phí thứ hai để so A/B; đây là rủi ro lựa chọn một mẫu.
- Giữ nguyên toàn bộ `fe/public/gf/*`; Design gate này không xóa hoặc thay asset hiện hành.

### Decision Log — CEO approval (2026-08-30)

Owner quyết định: **CEO Jack.T**.

1. **APPROVED** Red Comet Explorer, bốn cosmetic skin và toàn bộ hazard/reward/HUD family trên `assets/meowa/contact-sheet.png`.
2. **APPROVED WITH EXCEPTION** chi phí Meowa 72 credits so với cap 40. Không generate trả phí thêm; giữ balance 118 làm reserve.
3. **APPROVED** chốt selected assets trong PRD và chuẩn bị handoff FE. FE phải tạo runtime cells đúng hitbox, dùng nearest-neighbor và playtest mobile; source design không được đưa thẳng vào runtime như spritesheet hoàn chỉnh.
4. **SOURCE OF TRUTH**: dùng repo GitHub hiện có `https://github.com/thaitrn/pixel-quest`; không tạo repo trùng và không ghi đè lịch sử hiện hữu.
5. Gate hiện tại: **PRD-APPROVED**. Bước kế tiếp thuộc owner FE: tích hợp trong task riêng, kèm kiểm thử và review UI/UX; approval này không tự xác nhận FE integration đã hoàn thành.
