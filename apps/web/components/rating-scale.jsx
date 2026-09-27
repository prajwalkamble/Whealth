"use client";

import { toast } from "sonner";
import { submitRating } from "@/actions/rating";
import useFetch from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";

const SCORES = [1, 2, 3, 4, 5];

// The one rating control. It used to exist twice -- stars on the settings page
// and numbers in the feedback widget -- which meant two copies of the same
// submit handling and two different answers to "how do I rate this app?".
//
// `rating` and `onRated` are owned by the caller: the widget's copy unmounts
// whenever its panel closes, so state held here was reset to whatever the page
// was server-rendered with, and a rating given a moment earlier came back as
// the old one.
const RatingScale = ({ rating, onRated, onDone }) => {
  const { loading, fn: rate } = useFetch(submitRating);

  const choose = async (score) => {
    if (loading) return;
    const result = await rate(score);
    // On failure useFetch has already raised the toast.
    if (result?.success) {
      onRated(result.data.score);
      toast.success("Thank you for rating WHealthOS.");
      onDone?.();
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        How would you rate WHealthOS overall, from 1 (poor) to 5 (excellent)?
      </p>

      <div
        role="radiogroup"
        aria-label="Rate WHealthOS from 1 to 5"
        className="grid grid-cols-5 gap-2"
      >
        {SCORES.map((score) => {
          const selected = (rating ?? 0) === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={loading}
              onClick={() => choose(score)}
              className={cn(
                "flex h-14 items-center justify-center rounded-lg border text-lg font-semibold tabular-nums transition-colors",
                "hover:border-primary hover:bg-accent disabled:cursor-wait",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              {score}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 — Poor</span>
        <span>5 — Excellent</span>
      </div>

      {rating > 0 && (
        <p className="text-sm text-muted-foreground">
          Your current rating is {rating} of 5. Select another to change it.
        </p>
      )}
    </div>
  );
};

export default RatingScale;
