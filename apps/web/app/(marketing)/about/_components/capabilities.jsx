import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Globe,
  PiggyBank,
  Sparkles,
  Target,
} from "lucide-react";
import Section from "./section";
import { cn } from "@/lib/utils";

// "planned" is checked against the codebase, not aspiration: multi-currency
// and the intelligence layer have no implementation behind them, so they carry
// a badge rather than being listed alongside what works.
//
// Goals lost that badge once it shipped (app/(main)/goals). A built section
// advertised as planned undersells the product exactly as much as a planned
// one advertised as built oversells it, and both are the same mistake:
// this list disagreeing with the application.
const CAPABILITIES = [
  {
    icon: ArrowLeftRight,
    span: true,
    title: "Financial management",
    body: "Track income, expenses and transfers across current and savings accounts, including recurring commitments posted on schedule.",
  },
  {
    icon: PiggyBank,
    title: "Budgets",
    body: "Set a monthly limit, watch it against real spending, and get an email before you pass it rather than after.",
  },
  {
    icon: BarChart3,
    span: true,
    title: "Analytics",
    body: "Cash flow across months, spending by category, income sources and savings rate — on one dashboard.",
  },
  {
    icon: Target,
    title: "Goals",
    body: "Set a target, record what you put towards it, and see progress derived from those contributions rather than a running total that can drift.",
  },
  {
    icon: CreditCard,
    title: "Cards",
    body: "Keep track of the cards you use, their limits and their billing dates. Reference details only — there is no column for a card number, a CVV or a PIN.",
  },
  {
    icon: Globe,
    title: "Multi-currency",
    body: "Hold and report across currencies while preserving each transaction’s original context.",
    planned: true,
  },
  {
    icon: Sparkles,
    span: true,
    title: "Financial intelligence",
    body: "A locally developed layer that turns verified financial context into understandable insight.",
    planned: true,
  },
];

const Capabilities = () => (
  <Section
    id="glance"
    title="WHealthOS at a glance"
    lead="One financial workspace for understanding where your money comes from, where it goes, and where it’s headed."
  >
    <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CAPABILITIES.map(({ icon: Icon, title, body, planned, span }) => (
        <li
          key={title}
          className={cn(
            "rounded-xl border p-5",
            // The wide cells give the row a rhythm instead of six identical
            // tiles. Only from lg, where there are three columns to span.
            span && "lg:col-span-2",
            planned ? "border-dashed bg-muted/30" : "bg-card"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden className="h-[18px] w-[18px]" />
            </span>
            {planned && (
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Planned
              </span>
            )}
          </div>
          <h3 className="mt-4 text-sm font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  </Section>
);

export default Capabilities;
