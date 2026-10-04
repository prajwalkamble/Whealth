// Whether a goal is keeping up with its own deadline.
//
// Its own module because both goals-client and goal-card need it, and having
// the card import it back from the client created a circular import: at module
// init paceOf was undefined, which threw during render and broke the RSC
// stream ("an unexpected response was received from the server").
//
// Straight-line pacing: by the time half the days between creation and the
// target date have passed, half the money should be there. Deterministic, and
// it is the only claim made -- nothing here predicts whether a goal will be
// met.
export const paceOf = (goal) => {
  if (goal.status === "COMPLETED" || goal.percentComplete >= 100) {
    return { label: "Complete", tone: "text-emerald-600 dark:text-emerald-400" };
  }
  if (!goal.targetDate) return { label: "No deadline", tone: "text-muted-foreground" };

  const target = new Date(goal.targetDate).getTime();
  const now = Date.now();
  if (now >= target) return { label: "Past due", tone: "text-destructive" };

  const start = new Date(goal.createdAt ?? now).getTime();
  const span = target - start;
  if (span <= 0) return { label: "On track", tone: "text-muted-foreground" };

  const expected = ((now - start) / span) * 100;
  return goal.percentComplete + 0.5 >= expected
    ? { label: "On track", tone: "text-muted-foreground" }
    : { label: "Behind", tone: "text-amber-600 dark:text-amber-400" };
};
