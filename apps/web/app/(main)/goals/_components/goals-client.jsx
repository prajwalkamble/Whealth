"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/format";
import { deleteGoal, setGoalStatus } from "@/actions/goals";
import GoalCard from "./goal-card";
import { paceOf } from "./pace";
import GoalForm from "./goal-form";
import ContributionDrawer from "./contribution-drawer";

const Metric = ({ label, value, hint }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const GoalsClient = ({ goals }) => {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [, startTransition] = useTransition();

  const { active, done, totals } = useMemo(() => {
    const active = goals.filter((g) => g.status === "ACTIVE");
    const done = goals.filter((g) => g.status !== "ACTIVE");
    return {
      active,
      done,
      totals: {
        target: active.reduce((s, g) => s + g.targetAmount, 0),
        saved: active.reduce((s, g) => s + g.saved, 0),
        onTrack: active.filter((g) => paceOf(g).label === "On track").length,
      },
    };
  }, [goals]);

  const refresh = () => router.refresh();

  const run = (fn, ok, fail) =>
    startTransition(async () => {
      const result = await fn();
      if (result?.success) {
        toast.success(ok);
        refresh();
        return;
      }
      toast.error(result?.error ?? fail);
    });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set what you are saving toward and track what you have put aside.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Target aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">No goals yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            A goal is an amount you are working toward, like an emergency fund
            or a deposit. Record what you put aside and WHealthOS tracks how far
            along you are.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create your first goal
          </Button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Active goals" value={active.length} />
              <Metric label="Total target" value={formatCurrency(totals.target)} />
              <Metric
                label="Put aside"
                value={formatCurrency(totals.saved)}
                hint={
                  totals.target > 0
                    ? `${Math.round((totals.saved / totals.target) * 100)}% of target`
                    : undefined
                }
              />
              <Metric
                label="On track"
                value={`${totals.onTrack} of ${active.length}`}
                hint="Against their own deadlines"
              />
            </div>
          )}

          {active.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((goal) => (
                <li key={goal.id}>
                  <GoalCard
                    goal={goal}
                    onEdit={(g) => {
                      setEditing(g);
                      setFormOpen(true);
                    }}
                    onContribute={setContributing}
                    onComplete={(g) =>
                      run(
                        () => setGoalStatus(g.id, "COMPLETED"),
                        "Goal marked complete",
                        "Could not update the goal"
                      )
                    }
                    onArchive={(g) =>
                      run(
                        () => setGoalStatus(g.id, "ARCHIVED"),
                        "Goal archived",
                        "Could not archive the goal"
                      )
                    }
                    onDelete={setConfirming}
                  />
                </li>
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed and archived
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {done.map((goal) => (
                  <li key={goal.id}>
                    <GoalCard
                      goal={goal}
                      onEdit={(g) => {
                        setEditing(g);
                        setFormOpen(true);
                      }}
                      onContribute={setContributing}
                      onComplete={(g) =>
                        run(
                          () => setGoalStatus(g.id, "ACTIVE"),
                          "Goal reopened",
                          "Could not update the goal"
                        )
                      }
                      onArchive={(g) =>
                        run(
                          () => setGoalStatus(g.id, "ACTIVE"),
                          "Goal restored",
                          "Could not restore the goal"
                        )
                      }
                      onDelete={setConfirming}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        onSaved={refresh}
      />

      <ContributionDrawer
        goal={contributing}
        onOpenChange={(open) => !open && setContributing(null)}
        onSaved={refresh}
      />

      <Drawer
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Delete this goal?</DrawerTitle>
              <DrawerDescription>
                {confirming?.name} and its{" "}
                {confirming?.contributions ?? 0} recorded contribution
                {confirming?.contributions === 1 ? "" : "s"} will be removed.
                Archiving keeps the record instead.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const goal = confirming;
                  setConfirming(null);
                  run(
                    () => deleteGoal(goal.id),
                    "Goal deleted",
                    "Could not delete the goal"
                  );
                }}
              >
                Delete
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default GoalsClient;
