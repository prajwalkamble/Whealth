import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SERIES_COLORS,
  StatusBadge,
  TrendBadge,
  Widget,
  WidgetContent,
  WidgetHeader,
  percentChange,
} from "@/components/dashboard/widget";
import { categoryColors, defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";

const LABELS = Object.fromEntries(
  defaultCategories.map((category) => [category.id, category.name])
);

// This month's income by category: the total, how it compares with last
// month, a segmented bar of the split, and the categories ranked.
const IncomeSources = ({ rows, total, previousTotal }) => {
  const slices = rows.map((row, index) => ({
    ...row,
    label: LABELS[row.category] ?? row.category,
    share: total > 0 ? (row.amount / total) * 100 : 0,
    // Each income category keeps its own colour -- Salary green, Freelance
    // cyan, Investments indigo, Business pink, Rental amber, Other slate --
    // so a segment is recognisable at a glance in the bar and the list.
    color:
      categoryColors[row.category] ?? SERIES_COLORS[index % SERIES_COLORS.length],
  }));

  return (
    <Widget className="h-full">
      <WidgetHeader
        title="Income Sources"
        action={
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/transactions" aria-label="All transactions">
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <WidgetContent className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {formatCurrency(total)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {previousTotal ? (
              <>
                <TrendBadge value={percentChange(total, previousTotal)} />
                compared to last month
              </>
            ) : total > 0 ? (
              <>
                <StatusBadge>First month</StatusBadge>
                nothing last month to compare with
              </>
            ) : (
              "nothing recorded yet this month"
            )}
          </div>
        </div>

        {slices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No income recorded this month
          </p>
        ) : (
          <>
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
              {slices.map((slice) => (
                <div
                  key={slice.category}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${Math.max(slice.share, 1.5)}%`,
                    backgroundColor: slice.color,
                  }}
                  title={`${slice.label}: ${slice.share.toFixed(0)}%`}
                />
              ))}
            </div>

            <ul className="space-y-3">
              {slices.slice(0, 5).map((slice) => (
                <li
                  key={slice.category}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate capitalize">{slice.label}</span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatCurrency(slice.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </WidgetContent>
    </Widget>
  );
};

export default IncomeSources;
