import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig({
  base: '/',
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 3500 },
  test: {
    environmentOptions: { jsdom: { pretendToBeVisual: true } },
    deps: { inline: [/phaser/] },
    // Test dùng dist bundle (self-contained) — src build cần phaser3spectorjs + window.
    alias: [{ find: /^phaser$/, replacement: path.resolve(__dirname, 'node_modules/phaser/dist/phaser.js') }],
  },
  plugins: [{
    name: 'stub-phaser3spectorjs',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'phaser3spectorjs') return path.resolve(__dirname, 'tests/stubs/phaser3spectorjs.js');
      return null;
    },
  }],
});
