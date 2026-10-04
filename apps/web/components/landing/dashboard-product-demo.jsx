"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Moon,
  PiggyBank,
  Plus,
  Settings,
  Sun,
  Target,
  Wallet,
} from "lucide-react";

import StatCards from "@/app/(main)/dashboard/_components/stat-cards";
import CashFlowChart from "@/app/(main)/dashboard/_components/cash-flow-chart";
import CategoryDonut from "@/app/(main)/dashboard/_components/category-donut";
import IncomeSources from "@/app/(main)/dashboard/_components/income-sources";
import RecentTransactions from "@/app/(main)/dashboard/_components/recent-transactions";
import AccountsPanel from "@/app/(main)/dashboard/_components/accounts-panel";
import { landingDashboard } from "@/lib/demo/landing-data";
import { cn } from "@/lib/utils";
import DemoCursor from "./demo-cursor";
import { useDashboardDemoTimeline } from "./use-dashboard-demo-timeline";

// The landing page's product walkthrough.
//
// Every panel below is the signed-in dashboard's own component, imported from
// app/(main)/dashboard/_components and handed demo data instead of database
// rows. Nothing here is a marketing rebuild of the product: if the real
// dashboard changes, this changes with it, which is the only way a landing
// page stays honest about what the application looks like.
//
// Nothing it does leaves the browser. The rows the walkthrough adds live in
// React state for the length of a loop; there is no provider, no localStorage,
// no server action and no mutation path.

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", icon: Wallet },
  { label: "Cards", icon: CreditCard, muted: true },
  { label: "Budgets", icon: PiggyBank, muted: true },
  { label: "Goals", icon: Target, muted: true },
  { label: "Analytics", icon: BarChart3, muted: true },
  { label: "Settings", icon: Settings },
];

// A focus treatment that costs one custom property, so the timeline can raise
// and lower it on any panel without knowing what the panel contains. Kept
// quiet on purpose: a ring and a touch of lift, never a spotlight that dims
// the rest of the interface.
const panelClass =
  "[--demo-ring:0] relative rounded-xl transition-shadow " +
  "shadow-[0_0_0_calc(var(--demo-ring)*2px)_hsl(var(--primary)/calc(var(--demo-ring)*0.45))]";

const Panel = ({ name, className, children }) => (
  <div data-demo={name} data-demo-panel="" className={cn(panelClass, className)}>
    {children}
  </div>
);


const DashboardProductDemo = () => {
  const rootRef = useRef(null);
  const cursorRef = useRef(null);

  // The sample rows are dated from new Date(), so the server and the browser
  // can disagree by a tick and React reports a hydration mismatch. The demo
  // page gates on mount for the same reason. The frame keeps its height
  // across the swap, so nothing on the page moves.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The demo deliberately runs in the opposite theme to the site, so a visitor
  // sees the other one without changing their own. The class goes on the demo
  // frame, never on <html>: clicking the toggle in the walkthrough must not
  // re-theme the page someone is reading.
  const { resolvedTheme } = useTheme();
  // Shown in the opposite theme to the site, so a visitor sees the other one
  // without their own page changing. The class goes on the demo frame, never
  // on <html>.
  const demoDark = resolvedTheme !== "dark";

  const { transactions, accounts, dashboard } = useMemo(() => landingDashboard(), []);
  const { summary, cashFlow, breakdown } = dashboard;

  useDashboardDemoTimeline({
    rootRef,
    cursorRef,
    balance: summary.totalBalance,
  });

  return (
    <figure className="mx-auto mt-16 w-full max-w-6xl 2xl:max-w-7xl">
      <div
        ref={rootRef}
        // select-none plus pointer-events-none on the contents: the panel is a
        // demonstration, not a document, and it should behave like a video --
        // nothing to drag-select, nothing to right-click into. The timeline
        // still drives it, because element.click() ignores pointer-events.
        //
        // Worth being clear that this is a deterrent, not protection: the text
        // is in the DOM and anyone who opens the inspector can read it. The
        // numbers are sample data, so there is nothing here worth protecting
        // harder than this.
        className={cn(
          "relative min-h-[26rem] select-none overflow-hidden rounded-xl border text-left shadow-sm sm:min-h-[34rem] lg:min-h-[41rem]",
          // text-foreground as well as bg-background: body resolves
          // text-foreground against the SITE's tokens, and plain text inherits
          // that resolved colour rather than re-reading the variable under the
          // demo's scope. Without it the form page rendered near-black text on
          // the demo's dark background.
          "bg-background text-foreground",
          // Only once mounted. resolvedTheme is undefined on the server, so
          // deciding the class during SSR renders "dark" there and possibly
          // "theme-light" on the client, which is a hydration mismatch. The
          // contents are already hidden until mount, so there is nothing to
          // see in the gap.
          mounted && (demoDark ? "dark" : "theme-light")
        )}
        // Not aria-hidden: the figures, transaction names and account names
        // below are real content and stay readable with the animation off.
        role="img"
        aria-label="The WHealthOS dashboard, showing balance, income, expenses, savings rate, cash flow, expense breakdown, recent transactions and account balances."
      >
        <div className={cn("flex pointer-events-none", !mounted && "invisible")}>
          {/* Sidebar: the real nav, including the sections that are not built
              yet, shown muted exactly as the application shows them. */}
          <div
            data-demo="sidebar"
            data-demo-panel=""
            className="hidden w-44 shrink-0 border-r bg-card/40 p-3 lg:block"
          >
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Menu
            </p>
            <ul className="space-y-0.5">
              {NAV.map(({ label, icon: Icon, active, muted }) => (
                <li key={label}>
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                      active && "bg-accent font-medium text-accent-foreground",
                      muted && "text-muted-foreground/50",
                      !active && !muted && "text-muted-foreground"
                    )}
                  >
                    <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 flex-1">
            <div
              data-demo="topbar"
              data-demo-panel=""
              className="flex items-center justify-between gap-3 border-b px-4 py-3"
            >
              <h3 className="text-base font-bold tracking-tight">Dashboard</h3>
              <div className="flex items-center gap-2">
                <span className="hidden h-8 items-center gap-2 rounded-md border bg-card px-2.5 text-xs tabular-nums text-muted-foreground sm:inline-flex">
                  <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                  This month
                </span>
                {/* The real app header carries a theme toggle; so does this. */}
                <button
                  type="button"
                  data-demo-theme
                  tabIndex={-1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground"
                >
                  {/* Sun until mounted, on both sides. demoDark depends on
                      resolvedTheme, which is undefined during SSR, so picking
                      the icon before mount renders one glyph on the server and
                      possibly the other on the client -- a different <svg>,
                      which fails hydration outright. */}
                  {mounted && demoDark ? (
                    <Moon aria-hidden className="h-3.5 w-3.5" />
                  ) : (
                    <Sun aria-hidden className="h-3.5 w-3.5" />
                  )}
                </button>
                <span
                  data-demo-add
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                  Add Transaction
                </span>
              </div>
            </div>

            <div className="relative space-y-4 p-4">
              <Panel name="stats">
                <StatCards
                  summary={summary}
                  accountCount={accounts.length}
                  hasTransactions={transactions.length > 0}
                  guest
                />
              </Panel>

              <div className="grid gap-4 lg:grid-cols-3">
                <Panel name="income" className="min-w-0">
                  <IncomeSources
                    rows={breakdown.income}
                    total={summary.monthlyIncome}
                    previousTotal={summary.previous.income}
                  />
                </Panel>
                <Panel name="cashflow" className="min-w-0">
                  <CashFlowChart months={cashFlow} />
                </Panel>
                <Panel name="breakdown" className="min-w-0">
                  <CategoryDonut
                    title="Expense Breakdown"
                    rows={breakdown.expenses}
                    emptyLabel="No expenses this month"
                  />
                </Panel>
              </div>

              {/* 3:2 rather than even halves. At 1:1 the transaction name
                  column was squeezed to about ten characters and every
                  merchant rendered as "Mo...". */}
              <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
                <Panel name="transactions" className="flex min-w-0">
                  <RecentTransactions
                    transactions={transactions}
                    accounts={accounts}
                    limit={6}
                    viewAllHref="/demo/transactions"
                  />
                </Panel>
                <Panel name="accounts" className="flex min-w-0">
                  <AccountsPanel accounts={accounts} guest />
                </Panel>
              </div>

            </div>
          </div>
        </div>

        <DemoCursor ref={cursorRef} />
      </div>

      <figcaption className="mt-3 text-xs text-muted-foreground">
        The WHealthOS dashboard, running on sample data.{" "}
        <a href="/demo" className="underline underline-offset-2 hover:text-foreground">
          Open the live demo
        </a>
        .
      </figcaption>
    </figure>
  );
};

export default DashboardProductDemo;
