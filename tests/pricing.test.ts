import { describe, expect, it } from "vitest";
import {
  PLANS,
  ALTERNATIVES,
  planById,
  planForUsage,
  formatUsd,
  yearlyFreeMonths,
  calculateSavings,
  typicalCents,
  FREE_PLAN,
} from "~/lib/pricing";

describe("money is always integer cents", () => {
  it("every plan price is a whole number of cents", () => {
    for (const plan of PLANS) {
      expect(Number.isInteger(plan.monthlyCents)).toBe(true);
      expect(Number.isInteger(plan.yearlyCents)).toBe(true);
      expect(plan.monthlyCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("every competitor range is whole cents and ordered low to high", () => {
    for (const alt of ALTERNATIVES) {
      expect(Number.isInteger(alt.lowCents)).toBe(true);
      expect(Number.isInteger(alt.highCents)).toBe(true);
      expect(alt.lowCents).toBeLessThanOrEqual(alt.highCents);
    }
  });
});

describe("formatUsd", () => {
  it("shows free as $0, not $0.00", () => {
    expect(formatUsd(0)).toBe("$0");
  });

  it("drops the decimals on whole dollars", () => {
    expect(formatUsd(1900)).toBe("$19");
    expect(formatUsd(5900)).toBe("$59");
  });

  it("keeps cents when there are any", () => {
    expect(formatUsd(1950)).toBe("$19.50");
  });
});

describe("planForUsage", () => {
  it("keeps a small single-site pantry free", () => {
    expect(planForUsage(100, 1).id).toBe("community");
  });

  it("is generous exactly at the free ceiling", () => {
    expect(planForUsage(FREE_PLAN.householdsPerMonth!, 1).id).toBe("community");
  });

  it("moves to Standard one household past the ceiling", () => {
    expect(planForUsage(FREE_PLAN.householdsPerMonth! + 1, 1).id).toBe("standard");
  });

  it("moves a multi-site pantry to Network regardless of size", () => {
    expect(planForUsage(10, 2).id).toBe("network");
    expect(planForUsage(99_999, 4).id).toBe("network");
  });
});

describe("yearly pricing", () => {
  it("gives two free months on every paid plan", () => {
    for (const plan of PLANS.filter((p) => p.monthlyCents > 0)) {
      expect(yearlyFreeMonths(plan)).toBe(2);
    }
  });

  it("a year never costs more than twelve months", () => {
    for (const plan of PLANS) {
      expect(plan.yearlyCents).toBeLessThanOrEqual(plan.monthlyCents * 12);
    }
  });
});

describe("the savings calculator", () => {
  it("never reports negative savings when Laevo costs more", () => {
    const result = calculateSavings({
      alternativeId: "paper",
      hoursPerWeek: 0,
      hourlyValueCents: 0,
      householdsPerMonth: 5000,
      sites: 1,
    });
    expect(result.laevoMonthlyCents).toBe(planById("standard").monthlyCents);
    expect(result.softwareSavedMonthlyCents).toBe(0);
    expect(result.totalAnnualSavedCents).toBe(0);
  });

  it("uses the midpoint of the competitor's honest range", () => {
    const result = calculateSavings({
      alternativeId: "pantrysoft",
      hoursPerWeek: 0,
      hourlyValueCents: 0,
      householdsPerMonth: 100,
      sites: 1,
    });
    const alt = ALTERNATIVES.find((a) => a.id === "pantrysoft")!;
    expect(result.currentMonthlyCents).toBe(typicalCents(alt));
    expect(result.softwareSavedMonthlyCents).toBe(typicalCents(alt));
  });

  it("claims back a third of manual hours, not half", () => {
    const result = calculateSavings({
      alternativeId: "paper",
      hoursPerWeek: 6,
      hourlyValueCents: 1800,
      householdsPerMonth: 100,
      sites: 1,
    });
    // 6 hours a week is 26 a month; a third of that is 8.6.
    expect(result.hoursSavedMonthly).toBeCloseTo(8.6, 1);
    expect(result.hoursSavedMonthly).toBeLessThan(6 * 4.34 * 0.5);
  });

  it("handles an unknown alternative without exploding", () => {
    const result = calculateSavings({
      alternativeId: "not-a-real-tool",
      hoursPerWeek: 4,
      hourlyValueCents: 1500,
      householdsPerMonth: 100,
      sites: 1,
    });
    expect(result.currentMonthlyCents).toBe(0);
    expect(result.softwareSavedMonthlyCents).toBe(0);
  });

  it("treats nonsense input as zero rather than NaN", () => {
    const result = calculateSavings({
      alternativeId: "pantrysoft",
      hoursPerWeek: Number.NaN,
      hourlyValueCents: -500,
      householdsPerMonth: -3,
      sites: 0,
    });
    expect(Number.isFinite(result.totalAnnualSavedCents)).toBe(true);
    expect(result.hoursSavedMonthly).toBe(0);
    expect(result.plan.id).toBe("community");
  });
});

describe("the promises the marketing pages make", () => {
  it("there is a genuinely free plan", () => {
    expect(FREE_PLAN.monthlyCents).toBe(0);
    expect(FREE_PLAN.yearlyCents).toBe(0);
  });

  it("no plan is priced per user — the word never appears in a feature", () => {
    for (const plan of PLANS) {
      for (const feature of plan.features) {
        expect(feature.toLowerCase()).not.toMatch(/per user|per seat|per login/);
      }
    }
  });

  it("every alternative names something it does better than Laevo", () => {
    for (const alt of ALTERNATIVES) {
      expect(alt.whereTheyWin.length).toBeGreaterThan(60);
    }
  });
});
