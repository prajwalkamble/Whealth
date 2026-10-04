// The founder block is deliberately thin. The repository establishes a single
// copyright holder and nothing else about who builds this, so there are no
// invented employees, advisors, investors or customers here.
const Promise = () => (
  <>
    <section
      aria-labelledby="promise"
      className="reveal mt-24 rounded-2xl border bg-muted/30 px-6 py-14 md:mt-32 md:px-12 md:py-20"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Our promise
      </p>

      <h2
        id="promise"
        className="mt-6 max-w-3xl scroll-mt-28 text-balance text-2xl font-semibold leading-snug tracking-tight md:text-[2rem] md:leading-[1.25]"
      >
        We don&rsquo;t want to build another dashboard. We want to build a
        system that helps you{" "}
        <span className="gradient-title -mr-2">understand your financial life</span>.
      </h2>

      <p className="mt-6 max-w-2xl text-muted-foreground">
        Today that starts with financial management. Over time, WHealthOS is
        being built toward financial intelligence and broader financial
        management for professionals, businesses and enterprises.
      </p>
    </section>

    <section aria-labelledby="builder" className="reveal mt-16 border-t pt-10">
      <h2
        id="builder"
        className="scroll-mt-28 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        Built with a long-term view
      </h2>
      <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
        WHealthOS is built around a simple idea: financial software should help
        people understand their money, not merely record it. That takes longer
        than shipping another dashboard, and it is the reason this page is
        honest about what does not exist yet.
      </p>
    </section>
  </>
);

export default Promise;
