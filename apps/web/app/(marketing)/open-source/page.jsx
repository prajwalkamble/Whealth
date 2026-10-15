import Link from "next/link";
import { Bug, FileText, Github, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY_LINKS } from "@/lib/company/links";
import { CONTACT_EMAIL } from "@/lib/company/contact";
import {
  NOT_YET_PUBLISHED,
  OPEN_SOURCE_VERIFIED_ON,
  PHILOSOPHY,
  PUBLISHED,
  REPOSITORY,
  SERVICE_BOUNDARY,
} from "@/lib/company/open-source";

export const metadata = {
  title: "Open Source | WHealthOS",
  description:
    "WHealthOS is developed in the open. The repository, the licence that applies to it, and how to report a bug or a security issue.",
  alternates: { canonical: "/open-source" },
};

// The Open Source page.
//
// Every link and every licence statement here comes from lib/company/
// open-source.js, where each one carries the evidence it was established
// from -- including the one fact that makes this page awkward to write: the
// published branch is behind this development tree and carries a different
// licence from it.
//
// That is stated rather than smoothed over. The alternative is announcing
// Apache-2.0 on a page while the repository a reader downloads says MIT, which
// is a false statement about the terms they would be relying on.
//
// Deliberately absent: stars, forks, contributor counts, download figures, a
// commit graph and a "good first issue" board. The numbers are zero or one,
// and links to files that are not on the published branch would 404.

const ExternalLink = ({ href, children, className }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className={className ?? "font-medium text-foreground underline underline-offset-4"}
  >
    {children}
    <span className="sr-only"> (opens in a new tab)</span>
  </a>
);

const Section = ({ id, title, children }) => (
  <section aria-labelledby={id} className="scroll-mt-24 border-t pt-10">
    <h2 id={id} className="text-xl font-semibold tracking-tight sm:text-2xl">
      {title}
    </h2>
    <div className="mt-4 space-y-4 text-[0.975rem] leading-7 text-muted-foreground">
      {children}
    </div>
  </section>
);

export default function OpenSourcePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Open source
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
          WHealthOS is one application, and its source is public. If a page here
          claims a figure is arithmetic over your own records, you can go and
          read the arithmetic.
        </p>
      </header>

      {/* The repository panel. One real repository, described by what is in
          it -- not a dashboard of metrics that are all zero. */}
      <div className="mt-10 rounded-2xl border bg-muted/30 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              The repository
            </p>
            {/* The repository name only. The GitHub account it sits under is
                a person's handle, and the operator asked for their name to
                stay off the site -- it is in the link, where it has to be,
                and not printed as a heading. */}
            <h2 className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-bold tracking-tight">
              <span className="font-mono text-xl sm:text-2xl">
                {REPOSITORY.name}
              </span>
              <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {REPOSITORY.visibility}
              </span>
            </h2>
            <p className="mt-4 max-w-2xl text-[0.975rem] leading-7 text-muted-foreground">
              {REPOSITORY.what}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              The repository predates the rename to WHealthOS, which is why its
              name is still <span className="font-mono">{REPOSITORY.name}</span>
              .
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <Button asChild>
              <a href={REPOSITORY.url} target="_blank" rel="noreferrer noopener">
                <Github className="h-4 w-4" />
                View on GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={REPOSITORY.issuesUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Bug className="h-4 w-4" />
                Issues
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Only files that exist on the published branch are linked. */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t pt-5 text-sm">
          {PUBLISHED.files.map((file) => (
            <span key={file.path} className="inline-flex items-center gap-1.5">
              <FileText aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
              <ExternalLink href={file.url}>{file.label}</ExternalLink>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="why" title="Why it is open">
            <ul className="space-y-3">
              {PHILOSOPHY.map((line) => (
                <li key={line} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-3 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60"
                  />
                  <span className="min-w-0">{line}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="licence" title="The licence that applies">
            <p>
              <span className="font-medium text-foreground">
                What you can clone today is under the {PUBLISHED.license.name}
              </span>{" "}
              — the{" "}
              <ExternalLink
                href={PUBLISHED.files.find((file) => file.path === "LICENSE")?.url}
              >
                LICENSE
              </ExternalLink>{" "}
              file on <span className="font-mono">{REPOSITORY.defaultBranch}</span>{" "}
              is the one that governs it, and it is the one to rely on.
            </p>
            {!PUBLISHED.current && (
              <p>
                The development tree has since moved to the{" "}
                {NOT_YET_PUBLISHED.license.name}, with a NOTICE, contributor
                terms and explicit trademark terms alongside it. That work is
                not published yet: the public branch was last updated on{" "}
                {PUBLISHED.lastPush} and is {PUBLISHED.commitsBehind} commits
                behind. Nothing on this page changes the terms of the code that
                is actually out there, and the files listed below are named
                rather than linked because they are not on the published branch
                for anyone to open.
              </p>
            )}
            <ul className="space-y-2">
              {NOT_YET_PUBLISHED.documents.map((document) => (
                <li key={document.label} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-3 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60"
                  />
                  <span className="min-w-0">
                    <span className="font-mono text-sm text-foreground">
                      {document.label}
                    </span>{" "}
                    — {document.what}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Checked against the published branch on {OPEN_SOURCE_VERIFIED_ON}.
            </p>
          </Section>

          <Section id="contributing" title="Reporting a bug, or sending a change">
            <p>
              Bugs and suggestions go in the{" "}
              <ExternalLink href={REPOSITORY.issuesUrl}>issue tracker</ExternalLink>
              . What helps most: what you did, what happened, what you expected
              instead, and the page you were on. A screenshot is welcome as long
              as the figures in it are ones you are happy to publish — issues
              are public.
            </p>
            <p>
              Changes are welcome as pull requests against{" "}
              <span className="font-mono">{REPOSITORY.defaultBranch}</span>. A
              change is expected to pass the same three checks the project runs
              before anything lands — <span className="font-mono">lint</span>,{" "}
              <span className="font-mono">test</span> and a production{" "}
              <span className="font-mono">build</span>, all defined as scripts
              in the repository. The written contribution guide is part of the
              unpublished work above, so until it lands the honest answer is:
              open an issue first if the change is more than small, and ask.
            </p>
            <p>
              If you would rather not report something in public, the{" "}
              <Link
                href={COMPANY_LINKS.contact}
                className="font-medium text-foreground underline underline-offset-4"
              >
                contact form
              </Link>{" "}
              reaches the same person.
            </p>
          </Section>

          <Section id="security" title="Reporting a security issue">
            <div className="rounded-xl border bg-muted/40 p-5 text-foreground">
              <p className="flex items-start gap-3 text-[0.975rem] leading-7">
                <ShieldAlert
                  aria-hidden
                  className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground"
                />
                <span>
                  Please do not open a public issue for a vulnerability. Email{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {CONTACT_EMAIL}
                  </a>{" "}
                  with what you found, how to reproduce it and the impact you
                  believe it has. You will get an acknowledgement; there is one
                  person reading, so it will not be instant.
                </span>
              </p>
            </div>
            <p>
              What this application is most concerned with — tenant isolation,
              the public endpoint surface, and what is deliberately never
              stored — is set out on the{" "}
              <Link href="/security" className="font-medium text-foreground underline underline-offset-4">
                Security page
              </Link>
              , along with the limits of each of those claims.
            </p>
          </Section>

          <Section id="boundary" title="The source and the service are not the same thing">
            <dl className="space-y-6">
              {SERVICE_BOUNDARY.map(({ title, body }) => (
                <div key={title}>
                  <dt className="text-base font-semibold text-foreground">
                    {title}
                  </dt>
                  <dd className="mt-1.5">{body}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-muted/30 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider">
              At a glance
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Repository</dt>
                <dd className="mt-0.5 font-medium">
                  <ExternalLink href={REPOSITORY.url}>
                    {REPOSITORY.name} on GitHub
                  </ExternalLink>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Licence, as published</dt>
                <dd className="mt-0.5 font-medium">{PUBLISHED.license.spdx}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Issues</dt>
                <dd className="mt-0.5 font-medium">
                  {REPOSITORY.issuesEnabled ? "Open" : "Closed"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last published update</dt>
                <dd className="mt-0.5 font-medium">{PUBLISHED.lastPush}</dd>
              </div>
            </dl>
            <p className="mt-5 border-t pt-4 text-sm leading-6 text-muted-foreground">
              There are no star, fork or contributor counts on this page. They
              would be zeroes dressed up as momentum.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
