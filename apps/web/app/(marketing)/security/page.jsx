import Link from "next/link";
import { SECURITY } from "@/lib/legal/security";
import { LEGAL_LINKS } from "@/lib/legal/versions";
import { POLICY } from "@/lib/legal/policy";
import {
  Callout, H3, Item, List, P, Section, TableOfContents,
} from "@/components/legal/prose";

export const metadata = {
  title: "Security | WHealthOS",
  description:
    "The safeguards protecting your WHealthOS account and financial records, and the limits of those safeguards.",
  alternates: { canonical: "/security" },
};

// The security page.
//
// Built from lib/legal/security.js, where every claim below carries the
// evidence it was established from. The discipline that matters here is what
// the page leaves out: row-level security, two-step verification, backups,
// monitoring, dependency scanning and penetration testing were all examined
// during the audit and are all absent from this page, because none of them
// could be stated truthfully about production today. Those omissions are
// recorded in security.js so nobody later mistakes silence for oversight.
//
// If you are adding a claim here, add its evidence to security.js first. If
// there is no evidence, the claim does not go on the page.
//
// Server-rendered with no client JavaScript, like the other legal pages.

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "account", title: "Your account and sign-in" },
  { id: "abuse", title: "Application and abuse protection" },
  { id: "records", title: "Protecting your financial records" },
  { id: "not-collected", title: "What we deliberately do not hold" },
  { id: "development", title: "How changes are made" },
  { id: "response", title: "Monitoring and response" },
  { id: "report", title: "Reporting a security concern" },
  { id: "limits", title: "Limits of this page" },
  { id: "related", title: "Related documents" },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Security</h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          What protects your financial records, and what does not.
        </p>
        {/* A security page with no date on it is a claim about an unknown
            moment. This one names the day the claims below were last checked
            against the running application. */}
        <p className="mt-4 text-sm text-muted-foreground">
          Last reviewed {SECURITY.lastReviewed}
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:order-last lg:col-start-1 lg:row-start-1">
          <TableOfContents sections={SECTIONS} />
        </div>

        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="overview" number="1" title="Overview">
            <P>
              WHealthOS holds a record of what you earn, what you spend and
              what you owe. That is sensitive whether or not it can be used to
              move money, and it deserves to be looked after properly.
            </P>
            <P>
              This page describes the safeguards that are actually in place
              today. It is deliberately specific, and deliberately incomplete:
              a safeguard that is planned, partly built, or provided by someone
              else is not described here as though it were ours and working.
              Where something a reader might expect is missing from this page,
              the honest reading is that it is not in place.
            </P>
            <Callout>
              No service can promise that it will never suffer a security
              incident, and this page is not that promise. It is a description
              of the measures in place, so that you can judge for yourself
              whether they are enough for the information you are entering.
            </Callout>
          </Section>

          <Section id="account" number="2" title="Your account and sign-in">
            <P>
              Signing in is handled by Clerk, an authentication provider.
              Clerk holds your credentials and issues the session that proves
              to WHealthOS who you are.
            </P>
            <P>
              WHealthOS never receives or stores your password. This is a
              property of how the application is built rather than a policy
              it follows: the database has no column that could hold a
              password or a password hash. The only identity details WHealthOS
              keeps are an account identifier, your email address, your name
              and your profile image.
            </P>
            <P>
              The options available for protecting your sign-in &mdash; and the
              ability to sign out of your sessions or close your sign-in
              entirely &mdash; live in the account screen reached from your
              profile menu, which is Clerk&rsquo;s. We do not list them here,
              because the authoritative answer is the one that screen shows
              you.
            </P>
            <Callout>
              Closing your sign-in there removes your ability to sign in. It
              does not delete the financial records held under your WHealthOS
              account. If you want those removed, write to us using the
              address in section 8 before closing your sign-in.
            </Callout>
          </Section>

          <Section id="abuse" number="3" title="Application and abuse protection">
            <P>
              Requests to WHealthOS pass through Arcjet before they reach the
              application. Two protections run there: a shield that inspects
              requests for common application-layer attack patterns, and bot
              detection, which runs in enforcing mode in production rather
              than merely reporting.
            </P>
            <P>
              Separately, the operations that cost something &mdash; creating
              transactions, scanning a receipt, creating an account, and
              editing or deleting records &mdash; each carry their own rate
              limit, counted per account. The limits are not published, since
              publishing them would mainly help someone work around them.
            </P>
            <P>
              These protections reduce automated abuse. They are not a
              substitute for the application being written safely in the first
              place, and they are not described here as one. Nothing on this
              page should be read as a claim that every malicious request is
              blocked, or that WHealthOS is protected against
              denial-of-service attacks at any scale.
            </P>
          </Section>

          <Section id="records" number="4" title="Protecting your financial records">
            <H3 id="records-authorization">Every request is checked on the server</H3>
            <P>
              Hiding a button is not security. Every operation that reads or
              writes your records re-establishes who you are on the server,
              from the session rather than from anything the browser sent, and
              then scopes what it does to your own account.
            </P>
            <P>
              When a page or an action is given the identifier of a record
              &mdash; an account, a transaction, a card, a goal &mdash; that
              identifier is matched against your own account before the record
              is read or changed. An identifier belonging to someone else does
              not return their data; it returns nothing. Submitted data is
              re-validated on the server and unknown fields are discarded, so
              a crafted request cannot claim to belong to a different account.
            </P>
            <P>
              This is covered by automated tests that attempt exactly those
              things &mdash; reading another account&rsquo;s transaction,
              posting into another account&rsquo;s ledger, deleting records
              that are not the caller&rsquo;s, and submitting a payload that
              tries to reassign ownership &mdash; and require each attempt to
              be refused. They run against a real database, not a mock.
            </P>

            <H3 id="records-transport">In transit and at rest</H3>
            <P>
              The site is served only over HTTPS, and it instructs browsers to
              refuse to connect any other way for the next two years.
            </P>
            {SECURITY.responseHeaders && (
              <P>
                Every response also carries headers that narrow what a browser
                will do with the page: it may not be framed by another site, it
                must respect the content type we declare rather than guessing
                at it, it passes only our origin and not the full address when
                you follow a link off-site, and it is denied the microphone,
                location, payment and USB interfaces outright. These reduce the
                damage a flaw could do. They do not prevent one, and they are
                not a content security policy &mdash; WHealthOS does not have
                one of those yet.
              </P>
            )}
            <P>
              Your records are held in a Supabase PostgreSQL database.{" "}
              {SECURITY.encryptionAtRestProvider}&rsquo;s own data processing
              documentation states that the underlying disks are encrypted at
              rest with AES-256 and that encryption keys are held in hardware
              security modules. That is the provider&rsquo;s statement about
              its infrastructure, and it is repeated here as such &mdash; it is
              not a property WHealthOS implements, and it is not end-to-end
              encryption. WHealthOS can read your records in order to show
              them to you, and so can anyone with administrative access to the
              database.
            </P>
            <P>
              Both halves of the service sit in {SECURITY.dataRegion}. The{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              lists every other company that receives any of your data and
              what each one gets.
            </P>

            <H3 id="records-access">Who can see your records</H3>
            <P>
              WHealthOS is run by one person, who has administrative access to
              the database in order to operate it. There is no support team
              with a view of your account, and no internal tool for browsing
              other people&rsquo;s records &mdash; but there is no technical
              barrier that would stop the operator from reading the database
              either, and it would be dishonest to imply otherwise.
            </P>
          </Section>

          <Section id="not-collected" number="5" title="What we deliberately do not hold">
            <P>
              The most reliable way to protect a piece of information is not
              to have it. WHealthOS has no field for any of the following, so
              there is nothing to leak:
            </P>
            <List>
              <Item>
                <strong>Full card numbers, CVVs and PINs.</strong> A card
                record holds its name, issuer, network, type, expiry month and
                year, credit limit, billing and due day, and the last four
                digits &mdash; which are a label, not something that could be
                used to pay with.
              </Item>
              <Item>
                <strong>Bank credentials.</strong> WHealthOS does not connect
                to your bank, does not ask for net-banking or UPI
                credentials, and cannot initiate a payment. Balances are the
                ones you type in.
              </Item>
              <Item>
                <strong>Receipt images.</strong> A photo you submit to the
                receipt scanner is read once and discarded. There is no file
                store behind WHealthOS and no attachment table in the
                database. What is kept is the transaction you confirm.
              </Item>
            </List>
            <P>
              Your financial records are also not stored in your browser.
              What is kept there is your display preferences and a timestamp
              for which notifications you have seen. The one exception is the
              signed-out demo, where the figures are made up by whoever is
              using it and never leave their own browser.
            </P>
          </Section>

          <Section id="development" number="6" title="How changes are made">
            <P>
              Before a change is published it has to pass the linter and an
              automated test suite that runs against a real database, including
              the cross-account tests described in section 4 and tests that
              check a legal-consent record cannot be forged. Database changes
              are applied as migrations, which are kept permanently, so there
              is a record of every change the production schema has had.
            </P>
            <P>
              Those checks are run deliberately, by a person, before
              publishing. There is no automated pipeline that runs them on
              every change, no automated dependency-vulnerability scanning, no
              formal second-reviewer process, and no penetration test has been
              commissioned. If any of that changes, it will be described here
              and not before.
            </P>
          </Section>

          <Section id="response" number="7" title="Monitoring and response">
            <P>
              Server-side failures are logged where the application runs, and
              the hosting, database and security providers each keep their own
              logs. Those are read when something is being investigated.
            </P>
            <P>
              There is no automated alerting, no on-call rota and no
              round-the-clock monitoring. WHealthOS is operated by one person,
              so how quickly something is noticed and dealt with depends on
              that person being available. We would rather you knew that than
              read a paragraph implying a security operations centre that does
              not exist.
            </P>
            <P>
              If an incident occurred that affected your data, we would tell
              you about it and say what we knew. We are not setting out a
              notification deadline on this page, because a commitment nothing
              enforces is worth less than an honest description. Where the law
              that applies to you sets one, the law applies regardless of what
              this page says.
            </P>
          </Section>

          <Section id="report" number="8" title="Reporting a security concern">
            <P>
              If you believe you have found a vulnerability in WHealthOS,
              please write to{" "}
              <a
                href={`mailto:${POLICY.privacyContact.value}`}
                className="underline underline-offset-4"
              >
                {POLICY.privacyContact.value}
              </a>
              . Describe what you found and how to reproduce it. We read that
              address, and we will come back to you as soon as we reasonably
              can &mdash; we are not promising a response time we cannot keep.
            </P>
            <H3 id="report-conduct">While you are investigating</H3>
            <P>Please do not:</P>
            <List>
              <Item>
                access, modify or download data belonging to anyone but
                yourself &mdash; if a flaw would expose someone else&rsquo;s
                records, stop and describe it rather than proving it;
              </Item>
              <Item>
                run automated scanners, load tests or anything else that
                degrades the service for other people;
              </Item>
              <Item>
                delete or alter data, or attempt to maintain access once you
                have demonstrated the issue;
              </Item>
              <Item>
                publish the issue before we have had a reasonable opportunity
                to fix it;
              </Item>
              <Item>
                use social engineering, phishing, or physical approaches
                against anyone.
              </Item>
            </List>
            <P>
              WHealthOS does not run a bug bounty programme, does not pay for
              reports, and is not offering a legal safe harbour on this page.
              Reports are welcome nonetheless, and good-faith research is
              treated as the help it is.
            </P>
          </Section>

          <Section id="limits" number="9" title="Limits of this page">
            <P>
              The measures described here reduce risk. They do not eliminate
              it. Software has defects, providers have outages and incidents,
              and a determined attacker with enough time is a real
              possibility for any service.
            </P>
            <P>
              This page is a description of documented safeguards at the date
              at the top. It is not a certification, not an audit, not a
              warranty, and not a statement of compliance with any law or
              standard. WHealthOS holds no security certification and has not
              been assessed against one. Some of what protects your data is
              provided by Clerk, Supabase, Vercel and Arcjet under their own
              terms, and this page cannot speak for them beyond what their
              documentation says.
            </P>
            <P>
              Part of keeping your records safe is yours: use a strong, unique
              password or a Google account you control, keep your email
              account secure, and sign out on devices other people can reach.
            </P>
          </Section>

          <Section id="related" number="10" title="Related documents">
            <P>
              The{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              explains what personal information WHealthOS collects, why, who
              it is shared with and what rights you have over it. The{" "}
              <Link href={LEGAL_LINKS.terms} className="underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              set out the agreement governing your use of WHealthOS, including
              what it is not and where responsibility sits.
            </P>
            <P>
              This page is reviewed when the safeguards it describes change.
              There is no fixed review schedule, and the date at the top is
              the honest answer to when it was last checked.
            </P>
          </Section>
        </div>
      </div>
    </div>
  );
}
