import { describe, expect, it } from "vitest";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import type { SourceFreshness } from "@/types";
import {
  formatFreshnessDate,
  leadKey,
  normaliseStatus,
  orderSources,
  reachFor,
  worstStatus,
} from "@/lib/freshness";

const src = (over: Partial<SourceFreshness> & { key: string }): SourceFreshness => ({
  status: "current",
  ...over,
});

describe("worstStatus", () => {
  it("lets a single stale source downgrade the whole block", () => {
    expect(
      worstStatus([
        src({ key: "temperature", status: "current" }),
        src({ key: "seaIce", status: "stale" }),
      ]),
    ).toBe("stale");
  });

  it("reports lagging when nothing is stale", () => {
    expect(
      worstStatus([
        src({ key: "temperature", status: "lagging" }),
        src({ key: "co2", status: "current" }),
      ]),
    ).toBe("lagging");
  });

  it("only reports current when every source is current", () => {
    expect(
      worstStatus([src({ key: "seaIce" }), src({ key: "fjord" })]),
    ).toBe("current");
  });

  it("treats an unrecognised status as unknown rather than current", () => {
    expect(normaliseStatus("brand-new")).toBe("unknown");
    expect(worstStatus([src({ key: "seaIce", status: "nonsense" as never })])).toBe("unknown");
  });
});

describe("reachFor", () => {
  it("names the season for the seasonal fjord series", () => {
    expect(reachFor(src({ key: "fjord", cadence: "seasonal", latestYear: 2025 }), null)).toEqual({
      key: "outro.freshness.lastSeason",
      params: { year: 2025 },
    });
  });

  it("names the year for annual series", () => {
    expect(
      reachFor(src({ key: "temperature", cadence: "annual", latestYear: 2024 }), null),
    ).toEqual({ key: "outro.freshness.lastYear", params: { year: 2024 } });
  });

  it("dates a daily series to the day", () => {
    expect(
      reachFor(
        src({ key: "seaIce", cadence: "daily", latestDate: "2025-07-26" }),
        "26. Juli 2025",
      ),
    ).toEqual({ key: "outro.freshness.lastMeasurement", params: { date: "26. Juli 2025" } });
  });

  it("falls back to an explicit unknown instead of inventing a date", () => {
    expect(reachFor(src({ key: "seaIce", cadence: "daily" }), null)).toEqual({
      key: "outro.freshness.lastValueUnknown",
      params: {},
    });
  });
});

describe("orderSources", () => {
  it("puts the story's own fjord record first", () => {
    const ordered = orderSources([
      src({ key: "co2" }),
      src({ key: "seaIce" }),
      src({ key: "fjord" }),
      src({ key: "temperature" }),
    ]);
    expect(ordered.map((s) => s.key)).toEqual(["fjord", "seaIce", "temperature", "co2"]);
  });
});

describe("formatFreshnessDate", () => {
  it("formats in UTC so the day never shifts by timezone", () => {
    expect(formatFreshnessDate("2025-07-26T23:30:00+00:00", "en")).toBe("July 26, 2025");
    expect(formatFreshnessDate("2025-07-26", "de")).toBe("26. Juli 2025");
  });

  it("returns null for missing or unparseable input", () => {
    expect(formatFreshnessDate(null, "en")).toBeNull();
    expect(formatFreshnessDate("not-a-date", "en")).toBeNull();
  });
});

/* The editorial contract: when the record has gone quiet, the reader must not
   be told the data is current, and the copy must name the window instead. */
describe("freshness copy", () => {
  const locales: Record<string, unknown> = { de, en };
  const lookupNode = (bundle: unknown, path: string): unknown =>
    path
      .split(".")
      .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], bundle);
  const lookup = (bundle: unknown, path: string): string => {
    const value = path
      .split(".")
      .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], bundle);
    expect(typeof value).toBe("string");
    return value as string;
  };

  for (const [lng, bundle] of Object.entries(locales)) {
    it(`${lng}: every lead and status string exists`, () => {
      for (const status of ["current", "lagging", "stale", "unknown"] as const) {
        expect(lookup(bundle, leadKey(status)).length).toBeGreaterThan(0);
        expect(lookup(bundle, `outro.freshness.status.${status}`).length).toBeGreaterThan(0);
      }
      for (const key of ["fjord", "seaIce", "temperature", "co2"]) {
        expect(lookup(bundle, `outro.freshness.sourceLabels.${key}`).length).toBeGreaterThan(0);
      }
    });

    it(`${lng}: the stale lead does not assert currency`, () => {
      const stale = lookup(bundle, leadKey("stale")).toLowerCase();
      for (const word of ["aktuell", "up to date", "current data", "latest data"]) {
        expect(stale).not.toContain(word);
      }
    });

    it(`${lng}: no freshness copy uses a dash as punctuation`, () => {
      const walk = (node: unknown): string[] =>
        typeof node === "string"
          ? [node]
          : node && typeof node === "object"
            ? Object.values(node as Record<string, unknown>).flatMap(walk)
            : [];
      const strings = walk(lookupNode(bundle, "outro.freshness"));
      expect(strings.length).toBeGreaterThan(0);
      for (const s of strings) {
        expect(s).not.toMatch(/[–—]/);
        expect(s).not.toContain(" - ");
      }
    });
  }
});
