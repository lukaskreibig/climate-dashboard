import { test, expect, type Page } from '@playwright/test';

const SCENES = [
  { key: 'visual-proof', captionSide: 'right' as const },
  { key: 'new-abnormal', captionSide: 'left' as const },
];

const gotoStory = async (page: Page, baseURL: string | undefined, lng = 'de') => {
  await page.goto(`${baseURL}/${lng}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toBeVisible();
  await page.locator('[data-loading-overlay="true"]').waitFor({
    state: 'detached',
    timeout: 20_000,
  });
};

test.describe('story layout guardrails', () => {
  for (const lng of ['en', 'de']) {
    test(`/${lng} renders the live intro shell`, async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/${lng}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('body')).toContainText(
        lng === 'de' ? 'SCHMELZPUNKT' : 'THE BIG MELT',
      );
    });

    test(`/${lng} renders without mobile horizontal overflow`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseURL}/${lng}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();

      const overflow = await page.evaluate(() => (
        document.documentElement.scrollWidth - window.innerWidth
      ));
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('language switching does not hit Mapbox style-loading errors', async ({ page, baseURL }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await gotoStory(page, baseURL, 'de');
    await page.getByRole('button', { name: 'Sprache ändern' }).click();
    await page.getByRole('button', { name: /English/ }).click();
    await page.waitForURL('**/en');
    await page.waitForTimeout(1000);

    expect(pageErrors.filter((message) => message.includes('Style is not done loading'))).toEqual([]);
  });

  test('satellite mask overlay reaches the computer-vision step', async ({ page, baseURL }) => {
    const imageRequests = {
      satellite: 0,
      overlay: 0,
    };
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/images/satellite.jpg')) imageRequests.satellite += 1;
      if (url.includes('/images/overlay.jpg')) imageRequests.overlay += 1;
    });

    await gotoStory(page, baseURL, 'de');

    const scene = page.locator('section[data-scene="introcharts"]');
    await scene.scrollIntoViewIfNeeded();
    await expect(scene).toBeVisible();

    await page.waitForFunction(() => {
      const node = document.querySelector<HTMLElement>('section[data-scene="introcharts"]');
      return node?.dataset.satOverlayReady === 'true';
    }, null, { timeout: 20000 });

    await page
      .locator('section[data-scene="introcharts"] [data-cap-idx="4"] .caption-box')
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    await expect.poll(async () => {
      return page
        .locator('section[data-scene="introcharts"]')
        .getAttribute('data-sat-overlay-stage');
    }).toBe('2');

    await page.waitForTimeout(2000);
    expect(imageRequests.satellite).toBeLessThanOrEqual(2);
    expect(imageRequests.overlay).toBeLessThanOrEqual(2);
  });

  test('charts respect gutters and caption separation', async ({ page, baseURL }) => {
    await gotoStory(page, baseURL, 'de');
    await page.waitForTimeout(1000); // allow GSAP to settle

    const progressGutter = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--progress-gutter');
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.width = raw.trim() || '0px';
      document.body.appendChild(probe);
      const measured = probe.getBoundingClientRect().width;
      probe.remove();
      return Number.isFinite(measured) ? measured : 0;
    });

    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Viewport size not available');

    for (const scene of SCENES) {
      const sceneLocator = page.locator(`section[data-scene="${scene.key}"]`);
      await sceneLocator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      const chart = page.locator(`section[data-scene="${scene.key}"] .chart-layer > div`).first();
      const caption = page.locator(`section[data-scene="${scene.key}"] [data-cap-idx="0"] .caption-box`).first();
      await caption.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      const chartBox = await chart.boundingBox();
      const captionBox = await caption.boundingBox();
      if (!chartBox || !captionBox) {
        throw new Error(`Scene ${scene.key} did not expose measurable elements`);
      }
      const chartRight = chartBox.x + chartBox.width;
      const captionRight = captionBox.x + captionBox.width;

      // Sanity check: chart stays within viewport safety bounds
      expect(chartBox.x).toBeGreaterThanOrEqual(24);
      expect(chartRight).toBeLessThanOrEqual(viewport.width - progressGutter - 24);

      if (scene.captionSide === 'right') {
        expect(captionBox.x).toBeGreaterThan(chartRight + 8);
      } else {
        expect(captionRight).toBeLessThan(chartBox.x - 8);
      }
    }
  });
});
