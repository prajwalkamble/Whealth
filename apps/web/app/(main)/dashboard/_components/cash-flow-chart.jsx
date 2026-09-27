"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Widget,
  WidgetContent,
  WidgetFooter,
  WidgetHeader,
} from "@/components/dashboard/widget";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

// Both series come from the chosen chart ramp, so the Chart Colors setting
// reaches every chart. Income takes the strongest shade and expense a pale
// one, the same strong/pale pairing the reference uses, so the two are easy
// to tell apart in every ramp and in both themes.
const CHART_CONFIG = {
  income: { label: "Income", color: "hsl(var(--chart-1))" },
  expense: { label: "Expense", color: "hsl(var(--chart-4))" },
};

const VIEWS = [
  { value: "bars", label: "Bars" },
  { value: "flow", label: "Flow" },
];

const tooltip = (
  <ChartTooltip
    cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
    content={
      <ChartTooltipContent
        formatter={(value, name) => [
          formatCurrency(value),
          CHART_CONFIG[name]?.label ?? name,
        ]}
      />
    }
  />
);

// Charts here carry no grid and no value axis, as in the reference: the
// tooltip gives exact figures, and the bars read cleaner without the scaffold.
const axis = (
  <XAxis
    dataKey="label"
    tickLine={false}
    axisLine={false}
    tickMargin={10}
    fontSize={12}
  />
);

const Legend = () => (
  <div className="flex items-center gap-4 text-xs text-muted-foreground">
    {Object.entries(CHART_CONFIG).map(([key, { label, color }]) => (
      <span key={key} className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
    ))}
  </div>
);

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

    // This month's net against the previous one, which the footer reports.
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
    <Widget className="h-full">
      <WidgetHeader
        title="Cash Flow"
        action={
          <div className="flex rounded-md border p-0.5">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  view === option.value
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <WidgetContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Net, last {months.length} months</p>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight tabular-nums",
                net < 0 && "text-red-600 dark:text-red-400"
              )}
            >
              {formatCurrency(net)}
            </p>
          </div>
          <Legend />
        </div>

        <ChartContainer config={CHART_CONFIG} className="h-[220px] w-full">
          {view === "bars" ? (
            <BarChart data={months} margin={{ top: 4, right: 0, left: 0 }} barGap={4}>
              {axis}
              {tooltip}
              <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={months} margin={{ top: 4, right: 4, left: 4 }}>
              <defs>
                {["income", "expense"].map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              {axis}
              {tooltip}
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
      </WidgetContent>

      <WidgetFooter className="space-y-0.5">
        <p className="flex items-center gap-1.5 font-medium">
          {trend === null ? (
            "Not enough history to compare yet"
          ) : (
            <>
              Trending {trend >= 0 ? "up" : "down"} by {Math.abs(trend).toFixed(1)}% this month
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Income {formatCurrency(totals.income)} · Expenses {formatCurrency(totals.expense)}
        </p>
      </WidgetFooter>
    </Widget>
  );
};

export default CashFlowChart;
