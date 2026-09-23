"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import { format, parseISO, subDays } from 'date-fns';
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const DATE_RANGES = {
  "7D": { label: "Last 7 Days", days: 7 },
  "1M": { label: "Last Month", days: 30 },
  "3M": { label: "Last 3 Months", days: 90 },
  "6M": { label: "Last 6 Months", days: 180 },
  ALL: { label: "All Time", days: null },
};

// Both series come from the chosen chart ramp, so the Chart Colors setting
// reaches every chart. Income takes the strongest shade and expense a pale
// one, the same strong/pale pairing the reference uses, so the two are easy
// to tell apart in every ramp and in both themes.
const CHART_CONFIG = {
  income: { label: "Income", color: "hsl(var(--chart-1))" },
  expense: { label: "Expense", color: "hsl(var(--chart-4))" },
};

// dailyTotals: [{ day: "2026-09-14", income, expense }], one row per day with
// activity, summed by the database over the account's whole history. The
// chart used to be drawn from the transaction table's rows, which stop at
// the most recent 500, so "All Time" and its totals were silently incomplete.
export function AccountChart ({ dailyTotals }) {
  const [dateRange, setDateRange] = useState("1M");

  const filteredData = useMemo(() => {
    const range = DATE_RANGES[dateRange];
    const now = new Date();
    // yyyy-MM-dd strings compare correctly as plain strings.
    const today = format(now, "yyyy-MM-dd");
    const firstDay = range.days
      ? format(subDays(now, range.days), "yyyy-MM-dd")
      : null;
    // Ranges longer than a year need the year to tell the bars apart.
    const label = range.days ? "MMM dd" : "MMM dd ''yy";

    return dailyTotals
      .filter(({ day }) => (!firstDay || day >= firstDay) && day <= today)
      .map(({ day, income, expense }) => ({
        key: day,
        date: format(parseISO(day), label),
        income,
        expense,
      }));
  }, [dailyTotals, dateRange]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, day) => ({
        income: acc.income + day.income,
        expense: acc.expense + day.expense,
      }),
      { income: 0, expense: 0 }
    );
  }, [filteredData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-base font-normal">
          Transaction Overview
        </CardTitle>
        <Select defaultValue={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select Range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGES).map(([key, { label }]) => {
              return (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around mb-6 text-sm">
          <div className="text-center">
            <p className="text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totals.expense)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Net Balance</p>
            <p
              className={`text-lg font-bold ${
                totals.income - totals.expense >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(totals.income - totals.expense)}
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No transactions in this range
          </p>
        ) : (
          <ChartContainer config={CHART_CONFIG} className="h-[300px] w-full">
            <BarChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactCurrency}
              />
              {/* Sums of paise amounts are floats: 1234.5600000000002. */}
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
              <Bar
                dataKey="income"
                name="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="var(--color-expense)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
