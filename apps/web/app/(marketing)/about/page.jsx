import Link from "next/link";
import {
  Brain,
  Compass,
  Eye,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StageFlow from "./_components/stage-flow";
import Roadmap from "./_components/roadmap";

export const metadata = {
  title: "About · WHealthOS",
  description:
    "WHealthOS brings accounts, transactions, budgets and AI-assisted insight into one financial workspace. What it does today, and where it is going.",
};

// Everything on this page is checked against the codebase. "Today" lists only
// what is implemented; anything else is marked Planned. See the roadmap and
// stage components for how that distinction is carried without relying on
// colour.

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Privacy by design",
    body: "Financial records are among the most sensitive data a person has. We treat where that data goes, and who can reach it, as a design question rather than a setting.",
  },
  {
    icon: ShieldCheck,
    title: "Security in the architecture",
    body: "Access control belongs in the database, not in whichever code path happens to run. Isolation between accounts is enforced by Postgres row-level security, so application code cannot opt out of it.",
  },
  {
    icon: Eye,
    title: "Explainable insight",
    body: "Every figure shown is calculated, never generated. A model may phrase what the numbers mean; it does not produce the numbers. You should be able to trace any total back to the transactions behind it.",
  },
  {
    icon: Compass,
    title: "You stay in control",
    body: "Your data is yours to export or delete, and the product should inform decisions rather than make them. WHealthOS is not financial advice.",
  },
  {
    icon: Sparkles,
    title: "Built to grow",
    body: "The same system is intended to scale from one person's finances to a team's, without becoming a different product along the way.",
  },
];

// Verified against the codebase. Goals, Analytics as a section, Cards and
// multi-currency are deliberately absent: they are not implemented.
const TODAY = [
  "Current and savings accounts, with balances kept in step with every transaction",
  "Income and expenses by category, including recurring entries posted on schedule",
  "A monthly budget with progress tracking and an email alert before you pass it",
  "A dashboard covering cash flow, category breakdown, income sources and savings rate",
  "Receipt scanning that reads a photograph into a draft transaction",
  "A monthly summary email with AI-assisted commentary on the month",
  "A demo you can open without an account, running on sample data",
];

const PRODUCT_STAGES = [
  { title: "Financial data", description: "Accounts, transactions and balances in one place." },
  { title: "Financial management", description: "Budgets, categories and recurring commitments." },
  { title: "Financial understanding", description: "Where money actually goes, month over month." },
  { title: "Financial intelligence", description: "Insight grounded in your own figures.", planned: true },
  { title: "Financial operations", description: "Shared financial workflow for teams.", planned: true },
];

const AI_PIPELINE = [
  { title: "Financial data", description: "Your accounts and transactions." },
  { title: "Deterministic analysis", description: "Ordinary arithmetic. This is the source of truth for every number." },
  { title: "Verified context", description: "A structured summary — plain, inspectable data." },
  { title: "Financial intelligence", description: "An external provider today; a locally controlled model in future.", planned: true },
  { title: "Insight", description: "Phrased explanation of figures that were already computed." },
];

const EVOLUTION = [
  { title: "Personal", description: "Individual financial management. This is what exists today." },
  { title: "Professional", description: "Independent professionals and freelancers.", planned: true },
  { title: "Business", description: "Shared financial operations across a team.", planned: true },
  { title: "Enterprise", description: "Customer-operated, with the organisation running its own infrastructure.", planned: true },
  { title: "Cloud & Platform", description: "A managed offering, plus APIs and integrations.", planned: true },
];

const ROADMAP = [
  { stage: "Today", title: "Personal finance, AI-assisted", description: "The web application: accounts, transactions, budgets, a dashboard, receipt scanning and monthly insight emails." },
  { stage: "Next", title: "Backend evolution", description: "Moving from a single Next.js deployable toward a service-oriented backend, as scale and ownership boundaries justify it." },
  { stage: "Next", title: "WHealthOS financial intelligence", description: "Replacing the external AI provider with a model we develop and host ourselves, so financial data stops leaving our infrastructure." },
  { stage: "Next", title: "Mobile, offline-first", description: "Android and iOS, designed so the local database is authoritative for the interface and the network is a background concern." },
  { stage: "Later", title: "Professional and Business", description: "Shared financial operations for independent professionals, then for teams." },
  { stage: "Later", title: "Enterprise", description: "Customer-operated deployments with the administrative capabilities that implies." },
  { stage: "Future", title: "Cloud and Platform", description: "A managed offering operated by us, and the APIs and integrations around it." },
];

const Section = ({ id, eyebrow, title, lead, children, className = "" }) => (
  <section aria-labelledby={id} className={`mt-20 ${className}`}>
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {eyebrow}
      </p>
    )}
    <h2 id={id} className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
      {title}
    </h2>
    {lead && <p className="mt-3 max-w-2xl text-muted-foreground">{lead}</p>}
    {children}
  </section>
);

export default function AboutPage() {
  return (
    // pt-28 clears the fixed header, which the marketing layout does not
    // reserve space for. Matches the pricing page.
    <div className="container mx-auto px-4 pb-24 pt-28">
      {/* Hero */}
      <header className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          About
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
          Financial control, built for the way{" "}
          <span className="gradient-title">people manage money.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
          WHealthOS brings accounts, transactions, budgets and spending analysis
          into a single workspace — and adds a layer of assisted insight on top,
          so the numbers come with an explanation rather than just a total.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/demo">Explore WHealthOS</Link>
          </Button>
        </div>
      </header>

      {/* Why */}
      <Section
        id="why"
        eyebrow="The problem"
        title="Why WHealthOS exists"
        lead="Financial information is scattered. Balances sit with one bank, card spending with another, the real budget in a spreadsheet, and the reasoning behind any of it in somebody's head."
      >
        <div className="mt-6 max-w-2xl space-y-4 text-muted-foreground">
          <p>
            Each piece is legible on its own. Together they rarely answer the
            question people actually have, which is not{" "}
            <em className="text-foreground not-italic">
              what did I spend
            </em>{" "}
            but{" "}
            <em className="text-foreground not-italic">
              where is this going, and is it working
            </em>
            .
          </p>
          <p>
            WHealthOS is being built to hold those pieces in one place and make
            them answerable: where money goes, how income and spending move
            against each other, whether a budget is holding, and what has
            changed since last month.
          </p>
        </div>
      </Section>

      {/* What it is */}
      <Section
        id="what"
        eyebrow="The product"
        title="More than a transaction tracker."
        lead="Recording what happened is the starting point, not the goal. The product is designed to move along a progression — each stage only useful because the one before it is solid."
      >
        <StageFlow
          className="mt-8"
          label="How the product progresses"
          stages={PRODUCT_STAGES}
        />
      </Section>

      {/* Principles */}
      <Section
        id="principles"
        eyebrow="Principles"
        title="Built around a few principles."
        lead="These are constraints on how the product gets built, not slogans."
      >
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Today */}
      <Section
        id="today"
        eyebrow="Current"
        title="Where WHealthOS is today"
        lead="A web application for personal finance. Everything below is implemented and in use — nothing on this list is planned or partial."
      >
        <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {TODAY.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm">
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Amounts are handled in a single currency for now, and goals, dedicated
          analytics and card management are not built yet. They are on the
          roadmap below rather than in the product.
        </p>
      </Section>

      {/* Roadmap */}
      <Section
        id="roadmap"
        eyebrow="Direction"
        title="Built for what comes next."
        lead="In order, without dates. Everything after the first entry is planned work, not something you can use today."
      >
        <div className="mt-8 max-w-2xl">
          <Roadmap milestones={ROADMAP} />
        </div>
      </Section>

      {/* AI */}
      <Section
        id="intelligence"
        eyebrow="Intelligence"
        title="From AI-assisted to WHealthOS financial intelligence."
        lead="WHealthOS already uses an external AI provider for receipt scanning and the monthly summary email. That is the current implementation, and it is temporary."
      >
        <div className="mt-6 max-w-2xl space-y-4 text-muted-foreground">
          <p>
            The direction is a model we develop and host ourselves. A product
            holding complete financial histories should not be sending them to a
            third-party inference service, and self-hosting also removes a
            dependency on another company&rsquo;s pricing and availability.
          </p>
          <p>
            <span className="font-medium text-foreground">
              Whatever generates the words, the figures come from arithmetic.
            </span>{" "}
            Deterministic analysis runs first and produces a verified context;
            the model explains that context rather than computing it. If the
            model is unavailable, the summary is still correct — it is simply
            plainer.
          </p>
        </div>

        <StageFlow
          className="mt-8"
          label="How an insight is produced"
          stages={AI_PIPELINE}
        />

        <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
          <Brain aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The local model does not exist yet. Until it does, the step above is
            served by an external provider.
          </span>
        </p>
      </Section>

      {/* Evolution */}
      <Section
        id="evolution"
        eyebrow="Scope"
        title="One product, growing with its users."
        lead="The same system, widening in scope. Each stage after Personal is a direction rather than something available now."
      >
        <StageFlow
          className="mt-8"
          label="How the product's scope widens"
          stages={EVOLUTION}
        />
      </Section>

      {/* Closing */}
      <section
        aria-labelledby="start"
        className="mt-20 flex flex-col items-center justify-between gap-6 rounded-xl border bg-muted/40 p-6 md:flex-row md:p-8"
      >
        <div>
          <h2 id="start" className="text-xl font-bold tracking-tight">
            Start understanding your finances.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Free to begin, and you can try it with sample data first.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
