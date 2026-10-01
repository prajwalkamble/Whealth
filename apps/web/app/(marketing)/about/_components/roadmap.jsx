import { cn } from "@/lib/utils";

// A vertical timeline. No dates: the project has none published, and inventing
// them would be a commitment the product cannot currently make.
//
// The stage label ("Today", "Next", "Later", "Future") is text, not a colour —
// so the distinction between what exists and what does not survives being read
// aloud, printed in greyscale, or viewed by someone who cannot distinguish the
// accent colours.
const Roadmap = ({ milestones }) => (
  <ol aria-label="Product roadmap" className="relative space-y-6">
    {milestones.map((milestone, index) => {
      const isNow = milestone.stage === "Today";
      return (
        <li key={milestone.title} className="relative flex gap-4 sm:gap-6">
          {/* Rail and marker. Decorative — the list already conveys order. */}
          <div aria-hidden className="relative flex w-3 shrink-0 justify-center">
            <span
              className={cn(
                "absolute top-1.5 h-3 w-3 rounded-full ring-4 ring-background",
                isNow ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
            {index < milestones.length - 1 && (
              <span className="absolute top-5 h-[calc(100%+0.5rem)] w-px bg-border" />
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                isNow
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {milestone.stage}
            </span>
            <h3 className="mt-2 text-base font-semibold">{milestone.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {milestone.description}
            </p>
          </div>
        </li>
      );
    })}
  </ol>
);

export default Roadmap;
