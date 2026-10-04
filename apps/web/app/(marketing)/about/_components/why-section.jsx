import Section from "./section";
import StageFlow from "./stage-flow";

const FLOW = [
  {
    title: "Scattered records",
    description: "Bank accounts, cards, cash, spreadsheets, payment apps, notes.",
  },
  {
    title: "Brought together",
    description: "Accounts, transactions, budgets and goals in one structure.",
  },
  { title: "WHealthOS", description: "One workspace holding the whole picture." },
  {
    title: "A clearer picture",
    description: "Where money came from, where it went, and what changed.",
  },
];

const WhySection = () => (
  <Section
    id="why"
    title="Money management shouldn’t feel like data entry."
    lead="Your financial information already exists. It is just spread across bank accounts, cards, cash, spreadsheets, payment apps and the occasional note — each piece legible on its own, none of them adding up to an answer."
  >
    <p className="mt-4 max-w-2xl text-muted-foreground">
      The question people actually have is not what they spent last Tuesday. It
      is whether the overall shape of their finances is working. WHealthOS is
      being built to make that question answerable.
    </p>

    <StageFlow
      className="mt-10"
      label="How scattered financial information becomes a clearer picture"
      stages={FLOW}
    />
  </Section>
);

export default WhySection;
