"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChoiceField, Metrics, NumberField, PrimaryResult, Problem,
  SegmentedField, anyNaN, money, num,
} from "./kit";
import { investmentGrowth, sipForGoal, sipProjection } from "@/lib/tools/engines";

const Shell = ({ children }) => (
  <Card>
    <CardContent className="space-y-8 p-6 sm:p-8">{children}</CardContent>
  </Card>
);

export function InvestmentGrowthCalculator() {
  const [initial, setInitial] = useState("100000");
  const [contribution, setContribution] = useState("10000");
  const [frequency, setFrequency] = useState("monthly");
  const [years, setYears] = useState("10");
  const [returns, setReturns] = useState("12");
  const [inflation, setInflation] = useState("6");

  const result = useMemo(() => {
    const values = [num(initial), num(contribution), num(years), num(returns), num(inflation)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [i, c, y, r, f] = values;
    return investmentGrowth({
      initial: i, contribution: c, frequency, years: y, annualReturn: r, inflation: f,
    });
  }, [initial, contribution, frequency, years, returns, inflation]);

  // Contribution against growth, year by year. A stacked bar drawn with two
  // divs: the shape is the message, and it needs no charting library.
  const peak = result.ok ? Math.max(...result.series.map((p) => p.value), 1) : 1;

  return (
    <Shell>
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label="Starting amount" prefix="₹" value={initial} onChange={setInitial} />
        <NumberField label="You add" prefix="₹" value={contribution} onChange={setContribution} />
        <ChoiceField label="How often" value={frequency} onChange={setFrequency}
          options={[{ value: "monthly", label: "Every month" }, { value: "yearly", label: "Once a year" }]} />
        <NumberField label="For how long" suffix="yrs" value={years} onChange={setYears} />
        <NumberField label="Expected annual return" suffix="%" value={returns} onChange={setReturns} />
        <NumberField label="Assumed inflation" suffix="%" value={inflation} onChange={setInflation}
          hint="Set to 0 to skip the today's-money figure." />
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label="Projected value"
            value={money(result.projected)}
            caption={`After ${years} years, assuming a ${returns}% annual return. An estimate, not a promise.`}
          />
          <Metrics
            items={[
              { label: "You put in", value: money(result.invested) },
              { label: "Estimated growth", value: money(result.growth), tone: "positive" },
              result.realValue !== null && {
                label: "In today's money",
                value: money(result.realValue),
                note: `at ${inflation}% inflation`,
              },
            ]}
          />

          <div>
            <h3 className="text-sm font-medium">How it builds up</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Solid is what you paid in; the lighter part is estimated growth.
            </p>
            <ul className="mt-4 space-y-2">
              {result.series.map((point) => (
                <li key={point.year} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                    Yr {point.year}
                  </span>
                  <div className="flex h-4 flex-1 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${(point.invested / peak) * 100}%` }} />
                    <div className="h-full bg-primary/35" style={{ width: `${(point.growth / peak) * 100}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs tabular-nums">
                    {money(point.value)}
                  </span>
                </li>
              ))}
            </ul>
            {/* The same series as text, because a bar someone cannot see is
                not information. */}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Read these figures as a table
              </summary>
              <table className="mt-2 w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 font-medium">Year</th>
                    <th scope="col" className="py-1 font-medium">Paid in</th>
                    <th scope="col" className="py-1 font-medium">Growth</th>
                    <th scope="col" className="py-1 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.series.map((point) => (
                    <tr key={point.year} className="border-t">
                      <td className="py-1 tabular-nums">{point.year}</td>
                      <td className="py-1 tabular-nums">{money(point.invested)}</td>
                      <td className="py-1 tabular-nums">{money(point.growth)}</td>
                      <td className="py-1 text-right tabular-nums">{money(point.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function SipGoalCalculator() {
  const [mode, setMode] = useState("target");
  const [target, setTarget] = useState("5000000");
  const [sip, setSip] = useState("20000");
  const [current, setCurrent] = useState("200000");
  const [years, setYears] = useState("10");
  const [returns, setReturns] = useState("12");

  const result = useMemo(() => {
    const values = [num(target), num(sip), num(current), num(years), num(returns)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [t, s, c, y, r] = values;
    return mode === "target"
      ? sipForGoal({ target: t, current: c, years: y, annualReturn: r })
      : sipProjection({ sip: s, current: c, years: y, annualReturn: r });
  }, [mode, target, sip, current, years, returns]);

  return (
    <Shell>
      <SegmentedField
        label="What are you working out?"
        value={mode}
        onChange={setMode}
        options={[
          { value: "target", label: "The SIP my target needs" },
          { value: "projection", label: "Where my SIP would land" },
        ]}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {mode === "target" ? (
          <NumberField label="Target amount" prefix="₹" value={target} onChange={setTarget} />
        ) : (
          <NumberField label="Monthly SIP" prefix="₹" value={sip} onChange={setSip} />
        )}
        <NumberField label="Already invested" prefix="₹" value={current} onChange={setCurrent} />
        <NumberField label="For how long" suffix="yrs" value={years} onChange={setYears} />
        <NumberField label="Expected annual return" suffix="%" value={returns} onChange={setReturns} />
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : mode === "target" ? (
        <div className="space-y-6">
          <PrimaryResult
            label={result.alreadyFunded ? "No SIP needed" : "Estimated monthly SIP"}
            value={result.alreadyFunded ? "You are on track" : money(result.sip)}
            tone={result.alreadyFunded ? "positive" : "default"}
            caption={
              result.alreadyFunded
                ? "What you have already invested should reach the target on these assumptions."
                : `Over ${result.periods} months at an assumed ${returns}% a year.`
            }
          />
          <Metrics
            items={[
              { label: "You would invest", value: money(result.contributions) },
              { label: "Estimated growth", value: money(result.growth), tone: "positive" },
              { label: "Projected value", value: money(result.projected) },
            ]}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label="Projected value"
            value={money(result.projected)}
            caption={`Investing ${money(num(sip))} a month for ${years} years at an assumed ${returns}% a year.`}
          />
          <Metrics
            items={[
              { label: "You would invest", value: money(result.contributions) },
              { label: "Estimated growth", value: money(result.growth), tone: "positive" },
              { label: "Months", value: String(result.periods) },
            ]}
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Market returns are not steady and not guaranteed. A SIP buys at whatever
        the price is each month, so the actual outcome depends on the path
        returns take, not just their average.
      </p>
    </Shell>
  );
}
