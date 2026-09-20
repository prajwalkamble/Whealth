"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

// Income and expense keep their own colours in every palette: green and red
// mean something here, unlike the category colours elsewhere.
const CHART_CONFIG = {
  income: { label: "Income", color: "hsl(142 71% 45%)" },
  expense: { label: "Expense", color: "hsl(0 72% 51%)" },
};

const VIEWS = [
  { value: "bars", label: "Bars" },
  { value: "flow", label: "Flow" },
];

const CashFlowChart = ({ months }) => {
  const [view, setView] = useState("bars");

  const { totals, trend } = useMemo(() => {
    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expense: acc.expense + m.expense,
      }),
      { income: 0, expense: 0 }
    );

    // This month's net against the previous one, which is what the caption
    // above the chart reports.
    const [previous, current] = months.slice(-2);
    const net = (m) => (m ? m.income - m.expense : 0);
    const trend =
      months.length < 2 || net(previous) === 0
        ? null
        : ((net(current) - net(previous)) / Math.abs(net(previous))) * 100;

    return { totals, trend };
  }, [months]);

  const net = totals.income - totals.expense;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>Last {months.length} months</span>
            {trend !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  trend >= 0
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend > 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            )}
          </CardDescription>
        </div>

        <div className="flex rounded-md border p-0.5">
          {VIEWS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={view === option.value ? "secondary" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setView(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Income</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Expenses</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(totals.expense)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Net</p>
            <p
              className={cn(
                "text-lg font-semibold",
                net >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {formatCurrency(net)}
            </p>
          </div>
        </div>

        <ChartContainer config={CHART_CONFIG} className="h-[280px] w-full">
          {view === "bars" ? (
            <BarChart data={months} margin={{ top: 8, right: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={formatCompactCurrency}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      formatCurrency(value),
                      CHART_CONFIG[name]?.label ?? name,
                    ]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={months} margin={{ top: 8, right: 8, left: 8 }}>
              <defs>
                {["income", "expense"].map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={formatCompactCurrency}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      formatCurrency(value),
                      CHART_CONFIG[name]?.label ?? name,
                    ]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="income"
                type="monotone"
                stroke="var(--color-income)"
                fill="url(#fill-income)"
                strokeWidth={2}
              />
              <Area
                dataKey="expense"
                type="monotone"
                stroke="var(--color-expense)"
                fill="url(#fill-expense)"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CashFlowChart;
