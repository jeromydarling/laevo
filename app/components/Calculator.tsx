import { useState } from "react";
import {
  ALTERNATIVES,
  calculateSavings,
  formatUsd,
  TIME_RECLAIMED_SHARE,
} from "~/lib/pricing";

/**
 * What switching would actually save, in money and in evenings.
 *
 * The arithmetic lives in pricing.ts alongside the plans and the competitor
 * ranges, so this can never quote a number the pricing page disagrees with.
 * The assumptions are printed under the result rather than hidden — a pantry
 * that cannot see the working has no reason to believe the total.
 */
export function Calculator() {
  const [alternativeId, setAlternativeId] = useState("pantrysoft");
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [hourlyValue, setHourlyValue] = useState(18);
  const [householdsPerMonth, setHouseholdsPerMonth] = useState(250);
  const [sites, setSites] = useState(1);

  const result = calculateSavings({
    alternativeId,
    hoursPerWeek,
    hourlyValueCents: Math.round(hourlyValue * 100),
    householdsPerMonth,
    sites,
  });

  return (
    <div className="calc">
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="calc-alt">What do you use today?</label>
          <select
            id="calc-alt"
            value={alternativeId}
            onChange={(e) => setAlternativeId(e.target.value)}
          >
            {ALTERNATIVES.map((alt) => (
              <option key={alt.id} value={alt.id}>
                {alt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="calc-households">Households you serve a month</label>
          <input
            id="calc-households"
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            value={householdsPerMonth}
            onChange={(e) => setHouseholdsPerMonth(Number(e.target.value) || 0)}
          />
        </div>

        <div className="field">
          <label htmlFor="calc-hours">
            Hours a week spent counting, copying and chasing paperwork
          </label>
          <input
            id="calc-hours"
            type="number"
            inputMode="decimal"
            min={0}
            max={200}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value) || 0)}
          />
        </div>

        <div className="field">
          <label htmlFor="calc-rate">
            What an hour of that time is worth
            <span className="hint">
              Not what you pay — what you would have to pay if you had to.
            </span>
          </label>
          <input
            id="calc-rate"
            type="number"
            inputMode="decimal"
            min={0}
            max={500}
            value={hourlyValue}
            onChange={(e) => setHourlyValue(Number(e.target.value) || 0)}
          />
        </div>

        <div className="field">
          <label htmlFor="calc-sites">How many locations</label>
          <select
            id="calc-sites"
            value={sites}
            onChange={(e) => setSites(Number(e.target.value))}
          >
            <option value={1}>One</option>
            <option value={2}>Two or more</option>
          </select>
        </div>
      </div>

      <div className="calc-results" aria-live="polite">
        <div className="result">
          <span className="num">{formatUsd(result.softwareSavedMonthlyCents)}</span>
          <span className="lbl">Less software cost, per month</span>
        </div>
        <div className="result">
          <span className="num">{result.hoursSavedMonthly} hrs</span>
          <span className="lbl">Volunteer hours back, per month</span>
        </div>
        <div className="result">
          <span className="num">{formatUsd(result.totalAnnualSavedCents)}</span>
          <span className="lbl">Money and time value, over a year</span>
        </div>
        <div className="result">
          <span className="num">
            {result.laevoMonthlyCents === 0
              ? "Free"
              : `${formatUsd(result.laevoMonthlyCents)}/mo`}
          </span>
          <span className="lbl">
            Your plan would be {result.plan.name}
          </span>
        </div>
      </div>

      <p className="small" style={{ marginTop: 20 }}>
        <strong>How this is worked out, so you can argue with it:</strong> we
        assume {Math.round(TIME_RECLAIMED_SHARE * 100)}% of your manual hours
        come back — not half, because we would rather be low and right than high
        and impressive. The software figure is the midpoint of what pantries
        actually report paying for that tool, which is often higher than the
        published starting price. If your real numbers beat this, good. If they
        do not, tell us and we will change the assumptions.
      </p>
    </div>
  );
}
