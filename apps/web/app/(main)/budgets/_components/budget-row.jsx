"use client";

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, MoreHorizontal, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Status is a word and an icon as well as a colour, so it survives greyscale,
// a screen reader, and colour-blindness. The logic itself lives in
// lib/budget-pace.js; this only renders it.
const STATUS = {
  exceeded: { icon: AlertTriangle, className: "text-destructive" },
  "at-risk": { icon: AlertTriangle, className: "text-destructive" },
  watch: { icon: TrendingUp, className: "text-amber-600 dark:text-amber-400" },
  "on-track": { icon: CheckCircle2, className: "text-muted-foreground" },
};

const BudgetRow = ({ budget, label, periodLabel, previousLabel, onEdit, onDelete }) => {
  const { pace } = budget;
  const status = STATUS[pace.status.id] ?? STATUS["on-track"];
  const StatusIcon = status.icon;
  const over = pace.remaining < 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* break-words: a long category name must wrap rather than push
                the menu off the card. */}
            <h3 className="break-words text-sm font-semibold">{label}</h3>
            <p className={cn("mt-0.5 inline-flex items-center gap-1.5 text-xs", status.className)}>
              <StatusIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {pace.status.label}
              <span className="text-muted-foreground">
                · {budget.transactions} transaction{budget.transactions === 1 ? "" : "s"}
              </span>
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={`Actions for ${label}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(budget)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(budget)}>
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {formatCurrency(budget.spent)}
          </p>
          <p className="text-sm tabular-nums text-muted-foreground">
            of {formatCurrency(budget.amount)}
          </p>
        </div>

        {/* Capped so the bar cannot render past its track; the true figure is
            stated underneath in words. */}
        <Progress
          value={Math.min(pace.percentUsed, 100)}
          className="mt-3"
          aria-label={`${Math.round(pace.percentUsed)}% of ${label} used`}
        />

        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {Math.round(pace.percentUsed)}% used ·{" "}
          {over
            ? `${formatCurrency(Math.abs(pace.remaining))} over`
            : `${formatCurrency(pace.remaining)} left`}
        </p>

        <dl className="mt-4 space-y-1.5 border-t pt-3 text-xs">
          {/* Expected pace is the budget spread evenly across the month. It is
              a plan, not a prediction, and is labelled that way. */}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Expected pace</dt>
            <dd className="tabular-nums">{formatCurrency(pace.expectedPerDay)}/day</dd>
          </div>

          {pace.actualPerDay !== null && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Actual pace</dt>
              <dd
                className={cn(
                  "tabular-nums",
                  pace.actualPerDay > pace.expectedPerDay && "text-amber-600 dark:text-amber-400"
                )}
              >
                {formatCurrency(pace.actualPerDay)}/day
              </dd>
            </div>
          )}

          {pace.projected !== null && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">At this pace</dt>
              <dd className="tabular-nums">
                {formatCurrency(pace.projected)}
                {pace.projectedOverBy !== null && (
                  <span className="text-destructive">
                    {" "}
                    (+{formatCurrency(pace.projectedOverBy)})
                  </span>
                )}
              </dd>
            </div>
          )}

          {pace.remainingPerDay !== null && (
            <div className="flex justify-between gap-2">
              {/* Deliberately not "safe to spend": this accounts for nothing
                  but this budget, and the app does not model bills, income
                  timing or reserves. */}
              <dt className="text-muted-foreground">Remaining allowance</dt>
              <dd className="tabular-nums">{formatCurrency(pace.remainingPerDay)}/day</dd>
            </div>
          )}

          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">vs {previousLabel}</dt>
            <dd className="tabular-nums">
              {pace.spendChangePercent === null ? (
                <span className="text-muted-foreground">No prior spending</span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    Math.abs(pace.spendChangePercent) < 0.05
                      ? "text-muted-foreground"
                      : pace.spendChangePercent > 0
                        ? "text-destructive"
                        : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {Math.abs(pace.spendChangePercent) >= 0.05 &&
                    (pace.spendChangePercent > 0 ? (
                      <ArrowUp aria-hidden className="h-3 w-3" />
                    ) : (
                      <ArrowDown aria-hidden className="h-3 w-3" />
                    ))}
                  {pace.spendChangePercent > 0 ? "+" : ""}
                  {pace.spendChangePercent.toFixed(1)}%
                </span>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
};

export default BudgetRow;
