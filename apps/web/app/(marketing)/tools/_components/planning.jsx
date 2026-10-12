"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChoiceField, Metrics, NumberField, PrimaryResult, Problem,
  SegmentedField, anyNaN, money, monthsLabel, num,
} from "./kit";
import { emergencyFund, financialRunway, goalFunding } from "@/lib/tools/engines";

const Shell = ({ children }) => (
  <Card>
    <CardContent className="space-y-8 p-6 sm:p-8">{children}</CardContent>
  </Card>
);

const Grid = ({ children }) => (
  <div className="grid gap-5 sm:grid-cols-2">{children}</div>
);

// Results appear as you type. There is no Calculate button because there is
// nothing to submit: the arithmetic is instant and local, and making someone
// press a button to see it would only add a step.
export function FinancialRunwayCalculator() {
  const [savings, setSavings] = useState("588000");
  const [essential, setEssential] = useState("70000");
  const [discretionary, setDiscretionary] = useState("15000");
  const [income, setIncome] = useState("0");

  const result = useMemo(() => {
    const values = [num(savings), num(essential), num(discretionary), num(income)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [s, e, d, i] = values;
    return financialRunway({ savings: s, essential: e, discretionary: d, otherIncome: i });
  }, [savings, essential, discretionary, income]);

  return (
    <Shell>
      <Grid>
        <NumberField label="Liquid savings available" prefix="₹" value={savings} onChange={setSavings}
          hint="Cash and anything you could reach within a few days." />
        <NumberField label="Monthly essential expenses" prefix="₹" value={essential} onChange={setEssential}
          hint="Rent, food, utilities, loan instalments, insurance." />
        <NumberField label="Monthly discretionary spending" prefix="₹" value={discretionary} onChange={setDiscretionary}
          hint="Everything you could cut back if you had to." />
        <NumberField label="Other reliable monthly income" prefix="₹" value={income} onChange={setIncome}
          hint="Rent received, a partner's contribution — income that would continue." />
      </Grid>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label="Essential-only runway"
            value={result.essentialCovered ? "Costs already covered" : monthsLabel(result.essentialMonths)}
            caption={
              result.essentialCovered
                ? "Your other income covers your essential costs, so savings are not being drawn down."
                : "How long your savings could cover essentials alone, if income stopped today."
            }
          />
          <Metrics
            items={[
              {
                label: "Current-lifestyle runway",
                value: result.lifestyleCovered ? "Covered" : monthsLabel(result.lifestyleMonths),
              },
              { label: "Essential monthly burn", value: money(result.essentialBurn) },
              { label: "Current monthly burn", value: money(result.lifestyleBurn) },
              { label: "Liquid savings", value: money(result.savings) },
            ]}
          />
        </div>
      )}
    </Shell>
  );
}

export function EmergencyFundCalculator() {
  const [essential, setEssential] = useState("60000");
  const [debt, setDebt] = useState("10000");
  const [months, setMonths] = useState("6");
  const [current, setCurrent] = useState("150000");

  const result = useMemo(() => {
    const values = [num(essential), num(debt), num(current)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [e, d, c] = values;
    return emergencyFund({ essential: e, debtPayments: d, months: Number(months), current: c });
  }, [essential, debt, months, current]);

  return (
    <Shell>
      <Grid>
        <NumberField label="Monthly essential expenses" prefix="₹" value={essential} onChange={setEssential}
          hint="What you would still have to pay with no income." />
        <NumberField label="Monthly debt repayments" prefix="₹" value={debt} onChange={setDebt}
          hint="Loan and card minimums, which do not pause." />
        <NumberField label="Emergency savings you hold now" prefix="₹" value={current} onChange={setCurrent} />
        <SegmentedField
          label="Months of cover you want"
          value={months}
          onChange={setMonths}
          options={[
            { value: "3", label: "3 months" },
            { value: "6", label: "6 months" },
            { value: "9", label: "9 months" },
            { value: "12", label: "12 months" },
          ]}
        />
      </Grid>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label={result.funded ? "You have reached this target" : `Still to set aside for ${months} months`}
            value={result.funded ? money(result.current) : money(result.gap)}
            tone={result.funded ? "positive" : "default"}
            caption={
              result.funded
                ? `That covers about ${result.coverageMonths.toFixed(1)} months of essential costs.`
                : `A ${months}-month reserve at your costs would be ${money(result.target)}.`
            }
          />
          <Metrics
            items={[
              { label: "Monthly essentials", value: money(result.monthlyNeed) },
              { label: "Target reserve", value: money(result.target) },
              { label: "Cover you have now", value: `${result.coverageMonths.toFixed(1)} months` },
            ]}
          />
          <div>
            <h3 className="text-sm font-medium">The same costs at other horizons</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-4">
              {result.scenarios.map((scenario) => (
                <li key={scenario.months} className="rounded-lg border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {scenario.months} months
                  </p>
                  <p className="mt-1 font-semibold">{money(scenario.target)}</p>
                  <p className="text-xs text-muted-foreground">
                    {scenario.gap > 0 ? `${money(scenario.gap)} to go` : "Reached"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function GoalFundingCalculator() {
  const [goal, setGoal] = useState("1000000");
  const [current, setCurrent] = useState("100000");
  const [months, setMonths] = useState("60");
  const [returns, setReturns] = useState("12");
  const [frequency, setFrequency] = useState("monthly");

  const result = useMemo(() => {
    const values = [num(goal), num(current), num(months), num(returns)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [g, c, m, r] = values;
    return goalFunding({ goal: g, current: c, months: m, annualReturn: r, frequency });
  }, [goal, current, months, returns, frequency]);

  return (
    <Shell>
      <Grid>
        <NumberField label="Amount you need" prefix="₹" value={goal} onChange={setGoal} />
        <NumberField label="Saved towards it already" prefix="₹" value={current} onChange={setCurrent} />
        <NumberField label="Months until you need it" value={months} onChange={setMonths} suffix="mo" />
        <NumberField label="Expected annual return" value={returns} onChange={setReturns} suffix="%"
          hint="Leave at 0 if the money will sit in cash." />
        <ChoiceField
          label="How often you would contribute"
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: "monthly", label: "Every month" },
            { value: "yearly", label: "Once a year" },
          ]}
        />
      </Grid>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label={result.alreadyFunded ? "No further contributions needed" : `Contribute ${frequency === "yearly" ? "each year" : "each month"}`}
            value={result.alreadyFunded ? "You are on track" : money(result.contribution)}
            tone={result.alreadyFunded ? "positive" : "default"}
            caption={
              result.alreadyFunded
                ? "What you have already saved should reach the goal on these assumptions."
                : `Over ${result.periods} contributions, assuming a ${returns}% annual return.`
            }
          />
          <Metrics
            items={[
              { label: "You would contribute", value: money(result.contributions) },
              { label: "Estimated growth", value: money(result.growth), tone: "positive" },
              { label: "Projected value", value: money(result.projected) },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Contributions are money you put in. Growth is what the return
            assumption adds on top — it is an estimate, not a promise, and a
            lower return would mean a larger contribution.
          </p>
        </div>
      )}
    </Shell>
  );
}
