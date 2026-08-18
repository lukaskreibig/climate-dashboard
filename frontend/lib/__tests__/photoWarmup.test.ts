import { describe, expect, it } from "vitest";

import { nextImageSrcSet, nextImageUrl } from "../photoWarmup";

/**
 * Warming something the browser will not ask for is worse than not warming: it
 * costs a full optimiser pass and a full download for a file that is then never
 * requested, and the real one is fetched afterwards anyway. That already
 * happened once here, through Vary: Accept. So what has to stay in step with
 * next/image is pinned against strings lifted off the running production build,
 * not against a reimplementation of its rules.
 */
describe("the candidate list", () => {
  /* Copied verbatim from the srcset attribute of the intro photo, read out of
     the page served by `next start`. If next/image ever changes its default
     device sizes, its quality or its URL shape, this is where it shows. */
  const FROM_THE_PAGE =
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=640&q=75 640w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=750&q=75 750w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=828&q=75 828w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=1080&q=75 1080w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=1200&q=75 1200w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=1920&q=75 1920w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=2048&q=75 2048w, " +
    "/_next/image?url=%2Fimages%2Fheartofaseal-28.jpg&w=3840&q=75 3840w";

  it("is the one next/image emits, entry for entry", () => {
    expect(nextImageSrcSet("/images/heartofaseal-28.jpg")).toBe(FROM_THE_PAGE);
  });

  it("offers every width the browser may choose from", () => {
    // A short list would quietly hand a phone the desktop variant.
    const widths = [...nextImageSrcSet("/images/x.jpg").matchAll(/ (\d+)w/g)].map((m) => Number(m[1]));
    expect(widths).toEqual([640, 750, 828, 1080, 1200, 1920, 2048, 3840]);
  });
});

describe("a single candidate URL", () => {
  it("is byte for byte the one next/image requests", () => {
    expect(nextImageUrl("/images/heartofaseal_town.jpg", 1920)).toBe(
      "/_next/image?url=%2Fimages%2Fheartofaseal_town.jpg&w=1920&q=75",
    );
  });

  it("encodes a path that needs it", () => {
    expect(nextImageUrl("/images/a b.jpg", 640)).toContain("a%20b.jpg");
  });
});
