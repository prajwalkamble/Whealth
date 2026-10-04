import { cn } from "@/lib/utils";

// The four public figures, in the About page's visual language rather than the
// landing band's blue slab.
//
// Every tile renders, including one whose figure is not computable yet. The
// label is the claim and the number is the evidence, so a missing number is
// shown as missing — a dash the caption explains — rather than filled with a
// guess. On a finance product that distinction is the whole point.
//
// flex-col-reverse puts the figure above its label on screen while keeping
// <dt> before <dd> in the source, which is the order a screen reader needs.
const Stats = ({ stats }) => {
  if (stats.length === 0) return null;

  const pending = stats.some(({ value }) => value === null);

  return (
    <section aria-labelledby="stats" className="reveal mt-16 md:mt-20">
      <h2 id="stats" className="sr-only">
        WHealthOS in numbers
      </h2>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col-reverse gap-1 bg-card p-5 md:p-6"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "text-3xl font-bold tabular-nums tracking-tight md:text-4xl",
                value === null && "text-muted-foreground/40"
              )}
            >
              {/* An em dash, not "0" and not "N/A": nothing is being claimed. */}
              {value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      {pending && (
        <p className="mt-3 text-xs text-muted-foreground">
          A figure shown as &mdash; is one there is not enough recorded history
          to compute yet.
        </p>
      )}
    </section>
  );
};

export default Stats;
