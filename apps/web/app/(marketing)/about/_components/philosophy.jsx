import Section from "./section";

const PRINCIPLES = [
  {
    title: "Financial data first",
    body: "Core financial calculations are deterministic. Totals, balances and rates come from arithmetic over your own records, and the same inputs always give the same answer.",
  },
  {
    title: "Intelligence second",
    body: "Interpretation sits on top of verified figures. A model should explain financial context, never invent a financial fact.",
  },
  {
    title: "User control always",
    body: "Insight informs a decision; it does not make one. WHealthOS is not financial advice and is not designed to act on your behalf.",
  },
  {
    title: "Designed to evolve",
    body: "The same foundation is meant to carry personal finance today and professional, business and enterprise use later, without becoming a different product.",
  },
];

const Philosophy = () => (
  <Section
    id="philosophy"
    title="What makes WHealthOS different?"
    lead="Not a claim to be the best at anything. These are the 4 rules the product is built against."
  >
    <ol className="mt-10 divide-y border-y">
      {PRINCIPLES.map(({ title, body }, index) => (
        <li
          key={title}
          className="grid gap-2 py-6 md:grid-cols-[auto_minmax(0,16rem)_minmax(0,1fr)] md:items-baseline md:gap-8"
        >
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground md:text-base">{body}</p>
        </li>
      ))}
    </ol>
  </Section>
);

export default Philosophy;
