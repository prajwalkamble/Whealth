import Link from "next/link";
import { ArrowUpRight, Plus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateAccountDrawer from "@/components/create-account-drawer";
import {
  StatusBadge,
  TrendBadge,
  Widget,
  WidgetContent,
  WidgetHeader,
  percentChange,
} from "@/components/dashboard/widget";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import { APP_TIME_ZONE, monthBounds } from "@/lib/time";
import { cn } from "@/lib/utils";

const Figure = ({ value, tone }) => (
  <div className={cn("text-3xl font-bold tracking-tight tabular-nums", tone)}>
    {value}
  </div>
);

const Caption = ({ children }) => (
  <p className="mt-1 text-xs text-muted-foreground">{children}</p>
);

// Badges work in two stages:
//
//   getting started  no account, or no transaction yet: what to do next
//   in use           a percentage, always against a baseline that exists --
//                    last month once it has data, and until then a baseline
//                    inside this month (the opening balance, this month's
//                    income), never a percentage of nothing.

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "1 Sep": the first day of this month on the app's calendar, for captions.
// Built from parts because en-IN abbreviates September as "Sept".
const monthStartLabel = () => {
  const start = monthBounds().startOfMonth;
  const part = (options) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone: APP_TIME_ZONE }).format(start);
  return `${part({ day: "numeric" })} ${part({ month: "short" })}`;
};

// Balance: % change against the balance at the start of the month. Only when
// there was no opening balance (an account opened at zero this month) is
// there nothing to divide by, and the change is shown in rupees instead.
function balanceBadge({ accountCount, hasTransactions, balanceSince }) {
  if (accountCount === 0) {
    return {
      badge: <StatusBadge icon={Sparkles}>Get started</StatusBadge>,
      caption: "add your first account to start tracking",
    };
  }
  const accounts = `across ${plural(accountCount, "account")}`;
  if (!hasTransactions) {
    return {
      badge: <StatusBadge>Opening balance</StatusBadge>,
      caption: `${accounts} · add a transaction to see it move`,
    };
  }
  // % change against the balance on the 1st -- counting only accounts that
  // existed on the 1st, so an account opened this month is never measured
  // against its own opening balance (which read as +1,142%).
  if (balanceSince && balanceSince.start > 0) {
    return {
      badge: <TrendBadge value={percentChange(balanceSince.now, balanceSince.start)} />,
      caption: `vs ${formatCurrency(balanceSince.start)} on ${monthStartLabel()}`,
    };
  }
  // Every account was opened this month: there is no earlier balance, so
  // there is nothing honest to compare against yet.
  return {
    badge: <StatusBadge icon={Sparkles}>New account</StatusBadge>,
    caption: `${accounts} · opened this month, % change starts next month`,
  };
}

const pct = (value) => `${value.toFixed(1)}%`;

// Income: % change against last month once last month had income; before
// that, income's share of all the money that moved this month.
function incomeBadge({ hasTransactions, income, expenses, previous }) {
  if (!hasTransactions) {
    return {
      badge: <StatusBadge>Not tracked yet</StatusBadge>,
      caption: "add an income to see it here",
    };
  }
  if (previous > 0) {
    return {
      badge: <TrendBadge value={percentChange(income, previous)} />,
      caption: `vs ${formatCurrency(previous)} last month`,
    };
  }
  const moved = income + expenses;
  const share = moved > 0 ? (income / moved) * 100 : 0;
  return {
    badge: (
      <StatusBadge tone={share >= 50 ? "good" : "warn"} icon={TrendingUp}>
        {pct(share)}
      </StatusBadge>
    ),
    caption: income > 0 ? "of this month's money in" : "no income recorded this month",
  };
}

// Expenses: % change against last month once last month had spending;
// before that, spending as a share of this month's income -- lower is better.
function expensesBadge({ hasTransactions, income, expenses, previous }) {
  if (!hasTransactions) {
    return {
      badge: <StatusBadge>Not tracked yet</StatusBadge>,
      caption: "add an expense to see it here",
    };
  }
  if (previous > 0) {
    return {
      badge: <TrendBadge value={percentChange(expenses, previous)} goodWhenUp={false} />,
      caption: `vs ${formatCurrency(previous)} last month`,
    };
  }
  if (income <= 0) {
    return {
      badge: <StatusBadge>No income yet</StatusBadge>,
      caption: expenses > 0 ? "record income to see spending against it" : "no expenses recorded this month",
    };
  }
  const ofIncome = (expenses / income) * 100;
  return {
    badge: (
      <StatusBadge tone={ofIncome <= 50 ? "good" : ofIncome <= 100 ? "warn" : "bad"}>
        {pct(ofIncome)}
      </StatusBadge>
    ),
    caption: "of this month's income",
  };
}

// Savings rate: the change in points against last month's rate when both
// months have income; before that, the rate itself, coloured by whether it
// clears the 20% people are usually advised to keep.
function savingsBadge({ hasTransactions, rate, previousRate, net }) {
  if (!hasTransactions) {
    return {
      badge: <StatusBadge>Not tracked yet</StatusBadge>,
      caption: "add income and expenses to see how much you keep",
    };
  }
  if (rate === null) {
    return {
      badge: <StatusBadge>Needs income</StatusBadge>,
      caption: "record this month's income to see your rate",
    };
  }
  if (previousRate !== null) {
    return {
      badge: <TrendBadge value={rate - previousRate} />,
      caption: `vs ${previousRate.toFixed(1)}% last month · aim for 20%+`,
    };
  }
  const tone = rate >= 20 ? "good" : rate >= 0 ? "warn" : "bad";
  return {
    badge: <StatusBadge tone={tone}>{pct(rate)}</StatusBadge>,
    caption:
      rate >= 0
        ? "of income kept · aim for 20%+"
        : `${formatCurrency(Math.abs(net))} more spent than earned this month`,
  };
}

const StatCards = ({ summary, accountCount, hasTransactions }) => {
  const {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    net,
    previous,
  } = summary;

  const balance = balanceBadge({ accountCount, hasTransactions, balanceSince: summary.balanceSince });
  const income = incomeBadge({
    hasTransactions,
    income: monthlyIncome,
    expenses: monthlyExpenses,
    previous: previous.income,
  });
  const expenses = expensesBadge({
    hasTransactions,
    income: monthlyIncome,
    expenses: monthlyExpenses,
    previous: previous.expenses,
  });
  const savings = savingsBadge({
    hasTransactions,
    rate: savingsRate,
    previousRate: previous.savingsRate,
    net,
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <Widget>
        <WidgetHeader title="Total Balance" action={balance.badge} />
        <WidgetContent>
          <Figure
            value={formatCurrency(totalBalance)}
            tone={totalBalance < 0 ? "text-red-600 dark:text-red-400" : undefined}
          />
          <Caption>{balance.caption}</Caption>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="sm" asChild>
              <Link href="/transaction/create">
                <ArrowUpRight className="h-4 w-4" />
                Add
              </Link>
            </Button>
            <CreateAccountDrawer>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Account
              </Button>
            </CreateAccountDrawer>
          </div>
        </WidgetContent>
      </Widget>

      <Widget>
        <WidgetHeader title="Income" action={income.badge} />
        <WidgetContent>
          <Figure value={formatCurrency(monthlyIncome)} />
          <Caption>{income.caption}</Caption>
        </WidgetContent>
      </Widget>

      <Widget>
        <WidgetHeader title="Expenses" action={expenses.badge} />
        <WidgetContent>
          <Figure value={formatCurrency(monthlyExpenses)} />
          <Caption>{expenses.caption}</Caption>
        </WidgetContent>
      </Widget>

      <Widget>
        <WidgetHeader title="Savings Rate" action={savings.badge} />
        <WidgetContent>
          <Figure
            value={savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`}
            tone={
              savingsRate !== null && savingsRate < 0
                ? "text-red-600 dark:text-red-400"
                : undefined
            }
          />
          <Caption>{savings.caption}</Caption>
        </WidgetContent>
      </Widget>
    </div>
  );
};

export default StatCards;
