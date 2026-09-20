"use client";

import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { categoryColors, defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";

// Falls back to the five theme chart colours, so a category added later still
// gets one and the whole chart follows the colour scheme.
const FALLBACK = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const LABELS = Object.fromEntries(
  defaultCategories.map((category) => [category.id, category.name])
);

const CategoryDonut = ({ title, description, rows, emptyLabel }) => {
  const { slices, total, config } = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const slices = rows.map((row, index) => ({
      key: row.category,
      name: LABELS[row.category] ?? row.category,
      value: row.amount,
      share: total > 0 ? (row.amount / total) * 100 : 0,
      fill: categoryColors[row.category] ?? FALLBACK[index % FALLBACK.length],
    }));
    const config = Object.fromEntries(
      slices.map((slice) => [slice.name, { label: slice.name, color: slice.fill }])
    );
    return { slices, total, config };
  }, [rows]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <ChartContainer config={config} className="mx-auto h-[220px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, name) => [formatCurrency(value), name]}
                    />
                  }
                />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) =>
                      viewBox && "cx" in viewBox ? (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy - 6}
                            className="fill-foreground text-lg font-bold"
                          >
                            {formatCurrency(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy + 14}
                            className="fill-muted-foreground text-xs"
                          >
                            this month
                          </tspan>
                        </text>
                      ) : null
                    }
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* The reference dashboard lists each slice with its share; the
                chart alone makes small categories hard to compare. */}
            <ul className="mt-2 space-y-2">
              {slices.slice(0, 5).map((slice) => (
                <li key={slice.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <span className="truncate capitalize">{slice.name}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {slice.share.toFixed(0)}%
                  </span>
                  <span className="w-24 shrink-0 text-right font-medium">
                    {formatCurrency(slice.value)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryDonut;
