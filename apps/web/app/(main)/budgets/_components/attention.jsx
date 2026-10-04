"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Only conditions that are actually true, each one traceable to a calculation
// in lib/budget-pace.js. An empty list renders nothing at all: silence is the
// honest signal, not a reassuring card.
const TONE = {
  exceeded: { icon: AlertTriangle, className: "text-destructive" },
  "at-risk": { icon: AlertTriangle, className: "text-destructive" },
  watch: { icon: TrendingUp, className: "text-amber-600 dark:text-amber-400" },
};

const Attention = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="attention-heading"
      className="rounded-xl border bg-card p-4"
    >
      <h2 id="attention-heading" className="text-sm font-semibold">
        Needs attention
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const tone = TONE[item.tone] ?? TONE.watch;
          const Icon = tone.icon;
          return (
            <li key={item.id} className="flex items-start gap-2.5 text-sm">
              {/* The icon pairs with the wording; neither the state nor its
                  severity is carried by colour alone. */}
              <Icon aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0", tone.className)} />
              <span className="text-muted-foreground">{item.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Attention;
