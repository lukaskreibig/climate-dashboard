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

  test('new chart explainers render with localized copy', async ({ page, baseURL }) => {
    await gotoStory(page, baseURL, 'de');

    const pixelScene = page.locator('section[data-scene="pixel-inspector"]');
    await pixelScene.scrollIntoViewIfNeeded();
    await expect(pixelScene).toContainText('Wie aus einer Szene ein Wert wird');
    await expect(pixelScene).not.toContainText('Ergebnis');
    await expect(page.getByTestId('satellite-pixel-inspector')).toBeVisible();

    const memoryScene = page.locator('section[data-scene="memory-measurement"]');
    await memoryScene.scrollIntoViewIfNeeded();
    await expect(memoryScene).toContainText('Erinnerung trifft Messung');
    await expect(page.getByTestId('memory-measurement-chart')).toBeVisible();
    await memoryScene.locator('[data-cap-idx="0"]').scrollIntoViewIfNeeded();
    await page.getByTestId('memory-cell-2025-105').hover();
    await expect(page.getByTestId('memory-cell-tooltip')).toContainText('15. April 2025');
    await expect(page.getByTestId('memory-cell-tooltip')).toContainText('71,8');
  });

  test('memory measurement table does not jump between scroll stages', async ({ page, baseURL }) => {
    await gotoStory(page, baseURL, 'de');

    const memoryScene = page.locator('section[data-scene="memory-measurement"]');
    const boxes: Array<{ y: number; height: number }> = [];

    for (let index = 0; index <= 5; index += 1) {
      await memoryScene.locator(`[data-cap-idx="${index}"]`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      const box = await page.getByTestId('memory-measurement-table').boundingBox();
      if (!box) throw new Error(`Memory table not measurable at stage ${index}`);
      boxes.push({ y: Math.round(box.y), height: Math.round(box.height) });
    }

    const yValues = boxes.map((box) => box.y);
    const hValues = boxes.map((box) => box.height);
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeLessThanOrEqual(2);
    expect(Math.max(...hValues) - Math.min(...hValues)).toBeLessThanOrEqual(2);
  });

  test('charts respect gutters and caption separation', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
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

  test('reduced-motion disables chart parallax drift', async ({ page, baseURL }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoStory(page, baseURL, 'en');

    const scene = page.locator('section[data-scene="connections"]');
    const top = await scene.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );

    const boxY = () =>
      page.evaluate(() => {
        const vis = Array.from(document.querySelectorAll('.chart-layer')).find(
          (l) =>
            getComputedStyle(l as HTMLElement).visibility !== 'hidden' &&
            parseFloat(getComputedStyle(l as HTMLElement).opacity) > 0.5,
        );
        const box = vis?.firstElementChild as HTMLElement | undefined;
        if (!box) return null;
        const m = new DOMMatrixReadOnly(getComputedStyle(box).transform);
        return Math.round(m.f);
      });

    await page.evaluate((y) => window.scrollTo(0, y), top + 150);
    await page.waitForTimeout(400);
    const y1 = await boxY();
    await page.evaluate((y) => window.scrollTo(0, y), top + 650);
    await page.waitForTimeout(400);
    const y2 = await boxY();

    expect(y1).not.toBeNull();
    expect(y2).not.toBeNull();
    // Pinned chart must not drift vertically with scroll when motion is reduced.
    expect(Math.abs((y1 ?? 0) - (y2 ?? 0))).toBeLessThanOrEqual(6);
  });
});
