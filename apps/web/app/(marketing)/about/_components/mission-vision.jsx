// A split rather than two stacked cards: mission and vision are a pair, and
// reading them side by side is the point.
const MissionVision = () => (
  <section
    aria-labelledby="mission"
    className="reveal mt-24 grid gap-px overflow-hidden rounded-2xl border bg-border md:mt-32 md:grid-cols-2"
  >
    <div className="bg-background p-8 md:p-12">
      <h2
        id="mission"
        className="scroll-mt-28 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        Mission
      </h2>
      <p className="mt-6 text-balance text-xl font-medium leading-relaxed tracking-tight md:text-2xl">
        Make financial management clearer, more intelligent and more actionable
        by giving people and organisations the tools to understand their
        financial data and make better-informed decisions.
      </p>
    </div>

    <div className="bg-background p-8 md:p-12">
      <h2
        id="vision"
        className="scroll-mt-28 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        Vision
      </h2>
      <p className="mt-6 text-balance text-xl font-medium leading-relaxed tracking-tight md:text-2xl">
        A world where financial data doesn&rsquo;t just record the past — it
        helps people understand the present and plan the future.
      </p>
    </div>
  </section>
);

export default MissionVision;
