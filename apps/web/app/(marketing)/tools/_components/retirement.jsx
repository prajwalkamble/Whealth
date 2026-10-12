"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Metrics, NumberField, PrimaryResult, Problem, anyNaN, money, num,
} from "./kit";
import { retirementCorpus, retirementWithdrawal } from "@/lib/tools/engines";

const Shell = ({ children }) => (
  <Card>
    <CardContent className="space-y-8 p-6 sm:p-8">{children}</CardContent>
  </Card>
);

const Grid = ({ children }) => <div className="grid gap-5 sm:grid-cols-2">{children}</div>;

// For someone already retired and drawing on what they have.
export function RetirementWithdrawalCalculator() {
  const [corpus, setCorpus] = useState("12000000");
  const [withdrawal, setWithdrawal] = useState("60000");
  const [otherIncome, setOtherIncome] = useState("15000");
  const [returns, setReturns] = useState("8");
  const [inflation, setInflation] = useState("6");

  const result = useMemo(() => {
    const values = [num(corpus), num(withdrawal), num(otherIncome), num(returns), num(inflation)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [c, w, o, r, i] = values;
    return retirementWithdrawal({
      corpus: c, monthlyWithdrawal: w, otherMonthlyIncome: o, annualReturn: r, inflation: i,
    });
  }, [corpus, withdrawal, otherIncome, returns, inflation]);

  return (
    <Shell>
      <Grid>
        <NumberField label="Retirement savings you hold" prefix="₹" value={corpus} onChange={setCorpus}
          hint="Everything you are drawing on — deposits, funds, bonds." />
        <NumberField label="You need each month" prefix="₹" value={withdrawal} onChange={setWithdrawal}
          hint="Your living costs today, before any pension." />
        <NumberField label="Pension or other monthly income" prefix="₹" value={otherIncome} onChange={setOtherIncome}
          hint="Pension, annuity, rent. Assumed not to rise with inflation." />
        <NumberField label="Return on your savings" suffix="%" value={returns} onChange={setReturns} />
        <NumberField label="Assumed inflation" suffix="%" value={inflation} onChange={setInflation}
          hint="What you need to draw rises by this each year." />
      </Grid>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label={result.depleted ? "Your savings would last" : "Your savings would outlast the horizon"}
            value={result.depleted ? result.duration : `Beyond ${result.horizonYears} years`}
            tone={result.depleted ? "default" : "positive"}
            caption={
              result.depleted
                ? "At this rate of withdrawal, rising with inflation each year."
                : `After ${result.horizonYears} years you would still hold about ${money(result.endingBalance)}. This tool does not model further than that.`
            }
          />

          <Metrics
            items={[
              {
                label: "Could draw indefinitely",
                value: result.sustainableMonthly === null ? "Not at this return" : money(result.sustainableMonthly),
                note:
                  result.sustainableMonthly === null
                    ? "returns are below inflation"
                    : `at a ${result.realReturnPercent}% return after inflation`,
              },
              { label: "Drawing now", value: money(result.firstYearMonthly) },
              result.depleted && {
                label: "By the final year",
                value: money(result.finalMonthly),
                note: "same lifestyle, inflated",
              },
            ]}
          />

          {/* The distinction that matters most and is easiest to miss: a
              healthy headline return can still mean the pot is shrinking once
              inflation is taken out of it. */}
          {result.drawingDown && result.sustainableMonthly !== null && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
              You are drawing more than your savings earn after inflation, so
              the pot is being spent down rather than living off its return.
              Drawing around {money(result.sustainableMonthly)} a month would
              leave the balance broadly intact in today's money.
            </p>
          )}

          {result.yearly.length > 0 && (
            <details className="rounded-lg border p-4 text-sm">
              <summary className="cursor-pointer font-medium">Year by year</summary>
              <table className="mt-3 w-full">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 font-medium">Year</th>
                    <th scope="col" className="py-1 font-medium">Drawing monthly</th>
                    <th scope="col" className="py-1 text-right font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {result.yearly.map((row) => (
                    <tr key={row.year} className="border-t">
                      <td className="py-1 tabular-nums">{row.year}</td>
                      <td className="py-1 tabular-nums">{money(row.monthlyWithdrawal)}</td>
                      <td className="py-1 text-right tabular-nums">{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      )}
    </Shell>
  );
}

// For someone still working and building towards it.
export function RetirementCorpusCalculator() {
  const [age, setAge] = useState("35");
  const [retireAt, setRetireAt] = useState("60");
  const [years, setYears] = useState("25");
  const [expenses, setExpenses] = useState("50000");
  const [savings, setSavings] = useState("1500000");
  const [contribution, setContribution] = useState("20000");
  const [before, setBefore] = useState("11");
  const [after, setAfter] = useState("7");
  const [inflation, setInflation] = useState("6");

  const result = useMemo(() => {
    const v = [age, retireAt, years, expenses, savings, contribution, before, after, inflation].map(num);
    if (anyNaN(...v)) return { ok: false, reason: "Enter amounts as numbers." };
    const [a, r, y, e, s, c, rb, ra, i] = v;
    return retirementCorpus({
      currentAge: a, retirementAge: r, yearsInRetirement: y, monthlyExpenses: e,
      currentSavings: s, monthlyContribution: c, returnBefore: rb, returnAfter: ra, inflation: i,
    });
  }, [age, retireAt, years, expenses, savings, contribution, before, after, inflation]);

  return (
    <Shell>
      <div className="grid gap-5 sm:grid-cols-3">
        <NumberField label="Your age now" suffix="yrs" value={age} onChange={setAge} />
        <NumberField label="You want to retire at" suffix="yrs" value={retireAt} onChange={setRetireAt} />
        <NumberField label="Years it should cover" suffix="yrs" value={years} onChange={setYears}
          hint="How long you want the money to last." />
      </div>
      <Grid>
        <NumberField label="Monthly expenses today" prefix="₹" value={expenses} onChange={setExpenses}
          hint="In today's money — inflation is applied for you." />
        <NumberField label="Saved for retirement so far" prefix="₹" value={savings} onChange={setSavings} />
        <NumberField label="You save each month" prefix="₹" value={contribution} onChange={setContribution} />
        <NumberField label="Return before retiring" suffix="%" value={before} onChange={setBefore} />
        <NumberField label="Return after retiring" suffix="%" value={after} onChange={setAfter}
          hint="Usually lower — portfolios are moved to safer assets." />
        <NumberField label="Assumed inflation" suffix="%" value={inflation} onChange={setInflation} />
      </Grid>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label={`You would need by age ${retireAt}`}
            value={money(result.target)}
            caption={`To support ${money(result.monthlyAtRetirement)} a month then — which is ${money(num(expenses))} today, after ${result.yearsToRetirement} years of inflation.`}
          />
          <Metrics
            items={[
              { label: "On course for", value: money(result.projected), tone: result.onTrack ? "positive" : undefined },
              {
                label: result.onTrack ? "Surplus" : "Shortfall",
                value: result.onTrack ? money(result.projected - result.target) : money(result.gap),
                tone: result.onTrack ? "positive" : "negative",
              },
              {
                label: "Needs saving monthly",
                value: money(result.requiredMonthly),
                note: result.onTrack ? "already covered" : `${money(result.shortfallMonthly)} more than now`,
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            The target is what it would cost to draw a rising income for{" "}
            {years} years, not simply your expenses multiplied out — the pot
            keeps earning while you spend it, and the same lifestyle costs more
            each year.
          </p>
        </div>
      )}
    </Shell>
  );
}
