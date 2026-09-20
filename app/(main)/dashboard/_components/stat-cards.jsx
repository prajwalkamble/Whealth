import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

// Percentage change against last month. Null when last month was zero: every
// first month would otherwise read "+100%", which says nothing.
const change = (current, previous) => {
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

// A rise in expenses is not good news, so each card says which way is up.
const Trend = ({ value, goodWhenUp = true, suffix = "vs last month" }) => {
  if (value === null) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No comparison for last month
      </p>
    );
  }

  const flat = Math.abs(value) < 0.05;
  const good = flat || (value > 0) === goodWhenUp;
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-medium",
        flat
          ? "text-muted-foreground"
          : good
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? "No change" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
      <span className="font-normal text-muted-foreground">{suffix}</span>
    </p>
  );
};

const StatCards = ({ summary }) => {
  const {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    net,
    previous,
  } = summary;

  const savingsDelta =
    savingsRate === null || previous.savingsRate === null
      ? null
      : savingsRate - previous.savingsRate;

  const cards = [
    {
      label: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: Wallet,
      tone: totalBalance < 0 ? "text-red-600 dark:text-red-400" : undefined,
      footer: (
        <p className="mt-1 text-xs text-muted-foreground">
          {net === 0
            ? "No movement this month"
            : `${net > 0 ? "Up" : "Down"} ${formatCurrency(Math.abs(net))} this month`}
        </p>
      ),
    },
    {
      label: "Income",
      value: formatCurrency(monthlyIncome),
      icon: ArrowUpRight,
      tone: "text-green-600 dark:text-green-400",
      footer: <Trend value={change(monthlyIncome, previous.income)} />,
    },
    {
      label: "Expenses",
      value: formatCurrency(monthlyExpenses),
      icon: ArrowDownRight,
      tone: "text-red-600 dark:text-red-400",
      footer: (
        <Trend
          value={change(monthlyExpenses, previous.expenses)}
          goodWhenUp={false}
        />
      ),
    },
    {
      label: "Savings Rate",
      value: savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`,
      icon: PiggyBank,
      tone:
        savingsRate !== null && savingsRate < 0
          ? "text-red-600 dark:text-red-400"
          : undefined,
      footer:
        savingsRate === null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            No income recorded this month
          </p>
        ) : savingsDelta === null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Of this month&apos;s income
          </p>
        ) : (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              Math.abs(savingsDelta) < 0.05
                ? "text-muted-foreground"
                : savingsDelta > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
            )}
          >
            {savingsDelta > 0 ? "+" : ""}
            {savingsDelta.toFixed(1)} points{" "}
            <span className="font-normal text-muted-foreground">
              vs last month
            </span>
          </p>
        ),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone, footer }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <span className="rounded-md bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold tracking-tight", tone)}>
              {value}
            </div>
            {footer}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatCards;
