"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Where the spending actually went, and what moved since the period before.
//
// A table rather than another chart: the question here is comparison across
// many rows, which reads better as figures than as slices. Every column is
// derived from real transactions; a category with no prior spending shows
// "New" instead of a percentage against zero.
const Change = ({ value, previousAmount }) => {
  if (value === null) {
    return (
      <span className="text-xs text-muted-foreground">
        {previousAmount === 0 ? "New" : "—"}
      </span>
    );
  }

  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1 tabular-nums",
        // Spending up is the unwelcome direction. The arrow and the sign carry
        // it too, so colour is not the only signal.
        flat ? "text-muted-foreground" : up ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {flat ? "0%" : `${up ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
};

const CategoryTable = ({ rows, categoryName, periodLabel, previousLabel, hasPriorData }) => {
  const spending = rows.filter((r) => r.amount > 0 || r.previousAmount > 0);

  return (
    <section className="rounded-xl border bg-card" aria-labelledby="categories-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2 p-4">
        <h2 id="categories-heading" className="text-sm font-semibold">
          Spending by category
        </h2>
        <p className="text-xs text-muted-foreground">
          {periodLabel}
          {hasPriorData ? ` compared with ${previousLabel}` : " · no prior period to compare"}
        </p>
      </div>

      {spending.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-muted-foreground">
          No spending in this period.
        </p>
      ) : (
        // Scrolls sideways only on a narrow screen; a comparison whose columns
        // wrap stops being a comparison.
        <div className="overflow-x-auto">
          <Table className="min-w-[34rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">{previousLabel}</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spending.map((row) => (
                <TableRow key={row.category}>
                  <TableCell className="font-medium">
                    {categoryName(row.category)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.share.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(row.previousAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Change value={row.changePercent} previousAmount={row.previousAmount} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
};

export default CategoryTable;
