import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { photoSrcSet } from "@/components/StoryPhoto";
import { IMAGE_META } from "../imageMeta";
import { PHOTO_VARIANTS } from "../photoVariants";

/**
 * The photographs are encoded once by scripts/gen-photo-variants.mjs and served
 * as static files, so three things now have to agree that used to be one: the
 * committed manifest, the files the script produced, and the photographs the
 * story actually asks for. Drift between them is a 404 that only appears for a
 * reader whose screen picks the missing rung, which is the kind of defect that
 * ships.
 *
 * The file checks need `yarn photos` to have run; CI runs it before the tests.
 */

const root = join(__dirname, "..", "..");
const photosDir = join(root, "public", "photos");

/** Every photograph the story renders, read out of the source rather than listed. */
const referenced = (): string[] => {
  const files = [
    "components/scenes/scenesConfig.tsx",
    "components/IntroHero.tsx",
    "components/OutroHero.tsx",
    "components/OutroCredits.tsx",
    "components/ChatBot.tsx",
    "app/[lng]/page.tsx",
  ];
  const found = new Set<string>();
  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    for (const m of source.matchAll(/"(\/images\/[\w.-]+\.(?:jpe?g|png))"/g)) found.add(m[1]);
  }
  return [...found].sort();
};

/**
 * Read as data rather than shown as pictures, so deliberately not encoded. Kept
 * in step with NOT_PHOTOGRAPHS in the generator; if the two ever disagree this
 * test is what says so.
 */
const NOT_PHOTOGRAPHS = new Set(["/images/og-cover.jpg", "/images/satellite.jpg", "/images/overlay.jpg"]);

describe("the manifest and the story", () => {
  it("has an entry for every photograph the story renders", () => {
    const missing = referenced()
      .filter((src) => !NOT_PHOTOGRAPHS.has(src))
      .filter((src) => !PHOTO_VARIANTS[src]);
    expect(missing).toEqual([]);
  });

  it("agrees with imageMeta about every photograph's size", () => {
    // Two generators read the same files independently. If they disagree, one
    // of them ran against a photo that has since been replaced.
    for (const [src, variant] of Object.entries(PHOTO_VARIANTS)) {
      expect(IMAGE_META[src], `${src} missing from imageMeta`).toBeDefined();
      expect([variant.width, variant.height]).toEqual([IMAGE_META[src].width, IMAGE_META[src].height]);
    }
  });
});

describe("the width ladder", () => {
  it("never offers a width the photograph does not have", () => {
    // Upscaling would ship bytes carrying no detail, and the browser would
    // happily pick the biggest rung on a retina screen and get a soft photo.
    for (const [src, v] of Object.entries(PHOTO_VARIANTS)) {
      expect(Math.max(...v.widths), src).toBeLessThanOrEqual(v.width);
    }
  });

  it("tops out at the photograph's own resolution", () => {
    for (const [src, v] of Object.entries(PHOTO_VARIANTS)) {
      expect(v.widths.at(-1), src).toBe(v.width);
    }
  });

  it("is ascending, with no two rungs close enough to be the same file twice", () => {
    for (const [src, v] of Object.entries(PHOTO_VARIANTS)) {
      for (let i = 1; i < v.widths.length; i++) {
        expect(v.widths[i] / v.widths[i - 1], `${src} rung ${i}`).toBeGreaterThanOrEqual(1.15);
      }
    }
  });
});

describe("the srcset the component emits", () => {
  it("names files that exist", () => {
    expect(existsSync(photosDir), "public/photos is missing; run `yarn photos`").toBe(true);
    const missing: string[] = [];
    for (const src of Object.keys(PHOTO_VARIANTS)) {
      for (const format of ["avif", "webp"] as const) {
        for (const [, url] of photoSrcSet(src, format).matchAll(/(\/photos\/[\w.-]+) \d+w/g)) {
          if (!existsSync(join(root, "public", url.replace(/^\/photos\//, "photos/")))) missing.push(url);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("is empty for a photograph nobody encoded, rather than pointing at nothing", () => {
    // A <source> with an empty srcset is skipped; one with a broken srcset is a
    // blank frame. StoryPhoto drops the source entirely when this returns "".
    expect(photoSrcSet("/images/does-not-exist.jpg", "avif")).toBe("");
  });

  it("has one candidate per rung, in ascending order, with width descriptors", () => {
    expect(photoSrcSet("/images/motorsledge.jpg", "avif")).toBe(
      "/photos/motorsledge-640.avif 640w, " +
        "/photos/motorsledge-828.avif 828w, " +
        "/photos/motorsledge-1200.avif 1200w, " +
        "/photos/motorsledge-2000.avif 2000w",
    );
  });
});

describe("the optimiser stays out of the request path", () => {
  it("is not reachable, because nothing imports next/image", () => {
    // The memory property this whole pipeline exists for is only true while
    // this holds. next.config.ts sets unoptimized so a returning <Image> would
    // serve the original rather than encode, but it would also ship a 960 KB
    // JPEG to a phone, which is the defect the pipeline replaced.
    // --exclude-dir, because this file names the import in order to forbid it.
    const offenders = execSync(
      `grep -rl --exclude-dir=__tests__ 'from "next/image"' app components lib || true`,
      { cwd: root, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });
});
