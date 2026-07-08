import {
  buildFjordSeasonMatrix,
  isoDateFromYearDoy,
  meanOf,
  percentChange,
  splitEarlyLate,
  summarizeBreakup,
  summarizeFjordSeasons,
} from "@/lib/chartData";

describe("chartData helpers", () => {
  it("summarizes Uummannaq daily rows by measured season", () => {
    const summaries = summarizeFjordSeasons([
      { year: 2020, doy: 45, frac: 1 },
      { year: 2020, doy: 46, frac: 0.4 },
      { year: 2020, doy: 44, frac: 0 },
      { year: 2021, doy: 45, frac: null },
      { year: 2021, doy: 46, frac: 0.8 },
    ]);

    expect(summaries).toEqual([
      { year: 2020, mean: 0.7, measuredDays: 2, iceDays: 1 },
      { year: 2021, mean: 0.8, measuredDays: 1, iceDays: 1 },
    ]);
  });

  it("splits sorted rows into early and late periods", () => {
    const split = splitEarlyLate([
      { year: 2022 },
      { year: 2020 },
      { year: 2021 },
      { year: 2023 },
      { year: 2024 },
    ]);

    expect(split.early.map((row) => row.year)).toEqual([2020, 2021, 2022]);
    expect(split.late.map((row) => row.year)).toEqual([2023, 2024]);
  });

  it("computes means and percent changes with null-safe fallbacks", () => {
    expect(meanOf([1, null, 3, undefined])).toBe(2);
    expect(percentChange(0.8, 0.6)).toBeCloseTo(-25);
    expect(percentChange(0, 0.6)).toBeNull();
  });

  it("builds complete fjord seasons and marks short internal gaps as estimates", () => {
    const [row] = buildFjordSeasonMatrix(
      [
        { date: "2020-02-14", year: 2020, doy: 45, frac: 0.8 },
        { date: "2020-02-17", year: 2020, doy: 48, frac: 0.2 },
      ],
      45,
      48,
      2
    );

    expect(row.cells).toHaveLength(4);
    expect(row.cells.map((cell) => cell.status)).toEqual([
      "measured",
      "estimated",
      "estimated",
      "measured",
    ]);
    expect(row.cells[1].frac).toBeCloseTo(0.6);
    expect(row.cells[2].frac).toBeCloseTo(0.4);
  });

  it("leaves edge gaps and long internal gaps as missing", () => {
    const [row] = buildFjordSeasonMatrix(
      [
        { year: 2020, doy: 46, frac: 0.8 },
        { year: 2020, doy: 50, frac: 0.2 },
      ],
      45,
      51,
      2
    );

    expect(row.cells[0].status).toBe("missing");
    expect(row.cells[2].status).toBe("missing");
    expect(row.cells[3].status).toBe("missing");
    expect(row.cells[6].status).toBe("missing");
  });

  it("formats fallback dates from year and day-of-year", () => {
    expect(isoDateFromYearDoy(2025, 105)).toBe("2025-04-15");
  });

  it("summarizes breakup timing on the fixed 2021 baseline split", () => {
    const summary = summarizeBreakup([
      { year: 2017, breakup: 156 },
      { year: 2018, breakup: 154 },
      { year: 2019, breakup: 139 },
      { year: 2020, breakup: 145 },
      { year: 2021, breakup: 119 },
      { year: 2022, breakup: 159 },
      { year: 2023, breakup: 122 },
      { year: 2024, breakup: 157 },
      { year: 2025, breakup: 129 },
    ]);

    expect(summary.earlyMean).toBeCloseTo(148.5);
    expect(summary.lateMean).toBeCloseTo(137.2);
    expect(summary.shiftDays).toBeCloseTo(11.3);
    expect(summary.lateMin).toBe(119);
    expect(summary.lateMax).toBe(159);
    expect(summary.byYear.filter((row) => row.period === "early").map((row) => row.year)).toEqual([
      2017, 2018, 2019, 2020,
    ]);
    expect(summary.byYear.filter((row) => row.period === "late")).toHaveLength(5);
  });

  it("returns null-safe breakup summaries when values are missing", () => {
    const summary = summarizeBreakup([
      { year: 2018, breakup: null },
      { year: 2023, breakup: null },
    ]);

    expect(summary.earlyMean).toBeNull();
    expect(summary.lateMean).toBeNull();
    expect(summary.shiftDays).toBeNull();
    expect(summary.lateMin).toBeNull();
    expect(summary.lateMax).toBeNull();
  });
});
