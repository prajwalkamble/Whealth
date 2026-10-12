"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

// The parts every tool form is built from.
//
// One set, so the ten tools look and behave alike: the same label placement,
// the same hint, the same error wiring. A tool that needed its own input
// styling would be a sign the kit is missing something, not a reason to style
// it locally.

// A labelled numeric field.
//
// type="text" with inputMode="decimal" rather than type="number": a number
// input silently swallows what it cannot parse, scrolls the value on a
// trackpad, and hides malformed input from validation. Keeping it text means
// the engine sees what the person typed and can say why it is not usable.
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  error,
  placeholder,
  className,
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hint && hintId, error && errorId) || undefined}
          className={cn(
            prefix && "pl-7",
            suffix && "pr-10",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function ChoiceField({ label, value, onChange, options, hint, className }) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// A segmented control, for a choice short enough to show all of at once.
export function SegmentedField({ label, value, onChange, options }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                // 44px tall: a comfortable target on a phone.
                "min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// The answer to the question the tool asks. One figure, stated plainly.
export function PrimaryResult({ label, value, caption, tone = "default" }) {
  return (
    <div
      className="rounded-xl border bg-muted/40 p-6"
      // Announced when it changes, because the result appears without a
      // navigation and a screen-reader user would otherwise not know.
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-3xl font-bold tracking-tight sm:text-4xl",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-2 text-sm text-muted-foreground">{caption}</p>}
    </div>
  );
}

// The figures behind the answer. Few enough to read at a glance.
export function Metrics({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd
            className={cn(
              "mt-1 truncate text-lg font-semibold",
              item.tone === "positive" && "text-emerald-600 dark:text-emerald-400",
              item.tone === "negative" && "text-red-600 dark:text-red-400"
            )}
            title={typeof item.value === "string" ? item.value : undefined}
          >
            {item.value}
          </dd>
          {item.note && <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>}
        </div>
      ))}
    </dl>
  );
}

// Why a calculation could not run. Never styled as a result.
export function Problem({ children }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400"
    >
      {children}
    </p>
  );
}

// A plain proportional bar. Not a chart library: one div inside another is
// enough, and it stays readable in both themes without any JavaScript.
export function ShareBar({ rows, total }) {
  if (!rows?.length || total <= 0) return null;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatCurrency(row.amount)}
              <span className="ml-2 text-xs text-muted-foreground">
                {row.share.toFixed(0)}%
              </span>
            </span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${row.label}: ${row.share.toFixed(0)} per cent`}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, row.share))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Parsing what someone typed.
//
// An empty box is 0, not NaN, so a form is usable before every field is
// filled. Anything else unparseable stays NaN and the engine reports it --
// quietly turning "12o" into 12 would be worse than saying it is not a number.
export const num = (value) => {
  const text = String(value ?? "").replace(/[,\s₹]/g, "").trim();
  if (text === "") return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const anyNaN = (...values) => values.some((v) => Number.isNaN(v));

export const money = formatCurrency;

// Months as a readable duration, for results.
export const monthsLabel = (months) => {
  if (months === null || !Number.isFinite(months)) return "—";
  const rounded = Math.round(months * 10) / 10;
  if (rounded < 1) return `${rounded} months`;
  const years = Math.floor(rounded / 12);
  const rest = Math.round(rounded % 12);
  if (years === 0) return `${rounded} months`;
  return `${rounded} months (${years}y ${rest}m)`;
};
