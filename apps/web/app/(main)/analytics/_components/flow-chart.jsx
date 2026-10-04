"use client";

// ComposedChart, not BarChart: a BarChart will not render a Line child.
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { monthName } from "@/lib/time";

// Same tokens as the dashboard's chart, so the two pages agree visually. What
// differs is the job: this one spans the whole selected range with a labelled
// value axis and a net line over the bars, because the question here is how
// the shape changes rather than what this month came to.
const CONFIG = {
  income: { label: "Income", color: "hsl(var(--chart-1))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-4))" },
  net: { label: "Net", color: "hsl(var(--chart-2))" },
};

const FlowChart = ({ flow }) => {
  const data = flow.map((row) => ({
    ...row,
    label: monthName(row.year, row.month).slice(0, 3),
  }));

  // A flat series would render as a meaningless straight line.
  const hasMovement = data.some((d) => d.income > 0 || d.expenses > 0);

  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="flow-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="flow-heading" className="text-sm font-semibold">
          Income and expenses over time
        </h2>
        <p className="text-xs text-muted-foreground">
          {data.length} month{data.length === 1 ? "" : "s"}, net shown as a line
        </p>
      </div>

      {!hasMovement ? (
        <p className="py-14 text-center text-sm text-muted-foreground">
          No activity in this range.
        </p>
      ) : (
        <ChartContainer config={CONFIG} className="mt-4 h-[280px] w-full">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            {/* A labelled value axis is the point of an analytical chart: the
                dashboard's version omits it because it only needs shape. */}
            <YAxis
              tickLine={false}
              axisLine={false}
              width={62}
              tickFormatter={(v) => formatCompactCurrency(v)}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--color-net)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </section>
  );
};

export default FlowChart;
