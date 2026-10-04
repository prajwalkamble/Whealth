"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { saveBudgetEntry } from "@/actions/budget";
import { defaultCategories } from "@/data/categories";

const EXPENSE_CATEGORIES = defaultCategories.filter((c) => c.type === "EXPENSE");
const OVERALL = "__overall__";

// One drawer for setting and editing. The action upserts on (user, category),
// so editing an existing budget and creating a new one are the same write.
const BudgetForm = ({
  open,
  onOpenChange,
  budget,
  takenCategories,
  hasOverall,
  onSaved,
}) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(OVERALL);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setAmount(budget ? String(budget.amount) : "");
    setCategory(budget ? (budget.category ?? OVERALL) : OVERALL);
  }, [open, budget]);

  // While editing, the budget's own category stays selectable; the rest of the
  // already-budgeted ones are hidden so the form cannot build a duplicate the
  // database would reject.
  const available = EXPENSE_CATEGORIES.filter(
    (c) => !takenCategories.includes(c.id) || c.id === budget?.category
  );
  const overallSelectable = !hasOverall || budget?.category === null;

  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveBudgetEntry({
        amount,
        category: category === OVERALL ? null : category,
      });

      if (result?.success) {
        toast.success("Budget saved");
        onOpenChange(false);
        onSaved?.();
        return;
      }
      toast.error(result?.error ?? "Could not save the budget");
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>{budget ? "Edit budget" : "Set a budget"}</DrawerTitle>
            <DrawerDescription>
              Spending is measured against this limit from your real
              transactions, for the current month.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={submit} className="space-y-4 px-4 pb-6">
            <div className="space-y-1.5">
              <label htmlFor="budget-category" className="text-sm font-medium">
                Applies to
              </label>
              <Select
                value={category}
                onValueChange={setCategory}
                // Editing never changes what a budget applies to: that would
                // silently move the limit onto different spending.
                disabled={Boolean(budget)}
              >
                <SelectTrigger id="budget-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {overallSelectable && (
                    <SelectItem value={OVERALL}>All spending</SelectItem>
                  )}
                  {available.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="budget-amount" className="text-sm font-medium">
                Monthly limit
              </label>
              <Input
                id="budget-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                autoComplete="off"
              />
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save budget"}
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default BudgetForm;
