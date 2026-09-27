"use client";

import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCards from "@/app/(main)/dashboard/_components/stat-cards";
import CashFlowChart from "@/app/(main)/dashboard/_components/cash-flow-chart";
import CategoryDonut from "@/app/(main)/dashboard/_components/category-donut";
import IncomeSources from "@/app/(main)/dashboard/_components/income-sources";
import RecentTransactions from "@/app/(main)/dashboard/_components/recent-transactions";
import AccountsPanel from "@/app/(main)/dashboard/_components/accounts-panel";
import BudgetProgress from "@/app/(main)/dashboard/_components/budget-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_TIME_ZONE } from "@/lib/time";
import { useDemo } from "./_components/demo-provider";

// "1 – 21 Sep 2026": the period the figures cover, as on the real dashboard.
function currentPeriod() {
  const now = new Date();
  const part = (options) =>
    new Intl.DateTimeFormat("en-IN", { ...options, timeZone: APP_TIME_ZONE }).format(now);
  return `1 – ${part({ day: "numeric" })} ${part({ month: "short" })} ${part({ year: "numeric" })}`;
}

// The signed-in dashboard's own widgets, fed from the browser instead of the
// database. Reusing them rather than building demo copies is the point: what a
// guest evaluates is the real thing, and the two cannot drift apart.
export default function DemoDashboardPage() {
  const { ready, dashboard } = useDemo();
  const { accounts, transactions, summary, cashFlow, breakdown, budget } = dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm tabular-nums">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {currentPeriod()}
          </span>
          <Button size="sm" className="h-9" asChild>
            <Link href="/demo/transaction/create">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* The guest's own rows only arrive after mount, since they come from
          localStorage. Showing the skeleton until then keeps the figures from
          visibly correcting themselves a moment after the page appears. */}
      {!ready ? (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <StatCards
            summary={summary}
            accountCount={accounts.length}
            hasTransactions={transactions.length > 0}
            guest
          />

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <IncomeSources
              rows={breakdown.income}
              total={summary.monthlyIncome}
              previousTotal={summary.previous.income}
            />
            <CashFlowChart months={cashFlow} />
            <CategoryDonut
              title="Expense Breakdown"
              rows={breakdown.expenses}
              emptyLabel="No expenses this month"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="flex">
              <RecentTransactions
                transactions={transactions}
                accounts={accounts}
                limit={8}
                viewAllHref="/demo/transactions"
              />
            </div>
            <div className="flex flex-col gap-6">
              <div className="shrink-0">
                <BudgetProgress
                  initialBudget={budget.budget}
                  currentExpenses={budget.currentExpenses}
                  guest
                />
              </div>
              <div className="flex flex-1">
                <AccountsPanel accounts={accounts} guest />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
