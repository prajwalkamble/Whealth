import Link from "next/link";
import Section from "./section";
import { FEATURES, TERMS } from "@/lib/legal/terms";
import { COMPANY_LINKS } from "@/lib/company/links";

// Where the product actually is.
//
// The "working today" column is FEATURES from lib/legal/terms.js -- the same
// list the Terms of Service describe the service by. One source, so the
// marketing page and the contract cannot end up describing different products.
//
// The second column is the opposite discipline: things people reasonably
// assume a finance app has, which this one does not. Each is checked against
// the codebase rather than against the roadmap.
const NOT_YET = [
  {
    title: "Mobile apps",
    body: "The web application is the only thing being built. The mobile directories in the repository are placeholders and say so.",
  },
  {
    title: "Multi-currency",
    body: "There is no currency column on a transaction or an account, and no exchange rate anywhere. Every amount is in one currency.",
  },
  {
    title: "A self-hosted intelligence layer",
    body: "The long-term plan is a model developed and hosted here. Today two features call an external provider, and the AI Usage page says exactly which and what they send.",
  },
  {
    title: "Bank connections",
    body: "Nothing links to a bank. Transactions are entered, imported from a file, or read from a receipt photo you upload.",
  },
];

const Status = () => (
  <Section
    id="status"
    eyebrow="Where things stand"
    title="Early, and specific about it."
    lead="WHealthOS is pre-launch and built by one person. That is the context for everything above, so here is the line between what works today and what does not exist."
  >
    <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-12">
      <div>
        <h3 className="text-sm font-semibold">What you can do today</h3>
        <ul className="mt-4 space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm text-muted-foreground">
              <span
                aria-hidden
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70"
              />
              <span className="min-w-0 leading-6">{feature}</span>
            </li>
          ))}
        </ul>
        {!TERMS.paidPlansAvailable && (
          <p className="mt-5 border-t pt-4 text-sm leading-6 text-muted-foreground">
            All of it is free. There is no billing in the application and
            nothing to cancel.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold">What does not exist yet</h3>
        <dl className="mt-4 space-y-4">
          {NOT_YET.map(({ title, body }) => (
            <div key={title}>
              <dt className="text-sm font-medium text-foreground">{title}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                {body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>

    <p className="mt-10 border-t pt-6 text-sm leading-6 text-muted-foreground">
      The source is public, which is the shortest route to checking any of
      this — see the{" "}
      <Link
        href={COMPANY_LINKS.openSource}
        className="font-medium text-foreground underline underline-offset-4"
      >
        Open Source page
      </Link>
      . What the product does with AI is set out on{" "}
      <Link href="/ai-usage" className="font-medium text-foreground underline underline-offset-4">
        AI Usage
      </Link>
      , and what protects your records — with the limits of it — on{" "}
      <Link href="/security" className="font-medium text-foreground underline underline-offset-4">
        Security
      </Link>
      .
    </p>
  </Section>
);

export default Status;
