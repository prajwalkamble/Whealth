"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { addContribution, deleteContribution } from "@/actions/goals";
import { getGoalContributionsAction } from "@/actions/goals-read";
import { formatCurrency } from "@/lib/format";
import { APP_TIME_ZONE } from "@/lib/time";

const today = () => new Date().toISOString().slice(0, 10);

const dateLabel = (iso) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));

// Records a contribution and shows the ones already recorded. The history is
// real rows, not a derived guess -- if there are none, it says so rather than
// drawing an empty chart.
const ContributionDrawer = ({ goal, onOpenChange, onSaved }) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!goal) return;
    setAmount("");
    setDate(today());
    setNote("");
    setLoading(true);
    getGoalContributionsAction(goal.id).then((result) => {
      setHistory(result?.success ? result.data : []);
      setLoading(false);
    });
  }, [goal]);

  const reload = () =>
    getGoalContributionsAction(goal.id).then((result) =>
      setHistory(result?.success ? result.data : [])
    );

  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await addContribution(goal.id, { amount, date, note });
      if (result?.success) {
        toast.success("Contribution added");
        setAmount("");
        setNote("");
        await reload();
        onSaved?.();
        return;
      }
      toast.error(result?.error ?? "Could not add the contribution");
    });
  };

  const remove = (id) =>
    startTransition(async () => {
      const result = await deleteContribution(id);
      if (result?.success) {
        toast.success("Contribution removed");
        await reload();
        onSaved?.();
        return;
      }
      toast.error(result?.error ?? "Could not remove the contribution");
    });

  return (
    <Drawer open={Boolean(goal)} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Add to {goal?.name}</DrawerTitle>
            <DrawerDescription>
              {goal &&
                `${formatCurrency(goal.saved)} of ${formatCurrency(goal.targetAmount)} so far.`}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={submit} className="space-y-4 px-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="contrib-amount" className="text-sm font-medium">
                  Amount
                </label>
                <Input
                  id="contrib-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contrib-date" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="contrib-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contrib-note" className="text-sm font-medium">
                Note
              </label>
              <Input
                id="contrib-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving…" : "Add contribution"}
            </Button>
          </form>

          <section className="px-4 pb-4 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </h3>
            {loading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
            ) : history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing recorded yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y">
                {history.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular-nums">
                        {formatCurrency(row.amount)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {dateLabel(row.date)}
                        {row.note && ` · ${row.note}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(row.id)}
                      disabled={pending}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DrawerFooter className="flex-row justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ContributionDrawer;
