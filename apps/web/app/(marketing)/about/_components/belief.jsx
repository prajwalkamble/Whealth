const PRINCIPLES = [
  { title: "Visibility", body: "You can’t manage what you can’t see." },
  {
    title: "Understanding",
    body: "Financial data becomes useful when it becomes understandable.",
  },
  {
    title: "Control",
    body: "Technology should support financial decisions, not make them for you.",
  },
];

// Deliberately the quietest section on the page: one statement, a lot of
// space around it, no cards. It is the argument the rest of the page rests on.
const Belief = () => (
  <section
    aria-labelledby="belief"
    className="reveal mt-24 rounded-2xl border bg-muted/30 px-6 py-14 md:mt-32 md:px-12 md:py-20"
  >
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      Our belief
    </p>

    <h2
      id="belief"
      className="mt-6 max-w-4xl scroll-mt-28 text-balance text-2xl font-semibold leading-snug tracking-tight md:text-[2rem] md:leading-[1.3]"
    >
      Financial software should do more than tell you what happened. It should
      help you understand{" "}
      <span className="gradient-title -mr-2">why it happened</span> and what you can
      do next.
    </h2>

    <dl className="mt-12 grid gap-8 border-t pt-10 sm:grid-cols-3">
      {PRINCIPLES.map(({ title, body }) => (
        <div key={title}>
          <dt className="text-sm font-semibold">{title}</dt>
          <dd className="mt-2 text-sm text-muted-foreground">{body}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export default Belief;
