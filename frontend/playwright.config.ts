import { defineConfig, devices } from '@playwright/test';

/**
 * Headless Chromium draws WebGL with SwiftShader, a software rasteriser, unless
 * it is told otherwise. This story puts up to three Mapbox canvases on screen,
 * which is 7.4 megapixels at 2560 by 1440, and in software that is ruinous: the
 * responsive audit could not finish that viewport inside ten minutes, and a
 * profile blamed the page.
 *
 * The profile was wrong, and only measuring both told us. Same page, same
 * viewport, same scroll:
 *
 *              frames over 33 ms   p95 frame   worst frame   page.evaluate
 *   SwiftShader        42 %         1083 ms       9566 ms    57 ms (max 2099)
 *   Apple M3 Pro        9 %           50 ms        567 ms    18 ms (max 27)
 *
 * So the gate now asks for the GPU. Where there is none, ANGLE falls back to
 * SwiftShader on its own and the suite still runs, only slowly, which is the
 * right failure mode for a flag like this.
 */
const GPU_FLAGS = [
  '--use-gl=angle',
  '--use-angle=default',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: GPU_FLAGS },
      },
    },
  ],
});
