import {
  buildFjordSeasonMatrix,
  FJORD_LATE_START_YEAR,
  indexSeasonUncertainty,
  isoDateFromYearDoy,
  meanOf,
  percentChange,
  splitAtYear,
  summarizeBreakup,
  summarizeFjordSeasons,
  toSeasonUncertainty,
  widestSeason,
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

  it("pins the early/late boundary to the backend's seasonLossPct window", () => {
    expect(FJORD_LATE_START_YEAR).toBe(2021);
  });

  it("splits rows at the fixed boundary year, not at the median", () => {
    // The nine measured Uummannaq seasons. A median split (ceil(9/2) = 5) put
    // 2021 in the early group and contradicted the 32.4% headline, which is
    // defined as 2017-2020 vs 2021-2025.
    const split = splitAtYear([
      { year: 2022 },
      { year: 2017 },
      { year: 2020 },
      { year: 2019 },
      { year: 2021 },
      { year: 2018 },
      { year: 2025 },
      { year: 2023 },
      { year: 2024 },
    ]);

    expect(split.early.map((row) => row.year)).toEqual([2017, 2018, 2019, 2020]);
    expect(split.late.map((row) => row.year)).toEqual([2021, 2022, 2023, 2024, 2025]);
    expect(split.lateStartYear).toBe(2021);
  });

  it("keeps the boundary fixed when another season arrives", () => {
    const withNextSeason = splitAtYear(
      [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((year) => ({
        year,
      }))
    );

    expect(withNextSeason.early.map((row) => row.year)).toEqual([
      2017, 2018, 2019, 2020,
    ]);
    expect(withNextSeason.late).toHaveLength(6);
  });

  it("accepts an explicit boundary year for other windows", () => {
    const split = splitAtYear([{ year: 2019 }, { year: 2020 }, { year: 2021 }], 2020);

    expect(split.early.map((row) => row.year)).toEqual([2019]);
    expect(split.late.map((row) => row.year)).toEqual([2020, 2021]);
  });

  it("computes means and percent changes with null-safe fallbacks", () => {
    expect(meanOf([1, null, 3, undefined])).toBe(2);
    expect(percentChange(0.8, 0.6)).toBeCloseTo(-25);
    expect(percentChange(0, 0.6)).toBeNull();
  });

  it("builds complete fjord seasons and marks short internal gaps as estimates", () => {
    const [row] = buildFjordSeasonMatrix(
      [
        // fracRaw present = a real satellite scene existed that day
        { date: "2020-02-14", year: 2020, doy: 45, frac: 0.8, fracRaw: 0.8 },
        { date: "2020-02-17", year: 2020, doy: 48, frac: 0.2, fracRaw: 0.2 },
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

  it("marks smoothed days without a real scene as estimated, not measured", () => {
    const [row] = buildFjordSeasonMatrix(
      [
        { date: "2020-02-14", year: 2020, doy: 45, frac: 0.8, fracRaw: 0.8 },
        // smoothing produced a value, but no usable scene existed that day
        { date: "2020-02-15", year: 2020, doy: 46, frac: 0.7, fracRaw: null },
      ],
      45,
      46,
      2
    );

    expect(row.cells.map((cell) => cell.status)).toEqual(["measured", "estimated"]);
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

  it("keeps the bootstrap interval asymmetric around the season mean", () => {
    // Live /uummannaq values for 2017: the interval reaches 0.1611 below the
    // mean and 0.0831 above it. Anything that re-derives the ends from the
    // standard error would draw it symmetric and understate the low side.
    const season = toSeasonUncertainty({
      year: 2017,
      mean: 0.5904,
      observedDays: 39,
      standardError: 0.064,
      ci95: [0.4293, 0.6735],
    });

    expect(season.ci95).toEqual([0.4293, 0.6735]);
    expect(season.ciWidth).toBeCloseTo(0.2442, 6);
    expect(season.mean! - season.ci95![0]).toBeCloseTo(0.1611, 6);
    expect(season.ci95![1] - season.mean!).toBeCloseTo(0.0831, 6);
  });

  it("drops intervals a chart cannot draw instead of guessing them", () => {
    expect(toSeasonUncertainty({ year: 2017, mean: 0.5, ci95: null }).ci95).toBeNull();
    expect(toSeasonUncertainty({ year: 2017, mean: 0.5 }).ci95).toBeNull();
    // one-sided, wrong length, non-finite, or inverted bounds are all unusable
    expect(toSeasonUncertainty({ year: 2017, ci95: [0.4] }).ci95).toBeNull();
    expect(toSeasonUncertainty({ year: 2017, ci95: [0.4, 0.5, 0.6] }).ci95).toBeNull();
    expect(toSeasonUncertainty({ year: 2017, ci95: [NaN, 0.5] }).ci95).toBeNull();
    expect(toSeasonUncertainty({ year: 2017, ci95: [0.6, 0.4] }).ci95).toBeNull();
    // a season without an interval still keeps whatever else it has
    expect(toSeasonUncertainty({ year: 2017, mean: 0.5, observedDays: 2 })).toMatchObject({
      mean: 0.5,
      observedDays: 2,
      ciWidth: null,
    });
  });

  it("finds the least firm season, which is the one with fewest observed days", () => {
    const index = indexSeasonUncertainty([
      { year: 2017, mean: 0.5904, observedDays: 39, ci95: [0.4293, 0.6735] },
      { year: 2021, mean: 0.2194, observedDays: 106, ci95: [0.1633, 0.277] },
      { year: 2024, mean: 0.449, observedDays: 107, ci95: [0.3788, 0.5177] },
    ]);

    expect(index.size).toBe(3);
    const widest = widestSeason(index);
    expect(widest?.year).toBe(2017);
    expect(widest?.observedDays).toBe(39);
    // 2017's interval is more than twice as wide as 2021's
    expect(widest!.ciWidth! / index.get(2021)!.ciWidth!).toBeGreaterThan(2);
  });

  it("survives a payload without the uncertainty fields at all", () => {
    const index = indexSeasonUncertainty([{ year: 2019, mean: 0.4263 } as never]);
    expect(index.get(2019)).toEqual({
      year: 2019,
      mean: 0.4263,
      measuredMean: null,
      observedDays: null,
      standardError: null,
      ci95: null,
      ciWidth: null,
    });
    expect(widestSeason(indexSeasonUncertainty([]))).toBeNull();
    expect(indexSeasonUncertainty(undefined).size).toBe(0);
  });
  it("hands the interval the mean it belongs to", () => {
    // The bootstrap resamples the measured days, so the interval describes
    // their mean. `mean` is the gap-filled, smoothed average over the whole
    // window and can legitimately sit outside the band: on the 2018 season it
    // landed 0.004 below the lower bound. Both have to survive the mapping so a
    // chart can pick the right one.
    const index = indexSeasonUncertainty([
      {
        year: 2018,
        mean: 0.761,
        measuredMean: 0.851,
        observedDays: 60,
        standardError: 0.041,
        ci95: [0.765, 0.925],
      } as never,
    ]);
    const season = index.get(2018)!;
    expect(season.mean).toBe(0.761);
    expect(season.measuredMean).toBe(0.851);
    expect(season.ci95![0]).toBeLessThanOrEqual(season.measuredMean!);
    expect(season.ci95![1]).toBeGreaterThanOrEqual(season.measuredMean!);
    expect(season.mean!).toBeLessThan(season.ci95![0]);
  });
});
