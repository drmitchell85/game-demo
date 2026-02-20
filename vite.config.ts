import { defineConfig } from 'vitest/config';
import { defaultExclude } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'node',  // Hex math is pure TS — no DOM or Phaser needed
    // Extend vitest defaults rather than replace them — adds dist/ exclusion
    // so compiled test files from `npm run build` don't run alongside source tests.
    exclude: [...defaultExclude, 'dist/**'],
  },
  build: {
    // Phaser is always ~1.4MB — suppress the expected chunk size warning
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Keep Phaser in its own chunk — ~1.2MB, cached separately from game code
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 8080,
  },
});
