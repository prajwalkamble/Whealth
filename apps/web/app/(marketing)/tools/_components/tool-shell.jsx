import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryById, relatedTools, toolPath } from "@/lib/tools/registry";

// The frame every tool page shares.
//
// Server-rendered: only the calculator itself needs state, so everything
// around it — breadcrumb, explanation, assumptions, related links — ships no
// JavaScript. The calculator is passed in as `children` and is the one client
// island on the page.

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    {children}
  </section>
);

export default function ToolShell({ tool, howItWorks, assumptions, considerations, children }) {
  const category = categoryById(tool.category);
  const related = relatedTools(tool.slug);

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/tools" className="transition-colors hover:text-foreground">
                Tools
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li>{category?.name}</li>
            <li aria-hidden>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li aria-current="page" className="text-foreground">
              {tool.name}
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
          {/* The user's own question, in their words, so the page confirms
              they are in the right place before they type anything. */}
          <p className="mt-3 text-lg text-muted-foreground">{tool.question}</p>
        </header>

        {/* The calculator comes before any explanation: someone who arrived
            here wants to use it, not read about it first. */}
        <div className="mt-8">{children}</div>

        <div className="mt-14 space-y-10 border-t pt-10">
          <Section title="How this works">
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {howItWorks}
            </div>
          </Section>

          <Section title="What it assumes">
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {assumptions.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Worth knowing">
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {considerations.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {/* Present on every tool, in the same place, in the same words.
                Visible without shouting. */}
            <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              This is a planning estimate, not financial advice. It reflects the
              figures and assumptions you entered — real outcomes depend on
              things no calculator can know. Check anything important with a
              qualified adviser before acting on it.
            </p>
          </Section>

          {related.length > 0 && (
            <Section title="Related tools">
              <ul className="grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={toolPath(item.slug)}
                      className="group flex h-full flex-col rounded-xl border p-4 transition-colors hover:border-foreground/20 hover:bg-accent/50"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="mt-1 text-sm text-muted-foreground">{item.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <section className="rounded-xl border bg-muted/40 p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Stop estimating. Start tracking.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              These tools work from numbers you type in. WHealthOS works from
              the ones you actually spend — your accounts, budgets and goals in
              one place, updated as you go.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard">
                Open WHealthOS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
