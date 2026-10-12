"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Metrics, NumberField, PrimaryResult, Problem, SegmentedField,
  anyNaN, money, num,
} from "./kit";
import { compareDebtStrategies, loanPrepayment } from "@/lib/tools/engines";
import { describeMonths } from "@/lib/tools/finance";

const Shell = ({ children }) => (
  <Card>
    <CardContent className="space-y-8 p-6 sm:p-8">{children}</CardContent>
  </Card>
);

let nextId = 0;
const newDebt = (name = "", balance = "", rate = "", minimum = "") => ({
  id: `debt-${nextId++}`, name, balance, rate, minimum,
});

export function DebtPayoffCalculator() {
  const [debts, setDebts] = useState(() => [
    newDebt("Credit card", "80000", "36", "4000"),
    newDebt("Personal loan", "200000", "14", "6000"),
  ]);
  const [extra, setExtra] = useState("5000");
  const [strategy, setStrategy] = useState("avalanche");

  const update = (id, field, value) =>
    setDebts((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

  const result = useMemo(() => {
    const parsed = debts.map((d) => ({
      name: d.name.trim(),
      balance: num(d.balance),
      rate: num(d.rate),
      minimum: num(d.minimum),
    }));
    if (parsed.some((d) => anyNaN(d.balance, d.rate, d.minimum)) || anyNaN(num(extra))) {
      return { ok: false, reason: "Enter amounts as numbers." };
    }
    return compareDebtStrategies({ debts: parsed, extra: num(extra) });
  }, [debts, extra]);

  const chosen = result.ok ? result[strategy] : null;
  const other = result.ok ? result[strategy === "avalanche" ? "snowball" : "avalanche"] : null;

  return (
    <Shell>
      <div className="space-y-4">
        <h2 className="text-sm font-medium">Your debts</h2>
        <ul className="space-y-4">
          {debts.map((debt, index) => (
            <li key={debt.id} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5 lg:col-span-1">
                    <label htmlFor={`${debt.id}-name`} className="block text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id={`${debt.id}-name`}
                      value={debt.name}
                      placeholder={`Debt ${index + 1}`}
                      onChange={(e) => update(debt.id, "name", e.target.value)}
                    />
                  </div>
                  <NumberField label="Balance" prefix="₹" value={debt.balance}
                    onChange={(v) => update(debt.id, "balance", v)} />
                  <NumberField label="Interest rate" suffix="%" value={debt.rate}
                    onChange={(v) => update(debt.id, "rate", v)} />
                  <NumberField label="Minimum payment" prefix="₹" value={debt.minimum}
                    onChange={(v) => update(debt.id, "minimum", v)} />
                </div>
                {debts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-7 shrink-0"
                    onClick={() => setDebts((rows) => rows.filter((r) => r.id !== debt.id))}
                    aria-label={`Remove ${debt.name || `debt ${index + 1}`}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" onClick={() => setDebts((rows) => [...rows, newDebt()])}>
          <Plus className="h-4 w-4" />
          Add another debt
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label="Extra you can pay each month" prefix="₹" value={extra} onChange={setExtra}
          hint="On top of every minimum. This is what drives the payoff." />
        <SegmentedField
          label="Repayment order"
          value={strategy}
          onChange={setStrategy}
          options={[
            { value: "avalanche", label: "Highest rate first" },
            { value: "snowball", label: "Smallest balance first" },
          ]}
        />
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label="Debt-free in"
            value={chosen.duration}
            caption={`Paying every minimum plus ${money(num(extra))} a month, clearing the ${
              strategy === "avalanche" ? "highest-rate" : "smallest"
            } balance first.`}
          />
          <Metrics
            items={[
              { label: "Total interest", value: money(chosen.totalInterest), tone: "negative" },
              { label: "Total repaid", value: money(chosen.totalPaid) },
              { label: "Months", value: String(chosen.months) },
            ]}
          />

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium">Order you would clear them</h3>
            <ol className="mt-3 space-y-2">
              {chosen.order.map((debt, index) => (
                <li key={debt.index} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">
                    <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                    {debt.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    cleared by month {debt.month}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* The comparison is the point. Neither order is "correct": one costs
              less, the other pays off a whole debt sooner, and which matters
              more is a judgement about yourself, not about arithmetic. */}
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <h3 className="font-medium">Against the other order</h3>
            <p className="mt-2 text-muted-foreground">
              Clearing the highest rate first costs{" "}
              <strong className="text-foreground">{money(result.interestDifference)}</strong> less
              in interest
              {result.monthsDifference !== 0 && (
                <> and finishes {describeMonths(Math.abs(result.monthsDifference))} {result.monthsDifference > 0 ? "sooner" : "later"}</>
              )}{" "}
              than clearing the smallest balance first. Smallest-first gives you a
              debt fully gone earlier, which some people find far easier to keep
              up. The cheaper plan is only cheaper if you stick to it.
            </p>
            <p className="mt-2 text-muted-foreground">
              Currently showing: {strategy === "avalanche" ? "highest rate first" : "smallest balance first"}
              {" · "}the other would take {other.duration} and cost {money(other.totalInterest)} in interest.
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function LoanPrepaymentCalculator() {
  const [balance, setBalance] = useState("2500000");
  const [rate, setRate] = useState("8.5");
  const [payment, setPayment] = useState("25000");
  const [extra, setExtra] = useState("5000");
  const [lump, setLump] = useState("0");

  const result = useMemo(() => {
    const values = [num(balance), num(rate), num(payment), num(extra), num(lump)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [b, r, p, e, l] = values;
    return loanPrepayment({ balance: b, annualRate: r, payment: p, extra: e, lumpSum: l });
  }, [balance, rate, payment, extra, lump]);

  return (
    <Shell>
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label="Outstanding balance" prefix="₹" value={balance} onChange={setBalance} />
        <NumberField label="Interest rate" suffix="%" value={rate} onChange={setRate} />
        <NumberField label="Current instalment" prefix="₹" value={payment} onChange={setPayment}
          hint="Your EMI as it stands today." />
        <NumberField label="Extra each month" prefix="₹" value={extra} onChange={setExtra} />
        <NumberField label="One-off lump sum" prefix="₹" value={lump} onChange={setLump}
          hint="Paid now, before the next instalment." />
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label={result.changed ? "Interest you could save" : "Paying nothing extra"}
            value={result.changed ? money(result.interestSaved) : money(result.original.interest)}
            tone={result.changed ? "positive" : "default"}
            caption={
              result.changed
                ? `And you would finish ${result.monthsSavedLabel} earlier — in ${result.accelerated.duration} instead of ${result.original.duration}.`
                : `At this instalment the loan runs ${result.original.duration} and costs this much in interest. Add an extra payment above to see the difference.`
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium text-muted-foreground">As it stands</h3>
              <Metrics
                items={[
                  { label: "Payoff", value: result.original.duration },
                  { label: "Interest", value: money(result.original.interest) },
                ]}
              />
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium text-muted-foreground">Paying extra</h3>
              <Metrics
                items={[
                  { label: "Payoff", value: result.accelerated.duration },
                  { label: "Interest", value: money(result.accelerated.interest) },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
