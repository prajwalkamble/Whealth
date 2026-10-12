import Link from "next/link";
import {
  AI_AUDIT_DATE, AI_FACTS, AI_FEATURES, AI_PROVIDER, PROVIDER_TERMS,
} from "@/lib/legal/ai";
import { LEGAL_LINKS } from "@/lib/legal/versions";
import { POLICY } from "@/lib/legal/policy";
import { SECURITY_LINK } from "@/lib/legal/security";
import {
  Callout, H3, Item, List, P, Section, TableOfContents,
} from "@/components/legal/prose";

export const metadata = {
  title: "AI Usage | WHealthOS",
  description:
    "The two places WHealthOS uses AI, exactly what each one sends to Google, what it sends back, and what it gets wrong.",
  alternates: { canonical: "/ai-usage" },
};

// The AI Usage page.
//
// Built from lib/legal/ai.js, which was written by tracing both call sites of
// generateContent rather than by describing the product. Each feature below is
// rendered from that module, so a change to what the code sends has to pass
// through the evidence before it can change the prose.
//
// Three things this page deliberately does not do.
//
// It does not say your data is kept out of Google's training. Which of
// Google's two sets of terms applies to our API key is not confirmed, and the
// difference between them is the difference between "not used to improve our
// products" and "human reviewers may read your input". Section 4 gives both
// and says which is unknown.
//
// It does not describe the self-hosted model as a feature. It is a decision
// and an empty set of directories. Section 9 keeps it in the future tense.
//
// It does not claim the monthly commentary is reviewed. It is not. Section 2
// says so in the same words the code would.
//
// Server-rendered with no client JavaScript, like the other legal pages.

const SECTIONS = [
  { id: "about", title: "AI at WHealthOS" },
  { id: "features", title: "What uses AI today" },
  { id: "processing", title: "How your figures are handled" },
  { id: "provider", title: "Google, and what it may do" },
  { id: "accuracy", title: "Accuracy and limitations" },
  { id: "decisions", title: "Decisions about you" },
  { id: "controls", title: "What you can control" },
  { id: "privacy", title: "Privacy and security" },
  { id: "future", title: "Where this is going" },
  { id: "changes", title: "Changes and contact" },
];

export default function AiUsagePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">AI Usage</h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Where WHealthOS uses a model, what it sends, and what it gets wrong.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Reviewed against the code {AI_AUDIT_DATE}
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:order-last lg:col-start-1 lg:row-start-1">
          <TableOfContents sections={SECTIONS} />
        </div>

        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="about" number="1" title="AI at WHealthOS">
            <P>
              WHealthOS is a place to keep and understand your own financial
              records. Almost all of it is arithmetic: your balances, totals,
              budgets and projections are computed from the transactions you
              entered, by code that produces the same answer every time.
            </P>
            <P>
              Two things are not arithmetic. One reads a receipt photo so you
              do not have to type it out. The other writes a few sentences of
              commentary in the monthly summary email. Both send information to
              a model run by Google. There is nothing else — no assistant, no
              chat, no model watching what you do.
            </P>
            <P>
              This page describes those two features as they work today, by
              reference to the code that implements them. It says what is sent,
              what comes back, who checks it, and what it does badly. Where
              something is not known, it says that instead of guessing.
            </P>
          </Section>

          <Section id="features" number="2" title="What uses AI today">
            <P>
              {AI_FACTS.featureCount === 2 ? "Two features, and no others." : null}{" "}
              Each one is set out the same way: when it runs, what leaves
              WHealthOS, what does not, and what it gets wrong.
            </P>
            {AI_FEATURES.map((feature) => (
              <div key={feature.id} className="space-y-3">
                <H3 id={feature.id}>{feature.name}</H3>
                <List>
                  <Item>
                    <strong>When it runs.</strong> {feature.trigger}
                  </Item>
                  <Item>
                    <strong>What is sent.</strong> {feature.sends}
                  </Item>
                  <Item>
                    <strong>What is not sent.</strong> {feature.excludes}
                  </Item>
                  <Item>
                    <strong>What comes back.</strong> {feature.returns}
                  </Item>
                  <Item>
                    <strong>Who checks it.</strong> {feature.review}
                  </Item>
                  <Item>
                    <strong>What is kept.</strong> {feature.retention}
                  </Item>
                  <Item>
                    <strong>What it gets wrong.</strong> {feature.limits}
                  </Item>
                </List>
              </div>
            ))}
            <Callout>
              <strong>The difference between the two matters.</strong> You start
              a receipt scan and you approve its result. The monthly commentary
              is produced for you automatically unless you switch it off, and
              it is on until you do. Section 7 is where to change that.
            </Callout>
          </Section>

          <Section id="processing" number="3" title="How your figures are handled">
            <P>
              It is worth being precise about which numbers a model touches,
              because the answer is: none of the ones you rely on.
            </P>
            <List>
              <Item>
                <strong>Your records</strong> — the transactions, accounts,
                budgets, cards and goals you created — are stored in our
                database. A model never reads them. It has no access to the
                database, no query, and no way to ask for anything; each call
                is given a piece of text or an image and returns text.
              </Item>
              <Item>
                <strong>Your totals, balances and projections</strong> are
                calculated by code, from those records. They are not generated,
                estimated or smoothed by a model. The same records always
                produce the same figures.
              </Item>
              <Item>
                <strong>What is sent to the model</strong> is the narrow slice
                each feature needs: one receipt image, or one month of category
                totals. Nothing accumulates between calls, and no call is given
                the output of a previous one.
              </Item>
              <Item>
                <strong>What comes back</strong> is a draft for you to approve,
                in the case of a receipt, or sentences in an email, in the case
                of the monthly summary. Neither changes a stored record on its
                own.
              </Item>
            </List>
            <P>
              A model cannot edit, delete or add a transaction. The receipt
              scanner fills a form; you are the one who saves it.
            </P>
          </Section>

          <Section id="provider" number="4" title="Google, and what it may do">
            <P>
              Both features call the {AI_PROVIDER.service} from{" "}
              {AI_PROVIDER.name}. It is the only AI provider WHealthOS uses,
              and no other model, service or AI vendor receives anything. We
              do not publish which model version we call: it changes when the
              provider retires one, and the answer would be stale rather than
              informative.
            </P>
            <P>
              What Google may do with what we send depends on which of its two
              sets of API terms applies, and the two are very different. Google
              draws the line at whether the project behind the API key has
              active billing.
            </P>
            <H3>On the paid terms, Google states</H3>
            <List>
              {PROVIDER_TERMS.paid.map((line) => (
                <Item key={line}>{line}</Item>
              ))}
            </List>
            <H3>On the unpaid terms, Google states</H3>
            <List>
              {PROVIDER_TERMS.unpaid.map((line) => (
                <Item key={line}>{line}</Item>
              ))}
            </List>
            {!PROVIDER_TERMS.tierConfirmed && (
              <Callout>
                <strong>We have not yet confirmed which applies to WHealthOS.</strong>{" "}
                It depends on the billing state of the account behind our API
                key, which is not something our code records. We are checking,
                and this page will say plainly which it is. Until then, assume
                the less favourable column. If you would rather a receipt did
                not go to a third party at all, do not use the receipt scanner —
                nothing else in WHealthOS sends an image anywhere.
              </Callout>
            )}
            <P>
              We make none of the claims a page like this usually makes. We do
              not tell you your information is withheld from training, deleted
              immediately, or unreadable by any person, because we cannot show
              any of that to be true. We do not tell you where in the world the
              processing happens, because we do not know.
            </P>
          </Section>

          <Section id="accuracy" number="5" title="Accuracy and limitations">
            <P>
              Both features can be wrong, and neither is wrong in a way that
              announces itself. A model does not return &ldquo;I could not read
              this&rdquo;; it returns a plausible figure.
            </P>
            <P>
              A scanned receipt is checked for shape, not for truth. We confirm
              the amount is a positive number and that the suggested category is
              one we recognise, falling back to a general one if it is not. A
              date we cannot read is replaced with today&apos;s. None of that
              tells us whether the amount is the one on the receipt. Read the
              draft before you save it — that step is there for this reason.
            </P>
            <P>
              The monthly commentary is checked only for being three pieces of
              text. It sees totals, with no knowledge of why any of them look as
              they do, and it can read a transfer as income or a one-off as a
              habit. Nobody at WHealthOS reads it before it reaches you.
            </P>
            <P>
              We have not measured how often either one is right, so this page
              gives no accuracy figure.
            </P>
          </Section>

          <Section id="decisions" number="6" title="Decisions about you">
            <P>
              Nothing in WHealthOS, AI or otherwise, makes a decision about you.
              It does not score you, assess your creditworthiness, rank you,
              approve or refuse anything, set a limit, or report a conclusion
              about you to anyone. There is no code that could: there is no
              scoring model, no eligibility rule and no third party receiving
              an assessment.
            </P>
            <P>
              What the two features do is narrower than that. One proposes the
              contents of a form. The other remarks on figures you can already
              see for yourself.
            </P>
            <P>
              WHealthOS is not a financial adviser, and the commentary in a
              monthly email is not advice. It has no knowledge of your
              circumstances, your plans or anything outside the totals it was
              given, and it should not be the reason you do anything with your
              money.
            </P>
          </Section>

          <Section id="controls" number="7" title="What you can control">
            <P>
              Honestly stated, the controls are uneven, but the one that
              matters most is now yours.
            </P>
            <List>
              <Item>
                <strong>The receipt scanner is entirely yours.</strong> It runs
                only when you choose a photo. Never use it and no image is ever
                sent. You review every result before it is saved, and you can
                change or discard any part of it.
              </Item>
              <Item>
                <strong>The monthly commentary can be switched off,</strong> in
                Settings, under Privacy.{" "}
                {AI_FACTS.monthlySummaryDefaultsOn
                  ? "It is on until you turn it off."
                  : null}{" "}
                With it off, nothing from your account is sent to a model on a
                schedule: your summary email still arrives, with the same
                figures and no commentary section. You can turn it back on in
                the same place.
              </Item>
              <Item>
                <strong>Stopping the summary email itself</strong> is not a
                setting yet. If you would rather not receive it at all, write
                to{" "}
                <a
                  href={`mailto:${POLICY.privacyContact.value}`}
                  className="underline underline-offset-4"
                >
                  {POLICY.privacyContact.value}
                </a>{" "}
                and we will stop sending it.
              </Item>
              <Item>
                <strong>Correcting what a scan produced</strong> is the same as
                editing any transaction: open it and change it, or delete it.
                Nothing is locked because a model suggested it.
              </Item>
              <Item>
                <strong>Reporting a bad result</strong> — an amount read wrong,
                commentary that misrepresents your month — goes to the same
                address. It is worth telling us; it is how we find out that
                something has started failing.
              </Item>
            </List>
          </Section>

          <Section id="privacy" number="8" title="Privacy and security">
            <P>
              This page describes behaviour. The documents that govern it are
              the{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>
              , whose section 7 covers AI and automated processing and lists
              Google among our processors, and the{" "}
              <Link href={LEGAL_LINKS.terms} className="underline underline-offset-4">
                Terms of Service
              </Link>
              , whose section 10 covers AI features. The{" "}
              <Link href={SECURITY_LINK} className="underline underline-offset-4">
                Security page
              </Link>{" "}
              describes how the application and your records are protected, and
              is equally specific about what is not in place.
            </P>
            <P>
              Our API credential is held on the server and is never sent to your
              browser; every AI call is made from our own code, not from the
              page you are looking at. Receipt scanning is rate limited per
              account, and is disabled entirely in the demo, which has no
              account to limit.
            </P>
            <P>
              This page is a description, not a safeguard. Publishing it does
              not make anything more secure, and it should not be read as a
              promise about Google&apos;s systems, which we do not operate.
            </P>
          </Section>

          <Section id="future" number="9" title="Where this is going">
            <P>
              The intention is to stop sending financial information to a
              third-party model at all, and to run the intelligence layer on a
              model we host ourselves. The reasoning is the obvious one: this
              product holds complete financial histories, and a hosted API puts
              part of them into someone else&apos;s infrastructure, logs and
              retention policy, whatever the terms say.
            </P>
            <Callout>
              <strong>That does not exist.</strong> It is a direction, not a
              feature. There is no self-hosted model running, nothing is
              processed locally today, and this page will not describe one until
              it is actually serving requests. Everything in sections 2 to 4 is
              what is true now.
            </Callout>
            <P>
              The principles we are trying to hold to in the meantime are
              narrow enough to be checkable: send the least that the feature
              needs, send nothing that identifies you where a total will do,
              keep calculation out of the model&apos;s hands, let a person
              approve anything that becomes a record, and say what is wrong with
              it on a page like this one.
            </P>
          </Section>

          <Section id="changes" number="10" title="Changes and contact">
            <P>
              If a feature starts sending something different, a provider
              changes, a model changes, or a new AI feature is added, this page
              is updated and the date at the top changes with it. Where the
              change affects what we do with personal information, the{" "}
              <Link href={LEGAL_LINKS.privacy} className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              is updated too, and material changes are notified as that document
              describes.
            </P>
            <P>
              Questions about anything here, a bad AI result, or a request to
              stop receiving the monthly summary go to{" "}
              <a
                href={`mailto:${POLICY.privacyContact.value}`}
                className="underline underline-offset-4"
              >
                {POLICY.privacyContact.value}
              </a>
              .
            </P>
            <P>
              This page describes WHealthOS as it was read on {AI_AUDIT_DATE}. It
              is not a statement of compliance with any country&apos;s AI or data
              protection law.
            </P>
          </Section>
        </div>
      </div>
    </div>
  );
}
