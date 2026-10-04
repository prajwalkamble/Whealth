"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { deleteBudgetEntry } from "@/actions/budget";
import { defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import BudgetForm from "./budget-form";
import BudgetRow from "./budget-row";
import Attention from "./attention";
import { attentionItems, NEAR_LIMIT_PERCENT } from "@/lib/budget-pace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_NAME = new Map(defaultCategories.map((c) => [c.id, c.name]));

const BudgetsClient = ({ data, period, options }) => {
  const { budgets, progress, period: periodInfo, totals } = data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [, startTransition] = useTransition();

  const { overall, categories, takenCategories } = useMemo(() => {
    const overall = budgets.find((b) => b.category === null) ?? null;
    const categories = budgets.filter((b) => b.category !== null);
    return {
      overall,
      categories,
      takenCategories: categories.map((b) => b.category),
    };
  }, [budgets]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    const budget = confirming;
    setConfirming(null);
    startTransition(async () => {
      const result = await deleteBudgetEntry(budget.id);
      if (result?.success) {
        toast.success("Budget removed");
        router.refresh();
        return;
      }
      toast.error(result?.error ?? "Could not remove the budget");
    });
  };

  const label = (budget) =>
    budget.category === null
      ? "Overall monthly budget"
      : CATEGORY_NAME.get(budget.category) ?? budget.category;

  const attention = useMemo(
    () => attentionItems(budgets, (b) => label(b)),
    // label is derived from the same CATEGORY_NAME map on every render.
    [budgets] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setPeriod = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "current") params.delete("period");
    else params.set("period", next);
    router.replace(`/budgets?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Plan your spending, track your progress, and stay in control.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[11rem]" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">{options.current} (current)</SelectItem>
              <SelectItem value="previous">{options.previous}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Set a budget
          </Button>
        </div>
      </div>

      {budgets.length > 0 && (
        <>
          {/* Level 1: the overall position, in one divided strip. Totals use
              the overall budget when one exists, because it already covers
              every category -- adding it to the category budgets would count
              the same spending twice. */}
          <section
            aria-label={`Budget summary for ${periodInfo.label}`}
            className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4"
          >
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Total budget</p>
              <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">
                {formatCurrency(totals.budgeted)}
              </p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">
                {formatCurrency(totals.spent)}
              </p>
              {/* Spending less than last period is the good direction, so down
                  is green and up is red. The arrow and sign carry it too, so
                  the meaning does not rest on colour alone. */}
              {totals.spendChangePercent === null ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No prior spending
                </p>
              ) : (
                <p
                  className={cn(
                    "mt-0.5 inline-flex items-center gap-1 text-xs tabular-nums",
                    Math.abs(totals.spendChangePercent) < 0.05
                      ? "text-muted-foreground"
                      : totals.spendChangePercent > 0
                        ? "text-destructive"
                        : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {Math.abs(totals.spendChangePercent) >= 0.05 &&
                    (totals.spendChangePercent > 0 ? (
                      <ArrowUp aria-hidden className="h-3 w-3" />
                    ) : (
                      <ArrowDown aria-hidden className="h-3 w-3" />
                    ))}
                  {totals.spendChangePercent > 0 ? "+" : ""}
                  {totals.spendChangePercent.toFixed(1)}% vs {periodInfo.previousLabel}
                </p>
              )}
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {totals.remaining < 0 ? "Over budget" : "Remaining"}
              </p>
              {/* Red only when it has actually gone negative. A positive
                  remaining is the ordinary case and needs no colour. */}
              <p
                className={cn(
                  "mt-1 text-xl font-bold tabular-nums tracking-tight",
                  totals.remaining < 0 && "text-destructive"
                )}
              >
                {formatCurrency(Math.abs(totals.remaining))}
              </p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Utilisation</p>
              <p
                className={cn(
                  "mt-1 text-xl font-bold tabular-nums tracking-tight",
                  totals.percentUsed !== null &&
                    totals.percentUsed > 100 &&
                    "text-destructive",
                  totals.percentUsed !== null &&
                    totals.percentUsed >= NEAR_LIMIT_PERCENT &&
                    totals.percentUsed <= 100 &&
                    "text-amber-600 dark:text-amber-400"
                )}
              >
                {totals.percentUsed === null
                  ? "Not available"
                  : `${totals.percentUsed.toFixed(1)}%`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {progress.daysElapsed} of {progress.totalDays} days elapsed
                {progress.daysRemaining > 0 && ` · ${progress.daysRemaining} left`}
              </p>
            </div>
          </section>

          {/* Level 2: only what is actually true, and nothing if all is well. */}
          <Attention items={attention} />
        </>
      )}

      {budgets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <PiggyBank aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">No budgets yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Set a monthly limit and WHealthOS will track it against what you
            actually spend. Start with an overall limit, or budget a single
            category like groceries.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Set your first budget
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {overall && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overall
              </h2>
              <BudgetRow
                budget={overall}
                label={label(overall)}
                periodLabel={periodInfo.label}
                previousLabel={periodInfo.previousLabel}
                onEdit={(b) => {
                  setEditing(b);
                  setFormOpen(true);
                }}
                onDelete={setConfirming}
              />
            </section>
          )}

          {categories.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                By category
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((budget) => (
                  <li key={budget.id}>
                    <BudgetRow
                      budget={budget}
                      label={label(budget)}
                      periodLabel={periodInfo.label}
                      previousLabel={periodInfo.previousLabel}
                      onEdit={(b) => {
                        setEditing(b);
                        setFormOpen(true);
                      }}
                      onDelete={setConfirming}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        budget={editing}
        // The overall budget and any category already budgeted are excluded,
        // so the form cannot be used to create a duplicate the database would
        // then reject.
        takenCategories={takenCategories}
        hasOverall={Boolean(overall)}
        onSaved={() => router.refresh()}
      />

      <Drawer
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Remove this budget?</DrawerTitle>
              <DrawerDescription>
                {confirming && label(confirming)} will no longer be tracked.
                Your transactions are not affected.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Remove
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default BudgetsClient;
