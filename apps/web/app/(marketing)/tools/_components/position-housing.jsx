"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Metrics, NumberField, PrimaryResult, Problem, ShareBar,
  anyNaN, money, num,
} from "./kit";
import { homeAffordability, netWorth, rentVsBuy } from "@/lib/tools/engines";

const Shell = ({ children }) => (
  <Card>
    <CardContent className="space-y-8 p-6 sm:p-8">{children}</CardContent>
  </Card>
);

const ASSETS = [
  ["cash", "Cash in hand"],
  ["bank", "Bank accounts"],
  ["investments", "Investments"],
  ["retirement", "Retirement savings"],
  ["property", "Property"],
  ["vehicles", "Vehicles"],
  ["other", "Other assets"],
];

const LIABILITIES = [
  ["card", "Credit card debt"],
  ["personal", "Personal loans"],
  ["vehicle", "Vehicle loans"],
  ["home", "Home loan"],
  ["otherDebt", "Other liabilities"],
];

export function NetWorthCalculator() {
  const [assets, setAssets] = useState({
    cash: "25000", bank: "150000", investments: "800000",
    retirement: "600000", property: "4000000", vehicles: "450000", other: "",
  });
  const [liabilities, setLiabilities] = useState({
    card: "50000", personal: "200000", vehicle: "300000", home: "2500000", otherDebt: "",
  });

  const result = useMemo(() => {
    const rows = (defs, state) => defs.map(([key, label]) => ({ label, amount: num(state[key]) }));
    const a = rows(ASSETS, assets);
    const l = rows(LIABILITIES, liabilities);
    if (anyNaN(...a.map((r) => r.amount), ...l.map((r) => r.amount))) {
      return { ok: false, reason: "Enter amounts as numbers." };
    }
    return netWorth({ assets: a, liabilities: l });
  }, [assets, liabilities]);

  return (
    <Shell>
      <div className="grid gap-8 lg:grid-cols-2">
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">What you own</legend>
          {ASSETS.map(([key, label]) => (
            <NumberField key={key} label={label} prefix="₹" value={assets[key]}
              onChange={(v) => setAssets((s) => ({ ...s, [key]: v }))} />
          ))}
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">What you owe</legend>
          {LIABILITIES.map(([key, label]) => (
            <NumberField key={key} label={label} prefix="₹" value={liabilities[key]}
              onChange={(v) => setLiabilities((s) => ({ ...s, [key]: v }))} />
          ))}
        </fieldset>
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label="Net worth"
            value={money(result.netWorth)}
            tone={result.netWorth >= 0 ? "positive" : "negative"}
            caption={
              result.netWorth >= 0
                ? "What you own, less what you owe."
                : "You owe more than you own today. That is common with a recent mortgage or student loan, and it changes as balances fall."
            }
          />
          <Metrics
            items={[
              { label: "Total assets", value: money(result.totalAssets) },
              { label: "Total liabilities", value: money(result.totalLiabilities), tone: "negative" },
            ]}
          />
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-medium">What your assets are</h3>
              <ShareBar rows={result.assetBreakdown} total={result.totalAssets} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">What you owe it on</h3>
              <ShareBar rows={result.liabilityBreakdown} total={result.totalLiabilities} />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function HomeAffordabilityCalculator() {
  const [income, setIncome] = useState("200000");
  const [debt, setDebt] = useState("20000");
  const [down, setDown] = useState("1500000");
  const [rate, setRate] = useState("8.5");
  const [years, setYears] = useState("20");
  const [dti, setDti] = useState("40");
  const [costs, setCosts] = useState("5000");

  const result = useMemo(() => {
    const values = [num(income), num(debt), num(down), num(rate), num(years), num(dti), num(costs)];
    if (anyNaN(...values)) return { ok: false, reason: "Enter amounts as numbers." };
    const [i, d, dp, r, y, t, c] = values;
    return homeAffordability({
      monthlyIncome: i, existingDebt: d, downPayment: dp, annualRate: r,
      years: y, maxDtiPercent: t, otherHomeCosts: c,
    });
  }, [income, debt, down, rate, years, dti, costs]);

  return (
    <Shell>
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label="Monthly income" prefix="₹" value={income} onChange={setIncome}
          hint="Take-home, after tax." />
        <NumberField label="Existing monthly commitments" prefix="₹" value={debt} onChange={setDebt}
          hint="Other loan and card payments you already make." />
        <NumberField label="Deposit you have" prefix="₹" value={down} onChange={setDown} />
        <NumberField label="Interest rate" suffix="%" value={rate} onChange={setRate} />
        <NumberField label="Loan tenure" suffix="yrs" value={years} onChange={setYears} />
        <NumberField label="Other monthly home costs" prefix="₹" value={costs} onChange={setCosts}
          hint="Maintenance, property tax, society dues." />
        <NumberField label="Most of income going to debt" suffix="%" value={dti} onChange={setDti}
          hint="A common planning ceiling is 40%. Lower is more comfortable." />
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label="Property price this could support"
            value={money(result.price)}
            caption="A planning estimate from your own figures — not an offer, and not what a lender would approve."
          />
          <Metrics
            items={[
              { label: "Loan amount", value: money(result.loan) },
              { label: "Monthly EMI", value: money(result.emi) },
              { label: "Your deposit", value: money(result.downPayment), note: `${result.downPaymentPercent}% of price` },
              { label: "Total interest", value: money(result.totalInterest), tone: "negative" },
              { label: "Income going to debt", value: `${result.dtiPercent}%` },
              { label: "Left for the EMI", value: money(result.availableForEmi) },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            A lender will look at your credit history, employment, the property
            itself and its own rules. Their figure will differ from this one,
            often by a lot.
          </p>
        </div>
      )}
    </Shell>
  );
}

export function RentVsBuyCalculator() {
  const [rent, setRent] = useState("35000");
  const [rentRise, setRentRise] = useState("5");
  const [price, setPrice] = useState("9000000");
  const [down, setDown] = useState("1800000");
  const [rate, setRate] = useState("8.5");
  const [loanYears, setLoanYears] = useState("20");
  const [years, setYears] = useState("10");
  const [maintenance, setMaintenance] = useState("1");
  const [purchaseCost, setPurchaseCost] = useState("7");
  const [appreciation, setAppreciation] = useState("5");
  const [investReturn, setInvestReturn] = useState("10");

  const result = useMemo(() => {
    const v = [rent, rentRise, price, down, rate, loanYears, years, maintenance, purchaseCost, appreciation, investReturn].map(num);
    if (anyNaN(...v)) return { ok: false, reason: "Enter amounts as numbers." };
    const [r, ri, p, d, ir, ly, y, m, pc, ap, inv] = v;
    return rentVsBuy({
      monthlyRent: r, rentIncreasePercent: ri, propertyPrice: p, downPayment: d,
      annualRate: ir, loanYears: ly, years: y, maintenancePercent: m,
      purchaseCostPercent: pc, appreciationPercent: ap, investmentReturnPercent: inv,
    });
  }, [rent, rentRise, price, down, rate, loanYears, years, maintenance, purchaseCost, appreciation, investReturn]);

  return (
    <Shell>
      <div className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">If you rent</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Monthly rent" prefix="₹" value={rent} onChange={setRent} />
            <NumberField label="Rent rises each year by" suffix="%" value={rentRise} onChange={setRentRise} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">If you buy</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Property price" prefix="₹" value={price} onChange={setPrice} />
            <NumberField label="Deposit" prefix="₹" value={down} onChange={setDown} />
            <NumberField label="Interest rate" suffix="%" value={rate} onChange={setRate} />
            <NumberField label="Loan tenure" suffix="yrs" value={loanYears} onChange={setLoanYears} />
            <NumberField label="Upkeep and tax each year" suffix="%" value={maintenance} onChange={setMaintenance}
              hint="Of the property's value." />
            <NumberField label="One-off buying costs" suffix="%" value={purchaseCost} onChange={setPurchaseCost}
              hint="Stamp duty, registration, legal." />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">Your assumptions</legend>
          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField label="How long you would stay" suffix="yrs" value={years} onChange={setYears} />
            <NumberField label="Property grows by" suffix="%" value={appreciation} onChange={setAppreciation} />
            <NumberField label="Investments would return" suffix="%" value={investReturn} onChange={setInvestReturn}
              hint="What the deposit could earn instead." />
          </div>
        </fieldset>
      </div>

      {!result.ok ? (
        <Problem>{result.reason}</Problem>
      ) : (
        <div className="space-y-6">
          <PrimaryResult
            label={`Over ${years} years, the lower net cost is`}
            value={
              result.lowerCost === null
                ? "Line ball"
                : result.lowerCost === "buy"
                  ? `Buying, by ${money(result.difference)}`
                  : `Renting, by ${money(result.difference)}`
            }
            caption="Under the assumptions above — change any one of them and this can flip. That is the point of the tool, not a recommendation."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Renting</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Rent paid" value={money(result.rent.totalRent)} />
                <Row label="Invested instead" value={money(result.rent.totalInvested)} />
                <Row label="That portfolio becomes" value={money(result.rent.portfolioValue)} />
                <Row label="Net cost" value={money(result.rent.netCost)} strong />
              </dl>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Buying</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Interest paid" value={money(result.buy.interestPaid)} />
                <Row label="Upkeep and buying costs" value={money(result.buy.upkeep + result.buy.purchaseCosts)} />
                <Row label="Property worth" value={money(result.buy.propertyValue)} />
                <Row label="Loan still owed" value={money(result.buy.remainingLoan)} />
                <Row label="Equity you hold" value={money(result.buy.equity)} />
                <Row label="Net cost" value={money(result.buy.netCost)} strong />
              </dl>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Net cost is everything paid out less what you still own at the end,
            measured the same way on both sides. It ignores things that matter
            and cannot be priced: how settled you want to be, how easily you
            could move, and what owning does to your flexibility.
          </p>
        </div>
      )}
    </Shell>
  );
}

const Row = ({ label, value, strong }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
  </div>
);
