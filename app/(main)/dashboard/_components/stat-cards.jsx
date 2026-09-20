import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Wallet,
} from "lucide-react";

const StatCards = ({ summary }) => {
  const { totalBalance, monthlyIncome, monthlyExpenses, savingsRate } = summary;

  const cards = [
    {
      label: "Total Balance",
      value: formatCurrency(totalBalance),
      hint: "Across all accounts",
      icon: Wallet,
      tone: totalBalance < 0 ? "text-red-600 dark:text-red-400" : undefined,
    },
    {
      label: "Income",
      value: formatCurrency(monthlyIncome),
      hint: "This month",
      icon: ArrowUpRight,
      tone: "text-green-600 dark:text-green-400",
    },
    {
      label: "Expenses",
      value: formatCurrency(monthlyExpenses),
      hint: "This month",
      icon: ArrowDownRight,
      tone: "text-red-600 dark:text-red-400",
    },
    {
      label: "Savings Rate",
      value: savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`,
      hint:
        savingsRate === null
          ? "No income recorded this month"
          : "Of this month's income",
      icon: PiggyBank,
      tone:
        savingsRate !== null && savingsRate < 0
          ? "text-red-600 dark:text-red-400"
          : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, hint, icon: Icon, tone }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", tone)}>{value}</div>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatCards;
