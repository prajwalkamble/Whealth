import Section from "./section";

// Six values, each written so it could only belong to financial software.
// Generic virtues (innovation, excellence, passion) are deliberately absent:
// they constrain nothing and describe no decision.
const VALUES = [
  {
    title: "Trust",
    body: "Financial software is built on trust. Financial information, decisions and expectations get treated with the seriousness they deserve.",
  },
  {
    title: "User control",
    body: "WHealthOS should help people understand and manage their finances — not make financial decisions on their behalf.",
  },
  {
    title: "Clarity",
    body: "Financial information should be understandable, transparent and useful. A number nobody can trace is not an answer.",
  },
  {
    title: "Privacy by design",
    body: "Privacy shapes how the product, its data flows and its intelligence systems are designed — it is not a setting added at the end.",
  },
  {
    title: "Responsible intelligence",
    body: "Intelligence should be grounded in reliable data, explainable where possible, and honest about what it does not know.",
  },
  {
    title: "Build for the long term",
    body: "Reliability and maintainability over feature velocity. Financial records outlive release cycles.",
  },
];

const CoreValues = () => (
  <Section
    id="values"
    title="What we hold to"
    lead="6 commitments that constrain how WHealthOS gets built."
  >
    <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {VALUES.map(({ title, body }, index) => (
        <li key={title} className="border-t pt-5">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-2 text-base font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        </li>
      ))}
    </ol>
  </Section>
);

export default CoreValues;
