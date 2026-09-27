"use client";

import { useState } from "react";
import Link from "next/link";
import * as icons from "lucide-react";
import { Check, Info, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BILLING_PERIODS,
  FEATURE_GROUPS,
  HEADLINE_FEATURE,
  PLANS,
  YEARLY_DISCOUNT,
} from "@/data/pricing";
import { cn } from "@/lib/utils";

// Icons are named in data/pricing.js so the content stays free of imports;
// anything unrecognised falls back rather than crashing the page.
const Icon = ({ name, className }) => {
  const Component = icons[name] ?? icons.Circle;
  return <Component className={className} />;
};

// Each plan carries its own accent, rather than all three using the theme's
// primary colour. This is the marketing page: the point of the three columns
// is that they read as distinct tiers at a glance.
const ACCENTS = {
  neutral: {
    name: "text-foreground",
    button: "border bg-background text-foreground hover:bg-accent shadow-sm",
    pill: "bg-background",
    outline: "",
    badge: "",
  },
  blue: {
    name: "text-blue-600 dark:text-blue-400",
    button: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    pill: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    outline: "border-x-2 border-blue-500/50",
    badge: "bg-blue-600 text-white",
  },
  violet: {
    name: "text-violet-600 dark:text-violet-400",
    button:
      "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700",
    pill: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    outline: "",
    badge: "bg-violet-600 text-white",
  },
};

const accentOf = (plan) => ACCENTS[plan.accent] ?? ACCENTS.neutral;

// One continuous table, with a rule between each tier.
//
// The highlighted column carries its own outline on both sides, so the column
// after it must not add a left rule of its own -- with border-separate the two
// would sit side by side and read as a double line.
const columnSide = (plan, index) => {
  if (plan.popular) return "border-x-2 border-x-blue-500/50";
  const previous = PLANS[index - 1];
  return previous?.popular ? "" : "border-l border-l-border";
};

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Monthly shows the monthly price. Yearly shows what is actually charged --
// twelve months, discounted -- with the undiscounted total struck through
// beside it, so the saving is visible without spelling the sum out.
const MONTHS = 12;

export const priceFor = (plan, period) => {
  if (period === "monthly") {
    return { amount: plan.monthly, suffix: "/ month" };
  }

  const full = plan.monthly * MONTHS;
  return {
    amount: Math.round(full * (1 - YEARLY_DISCOUNT)),
    suffix: "/ year",
    // Nothing to strike through on a free plan.
    full: full > 0 ? full : null,
  };
};

const Hint = ({ children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="What this includes"
        className="text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs">
      {children}
    </TooltipContent>
  </Tooltip>
);

const Included = ({ yes }) =>
  yes ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
  );

// Flattened up front so the last row is knowable: the highlighted column's
// outline needs to close off at the bottom, which means identifying the final
// cell rather than guessing from the last group.
const ROWS = [
  { kind: "limit", key: "limit" },
  ...FEATURE_GROUPS.flatMap((group) => [
    { kind: "group", key: `group-${group.title}`, group },
    ...group.features.map((feature) => ({
      kind: "feature",
      key: feature.label,
      feature,
    })),
  ]),
];

const PricingPlans = ({ defaultPeriod = "monthly" }) => {
  const [period, setPeriod] = useState(defaultPeriod);

  // The popular column is drawn as an outline running the height of the table.
  // Borders go on its own cells, so the rule follows the rows however tall
  // they end up rather than being an overlay that has to be kept in step.
  const columnEdge = (plan, index, rowIndex) =>
    cn(
      columnSide(plan, index),
      plan.popular &&
        rowIndex === ROWS.length - 1 &&
        "rounded-b-xl border-b-2 border-b-blue-500/50"
    );

  return (
    <TooltipProvider delayDuration={150}>
      {/* Billing switch. The wrapper is relative so the handwritten aside can
          be hung beside it without shifting the switch off centre. */}
      <div className="relative flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex items-center gap-1 rounded-full border bg-muted/50 p-1"
        >
          {BILLING_PERIODS.map(({ id, label, note }) => {
            const active = period === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPeriod(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                {note && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      active
                        ? "bg-white/20"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    )}
                  >
                    {note}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* The handwritten aside, pointing back at the Yearly option.
            Absolutely placed so it cannot pull the switch off centre, and
            hidden on narrow screens where there is no room beside it.
            aria-hidden: the saving is already stated on the button itself, so
            to a screen reader this is decoration repeated. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[calc(50%+8.75rem)] top-0 hidden select-none items-start gap-1 text-foreground/70 md:flex"
        >
          <svg
            width="64"
            height="36"
            viewBox="0 0 50 28"
            fill="none"
            className="mt-3 shrink-0"
          >
            {/* The reference's swoosh: out of the switch on the left, dipping
                through a trough, then sweeping up to the right with the head
                pointing at the text. */}
            <path
              d="M2 12C7 19.5 18 22.5 28 19C36 16 42 10 44.5 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M36.8 4.8 44.9 3.4 42.4 11.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* Narrow enough to break as "Save more with / annual billing",
              and tilted slightly, as in the reference. */}
          <span
            className="animate-float-note -mt-2 max-w-[8rem] text-xl leading-tight text-foreground/90"
            style={{ fontFamily: "var(--font-caveat)" }}
          >
            Save more with annual billing
          </span>
        </span>
      </div>

      {/* pt-5 leaves room inside the scroll box for the badge to sit on the
          table's top edge; without it the container would clip it. The table
          scrolls sideways rather than reflowing -- a comparison whose columns
          wrap is no longer a comparison. */}
      <div className="mt-6 overflow-x-auto pt-5">
        <table className="w-full min-w-[56rem] border-separate border-spacing-0 rounded-xl border bg-card">
          {/* Built from the catalogue rather than written out, so renaming a
              tier cannot leave the screen-reader caption behind. */}
          <caption className="sr-only">
            {`Compare the ${PLANS.map((p) => p.name).join(", ")} plans`}
          </caption>

          <thead>
            <tr>
              <th scope="col" className="w-[30%] border-b p-6 text-left align-top">
                <span className="block text-xl font-bold tracking-tight">
                  Features
                </span>
                <span className="mt-1 block text-sm font-normal text-muted-foreground">
                  Compare what&rsquo;s included in each plan.
                </span>
              </th>

              {PLANS.map((plan, index) => {
                const accent = accentOf(plan);
                return (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      // A transparent top border on every column, so the
                      // highlighted one's 2px rule does not push its contents
                      // down and leave its button 2px below the other two.
                      "relative border-b border-t-2 border-t-transparent p-6 text-center align-top",
                      columnSide(plan, index),
                      plan.popular &&
                        "rounded-t-xl border-t-blue-500/50 bg-blue-500/[0.04]"
                    )}
                  >
                    {plan.popular && (
                      <span
                        className={cn(
                          "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                          accent.badge
                        )}
                      >
                        Most Popular
                      </span>
                    )}

                    <span
                      className={cn(
                        "block text-xl font-bold tracking-tight",
                        accent.name
                      )}
                    >
                      {plan.name}
                    </span>
                    <span className="mx-auto mt-1 block min-h-10 max-w-[15rem] text-sm font-normal leading-5 text-muted-foreground">
                      {plan.tagline}
                    </span>

                    {(() => {
                      const price = priceFor(plan, period);
                      return (
                        <>
                          <span className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2">
                            {price.full && (
                              <span className="text-lg font-normal tabular-nums text-muted-foreground line-through">
                                {rupees.format(price.full)}
                              </span>
                            )}
                            <span className="text-3xl font-bold tracking-tight tabular-nums">
                              {rupees.format(price.amount)}
                            </span>
                            <span className="text-sm font-normal text-muted-foreground">
                              {price.suffix}
                            </span>
                          </span>
                        </>
                      );
                    })()}

                    <Button
                      asChild
                      className={cn("mt-4 w-full font-semibold", accent.button)}
                    >
                      <Link href={plan.cta.href}>{plan.cta.label}</Link>
                    </Button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row, index) => {
              if (row.kind === "group") {
                return (
                  <tr key={row.key} className="bg-muted/60">
                    <th
                      scope="colgroup"
                      className="border-b px-4 py-2 text-left text-sm font-semibold"
                    >
                      {row.group.title}
                    </th>
                    {PLANS.map((plan, planIndex) => (
                      <td
                        key={plan.id}
                        className={cn(
                          "border-b",
                          plan.popular && "bg-blue-500/[0.06]",
                          columnEdge(plan, planIndex, index)
                        )}
                      />
                    ))}
                  </tr>
                );
              }

              if (row.kind === "limit") {
                return (
                  <tr key={row.key} className="bg-muted/40">
                    <th scope="row" className="border-b p-4 text-left font-normal">
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                          <Icon name={HEADLINE_FEATURE.icon} className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">
                            {HEADLINE_FEATURE.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {HEADLINE_FEATURE.description}
                          </span>
                        </span>
                      </span>
                    </th>
                    {PLANS.map((plan, planIndex) => (
                      <td
                        key={plan.id}
                        className={cn(
                          "border-b p-4 text-center",
                          plan.popular && "bg-blue-500/[0.06]",
                          columnEdge(plan, planIndex, index)
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block rounded-md px-3 py-1.5 text-sm font-medium",
                            accentOf(plan).pill
                          )}
                        >
                          {plan.limit}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              }

              const { feature } = row;
              return (
                <tr key={row.key} className="hover:bg-muted/30">
                  <th scope="row" className="border-b p-4 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <Icon
                        name={feature.icon}
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                      <span className="text-sm">{feature.label}</span>
                      {feature.hint && <Hint>{feature.hint}</Hint>}
                    </span>
                  </th>
                  {PLANS.map((plan, planIndex) => {
                    const included = feature.plans.includes(plan.id);
                    return (
                      <td
                        key={plan.id}
                        className={cn(
                          "border-b p-4 text-center",
                          plan.popular && "bg-blue-500/[0.06]",
                          columnEdge(plan, planIndex, index)
                        )}
                      >
                        <Included yes={included} />
                        <span className="sr-only">
                          {included
                            ? `Included in ${plan.name}`
                            : `Not in ${plan.name}`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
};

export default PricingPlans;
