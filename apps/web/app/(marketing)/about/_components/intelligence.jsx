import { ShieldCheck } from "lucide-react";
import Section from "./section";
import StageFlow from "./stage-flow";

// Every stage is marked planned. The deterministic steps exist in some form
// already, but the pipeline as a whole — and the model at the end of it — does
// not, and presenting half of it as live would be the misleading half.
const PIPELINE = [
  { title: "Financial activity", description: "What you actually did with money." },
  { title: "Accounts + transactions", description: "Recorded and categorised." },
  { title: "Deterministic engine", description: "Arithmetic. The source of truth for every number." },
  { title: "Verified metrics", description: "Totals and rates that can be traced back.", planned: true },
  { title: "Patterns + anomalies", description: "Trends, and what breaks them.", planned: true },
  { title: "Personal context", description: "Structured, inspectable, yours alone.", planned: true },
  { title: "Financial intelligence", description: "A model we develop and host.", planned: true },
  { title: "Understandable insight", description: "Explanation, not instruction.", planned: true },
];

const Intelligence = () => (
  <>
    <Section
      id="intelligence"
      eyebrow="Where we’re going"
      title="From financial data to financial intelligence."
      lead="Our long-term goal is not to put a chatbot on top of a finance dashboard. It is to build an intelligence layer that understands structured financial context and turns it into useful, understandable insights."
    >
      <div className="mt-6 max-w-2xl space-y-4 text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            This layer does not exist yet.
          </span>{" "}
          Today WHealthOS uses an external provider in two specific places —
          reading a photographed receipt into a draft transaction, and writing
          the commentary in the monthly summary email. That is assistance at the
          edges, not the system described below, and it is the part we intend to
          replace.
        </p>
        <p>
          The direction is a model developed and hosted by us. A product holding
          complete financial histories should not be sending them to a
          third-party inference service, and self-hosting also removes a
          dependency on another company&rsquo;s pricing and availability.
        </p>
      </div>

      <StageFlow
        className="mt-10"
        label="How financial activity would become an insight"
        stages={PIPELINE}
      />
    </Section>

    <section
      aria-labelledby="responsible"
      className="reveal mt-10 flex flex-col gap-4 rounded-xl border bg-muted/30 p-6 md:flex-row md:items-start md:gap-6 md:p-8"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <ShieldCheck aria-hidden className="h-5 w-5" />
      </span>
      <div>
        <h2 id="responsible" className="scroll-mt-28 text-lg font-semibold tracking-tight">
          Intelligence with boundaries.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Financial intelligence should be useful without pretending to be
          infallible. The approach is to separate deterministic financial
          calculation from generated interpretation, make uncertainty clear, and
          keep you in control of financial decisions.
        </p>
      </div>
    </section>
  </>
);

export default Intelligence;
