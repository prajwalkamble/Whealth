"use client";

import { updateBudget } from '@/actions/budget';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Widget, WidgetContent, WidgetHeader } from '@/components/dashboard/widget';
import { Input } from '@/components/ui/input';
import useFetch from '@/hooks/use-fetch';
import { formatCurrency } from '@/lib/format';
import { Check, Pencil, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const BudgetProgress = ({ initialBudget, currentExpenses, hasAccount = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newbudget, setNewBudget] = useState(
    initialBudget?.amount?.toString() || ""
  );

  // Guard the divisor: a budget of 0 rendered as "Infinity% used".
  const percentageUsed =
    initialBudget?.amount > 0
      ? (currentExpenses / initialBudget.amount) * 100
      : 0;

  const remaining = (initialBudget?.amount ?? 0) - currentExpenses;

  // Days left in the month, so "70% used" reads against how far through the
  // month it is.
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const daysLeft = daysInMonth - today.getDate();

  const {
    loading: isLoading,
    fn: updateBudgetFn,
    data: updatedBudget,
  } = useFetch(updateBudget);

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newbudget);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    await updateBudgetFn(amount);
  };

  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);
      toast.success("Budget updated successfully");
    }
  }, [updatedBudget]);

  // No error effect here on purpose: updateBudget now throws on failure and
  // useFetch raises the only toast. A second one here would double it.

  // Keep the editor in sync when a save (or another tab) changes the budget.
  useEffect(() => {
    setNewBudget(initialBudget?.amount?.toString() || "");
  }, [initialBudget?.amount]);

  const handleCancel = () => {
    setNewBudget(initialBudget?.amount?.toString() || "");
    setIsEditing(false);
  };

  const overBudget = percentageUsed >= 100;

  // One decimal below 10%, so a small spend against a large budget still
  // reads as a number ("0.6%") rather than rounding to a flat "0%".
  const percentLabel =
    percentageUsed > 0 && percentageUsed < 10
      ? `${percentageUsed.toFixed(1)}%`
      : `${Math.round(percentageUsed)}%`;

  // At small ratios the true width is a sliver that does not read as
  // progress, so any spend at all fills at least 5%; the exact figure is in
  // the tag beside the title.
  const fillWidth =
    percentageUsed > 0 ? Math.min(Math.max(percentageUsed, 5), 100) : 0;

  // "of ₹50,000", whole rupees, as the reference prints "of $1,200".
  const wholeRupees = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);

  // The reference's Saving Goal: title with a grey progress tag, a report
  // link, a large figure with its target beside it, and a flat bar in two
  // shades -- a mid-tone fill on a pale track. Both shades are the theme
  // colour at different strengths, so the default reads as the reference's
  // greys and a chosen Theme Color tints it.
  return (
    <Widget>
      <WidgetHeader
        title={
          <>
            Monthly Budget
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-normal tabular-nums">
              {initialBudget ? `${percentLabel} Progress` : "Not set"}
            </span>
          </>
        }
        action={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/transactions">View Report</Link>
          </Button>
        }
      />
      <WidgetContent className="space-y-5 py-7">
        {isEditing ? (
          <div className="flex min-w-0 items-center gap-2">
            <Input
              type="number"
              value={newbudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="Monthly budget"
              className="min-w-0"
              autoFocus
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="shrink-0"
              onClick={handleUpdateBudget}
              disabled={isLoading}
              aria-label="Save budget"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCancel}
              disabled={isLoading}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {formatCurrency(currentExpenses)}
            </span>
            {initialBudget ? (
              <span className="text-sm text-muted-foreground tabular-nums">
                of {wholeRupees(initialBudget.amount)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                spent · no budget set
              </span>
            )}
            {hasAccount && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="ml-auto self-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={initialBudget ? "Edit budget" : "Set a budget"}
                title={initialBudget ? "Edit budget" : "Set a budget"}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div
          className="h-2.5 w-full overflow-hidden rounded-sm bg-primary/10"
          role="progressbar"
          aria-label="Budget progress"
          aria-valuenow={Math.round(percentageUsed)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full transition-all duration-500 ${
              overBudget ? "bg-red-500" : "bg-primary/55"
            }`}
            style={{ width: `${fillWidth}%` }}
          />
        </div>

        {!hasAccount && (
          <p className="text-xs text-muted-foreground">
            Add an account first; the budget tracks spending on your default
            account.
          </p>
        )}
      </WidgetContent>
    </Widget>
  );
};

export default BudgetProgress;
