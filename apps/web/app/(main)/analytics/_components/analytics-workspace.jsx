"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, BarChart3, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";
import { change } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import FlowChart from "./flow-chart";
import CategoryTable from "./category-table";

const CATEGORY_NAME = new Map(defaultCategories.map((c) => [c.id, c.name]));
const ALL = "__all__";

// A change, rendered honestly.
//
// null means the comparison has no answer -- there was nothing in the prior
// period to measure against -- and that is said in words rather than printed
// as 0%, Infinity or NaN. The arrow is paired with a sign and a label so the
// direction is not carried by colour alone.
export const Delta = ({ value, invert = false }) => {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">No prior data</span>;
  }

  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  // For expenses, up is the unwelcome direction; for income it is the good one.
  const good = invert ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs tabular-nums",
        flat
          ? "text-muted-foreground"
          : good
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-destructive"
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {flat ? "No change" : `${up ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
};

const Headline = ({ label, value, delta, invert }) => (
  <div className="p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">{value}</p>
    <div className="mt-1">{delta}</div>
  </div>
);

const AnalyticsWorkspace = ({ data, filters }) => {
  const router = useRouter();
  const params = useSearchParams();

  const { current, previous, categories, flow, accounts, period, hasAnyTransactions, hasPriorData } =
    data;

  // Filters are URL state. Changing one replaces the query and the server
  // recomputes; nothing here aggregates on the client.
  const setParam = (key, value) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    router.replace(`/analytics?${next.toString()}`, { scroll: false });
  };

  const savings =
    current.savingsRate === null
      ? "Not available"
      : `${current.savingsRate.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Understand how your income, spending and financial activity change
          over time.
        </p>
      </div>

      {/* Controls first, because every figure below is a function of them. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <Select value={filters.months} onValueChange={(v) => setParam("months", v)}>
          <SelectTrigger className="w-[9.5rem]" aria-label="Time range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.account || ALL}
          onValueChange={(v) => setParam("account", v)}
        >
          <SelectTrigger className="w-[11rem]" aria-label="Account">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type || ALL} onValueChange={(v) => setParam("type", v)}>
          <SelectTrigger className="w-[9.5rem]" aria-label="Transaction type">
            <SelectValue placeholder="All activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All activity</SelectItem>
            <SelectItem value="INCOME">Income only</SelectItem>
            <SelectItem value="EXPENSE">Expenses only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasAnyTransactions ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <BarChart3 aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">
            No transaction data for this period
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Analytics compares periods of real activity. Record some
            transactions, or widen the time range, and the trends will appear
            here.
          </p>
        </div>
      ) : (
        <>
          {/* Deliberately a single divided strip rather than a row of cards:
              these are context for the analysis below, not the point of the
              page. The dashboard is where figures lead. */}
          <section
            aria-label={`${period.label} ${period.year} compared with ${period.previousLabel}`}
            className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4"
          >
            <div className="bg-card">
              <Headline
                label={`Income · ${period.label}`}
                value={formatCurrency(current.income)}
                delta={
                  hasPriorData ? (
                    <Delta value={change(current.income, previous.income)} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No prior data
                    </span>
                  )
                }
              />
            </div>
            <div className="bg-card">
              <Headline
                label={`Expenses · ${period.label}`}
                value={formatCurrency(current.expenses)}
                delta={
                  hasPriorData ? (
                    <Delta value={change(current.expenses, previous.expenses)} invert />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No prior data
                    </span>
                  )
                }
              />
            </div>
            <div className="bg-card">
              <Headline
                label="Net"
                value={formatCurrency(current.net)}
                delta={
                  hasPriorData ? (
                    <Delta value={change(current.net, previous.net)} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No prior data
                    </span>
                  )
                }
              />
            </div>
            <div className="bg-card">
              <Headline
                label="Savings rate"
                value={savings}
                delta={
                  current.savingsRate === null ? (
                    <span className="text-xs text-muted-foreground">
                      Needs income to compute
                    </span>
                  ) : (
                    <Delta value={change(current.savingsRate, previous.savingsRate)} />
                  )
                }
              />
            </div>
          </section>

          <FlowChart flow={flow} />

          <CategoryTable
            rows={categories}
            categoryName={(id) => CATEGORY_NAME.get(id) ?? id}
            periodLabel={period.label}
            previousLabel={period.previousLabel}
            hasPriorData={hasPriorData}
          />
        </>
      )}
    </div>
  );
};

export default AnalyticsWorkspace;
