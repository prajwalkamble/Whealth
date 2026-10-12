import Link from "next/link";
import {
  COOKIE_AUDIT_DATE, NOT_PRESENT, STORAGE_INVENTORY, THIRD_PARTY_HOSTS,
} from "@/lib/legal/cookies";
import { LEGAL_LINKS } from "@/lib/legal/versions";
import { POLICY } from "@/lib/legal/policy";
import { SECURITY_LINK } from "@/lib/legal/security";
import {
  Callout, DataTable, H3, Item, List, P, Section, TableOfContents,
} from "@/components/legal/prose";

export const metadata = {
  title: "Cookie Policy | WHealthOS",
  description:
    "Every cookie and browser storage key WHealthOS uses, what each one does, and the choices you have over them.",
  alternates: { canonical: "/cookie-policy" },
};

// The cookie policy.
//
// Built from lib/legal/cookies.js, where each row carries the evidence it was
// established from: observed in a real browser, read out of the source, or
// taken from the provider's documentation. The table below renders those rows
// rather than restating them, so the page cannot drift from the audit.
//
// Re-audited after the sign-in software was taken off the public pages. The
// provider telemetry this policy used to have to disclose -- an outbound
// request on every page and a local entry throttling it -- is gone, along with
// the configuration cache that came with it. What is left on a public page is
// the authentication cookie the middleware sets, and this page does not claim
// that is exempt either: section 9 says what is settled and what is not.
//
// It still does not present a consent banner, because none has been built:
// section 7 says what you can actually do today rather than describing a
// control that is not there.
//
// Server-rendered with no client JavaScript, like the other legal pages.

const SECTIONS = [
  { id: "about", title: "About this policy" },
  { id: "what", title: "Cookies and similar technologies" },
  { id: "how", title: "How WHealthOS uses them" },
  { id: "categories", title: "Categories" },
  { id: "inventory", title: "What is stored" },
  { id: "third-parties", title: "Third parties" },
  { id: "choices", title: "Your choices" },
  { id: "browser", title: "Browser controls" },
  { id: "international", title: "If you are outside India" },
  { id: "changes", title: "Changes and contact" },
];

const TYPE_LABEL = {
  cookie: "Cookie",
  localStorage: "Local storage",
  sessionStorage: "Session storage",
};

const EVIDENCE_LABEL = {
  observed: "Observed in the browser",
  source: "Read from our source code",
  "provider-docs": "From the provider's documentation",
};

// Four columns, not six. At the tablet width where DataTable switches from
// its stacked form to a real table, six columns of prose overflowed the
// clipped container and cut the text off. Who sets it, where it applies and
// how it was established read perfectly well as a line under the name.
const columns = [
  { key: "name", label: "Name" },
  { key: "kind", label: "Type" },
  { key: "purpose", label: "What it does" },
  { key: "duration", label: "How long" },
];

const rows = STORAGE_INVENTORY.map((entry) => ({
  name: entry.name,
  note: `${entry.provider}${entry.party === "third" ? " (third party)" : ""} · ${entry.where} · ${EVIDENCE_LABEL[entry.evidence].toLowerCase()}`,
  kind: TYPE_LABEL[entry.type],
  purpose: entry.note ? `${entry.purpose} ${entry.note}` : entry.purpose,
  duration: entry.duration,
}));

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Cookie Policy</h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          What WHealthOS stores on your device, and what you can do about it.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Audited {COOKIE_AUDIT_DATE}
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:order-last lg:col-start-1 lg:row-start-1">
          <TableOfContents sections={SECTIONS} />
        </div>

        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="about" number="1" title="About this policy">
            <P>
              This policy explains what WHealthOS stores on your device, what
              each item does, and what you can do about it. It sits alongside
              the{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>
              , which covers personal information more broadly. Where they
              overlap, the Privacy Policy governs.
            </P>
            <P>
              The list in section 5 is not a template. Each entry was
              established on {COOKIE_AUDIT_DATE} either by loading WHealthOS in
              a clean browser and recording everything it stored, or by reading
              the code that writes it. Each row says which.
            </P>
          </Section>

          <Section id="what" number="2" title="Cookies and similar technologies">
            <P>
              A <strong>cookie</strong> is a small piece of text a site asks
              your browser to keep and send back on later visits.{" "}
              <strong>Local storage</strong> and <strong>session storage</strong>{" "}
              hold more, are read only by code running on the page, and are
              never sent automatically with a request &mdash; local storage
              lasts until it is cleared, session storage until the tab closes.
            </P>
            <P>
              The law in several places treats all three the same way, because
              what matters is that something is being kept on your device, not
              which mechanism keeps it. This policy therefore lists all three
              together rather than only the cookies.
            </P>
          </Section>

          <Section id="how" number="3" title="How WHealthOS uses them">
            <P>There are three reasons anything is stored on your device:</P>
            <List>
              <Item>
                <strong>To keep you signed in.</strong> Our authentication
                provider sets what it needs to recognise your session.
              </Item>
              <Item>
                <strong>To remember how you like the app to look.</strong> Your
                theme, appearance settings and whether the sidebar is open.
              </Item>
              <Item>
                <strong>To make a few things work correctly.</strong> The
                figures you type into the signed-out demo, the marker that
                stops a failed page reloading in a loop, and a record of when
                you last looked at notifications.
              </Item>
            </List>
            <Callout>
              There is no analytics on WHealthOS, no advertising, no marketing
              tag, no tracking pixel and no embedded third-party content. That
              is not a slogan: section 5 lists what was searched for and not
              found, and section 6 names every outside address your browser
              contacts.
            </Callout>
          </Section>

          <Section id="categories" number="4" title="Categories">
            <H3 id="categories-essential">Necessary</H3>
            <P>
              Needed for something you asked for. Signing in and staying signed
              in, and the marker that prevents a reload loop. Switch these off
              and the account side of WHealthOS does not work.
            </P>

            <H3 id="categories-preferences">Appearance and preferences</H3>
            <P>
              Written only when you change something: your theme, your
              appearance settings, the sidebar. Clearing them loses the
              setting, nothing else.
            </P>

<H3 id="categories-telemetry">What used to be here</H3>
            <P>
              Our authentication provider&rsquo;s software used to report usage
              information about itself to its own telemetry service, from every
              page, including pages with nothing to sign in to. It also cached
              its configuration in your browser on those pages.
            </P>
            <Callout>
              <strong>Neither happens any more.</strong> The telemetry is
              switched off, and the sign-in software is no longer loaded on the
              public pages at all, so there is nothing on them to cache. This
              was the one item on this page that we could not argue was exempt
              from consent in the EEA and the UK, and removing it was a better
              answer than asking you to agree to it.
            </Callout>

            <H3 id="categories-none">Analytics and advertising</H3>
            <P>None. No such technology is present.</P>
          </Section>

          <Section id="inventory" number="5" title="What is stored">
            <P>
              Every item found, with the evidence for each. &ldquo;Until
              cleared&rdquo; means it stays until you remove it through your
              browser.
            </P>
            <DataTable columns={columns} rows={rows} />

            <H3 id="inventory-absent">Searched for and not found</H3>
            <List>
              {NOT_PRESENT.map((item) => (
                <Item key={item}>{item}</Item>
              ))}
            </List>
            <P>
              Two limits worth stating. The browser sweep ran signed out, so
              the signed-in entries above come from our own source code and
              from the provider&rsquo;s documentation rather than from
              observation. And it ran against a development configuration of
              the authentication provider, which the provider documents as
              behaving differently from the live one &mdash; so the live site
              may set a slightly different set of its cookies than the names
              above.
            </P>
          </Section>

          <Section id="third-parties" number="6" title="Third parties">
            <P>
              These are the addresses outside WHealthOS that your browser may
              contact. Only the first is reached on an ordinary public page
              signed out; the others belong to the sign-in screens:
            </P>
            <List>
              {THIRD_PARTY_HOSTS.map(({ host, why }) => (
                <Item key={host}>
                  <strong>{host}.</strong> {why}
                </Item>
              ))}
            </List>
            <P>
              Each connection reveals your IP address and basic browser
              information to the party receiving it, as any connection does.
              The{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              lists every company that receives data from WHealthOS and what
              each one gets.
            </P>
          </Section>

          <Section id="choices" number="7" title="Your choices">
            <P>
              WHealthOS has no cookie banner. We are not going to describe one
              that does not exist, so here is what you can actually do today:
            </P>
            <List>
              <Item>
                <strong>Appearance and preferences.</strong> Change or reset
                them in the app&rsquo;s settings, or clear them in your browser.
                Nothing breaks.
              </Item>
              <Item>
                <strong>The demo figures.</strong> Clearing site data for
                WHealthOS removes them. They never leave your browser.
              </Item>
              <Item>
                <strong>Sign-in.</strong> Signing out ends the session. The
                provider&rsquo;s own account screen, reached from your profile
                menu, can sign you out everywhere.
              </Item>
              <Item>
                <strong>Everything.</strong> Blocking cookies and site data for
                this site in your browser stops all of it. It will also stop
                you signing in, because the sign-in cookie is how a session is
                kept.
              </Item>
            </List>
            <P>
              There is nothing here to opt out of for analytics or advertising,
              because there is none. If something on this page concerns you,
              the address in section 10 reaches a person.
            </P>
          </Section>

          <Section id="browser" number="8" title="Browser controls">
            <P>
              Every major browser can block or delete cookies and site data,
              per site or entirely, usually under privacy or site settings.
              Private or incognito windows discard the lot when closed.
            </P>
            <P>
              Blocking cookies for WHealthOS prevents signing in, because the
              session cannot be kept. Deleting site data signs you out and
              resets your appearance settings in that browser; for an account,
              the settings saved on the account are restored next time you sign
              in. None of your financial records are stored in the browser, so
              clearing it never loses them &mdash; the{" "}
              <Link href={SECURITY_LINK} className="underline underline-offset-4">
                Security page
              </Link>{" "}
              explains where they are kept.
            </P>
            <P>
              Browser controls are not a substitute for a service asking your
              permission where the law requires it. Where that applies to
              WHealthOS, section 9 says so plainly instead of pointing you at
              your browser settings.
            </P>
          </Section>

          <Section id="international" number="9" title="If you are outside India">
            <P>
              WHealthOS is operated from India and is built for Indian users.
              Indian data protection law does not currently impose the
              cookie-banner rules familiar from Europe; it governs what is done
              with personal information rather than what is stored on a device.
            </P>
            <P>
              In the <strong>EEA and the United Kingdom</strong> the rules are
              different: storing or reading anything on your device generally
              needs your prior agreement unless a specific exception applies.
              Our honest reading is that keeping you signed in and remembering
              how you like the app to look fall within those exceptions. The one
              item we could not argue for &mdash; our authentication
              provider&rsquo;s telemetry, which ran on every page &mdash; has
              been removed rather than defended.
              <br />
              <br />
              One thing is still unsettled, and we would rather name it than
              let the absence of a banner imply otherwise. The authentication
              cookie is set on public pages too, because the same check runs on
              every route. On a page with nothing to sign in to, whether that
              counts as strictly necessary is arguable, and we have not had
              that argument settled. There is no banner and no way to object to
              it short of blocking site data in your browser.
            </P>
            <P>
              In the <strong>United States</strong>, WHealthOS does not sell or
              share personal information, does not use it for targeted
              advertising, and runs no advertising technology, so the opt-out
              rights that attach to those activities do not arise.
            </P>
            <P>
              This section describes our position. It is not legal advice and
              not a claim of compliance in any country.
            </P>
          </Section>

          <Section id="changes" number="10" title="Changes and contact">
            <P>
              This policy is re-audited when what WHealthOS stores changes. The
              date at the top is when the list was last checked against a real
              browser, not when a sentence was last edited.
            </P>
            <P>
              Questions, or a request about anything described here, go to{" "}
              <a
                href={`mailto:${POLICY.privacyContact.value}`}
                className="underline underline-offset-4"
              >
                {POLICY.privacyContact.value}
              </a>
              . The{" "}
              <Link href={LEGAL_LINKS.terms} className="underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              and the{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              cover the rest of your relationship with WHealthOS.
            </P>
          </Section>
        </div>
      </div>
    </div>
  );
}
