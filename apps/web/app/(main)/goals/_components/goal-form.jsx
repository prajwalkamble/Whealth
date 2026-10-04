"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { createGoal, updateGoal } from "@/actions/goals";

const EMPTY = { name: "", description: "", targetAmount: "", targetDate: "" };

const Field = ({ label, htmlFor, hint, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const GoalForm = ({ open, onOpenChange, goal, onSaved }) => {
  const [values, setValues] = useState(EMPTY);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setValues(
      goal
        ? {
            name: goal.name,
            description: goal.description ?? "",
            targetAmount: String(goal.targetAmount),
            // The date input wants YYYY-MM-DD.
            targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
          }
        : EMPTY
    );
  }, [open, goal]);

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = goal
        ? await updateGoal(goal.id, values)
        : await createGoal(values);

      if (result?.success) {
        toast.success(goal ? "Goal updated" : "Goal created");
        onOpenChange(false);
        onSaved?.();
        return;
      }
      toast.error(result?.error ?? "Could not save the goal");
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>{goal ? "Edit goal" : "Create goal"}</DrawerTitle>
            <DrawerDescription>
              Progress is the total of the contributions you record against it.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={submit} className="space-y-4 px-4 pb-6">
            <Field label="Name" htmlFor="goal-name">
              <Input
                id="goal-name"
                value={values.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="Emergency fund"
                autoComplete="off"
              />
            </Field>

            <Field label="Target amount" htmlFor="goal-target">
              <Input
                id="goal-target"
                value={values.targetAmount}
                onChange={(e) => set("targetAmount")(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                autoComplete="off"
              />
            </Field>

            <Field label="Target date" htmlFor="goal-date" hint="Optional.">
              <Input
                id="goal-date"
                type="date"
                value={values.targetDate}
                onChange={(e) => set("targetDate")(e.target.value)}
              />
            </Field>

            <Field label="Description" htmlFor="goal-desc" hint="Optional.">
              <Textarea
                id="goal-desc"
                value={values.description}
                onChange={(e) => set("description")(e.target.value)}
                rows={3}
                placeholder="What this is for."
              />
            </Field>

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
                {pending ? "Saving…" : goal ? "Save changes" : "Create goal"}
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GoalForm;
