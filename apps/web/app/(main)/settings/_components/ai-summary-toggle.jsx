"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setMonthlyInsights } from "@/actions/preferences";

// The switch that decides whether this account's monthly totals are sent to
// an external AI model.
//
// Optimistic, with a rollback: the control is a privacy setting, so it has to
// show what the server actually holds. If the save fails it goes back to what
// it was and says so, rather than leaving someone believing they had turned
// the model off.
// Static ids. A useId() value must never reach rendered markup in this repo:
// it encodes the component's position in the tree, and the server and the
// client have disagreed about that before. One of these renders per page.
const LABEL_ID = "monthly-insights-label";
const DESCRIPTION_ID = "monthly-insights-description";

const AiSummaryToggle = ({ enabled }) => {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  const change = (next) => {
    const previous = on;
    setOn(next);

    startTransition(async () => {
      const result = await setMonthlyInsights(next);
      if (result?.success) {
        toast.success(
          next
            ? "Your monthly summary will include AI commentary."
            : "Your figures will no longer be sent to an AI model."
        );
        return;
      }
      setOn(previous);
      toast.error(result?.error ?? "That didn't save. Please try again.");
    });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        {/* A span with aria-labelledby, not <label htmlFor>. Radix renders the
            switch as a <button role="switch">, which a <label> does not
            reliably name, and an aria-label alongside it would have hidden
            this text from a screen reader in favour of a duplicate of it. */}
        <span
          id={LABEL_ID}
          className="block text-sm font-medium leading-none"
        >
          AI commentary in the monthly summary
        </span>
        <p id={DESCRIPTION_ID} className="text-sm text-muted-foreground">
          Writing it sends that month&apos;s totals by category to an external
          AI provider. Turn it off and your summary email still arrives, with
          the same figures and no commentary — and nothing from your account
          is sent to a model on a schedule.
        </p>
      </div>
      <Switch
        id="monthly-insights"
        checked={on}
        disabled={pending}
        onCheckedChange={change}
        aria-labelledby={LABEL_ID}
        aria-describedby={DESCRIPTION_ID}
      />
    </div>
  );
};

export default AiSummaryToggle;
