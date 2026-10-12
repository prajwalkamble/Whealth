import Link from "next/link";
import { AI_USAGE_LINK } from "@/lib/legal/ai";
import { COOKIE_POLICY_LINK } from "@/lib/legal/cookies";
import { DATA_TABLE, POLICY, PROCESSORS } from "@/lib/legal/policy";
import { SECURITY_LINK } from "@/lib/legal/security";
import {
  Callout, DataTable, Fact, H3, Item, List, P, Section, TableOfContents,
} from "@/components/legal/prose";

export const metadata = {
  title: "Privacy Policy | WHealthOS",
  description:
    "How WHealthOS collects, uses, protects and shares personal and financial information.",
  alternates: { canonical: "/privacy" },
};

// The privacy policy.
//
// Every factual statement here was established by reading the application:
// which providers are actually called, what the database actually stores, what
// is actually sent to the AI model. Anything that could not be established --
// who operates WHealthOS, its address, its retention schedule -- renders as a
// visible placeholder rather than a plausible invention.
//
// Server-rendered with no client JavaScript: the policy has to be readable
// even when everything else is broken.

const SECTIONS = [
  { id: "about", title: "About WHealthOS" },
  { id: "scope", title: "What this policy covers" },
  { id: "collect", title: "Information we collect" },
  { id: "use", title: "How we use information" },
  { id: "bases", title: "Legal bases" },
  { id: "financial", title: "Your financial information" },
  { id: "ai", title: "AI and automated processing" },
  { id: "sharing", title: "How we share information" },
  { id: "providers", title: "Service providers" },
  { id: "transfers", title: "Where your data is held" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your privacy rights" },
  { id: "exercise", title: "Exercising your rights" },
  { id: "regions", title: "Region-specific information" },
  { id: "children", title: "Children" },
  { id: "cookies", title: "Cookies and local storage" },
  { id: "links", title: "Other sites" },
  { id: "transfer-of-business", title: "Business transfers" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          How WHealthOS handles your personal and financial information.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:order-last lg:col-start-1 lg:row-start-1">
          <TableOfContents sections={SECTIONS} />
        </div>

        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="about" number="1" title="About WHealthOS">
            <P>
              WHealthOS is a personal finance application. You record your
              accounts, transactions, budgets and goals, and it organises,
              totals and explains them back to you.
            </P>
            <P>
              <Fact value={POLICY.entity} />. It is not yet an incorporated
              company, and no separate legal entity stands behind it. For most
              of the processing described
              here we decide why and how your information is used, which makes
              us the controller of it (the data fiduciary, under India&apos;s
              DPDP Act).
            </P>
            <P>
              One exception is worth naming. When you sign in, our
              authentication provider handles your credentials under its own
              terms as well as ours. We never see your password.
            </P>
          </Section>

          <Section id="scope" number="2" title="What this policy covers">
            <P>
              This policy covers the WHealthOS website, the signed-in
              application, the public financial tools, and email we send you or
              receive from you. It does not cover any other company&apos;s
              product, including sites we link to.
            </P>
            <Callout>
              <strong>The public tools hold nothing.</strong> The calculators
              under <Link href="/tools" className="underline underline-offset-4">/tools</Link>{" "}
              run entirely in your browser. The figures you type are not sent to
              us, not stored, and not logged.
            </Callout>
          </Section>

          <Section id="collect" number="3" title="Information we collect">
            <P>
              Everything below was checked against what the application actually
              stores. We do not ask for, and have no field to hold, a phone
              number, date of birth, postal address, location, government
              identifier, biometric data, or any bank or card credential.
            </P>
            <DataTable
              columns={[
                { key: "category", label: "Category" },
                { key: "examples", label: "What this includes" },
                { key: "source", label: "Where it comes from" },
                { key: "purpose", label: "Why we have it" },
              ]}
              rows={DATA_TABLE}
            />
            <H3>Files you import, and files you export</H3>
            <P>
              You can import transactions from a CSV or XLSX file, and export
              them as CSV, Excel or PDF. The file you upload is read to create
              the transactions you confirm, and is <strong>not stored</strong> —
              WHealthOS has no file storage, so there is nowhere for it to be
              kept. Exports are generated when you ask for them and sent
              straight to your browser; no copy is retained.
            </P>
            <H3>Marketing</H3>
            <P>
              There is no marketing list, no newsletter and no promotional
              email. The only email WHealthOS sends is about your own account: a
              budget alert you set up, or a monthly summary of your own figures.
              There is no unsubscribe mechanism because there is nothing to
              unsubscribe from.
            </P>

            <H3>Things we do not collect</H3>
            <List>
              <Item>
                <strong>No payment information.</strong> WHealthOS has no
                payment processor connected. We do not take card details and
                hold no billing records.
              </Item>
              <Item>
                <strong>No analytics or advertising.</strong> There is no
                analytics service, no advertising network and no third-party
                tracker in the application. We do not build advertising profiles
                and have nothing to sell to advertisers.
              </Item>
              <Item>
                <strong>No bank connections.</strong> WHealthOS does not link to
                your bank. Records reach it because you enter, import or
                photograph them.
              </Item>
            </List>
          </Section>

          <Section id="use" number="4" title="How we use information">
            <List>
              <Item>To create your account and sign you in.</Item>
              <Item>
                To store the financial records you enter, and to calculate the
                totals, breakdowns and trends the product shows you.
              </Item>
              <Item>
                To read a receipt photo you choose to upload, and turn it into a
                draft transaction for you to confirm.
              </Item>
              <Item>
                To send you service email: a budget alert you have set up, and a
                monthly summary of your own figures.
              </Item>
              <Item>To answer feedback and support messages you send us.</Item>
              <Item>
                To keep the service running and resist abuse — rate limiting,
                blocking automated traffic, and diagnosing faults.
              </Item>
              <Item>To comply with legal obligations that apply to us.</Item>
            </List>
            <P>
              We do not use your financial records for advertising, and we do
              not sell them.
            </P>
          </Section>

          <Section id="bases" number="5" title="Legal bases">
            <P>
              If the UK or EU GDPR applies to you, we rely on the bases below.
              Which basis applies to a given activity is a legal conclusion that
              still requires review, and the balancing assessment behind any
              legitimate-interests claim has not yet been documented.
            </P>
            <DataTable
              columns={[
                { key: "category", label: "Information" },
                { key: "purpose", label: "Purpose" },
                { key: "basis", label: "Basis" },
              ]}
              rows={DATA_TABLE}
            />
            <P>
              Where we ask for consent — for anything optional — you can
              withdraw it at any time, and withdrawing it does not affect what
              we did while it was in place.
            </P>
          </Section>

          <Section id="financial" number="6" title="Your financial information">
            <P>
              Financial records are the substance of WHealthOS, and we treat
              them as information needing particular care. It is worth being
              precise about three different things:
            </P>
            <List>
              <Item>
                <strong>What you give us.</strong> Accounts, transactions,
                budgets, goals and card records you enter, import or scan.
              </Item>
              <Item>
                <strong>What we calculate.</strong> Monthly totals, savings
                rate, category breakdowns, budget pace and net worth. These are
                arithmetic on your own records, recomputed when a page loads.
              </Item>
              <Item>
                <strong>What we infer.</strong> Trends and comparisons between
                periods — for instance that spending in a category rose against
                last month. These are descriptions of your data, not judgements
                about you, and nothing is decided about you on the strength of
                them.
              </Item>
            </List>
            <Callout>
              <strong>Card records hold four digits.</strong> You can record a
              card so you know which one an expense settled from. The database
              stores its name, issuer, network, type, expiry month and year, and
              the last four digits. There is no field for a full card number, a
              CVV, a PIN or a banking password, so we cannot hold one.
            </Callout>
          </Section>

          <Section id="ai" number="7" title="AI and automated processing">
            <P>
              WHealthOS currently uses one external AI provider, Google, in two
              specific places and nowhere else. Both are described below exactly
              as they work today.
            </P>
            <H3>Reading a receipt</H3>
            <P>
              When you upload a receipt photo, the image is sent to Google&apos;s
              Gemini API, which returns an amount, date, description, merchant
              and suggested category. You review that draft before anything is
              saved. The image is held in memory for the request and{" "}
              <strong>is not stored by WHealthOS</strong> — there is no file
              storage in the application at all. This only happens when you
              choose to scan a receipt.
            </P>
            <H3>The monthly summary</H3>
            <P>
              If a monthly summary email is generated, the figures sent to the
              model are <strong>aggregate totals only</strong>: your total income,
              total expenses, net figure and totals per category for that month.
              Individual transactions, their descriptions, your account names and
              your identity are not included.
            </P>
            <P>
              You can stop this. The commentary is on by default and there is a
              switch for it in{" "}
              <Link href="/settings" className="underline underline-offset-4">
                Settings
              </Link>{" "}
              under Privacy; with it off, your summary still arrives with the
              same figures and nothing is sent to the model. The{" "}
              <Link href={AI_USAGE_LINK} className="underline underline-offset-4">
                AI Usage page
              </Link>{" "}
              sets out both features in full, including what they get wrong.
            </P>
            <H3>What Google may do with it</H3>
            <P>
              That depends on the API plan in use, and Google draws a sharp line
              between them. On its paid tier, Google states it does not use
              prompts or responses to improve its products and logs them only
              briefly to detect abuse. On its free tier, Google states that
              submitted content may be used to develop its products, that human
              reviewers may read API input and output, and advises against
              submitting personal information.
            </P>
            <P>
              We are confirming which applies to WHealthOS and will state it
              here plainly. If you would rather not have a receipt go to a third
              party at all, do not use the receipt scanner — nothing else in
              WHealthOS sends an image anywhere.
            </P>
            <H3>Automated decisions</H3>
            <P>
              WHealthOS does not make automated decisions that produce legal or
              similarly significant effects about you. It does not score you,
              assess your creditworthiness, approve or refuse anything, or share
              conclusions about you with anyone. The AI features draft a
              transaction for you to approve and write commentary on figures you
              can already see.
            </P>
          </Section>

          <Section id="sharing" number="8" title="How we share information">
            <P>We share personal information only in these situations:</P>
            <List>
              <Item>
                <strong>With the service providers in section 9</strong>, who
                process it on our instructions to run the product.
              </Item>
              <Item>
                <strong>When the law requires it</strong> — a valid legal
                request, or to establish or defend legal claims.
              </Item>
              <Item>
                <strong>To protect people</strong>, where there is a serious
                risk to someone&apos;s safety or rights.
              </Item>
              <Item>
                <strong>In a business transfer</strong>, as described in section 19.
              </Item>
            </List>
            <P>
              We do not sell personal information, and we do not share it for
              cross-context behavioural advertising. There is no advertising
              technology in WHealthOS for that to be possible.
            </P>
          </Section>

          <Section id="providers" number="9" title="Service providers">
            <P>
              Each provider below was confirmed by finding it in the running
              code, not merely among the project&apos;s dependencies.
            </P>
            <DataTable
              columns={[
                { key: "name", label: "Provider" },
                { key: "purpose", label: "What it does" },
                { key: "data", label: "What it may handle" },
              ]}
              rows={PROCESSORS}
            />
            <P>
              Each of these providers publishes its own data-protection terms,
              which apply to your information alongside this policy. We have not
              completed a provider-by-provider review of those terms, and we do
              not claim that a signed data-processing agreement is in place with
              each of them.
            </P>
          </Section>

          <Section id="transfers" number="10" title="Where your data is held">
            <P>
              Your WHealthOS records are stored in a PostgreSQL database hosted
              in <strong><Fact value={POLICY.databaseRegion} /></strong>.
            </P>
            <P>
              The application itself runs on <Fact value={POLICY.appHosting} />,
              so both halves of WHealthOS — the application and its database —
              are hosted in India.
            </P>
            <P>
              The providers in section 9 operate internationally, so your
              information may still be processed outside the country you live
              in. Each publishes its own terms for international transfers. We
              have not completed a review of the transfer mechanism each relies
              on, and we do not claim that standard contractual clauses are in
              place.
            </P>
          </Section>

          <Section id="retention" number="11" title="How long we keep it">
            <P>
              We keep your records for as long as your account exists. When you
              delete a transaction, account, budget, goal or card in the app, the
              row is deleted from the database.
            </P>
            <Callout>
              <strong>Deleting your sign-in now deletes your records too.</strong>{" "}
              The account menu opens Clerk&apos;s own profile screen, and that
              screen can delete your Clerk account. It used to remove only the
              sign-in and leave everything else here; Clerk now tells us, and
              we delete the account and every record on it &mdash; transactions,
              accounts, budgets, goals, cards and contributions.
              <br />
              <br />
              <strong>That cannot be undone, and we cannot get it back for
              you.</strong> Export anything you want to keep first. If you
              would rather we did it, or you want it done without touching
              your sign-in, contact us using section 21.
            </Callout>
            <P>
              We have not set fixed retention periods for server logs and
              backups. Those follow the defaults of the providers in section 9
              rather than a schedule of our own, and we would rather say so than
              quote a number nothing enforces. Copies may therefore persist
              briefly in provider backups after you delete something, and we may
              keep what the law requires us to keep.
            </P>
          </Section>

          <Section id="security" number="12" title="Security">
            <P>
              Connections to WHealthOS use HTTPS. Every operation that reads or
              writes your records checks that they are yours before it runs,
              and those checks are tested against a real database. Requests are
              rate limited and filtered for automated abuse. We never see your
              password; authentication is handled by our provider. The{" "}
              <Link href={SECURITY_LINK} className="underline underline-offset-4">
                Security page
              </Link>{" "}
              describes these in detail, including what is not in place.
            </P>
            <P>
              We make no claim to hold any security certification, and we do not
              claim that any system is perfectly secure. If a personal data
              breach occurs, we will act in line with the law that applies,
              including notifying regulators and affected people where required.
            </P>
          </Section>

          <Section id="rights" number="13" title="Your privacy rights">
            <P>
              What rights you have depends on where you live and which law
              applies. Depending on that, you may be able to ask us to:
            </P>
            <List>
              <Item>confirm what information we hold and give you a copy;</Item>
              <Item>correct information that is wrong or incomplete;</Item>
              <Item>delete information, subject to what the law lets us keep;</Item>
              <Item>provide your information in a portable form;</Item>
              <Item>restrict or object to certain processing;</Item>
              <Item>withdraw consent where we relied on it;</Item>
              <Item>
                complain to your data protection regulator — in the UK the ICO,
                in India the Data Protection Board, or your local authority.
              </Item>
            </List>
            <P>
              We will not treat you worse for exercising these rights. Much of
              this you can do yourself: your records are editable and deletable
              in the app, and{" "}
              <Link href="/settings" className="underline underline-offset-4">
                Settings
              </Link>{" "}
              lets you export your transactions as CSV, Excel or PDF at any time.
            </P>
          </Section>

          <Section id="exercise" number="14" title="Exercising your rights">
            <P>
              Email <Fact value={POLICY.privacyContact} />. There is no separate
              privacy portal; we handle requests by hand.
            </P>
            <P>
              We may need to confirm you are the person the information is about
              before we act, usually by asking you to write from the email
              address on the account. We will respond within the time the
              applicable law allows.
            </P>
          </Section>

          <Section id="regions" number="15" title="Region-specific information">
            <H3>India</H3>
            <P>
              WHealthOS is operated from India and its database is in India.
              Under the Digital Personal Data Protection Act, 2023 you are a
              Data Principal and we are a Data Fiduciary. You may access,
              correct and erase your personal data, nominate someone to exercise
              your rights, and have your grievances addressed. Grievances
              reach us at <Fact value={POLICY.grievanceOfficer} />. We have not
              been designated a Significant Data Fiduciary, and we do not claim
              to be one.
            </P>
            <H3>United Kingdom and European Economic Area</H3>
            <P>
              If the UK or EU GDPR applies to your use of WHealthOS, section 5
              sets out our legal bases and section 13 your rights, including the
              right to complain to your supervisory authority. WHealthOS is
              operated from India and has no establishment in the EEA or the UK.
              We have not appointed an Article 27 representative or a data
              protection officer: the processing described here involves no
              large-scale monitoring and no special-category data. We will
              appoint one if that changes.
            </P>
            <H3>California and other United States states</H3>
            <P>
              The CCPA applies to businesses above thresholds on revenue, on the
              number of California consumers whose information they handle, or
              on revenue from selling personal information. WHealthOS meets none
              of them, so we do not believe the CCPA applies to us today — the
              rights in section 13 are open to you either way. We do not sell
              personal information, we do not
              share it for cross-context behavioural advertising, and there is no
              advertising technology in the product. Nothing in WHealthOS would
              act on a Global Privacy Control signal today, because there is
              nothing to opt out of.
            </P>
            <H3>Other United States states</H3>
            <P>
              Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana and
              a growing number of other states have comprehensive privacy laws.
              They broadly give residents rights to access, correct, delete and
              port their information, and to opt out of targeted advertising,
              the sale of personal information and certain profiling. Each
              applies only above thresholds set by the number of that
              state&apos;s residents whose data a business processes, or by
              revenue from selling personal information. WHealthOS is below all
              of them, and does none of the three things those opt-outs exist to
              address — no targeted advertising, no sale, no profiling that
              decides anything about you. The rights in section 13 are open to
              you whichever state you are in.
            </P>

            <H3>Elsewhere</H3>
            <P>
              Other frameworks — Canada&apos;s PIPEDA, Australia&apos;s Privacy
              Act, Brazil&apos;s LGPD, Singapore&apos;s PDPA among them — may
              apply depending on where you are and how WHealthOS is offered.
              Which of them apply has not been established, and we make no
              compliance claim under any of them. Section 13 describes the
              rights we will honour, and we will meet obligations that are found
              to apply.
            </P>
          </Section>

          <Section id="children" number="16" title="Children">
            <P>
              WHealthOS is not directed to children and we do not knowingly
              collect their personal data. India&apos;s DPDP Act treats anyone
              under 18 as a child and requires verifiable parental consent, and
              it prohibits tracking, behavioural monitoring and targeted
              advertising of children — none of which WHealthOS does to anyone.
              Other countries set different ages.
            </P>
            <P>
              You must be 18 or older to hold a WHealthOS account. If you
              believe a child has given us personal data, contact us and we will
              delete it.
            </P>
          </Section>

          <Section id="cookies" number="17" title="Cookies and local storage">
            <P>
              WHealthOS uses no analytics cookies, no advertising cookies and no
              third-party trackers. What it does use is summarised below; the{" "}
              <Link href={COOKIE_POLICY_LINK} className="underline underline-offset-4">
                Cookie Policy
              </Link>{" "}
              lists every individual item, what sets it and how long it lasts.
            </P>
            <List>
              <Item>
                <strong>Authentication cookies</strong>, set by our sign-in
                provider to keep you signed in. Without them you cannot use the
                app.
              </Item>
              <Item>
                <strong>A sidebar preference cookie</strong>, remembering whether
                you collapsed the navigation.
              </Item>
              <Item>
                <strong>Browser local storage</strong>, holding your display
                preferences, whether you have seen a notification, and — in the
                public demo — the sample rows you create there. This stays on
                your device.
              </Item>
            </List>
          </Section>

          <Section id="links" number="18" title="Other sites">
            <P>
              WHealthOS links to other websites. Their privacy practices are
              their own and this policy does not cover them.
            </P>
          </Section>

          <Section id="transfer-of-business" number="19" title="Business transfers">
            <P>
              If WHealthOS is involved in a merger, acquisition, restructuring or
              sale of assets, or in insolvency, personal information may be among
              the assets transferred. Any such transfer would remain subject to
              this policy and to applicable law, and we would tell you if the
              policy changed as a result.
            </P>
          </Section>

          <Section id="changes" number="20" title="Changes to this policy">
            <P>
              We may update this policy as WHealthOS changes. The date at the top
              always reflects the current version. If a change materially affects
              how we handle your information, we will give you notice through the
              product or by email before it takes effect, and obtain consent
              where the law requires it.
            </P>
          </Section>

          <Section id="contact" number="21" title="Contact">
            <P>
              For anything in this policy, including a privacy request, email{" "}
              <Fact value={POLICY.privacyContact} />.
            </P>
            <P>
              <Fact value={POLICY.entity} />. There is no postal address to
              publish; email is the way to reach us.
            </P>
          </Section>
        </div>
      </div>
    </div>
  );
}
