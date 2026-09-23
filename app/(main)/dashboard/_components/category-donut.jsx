"use client";

import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  SERIES_COLORS,
  Widget,
  WidgetContent,
  WidgetHeader,
} from "@/components/dashboard/widget";
import { defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";

const LABELS = Object.fromEntries(
  defaultCategories.map((category) => [category.id, category.name])
);

// Four legend tiles, as in the reference. With more categories than that, the
// smallest are folded into "Other" so the grid stays even.
const LEGEND_TILES = 4;

const CategoryDonut = ({ title, rows, emptyLabel }) => {
  const { slices, tiles, total, config } = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const slices = rows.map((row, index) => ({
      key: row.category,
      name: LABELS[row.category] ?? row.category,
      value: row.amount,
      share: total > 0 ? (row.amount / total) * 100 : 0,
      fill: SERIES_COLORS[index % SERIES_COLORS.length],
    }));

    let tiles = slices;
    if (slices.length > LEGEND_TILES) {
      const rest = slices.slice(LEGEND_TILES - 1);
      tiles = [
        ...slices.slice(0, LEGEND_TILES - 1),
        {
          key: "__other",
          name: "Other",
          value: rest.reduce((sum, slice) => sum + slice.value, 0),
          share: rest.reduce((sum, slice) => sum + slice.share, 0),
          fill: "hsl(var(--muted-foreground))",
        },
      ];
    }

    const config = Object.fromEntries(
      slices.map((slice) => [slice.name, { label: slice.name, color: slice.fill }])
    );
    return { slices, tiles, total, config };
  }, [rows]);

  return (
    <Widget className="h-full">
      <WidgetHeader
        title={title}
        action={
          <span className="text-xs text-muted-foreground">This month</span>
        }
      />
      <WidgetContent className="flex flex-col gap-5">
        {slices.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="mx-auto aspect-square h-[210px]">
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
                  innerRadius={62}
                  outerRadius={96}
                  // One continuous ring, as in the reference: no padding
                  // angle and no stroke, so slices meet edge to edge.
                  paddingAngle={0}
                  strokeWidth={0}
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
                            y={viewBox.cy + 2}
                            className="fill-foreground text-xl font-bold"
                          >
                            {formatCurrency(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            total
                          </tspan>
                        </text>
                      ) : null
                    }
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-2">
              {tiles.map((tile) => (
                <div
                  key={tile.key}
                  className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tile.fill }}
                  />
                  <span className="truncate capitalize text-muted-foreground">
                    {tile.name}
                  </span>
                  <span className="ml-auto font-medium tabular-nums">
                    {tile.share.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </WidgetContent>
    </Widget>
  );
};

export default CategoryDonut;
