import { Check } from "lucide-react";
import Section from "./section";

// Verified against the codebase. Anything without an implementation sits in
// the right-hand column, not the left.
const TODAY = [
  "Current and savings accounts with balances that stay in step",
  "Income and expenses by category, including recurring entries",
  "A monthly budget with progress tracking and email alerts",
  "A dashboard covering cash flow, categories and savings rate",
  "Search across your own transactions and accounts",
  "Receipt scanning that reads a photograph into a draft transaction",
];

const AHEAD = [
  "Goals, analytics as its own workspace, and multi-currency",
  "WHealthOS Financial Intelligence, developed and hosted by us",
  "Mobile, designed offline-first",
  "Professional, Business and customer-operated Enterprise",
  "WHealthOS Cloud and Platform",
];

const WhatIs = () => (
  <Section
    id="what-is"
    title="What is WHealthOS?"
    lead="A financial management product that is being built toward a broader financial intelligence platform. Today that means personal finance; the same foundation is designed to carry professional, business and enterprise use later."
  >
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <h3 className="text-sm font-semibold">Today</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Available now, in the web application.
        </p>
        <ul className="mt-5 space-y-3">
          {TODAY.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <Check
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-dashed bg-muted/30 p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />
          <h3 className="text-sm font-semibold">Where we&rsquo;re going</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Planned. None of this is available yet.
        </p>
        <ul className="mt-5 space-y-3">
          {AHEAD.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50"
              />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </Section>
);

export default WhatIs;
