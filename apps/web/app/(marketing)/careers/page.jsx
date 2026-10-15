import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COMPANY_LINKS } from "@/lib/company/links";
import { HIRING_STATUS, OPENINGS, WHAT_THIS_IS } from "@/lib/company/careers";
import { CONTACT_EMAIL } from "@/lib/company/contact";
import { REPOSITORY } from "@/lib/company/open-source";

export const metadata = {
  title: "Careers | WHealthOS",
  description:
    "WHealthOS is pre-launch and built by one person. There are no open roles right now — here is what the project is, and how to reach us if you have something specific in mind.",
  alternates: { canonical: "/careers" },
};

// The Careers page.
//
// There are no vacancies, so the page's job is to say that in the first line
// and then be useful anyway: what the project actually is, how work gets done
// here, and the two real ways to get involved today -- the code, and a direct
// message.
//
// It renders openings when lib/company/careers.js has any, so adding a real
// role is a data change rather than a rewrite. Until then there is no
// application form, because a form that takes a name, a history and a CV into
// a flow with no recipient is worse than an honest empty state.

// Reused for both states so the page's rhythm does not change when a role
// appears.
const Block = ({ id, title, children }) => (
  <section aria-labelledby={id} className="border-t pt-10">
    <h2 id={id} className="text-xl font-semibold tracking-tight sm:text-2xl">
      {title}
    </h2>
    <div className="mt-4">{children}</div>
  </section>
);

const Opening = ({ opening }) => (
  <article className="rounded-xl border p-6">
    <h3 className="text-lg font-semibold tracking-tight">{opening.title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      {opening.arrangement}
      {opening.location ? ` · ${opening.location}` : ""}
    </p>
    <p className="mt-4 text-[0.975rem] leading-7 text-muted-foreground">
      {opening.summary}
    </p>
    {opening.responsibilities?.length > 0 && (
      <>
        <h4 className="mt-5 text-sm font-semibold">What you would do</h4>
        <ul className="mt-2 space-y-2 text-[0.975rem] leading-7 text-muted-foreground">
          {opening.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </>
    )}
    {opening.requirements?.length > 0 && (
      <>
        <h4 className="mt-5 text-sm font-semibold">What it needs</h4>
        <ul className="mt-2 space-y-2 text-[0.975rem] leading-7 text-muted-foreground">
          {opening.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </>
    )}
    <p className="mt-5 text-[0.975rem] leading-7 text-muted-foreground">
      {opening.howToApply}
    </p>
  </article>
);

export default function CareersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Careers
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            {HIRING_STATUS.summary}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Accurate as of {HIRING_STATUS.asOf}. This page is the only place
            WHealthOS advertises roles, so if it says there are none, there are
            none.
          </p>
        </header>

        <div className="mt-14 space-y-12">
          {OPENINGS.length > 0 ? (
            <Block id="openings" title="Open roles">
              <div className="space-y-6">
                {OPENINGS.map((opening) => (
                  <Opening key={opening.title} opening={opening} />
                ))}
              </div>
            </Block>
          ) : (
            <Block id="openings" title="No open roles">
              <p className="text-[0.975rem] leading-7 text-muted-foreground">
                No vacancies, no pipeline, and no “we’re always looking for
                exceptional people” — there is no hiring budget to spend. When
                that changes, the role will be written out here with what it
                involves, what it needs and how to apply, and not before.
              </p>
            </Block>
          )}

          <Block id="what-this-is" title="What the project actually is">
            <dl className="space-y-6">
              {WHAT_THIS_IS.map(({ title, body }) => (
                <div key={title}>
                  <dt className="text-base font-semibold">{title}</dt>
                  <dd className="mt-1.5 text-[0.975rem] leading-7 text-muted-foreground">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </Block>

          <Block id="get-involved" title="If you want to get involved now">
            <p className="text-[0.975rem] leading-7 text-muted-foreground">
              The code is public. Reading it, filing a bug or sending a change
              is the one way to work on WHealthOS today, and it needs nobody’s
              permission — the{" "}
              <Link
                href={COMPANY_LINKS.openSource}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Open Source page
              </Link>{" "}
              sets out what the repository holds and how to report things.
            </p>
            <p className="mt-4 text-[0.975rem] leading-7 text-muted-foreground">
              If you have something specific in mind — a collaboration, or a
              role you think should exist — write and say so plainly. There is
              no CV to upload and nothing to fill in beyond a message.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href={COMPANY_LINKS.contact}>Send a message</Link>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={REPOSITORY.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Read the code
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Or email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Block>
        </div>
      </div>
    </div>
  );
}
