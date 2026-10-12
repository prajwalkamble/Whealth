import Link from "next/link";
import { POLICY } from "@/lib/legal/policy";
import { FEATURES, TERMS } from "@/lib/legal/terms";
import {
  Callout, Fact, H3, Item, List, P, Section, TableOfContents,
} from "@/components/legal/prose";

export const metadata = {
  title: "Terms of Service | WHealthOS",
  description:
    "The terms governing your use of WHealthOS and its financial management tools and services.",
  alternates: { canonical: "/terms" },
};

// The terms of service.
//
// Written against what WHealthOS actually is today: one free service, no
// payments, no plan tiers, Apache-licensed code, two AI features. Clauses that
// would describe a billing lifecycle, a refund window or a subscription
// renewal are absent because none of those exist — a contract about a product
// nobody built is worse than no contract.
//
// Server-rendered with no client JavaScript, like the privacy policy.

const SECTIONS = [
  { id: "agreement", title: "These terms" },
  { id: "about", title: "About WHealthOS" },
  { id: "eligibility", title: "Who can use it" },
  { id: "account", title: "Your account" },
  { id: "service", title: "What WHealthOS provides" },
  { id: "plans", title: "Plans and payment" },
  { id: "your-data", title: "Your information, and your part in it" },
  { id: "not-advice", title: "What WHealthOS is not" },
  { id: "tools", title: "The public tools" },
  { id: "ai", title: "AI features" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "ownership", title: "Who owns what" },
  { id: "software", title: "The software licence" },
  { id: "third-parties", title: "Third-party services" },
  { id: "availability", title: "Availability and changes" },
  { id: "termination", title: "Ending your use" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Liability" },
  { id: "your-rights", title: "Rights you keep regardless" },
  { id: "law", title: "Governing law and disputes" },
  { id: "changes", title: "Changes to these terms" },
  { id: "general", title: "General" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Terms of Service</h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          The rules governing your use of WHealthOS.
        </p>
        {/* The version, not a "last updated" line. This exact string is what
            gets written into a consent record when someone accepts, so showing
            it means a person can check which text they agreed to instead of
            taking our word for it. It comes from LEGAL_VERSIONS, which is the
            only place either the page or the record may read it from. */}
        <p className="mt-4 text-sm text-muted-foreground">
          Version <Fact value={TERMS.version} />
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:order-last lg:col-start-1 lg:row-start-1">
          <TableOfContents sections={SECTIONS} />
        </div>

        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="agreement" number="1" title="These terms">
            <P>
              These terms are an agreement between you and WHealthOS about your
              use of the WHealthOS website, application and public tools.
            </P>
            <P>
              If you create an account, you are asked to accept these terms and
              the Privacy Policy before the account is made. The box is not
              ticked for you, and the account is not created until you tick it.
              WHealthOS records which version of each document you accepted and
              when &mdash; you accepted version <Fact value={TERMS.version} />.
              Accounts created before that step existed have no such record,
              and we have not written one for them; those accounts are governed
              by these terms through use rather than through a recorded
              acceptance.
            </P>
            <P>
              The public tools need no account and no acceptance. Using them is
              covered by section 9.
            </P>
            <P>
              Our{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              explains what we do with personal information. It forms part of
              these terms, and where the two could be read differently about
              data, the Privacy Policy governs.
            </P>
          </Section>

          <Section id="about" number="2" title="About WHealthOS">
            <P>
              <Fact value={POLICY.entity} />. It is not yet an incorporated
              company, and no separate legal entity stands behind it. WHealthOS
              is a personal finance application: you record your accounts,
              transactions, budgets and goals, and it organises, totals and
              explains them back to you.
            </P>
          </Section>

          <Section id="eligibility" number="3" title="Who can use it">
            <P>
              You must be 18 or older. WHealthOS is not intended for children,
              and we do not knowingly provide it to them. You also need to be
              able to enter a binding agreement where you live.
            </P>
          </Section>

          <Section id="account" number="4" title="Your account">
            <P>
              You sign in through Clerk, our authentication provider; we never
              see your password. Keep your sign-in details to yourself, and tell
              us promptly if you think someone else has got into your account.
            </P>
            <P>
              Your Clerk sign-in and your WHealthOS records are two separate
              things, and deleting one does not delete the other. This matters
              when you come to close your account, so section 16 says what each
              one does.
            </P>
            <P>
              Give accurate information when you sign up, and keep it current.
              You are responsible for what happens under your account, except
              where it was not reasonably within your control.
            </P>
          </Section>

          <Section id="service" number="5" title="What WHealthOS provides">
            <P>Today the service lets you:</P>
            <List>
              {FEATURES.map((feature) => (
                <Item key={feature}>{feature}</Item>
              ))}
            </List>
            <P>
              That is the whole of it. WHealthOS does not connect to your bank,
              move money, hold funds, or act on your behalf with any financial
              institution. Anything you see in it is there because you entered,
              imported or scanned it.
            </P>
          </Section>

          <Section id="plans" number="6" title="Plans and payment">
            {/* The most important honest statement in this document. The
                pricing page advertises paid tiers; none of them can be bought,
                and none is enforced. Describing a billing lifecycle here would
                be describing a product that does not exist. */}
            <Callout>
              <strong>WHealthOS is free, and we cannot currently take
              payment.</strong> Our pricing page describes paid plans, but they
              are not available yet: there is no checkout, no payment processor
              connected, and no plan limits enforced in the product. Everyone
              uses the same free service.
            </Callout>
            <P>
              Because nothing is sold, there is nothing here about billing
              cycles, automatic renewal, refunds or cancellation of a paid plan.
              If and when paid plans launch, we will set out those terms before
              you can subscribe, and they will not apply retrospectively to your
              use of the free service.
            </P>
          </Section>

          <Section id="your-data" number="7" title="Your information, and your part in it">
            <P>
              WHealthOS works on the figures you give it. It totals, categorises
              and charts what you enter, import or scan — it does not verify any
              of it against your bank or anyone else, because it has no
              connection to them.
            </P>
            <P>
              So the accuracy of what you see depends on the accuracy of what
              went in. Please check anything you are relying on, particularly
              before a decision that matters. If a figure looks wrong to you, it
              may well be: tell us, and we will look into it.
            </P>
            <P>
              That said, this is not a way of disclaiming our own mistakes. If
              WHealthOS calculates something incorrectly, that is our problem to
              fix, not yours to have caught.
            </P>
          </Section>

          <Section id="not-advice" number="8" title="What WHealthOS is not">
            <P>
              WHealthOS is software for organising your own money. It is not a
              bank, a broker, a payment service, an investment manager, a tax
              adviser or a financial adviser, and it is not regulated as any of
              those.
            </P>
            <P>
              Nothing in the product is personal financial, investment, tax or
              legal advice. Its summaries, charts and projections describe the
              figures you gave it. Decisions about your money remain yours, and
              for anything consequential it is worth speaking to someone
              qualified who knows your circumstances.
            </P>
          </Section>

          <Section id="tools" number="9" title="The public tools">
            <P>
              The calculators at{" "}
              <Link href="/tools" className="underline underline-offset-4">
                /tools
              </Link>{" "}
              are free and need no account. The calculation runs entirely in
              your browser: the figures you type stay on your device, and are
              not sent to us, not stored and not logged. We have checked this
              by watching what the page actually transmits, not by assuming it.
            </P>
            <P>
              One thing we should be straight about, because &ldquo;runs in
              your browser&rdquo; can be read too generously. The page itself
              is still a page on the internet, and loading it contacts our
              authentication provider, which is how the site knows whether to
              show you a sign-in button. That happens on every page here, signed
              in or not, and it means your IP address reaches that provider.
              It carries nothing you typed into a calculator. The{" "}
              <Link href="/privacy#providers" className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              lists the providers involved.
            </P>
            <P>
              Each one works from assumptions you can see and change, and its
              page sets them out. The results are estimates, not forecasts or
              guarantees — a projection built on an assumed rate of return tells
              you what that assumption implies, not what will happen.
            </P>
          </Section>

          <Section id="ai" number="10" title="AI features">
            <P>
              Two parts of WHealthOS use an external AI model, Google&apos;s
              Gemini. The receipt scanner reads a photo you upload into a draft
              transaction, and the monthly summary email includes written
              commentary on your totals. Our{" "}
              <Link href="/privacy#ai" className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              sets out exactly what data each one sends.
            </P>
            <P>
              Generated output can be wrong. A scanned receipt can misread an
              amount or a date, which is why you confirm the draft before it is
              saved, and written commentary can misjudge what a figure means.
              Please read both as a starting point rather than a conclusion.
            </P>
            <P>
              The AI does not decide anything about you. It does not score you,
              assess your creditworthiness, approve or refuse anything, or share
              conclusions about you with anyone.
            </P>
            <P>
              The two features differ in a way worth knowing. The receipt
              scanner runs only when you upload a photo, so you control it
              completely: upload nothing and no image ever leaves WHealthOS.
              The monthly summary is not like that. It is produced for every
              account that has an email address, and writing the commentary
              sends that month's income, expenditure and per-category totals to
              Google. It is on by default, and you can turn it off in Settings,
              under Privacy: the report still reaches you with the same figures
              and no commentary, and nothing is sent to Google. If you would
              rather not receive the report at all, write to{" "}
              <Fact value={POLICY.privacyContact} /> and we will stop sending
              it.
            </P>
          </Section>

          <Section id="acceptable-use" number="11" title="Acceptable use">
            <P>Please do not:</P>
            <List>
              <Item>break the law, or use WHealthOS to help someone else do so;</Item>
              <Item>try to reach another person&apos;s account or data;</Item>
              <Item>
                attack or interfere with the service — overwhelming it, evading
                rate limits, or uploading anything malicious;
              </Item>
              <Item>
                probe or test our security without permission, beyond the
                good-faith reporting described below;
              </Item>
              <Item>impersonate someone, or misrepresent who you are.</Item>
            </List>
            <Callout>
              <strong>Security research is welcome.</strong> If you find a
              vulnerability, tell us at{" "}
              <Fact value={POLICY.privacyContact} /> and give us a reasonable
              chance to fix it. We will not treat a good-faith report made that
              way as a breach of these terms.
            </Callout>
          </Section>

          <Section id="ownership" number="12" title="Who owns what">
            <H3>Your information stays yours</H3>
            <P>
              The accounts, transactions, budgets, goals and everything else you
              put into WHealthOS remain yours. We do not claim ownership of them.
            </P>
            <P>
              We need your permission to operate the service on them — to store
              your records, transmit them between your browser and our database,
              calculate totals from them, and display them back to you. You give
              us that permission for those purposes only. It lasts as long as
              your account does, and it does not let us do anything else with
              your information.
            </P>
            <Callout>
              <strong>We do not train AI on your financial records.</strong> The
              only data that reaches an AI provider is described in section 10,
              and it goes there to perform the task you asked for. We claim no
              right to use your records to build or improve a model.
            </Callout>
            <H3>Feedback</H3>
            <P>
              If you send us a suggestion or bug report, we may act on it and
              build what it describes, without owing you anything for it. We do
              not claim ownership of anything else you happen to send us.
            </P>
          </Section>

          <Section id="software" number="13" title="The software licence">
            {/* Distinctive and easy to get wrong: the Terms govern the hosted
                service, while the code is Apache-2.0 and those rights cannot be
                narrowed here. */}
            <P>
              WHealthOS source code is released under the Apache License,
              Version 2.0. These terms govern your use of the service we run at
              whealthos.com. They do not narrow, and cannot narrow, the rights
              that licence gives you in the code itself — including running your
              own copy.
            </P>
            <P>
              The code includes third-party components under their own licences,
              which we do not relicense. The WHealthOS name and logo are
              separate from the code licence: Apache 2.0 section 6 does not
              grant trademark rights, so please do not present your own service
              as WHealthOS or imply we endorse it.
            </P>
          </Section>

          <Section id="third-parties" number="14" title="Third-party services">
            <P>
              WHealthOS runs on services provided by other companies —
              authentication, hosting, the database, email, the AI model, and
              security and scheduling tooling. Our{" "}
              <Link href="/privacy#providers" className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              names each one and what it handles.
            </P>
            <P>
              Those providers have their own terms, and an outage or a change at
              one of them can affect WHealthOS. We chose them and remain
              responsible to you for the service we provide, but we do not
              control how they run theirs.
            </P>
          </Section>

          <Section id="availability" number="15" title="Availability and changes">
            <P>
              We will make reasonable efforts to keep WHealthOS running, but we
              do not promise uninterrupted availability and there is no service
              level agreement. It may be unavailable during maintenance, because
              of a fault, or because a provider we depend on is down.
            </P>
            <P>
              We may add, change or remove features as the product develops. If
              we remove something you rely on, we will give you reasonable
              notice where we can, and your export options in section 5 mean
              your records are never locked in.
            </P>
          </Section>

          <Section id="termination" number="16" title="Ending your use">
            <P>
              You can stop using WHealthOS whenever you like. You can delete
              individual records yourself at any time, and export everything
              first.
            </P>
            <Callout>
              <P>
                <strong>
                  Deleting your sign-in deletes your financial records with it.
                </strong>{" "}
                The account menu in the app opens Clerk&apos;s own profile
                screen, and that screen can delete your Clerk account. Clerk
                tells us when it happens, and we then delete your accounts,
                transactions, budgets, goals and cards. This is a change: it
                used to remove only your ability to sign in and leave
                everything else sitting in our database.
              </P>
              <P>
                <strong>It is immediate and it cannot be reversed.</strong>{" "}
                Export anything you want to keep before you do it. If you would
                rather we handled it, or you want the records gone without
                deleting your sign-in, write to{" "}
                <Fact value={POLICY.privacyContact} />.
              </P>
            </Callout>
            <P>
              We may suspend or close an account if it is being used to break
              the law, to attack the service or another user, or in serious
              breach of section 11 — or if we are required to. Where it is
              reasonable to do so we will tell you why first and give you a
              chance to put it right. We will not close an account arbitrarily.
            </P>
            <P>
              What happens to your data afterwards is covered by the{" "}
              <Link href="/privacy#retention" className="underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </P>
          </Section>

          <Section id="disclaimers" number="17" title="Disclaimers">
            <P>
              WHealthOS is provided as it is. Beyond what these terms say and
              what the law requires of us, we do not make promises about it —
              that it will be free of faults, that it will suit a particular
              purpose of yours, or that its figures and projections will prove
              correct.
            </P>
            <P>
              This does not displace rights you have under consumer law. Section
              19 says so, and means it.
            </P>
          </Section>

          <Section id="liability" number="18" title="Liability">
            <P>
              Some liability cannot lawfully be excluded, and we do not try to
              exclude it. That includes liability for fraud or fraudulent
              misrepresentation, for death or personal injury caused by
              negligence, and anything else the law that applies to you does not
              allow to be limited.
            </P>
            <P>
              Beyond that, and only as far as the law that applies to you
              allows, we are not liable for indirect or consequential loss, for
              lost profits or lost opportunity, or for loss that arises because
              a figure WHealthOS showed you was relied on without being checked.
              Section 7 explains why checking matters: the numbers here are
              produced from what you entered, and a total is only ever as good
              as the records behind it.
            </P>
            <P>
              There is no monetary cap on our liability in these terms. That is
              deliberate rather than an omission. WHealthOS is free, so the
              usual way of writing one &mdash; a cap set at the fees you paid
              over some period &mdash; would come to nothing, and a clause that
              limits our liability to zero is both unfair and, in several of
              the places our users live, unenforceable. We would rather carry
              the liability the law gives us than claim a protection that would
              not survive being tested.
            </P>
            <P>
              None of this affects the rights described in section 19, and
              nothing in these terms asks you to give up a claim arising from a
              defect in the software itself.
            </P>
          </Section>

          <Section id="your-rights" number="19" title="Rights you keep regardless">
            <P>
              Nothing in these terms excludes, restricts or waives any right or
              remedy you have that cannot lawfully be excluded, restricted or
              waived. Consumer protections where you live continue to apply
              whatever these terms say.
            </P>
            <P>
              If a term here conflicts with a mandatory protection that applies
              to you, that protection wins and the rest of these terms carry on.
            </P>
            <P>
              In particular, we do not treat WHealthOS being free as a reason
              those protections fall away. In the European Union, consumer
              rules on digital services can apply to a service supplied without
              a price where the user provides personal data instead, and rules
              on unfair contract terms apply whether or not anything was paid.
              We have not tried to draft around that, and section 18 is written
              on the same basis.
            </P>
          </Section>

          <Section id="law" number="20" title="Governing law and disputes">
            <P>
              These terms are governed by the law of India, which is where
              WHealthOS is operated from.
            </P>
            <P>
              If something goes wrong, please write to us first at{" "}
              <Fact value={POLICY.privacyContact} />. Most things are quicker to
              sort out that way, and we would rather fix a problem than argue
              about it.
            </P>
            <P>
              The courts of India may hear disputes arising out of these terms.
              That is not exclusive, and we do not ask you to treat it as
              though it were. If the law where you live gives you the right to
              bring proceedings in your own country&rsquo;s courts, or to rely
              on the consumer protections of your own country, these terms do
              not take that away and we will not argue that they do. A consumer
              in India keeps every option the Consumer Protection Act gives
              them, including complaining where they live rather than where we
              are.
            </P>
            <P>
              We have not written an arbitration clause or a class action
              waiver. Both carry different weight in different countries and
              are frequently unenforceable against consumers, and neither is
              something a free personal-finance tool needs.
            </P>
          </Section>

          <Section id="changes" number="21" title="Changes to these terms">
            <P>
              We may update these terms as WHealthOS changes. For a minor
              change, the updated version simply takes effect. For a change that
              materially affects your rights or what you can do, we will give
              you reasonable notice through the product or by email before it
              applies, and where the law requires your agreement we will ask for
              it rather than assume it.
            </P>
            <P>
              If you do not accept a material change, you can stop using
              WHealthOS and ask us to close your account.
            </P>
          </Section>

          <Section id="general" number="22" title="General">
            <List>
              <Item>
                <strong>If part of this is unenforceable</strong>, the rest
                still applies, and that part applies as far as it lawfully can.
              </Item>
              <Item>
                <strong>Not enforcing something straight away</strong> does not
                mean we have given it up.
              </Item>
              <Item>
                <strong>You cannot transfer</strong> your account or these terms
                to someone else without our agreement. If WHealthOS changes
                hands, these terms may transfer with it, subject to the Privacy
                Policy and applicable law.
              </Item>
              <Item>
                <strong>Things outside our reasonable control</strong> — an
                infrastructure failure, a provider outage, a natural event —
                may delay or prevent us doing what these terms describe, and we
                are not liable for that delay beyond what the law requires.
              </Item>
              <Item>
                <strong>These terms and the Privacy Policy</strong> are the
                whole agreement between us about WHealthOS. That is about
                keeping the agreement in one place, not about disclaiming
                things we have said: it does not limit any liability we have
                for a misrepresentation, and section 18 continues to apply.
              </Item>
            </List>
          </Section>

          <Section id="contact" number="23" title="Contact">
            <P>
              Questions about these terms, or anything else, go to{" "}
              <Fact value={POLICY.privacyContact} />.
            </P>
            <P>
              <Fact value={POLICY.entity} />.
            </P>
          </Section>
        </div>
      </div>
    </div>
  );
}
