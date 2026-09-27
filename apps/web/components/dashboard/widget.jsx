import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// The anatomy every dashboard widget shares: a header strip holding the title
// and at most one small action, divided from the body by a hairline. Keeping
// every card on the same bones -- same padding, same title size, same rule --
// is most of what makes a dashboard read as designed rather than assembled.

export const Widget = ({ className, children, ...props }) => (
  <section
    className={cn(
      "flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </section>
);

export const WidgetHeader = ({ title, action, className, children }) => (
  <header
    className={cn(
      "flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3",
      className
    )}
  >
    <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium">
      {title}
    </h2>
    <div className="shrink-0">{action ?? children}</div>
  </header>
);

export const WidgetContent = ({ className, children }) => (
  <div className={cn("flex-1 p-5", className)}>{children}</div>
);

export const WidgetFooter = ({ className, children }) => (
  <footer className={cn("border-t px-5 py-3 text-sm", className)}>
    {children}
  </footer>
);

// Percentage change as an outlined pill -- "↗ 12.5%" -- coloured by whether
// the direction is good news. goodWhenUp is false for things like expenses.
export const TrendBadge = ({ value, goodWhenUp = true, suffix = "%", className }) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className
        )}
      >
        <Minus className="h-3 w-3" />
        New
      </span>
    );
  }

  const flat = Math.abs(value) < 0.05;
  const good = flat || (value > 0) === goodWhenUp;
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        flat
          ? "text-muted-foreground"
          : good
            ? "border-green-600/30 bg-green-500/5 text-green-700 dark:border-green-400/30 dark:text-green-400"
            : "border-red-600/30 bg-red-500/5 text-red-700 dark:border-red-400/30 dark:text-red-400",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {flat
        ? `0${suffix}`
        : Math.abs(value) > 999
          ? `>999${suffix}`
          : Math.abs(value) >= 100
            ? `${Math.round(Math.abs(value))}${suffix}`
            : `${Math.abs(value).toFixed(1)}${suffix}`}
    </span>
  );
};

// Change against a previous value, as a percentage. Null when there is
// nothing to compare against -- every first month would otherwise read
// "+100%", which says nothing.
export const percentChange = (current, previous) => {
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

// The order categorical series take their colours in: strong, pale, strong,
// pale around the ramp, so neighbouring slices and segments always contrast.
// Shared so a category is the same colour in every widget on the page.
export const SERIES_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-3))",
];

const PILL_TONES = {
  good: "border-green-600/30 bg-green-500/5 text-green-700 dark:border-green-400/30 dark:text-green-400",
  warn: "border-amber-600/30 bg-amber-500/5 text-amber-700 dark:border-amber-400/30 dark:text-amber-400",
  bad: "border-red-600/30 bg-red-500/5 text-red-700 dark:border-red-400/30 dark:text-red-400",
  neutral: "text-muted-foreground",
};

// A short labelled pill -- "Healthy", "First month", "+₹1,200" -- for badges
// where a percentage would say nothing to a new user.
export const StatusBadge = ({ tone = "neutral", icon: Icon, className, children }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
      PILL_TONES[tone],
      className
    )}
  >
    {Icon && <Icon className="h-3 w-3" />}
    {children}
  </span>
);
