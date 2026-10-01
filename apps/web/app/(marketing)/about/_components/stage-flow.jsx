import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Three sections of the About page are the same shape: an ordered sequence of
// stages, some of which are not built yet. One component rather than three
// near-identical ones.
//
// It is an <ol> because the order carries the meaning. Read with styling
// stripped — by a screen reader, or with CSS off — it is still a numbered list
// of stages, each with its description and, where relevant, the word
// "Planned". None of the meaning lives in the arrows or the colour.
const StageFlow = ({ stages, label, className }) => (
  <ol
    aria-label={label}
    // auto-fit with a real minimum, not minmax(0,1fr): the latter packs every
    // stage onto one row at any width, so five of them become unreadable
    // slivers on a tablet. With a 13rem floor they wrap to a second row
    // instead.
    className={cn(
      "grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] sm:items-stretch",
      className
    )}
  >
    {stages.map((stage, index) => (
      <li key={stage.title} className="relative flex sm:flex-col">
        {/* Decorative: it repeats the order the list already carries, so it is
            hidden from assistive technology. Hidden on the first item, which
            has nothing before it to point from. */}
        <ChevronRight
          aria-hidden
          className={cn(
            "absolute h-4 w-4 shrink-0 text-muted-foreground/60",
            // Pointing down between stacked rows, right between columns.
            "-top-2.5 left-6 rotate-90 sm:left-auto sm:-top-0 sm:bottom-0 sm:-left-2.5 sm:my-auto sm:rotate-0",
            index === 0 && "hidden"
          )}
        />

        <div
          className={cn(
            "flex h-full w-full flex-col rounded-xl border p-4 transition-colors",
            stage.planned ? "border-dashed bg-muted/30" : "bg-card"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold">{stage.title}</h3>
            {stage.planned && (
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Planned
              </span>
            )}
          </div>
          {stage.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {stage.description}
            </p>
          )}
        </div>
      </li>
    ))}
  </ol>
);

export default StageFlow;
