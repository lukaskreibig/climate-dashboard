import { test, expect } from '@playwright/test';

const SCENES = [
  { key: 'visual-proof', captionSide: 'right' as const },
  { key: 'new-abnormal', captionSide: 'left' as const },
];

test.describe('story layout guardrails', () => {
  test('charts respect gutters and caption separation', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/de`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // allow GSAP to settle

    const progressGutter = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--progress-gutter');
      const numeric = parseFloat(raw);
      return Number.isNaN(numeric) ? 160 : numeric;
    });

    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Viewport size not available');

    for (const scene of SCENES) {
      const sceneLocator = page.locator(`section[data-scene="${scene.key}"]`);
      await sceneLocator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      const chart = page.locator(`section[data-scene="${scene.key}"] .chart-layer > div`).first();
      const caption = page.locator(`section[data-scene="${scene.key}"] [data-cap-idx="0"] .caption-box`).first();

      const chartBox = await chart.boundingBox();
      const captionBox = await caption.boundingBox();
      if (!chartBox || !captionBox) {
        throw new Error(`Scene ${scene.key} did not expose measurable elements`);
      }

      // Sanity check: chart stays within viewport safety bounds
      expect(chartBox.left).toBeGreaterThanOrEqual(24);
      expect(chartBox.right).toBeLessThanOrEqual(viewport.width - progressGutter - 24);

      if (scene.captionSide === 'right') {
        expect(captionBox.left).toBeGreaterThan(chartBox.right + 8);
      } else {
        expect(captionBox.right).toBeLessThan(chartBox.left - 8);
      }
    }
  });
});
