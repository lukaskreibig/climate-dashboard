/**
 * The shared test base, which exists for one reason: the suite was spending the
 * project's map tile budget.
 *
 * Measured on the built story, one page view used to issue 571 requests to
 * api.maptiler.com, 260 of them during the loading gate before the reader had
 * scrolled at all. The free plan allowed 100 000 a month, so about 175 views.
 * One run of this suite is 19 tests, most of which load and scroll the whole
 * story, and it gets run many times a day. In August 2026 the account hit the
 * limit and MapTiler suspended the keys until the 26th, which is how this was
 * noticed: every terrain request in the built app started answering 403.
 *
 * MapTiler is gone now. The relief ships with the story from public/terrain and
 * costs nobody anything, but the imagery still comes from two public services,
 * Esri and EOX, and neither of them agreed to serve a test suite. So the tests
 * abort those two, which is deliberately the same thing the suite already
 * experienced under those 403s, and nothing here asserts anything about
 * satellite imagery: these tests check layout, captions, overflow and overlays.
 *
 * Serving stub tiles instead was tried and is worse. A stub tilejson has to
 * name a tile URL, and any host that is not intercepted costs a DNS timeout per
 * tile: the loading-gate budget test went from passing to 11.6 seconds. Pointing
 * it back at the intercepted host means answering terrain-rgb with a blank PNG,
 * and a blank pixel decodes to an elevation of -10000 m, which is a stranger
 * thing to hand the camera than no terrain at all.
 *
 * If a test is ever written that genuinely needs terrain, give it its own
 * project in playwright.config.ts rather than removing this.
 */
import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route('**://server.arcgisonline.com/**', (route) => route.abort());
    await page.route('**://tiles.maps.eox.at/**', (route) => route.abort());
    await use(page);
  },
});

export { expect, type Page };
