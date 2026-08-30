// Phaser dist bundle (self-contained) — src/ build cần phaser3spectorjs + window ở import-time.
// QA M3 test dùng bundle này cho HEADLESS boot.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import Phaser from 'phaser/dist/phaser.js';
export default Phaser as any;
