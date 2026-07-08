/**
 * responsive-audit.spec.ts — systematic layout audit across viewport sizes.
 *
 * Not a pass/fail guardrail (yet): it scrolls the whole story at several
 * viewport widths and reports, per scene, any of:
 *   • page-level horizontal overflow (something wider than the viewport)
 *   • caption box escaping the viewport (clipped left/right/bottom)
 *   • caption ↔ chart overlap
 *   • text clipped inside its box (scrollWidth > clientWidth)
 *
 * Run: yarn playwright test tests/e2e/responsive-audit.spec.ts --reporter=line
 * Read the console report to see where each viewport breaks.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'landscape-812', width: 812, height: 390 }, // short height stress
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'wide-1920', width: 1920, height: 1080 },
  { name: 'ultra-2560', width: 2560, height: 1440 },
];

const gotoStory = async (page: Page, baseURL: string | undefined, lng = 'de') => {
  await page.goto(`${baseURL}/${lng}`, { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor({ state: 'visible' });
  await page
    .locator('[data-loading-overlay="true"]')
    .waitFor({ state: 'detached', timeout: 25_000 })
    .catch(() => {});
};

type Finding = { scene: string; issue: string; detail: string };

test.describe('responsive audit (report only)', () => {
  for (const vp of VIEWPORTS) {
    test(`audit @ ${vp.name}`, async ({ page, baseURL }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoStory(page, baseURL, 'de');
      await page.waitForTimeout(800);

      const sceneKeys: string[] = await page.$$eval('[data-scene]', (els) =>
        els.map((e) => (e as HTMLElement).dataset.scene || '').filter(Boolean),
      );

      const findings: Finding[] = [];

      // heroes & headings: scan the top and bottom of the page for any heading
      // wider than the viewport (giant clamp() titles clipping on small screens)
      for (const [where, y] of [['top', 0], ['bottom', 999999]] as const) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(300);
        const heads = await page.evaluate((vw) => {
          const bad: { detail: string }[] = [];
          document.querySelectorAll<HTMLElement>('h1,h2,h3').forEach((h) => {
            const cs = getComputedStyle(h);
            if (parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden') return;
            // skip elements mid-scale-animation (e.g. the outro's 300× zoom title)
            const m = new DOMMatrixReadOnly(cs.transform);
            if (Math.abs(m.a) > 1.5 || Math.abs(m.d) > 1.5) return;
            const r = h.getBoundingClientRect();
            if (r.width === 0) return;
            // only judge headings actually on screen here; in-scene captions are
            // measured by the per-scene loop when scrolled into their own view.
            if (r.bottom <= 0 || r.top >= window.innerHeight) return;
            if (h.scrollWidth - h.clientWidth > 2 || r.width > vw + 2) {
              bad.push({ detail: `<${h.tagName.toLowerCase()}> "${(h.textContent || '').slice(0, 22)}" w=${Math.round(r.width)} sw=${h.scrollWidth} vw=${vw}` });
            }
          });
          return bad;
        }, vp.width);
        heads.forEach((h) => findings.push({ scene: `hero-${where}`, issue: 'heading-overflow', detail: h.detail }));
      }

      // walk each scene: scroll every caption into view, measure
      for (const key of sceneKeys) {
        const capCount = await page
          .locator(`section[data-scene="${key}"] [data-cap-idx]`)
          .count();

        for (let i = 0; i < Math.max(capCount, 1); i += 1) {
          const capSel = `section[data-scene="${key}"] [data-cap-idx="${i}"]`;
          const target = capCount > 0 ? page.locator(capSel) : page.locator(`section[data-scene="${key}"]`);
          await target.first().scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(140);

          const res = await page.evaluate(
            ({ key, i, vw, vh }) => {
              const out: { issue: string; detail: string }[] = [];
              const overflow = document.documentElement.scrollWidth - window.innerWidth;
              if (overflow > 1) {
                // find the widest offending element
                let worst = '';
                let worstRight = 0;
                document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
                  const r = el.getBoundingClientRect();
                  if (r.width > 0 && r.right > vw + 2 && r.right > worstRight) {
                    worstRight = r.right;
                    worst = `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 2).join('.')}`;
                  }
                });
                out.push({ issue: 'page-overflow', detail: `${Math.round(overflow)}px; worst=${worst} right=${Math.round(worstRight)}` });
              }

              const capBox = document.querySelector<HTMLElement>(
                `section[data-scene="${key}"] [data-cap-idx="${i}"] .caption-box`,
              );
              if (capBox) {
                const r = capBox.getBoundingClientRect();
                const cs = getComputedStyle(capBox);
                const visible = parseFloat(cs.opacity) > 0.05 && cs.visibility !== 'hidden' && r.width > 0;
                if (visible) {
                  if (r.left < -2) out.push({ issue: 'caption-clip-left', detail: `left=${Math.round(r.left)}` });
                  if (r.right > vw + 2) out.push({ issue: 'caption-clip-right', detail: `right=${Math.round(r.right)} vw=${vw}` });
                  if (r.top < -2) out.push({ issue: 'caption-clip-top', detail: `top=${Math.round(r.top)}` });
                  if (r.bottom > vh + 2) out.push({ issue: 'caption-clip-bottom', detail: `bottom=${Math.round(r.bottom)} vh=${vh}` });

                  // text clipped inside a fixed box (ignore intentional overflow-y-auto)
                  capBox.querySelectorAll<HTMLElement>('h1,h2,h3,p,span').forEach((t) => {
                    // animated counters (aria-hidden decorative text) have
                    // transient widths mid-count, and sr-only twins are 1px
                    // by design — neither is real clipped content.
                    if (t.getAttribute('aria-hidden') === 'true') return;
                    if (t.classList.contains('sr-only')) return;
                    if (t.scrollWidth - t.clientWidth > 2) {
                      out.push({ issue: 'text-clip-x', detail: `<${t.tagName.toLowerCase()}> "${(t.textContent || '').slice(0, 24)}" sw=${t.scrollWidth} cw=${t.clientWidth}` });
                    }
                  });

                  // overlap with the visible pinned chart
                  const layer = Array.from(document.querySelectorAll<HTMLElement>('.chart-layer')).find(
                    (l) => getComputedStyle(l).visibility !== 'hidden' && parseFloat(getComputedStyle(l).opacity) > 0.4,
                  );
                  const chart = layer?.firstElementChild as HTMLElement | undefined;
                  if (chart) {
                    const cr = chart.getBoundingClientRect();
                    // fullscreen visuals (map/photo/globe) intentionally sit UNDER the
                    // caption — only require the caption to carry a readable background.
                    const fullscreen = cr.width >= vw * 0.9 && cr.height >= vh * 0.85;
                    if (fullscreen) {
                      const bg = getComputedStyle(capBox).backgroundColor;
                      const transparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
                      const textLen = (capBox.textContent || '').trim().length;
                      if (transparent && textLen > 0) {
                        out.push({ issue: 'fullscreen-caption-no-bg', detail: `text over visual without background box` });
                      }
                    } else {
                      const ox = Math.max(0, Math.min(r.right, cr.right) - Math.max(r.left, cr.left));
                      const oy = Math.max(0, Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top));
                      const overlapArea = ox * oy;
                      const capArea = r.width * r.height;
                      if (capArea > 0 && overlapArea / capArea > 0.12) {
                        out.push({ issue: 'caption-chart-overlap', detail: `${Math.round((overlapArea / capArea) * 100)}% covered; cap[${Math.round(r.top)}-${Math.round(r.bottom)}] chart[${Math.round(cr.top)}-${Math.round(cr.bottom)}]` });
                      }
                    }
                  }
                }
              }
              return out;
            },
            { key, i, vw: vp.width, vh: vp.height },
          );

          res.forEach((r) => findings.push({ scene: `${key}#${i}`, ...r }));
        }
      }

      // de-dupe identical (scene,issue) and print
      const seen = new Set<string>();
      const unique = findings.filter((f) => {
        const k = `${f.scene}|${f.issue}|${f.detail}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      console.log(`\n===== RESPONSIVE AUDIT @ ${vp.name} (${vp.width}x${vp.height}) =====`);
      if (unique.length === 0) console.log('  ✓ no issues');
      unique.forEach((f) => console.log(`  ✗ [${f.scene}] ${f.issue}: ${f.detail}`));
      console.log(`===== ${unique.length} findings @ ${vp.name} =====\n`);

      // hard gate: no layout violations at any supported viewport
      expect(unique, `layout violations @ ${vp.name}:\n${unique.map((f) => `  [${f.scene}] ${f.issue}: ${f.detail}`).join('\n')}`).toEqual([]);
    });
  }
});
