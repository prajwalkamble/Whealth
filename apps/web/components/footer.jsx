import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import BackToTop from "@/components/back-to-top";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FOOTER_TOOL_SLUGS, toolBySlug, toolPath } from "@/lib/tools/registry";
import { COMPANY_CONTENT_LINKS, COMPANY_NAV } from "@/lib/company/links";
import { CONTACT_EMAIL } from "@/lib/company/contact";
import { AI_USAGE_LINK } from "@/lib/legal/ai";
import { COOKIE_POLICY_LINK } from "@/lib/legal/cookies";
import { SECURITY_LINK } from "@/lib/legal/security";
import { LEGAL_LINKS } from "@/lib/legal/versions";

// The marketing footer.
//
// Rendered by app/(marketing)/layout.js and nowhere else: the signed-in app
// has its own sidebar shell, the demo has its own, and the sign-in pages carry
// the header alone. One footer, one layout.
//
// Composition follows the supplied reference: a call to action across the top
// with the heading left and the button right, a rule, five columns with the
// brand in the first and company information in the last, a second rule, and a
// copyright row, with the back-to-top control in the bottom right.
//
// Nothing behind the content: no surface of its own and no decoration. The
// footer sits on the page background and is marked off by the rule along its
// top edge alone, by instruction.
//
// Every entry is a route that exists. There are no href-less labels: an entry
// that renders as plain text still advertises a section, and Documentation, a
// Help Center, a Getting Started guide, a Changelog, a Roadmap and a Status
// page are all things WHealthOS does not have. The reference's social row is
// absent for the same reason -- there are no accounts to link.

// The four featured tools, read from the registry so a label here can never
// drift from the page it points at. Between them they cover the four questions
// people actually arrive with: how long will my money last, can I reach my
// goal, how do I clear what I owe, and where do I stand.
const TOOL_LINKS = [
  ...FOOTER_TOOL_SLUGS.map((slug) => {
    const tool = toolBySlug(slug);
    return { label: tool.short, href: toolPath(slug) };
  }),
  // Always last.
  { label: "All Tools", href: "/tools" },
];

// The application's own sections, in the order the sidebar has them, behind
// Pricing. They lead to sign-in, which is the honest destination: they are the
// product, not a tour of it.
//
// No "AI Insights" line. The commentary is part of the dashboard rather than a
// page of its own, and a footer link has to lead somewhere.
const PRODUCT_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
  { label: "Accounts", href: "/accounts" },
  // "Cards", not "Cards & Wallet": the section is cards, and there is no
  // wallet.
  { label: "Cards", href: "/cards" },
  { label: "Budgets", href: "/budgets" },
  { label: "Goals", href: "/goals" },
  { label: "Analytics", href: "/analytics" },
];

// What someone can use without an account: the demo, and the calculators.
const RESOURCE_LINKS = [{ label: "Live Demo", href: "/demo" }, ...TOOL_LINKS];

// The five trust documents, each read from its own module rather than typed as
// a route here -- the same reason the Tools entries are generated.
const LEGAL_DOCUMENT_LINKS = [
  { label: "Privacy Policy", href: LEGAL_LINKS.privacy },
  { label: "Terms of Service", href: LEGAL_LINKS.terms },
  { label: "Security", href: SECURITY_LINK },
  { label: "Cookie Policy", href: COOKIE_POLICY_LINK },
  { label: "AI Usage", href: AI_USAGE_LINK },
];

// Columns two to four. The brand column and the company-information column are
// written out, because neither is a list of links.
const LINK_COLUMNS = [
  { title: "Company", links: [...COMPANY_NAV, ...COMPANY_CONTENT_LINKS] },
  { title: "Product", links: PRODUCT_LINKS },
  { title: "Resources", links: RESOURCE_LINKS },
];

// One link style for the whole footer. py-1.5 is the tap target, not
// decoration: it takes the row to 32px without changing how the column reads.
// Nothing is distinguished by colour alone -- hover adds an underline, and the
// focus ring is a shape.
//
// foreground/70 rather than muted-foreground: on this band muted-foreground
// measures 4.46:1 in the light theme, just under the 4.5:1 AA threshold for
// body text. foreground/70 measures 7.4:1 light and 8.4:1 dark and still reads
// as secondary against the headings, which are foreground.
const linkClass = cn(
  "inline-block rounded-sm py-1.5 text-sm leading-5 text-foreground/70 transition-colors",
  "hover:text-foreground hover:underline hover:underline-offset-4",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background"
);

const headingClass = "text-lg font-semibold tracking-tight text-foreground lg:text-xl";

// Each group names itself for a screen reader through its own heading, so the
// four navigations announce as Company, Product, Resources and the legal group
// rather than as four unnamed ones.
const groupId = (title) => `footer-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;

const LinkColumn = ({ title, links }) => (
  <nav aria-labelledby={groupId(title)}>
    <h2 id={groupId(title)} className={headingClass}>
      {title}
    </h2>
    <ul className="mt-4 space-y-0.5">
      {links.map(({ label, href }) => (
        <li key={label}>
          <Link href={href} className={linkClass}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t">
      {/* The one piece of brand colour on the footer: the blue-to-purple
          gradient as a hairline along the top edge, where the reference has
          its accent strip. */}
      <div aria-hidden className="gradient h-[3px] w-full" />


      <div className="relative mx-auto w-full max-w-[84rem] px-5 sm:px-8">
        {/* A. The call to action: heading left, button right, aligned on one
            line from sm up and stacked below it. */}
        <div className="flex flex-col gap-6 py-11 sm:flex-row sm:items-center sm:justify-between sm:gap-10 lg:py-16">
          <h2 className="max-w-md text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:max-w-xl sm:text-4xl lg:max-w-3xl lg:text-5xl">
            Take control of your finances
          </h2>
          <Button
            asChild
            size="lg"
            className="h-12 shrink-0 self-start rounded-md px-8 text-sm tracking-wide sm:self-auto lg:h-14 lg:px-9"
          >
            <Link href="/sign-up">
              Get Started
              <ArrowRight aria-hidden className="ml-1" />
            </Link>
          </Button>
        </div>

        <div className="border-t" />

        {/* B. Five columns: brand, three link groups, company information. The
            proportions are the reference's own -- the brand and the
            information column are wider than the three in between. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:gap-x-8 lg:grid-cols-[1.15fr_0.85fr_0.95fr_0.95fr_1.1fr] lg:gap-x-10 lg:py-14">
          <div className="col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Same pairing as the header: the navy wordmark is unreadable
                  on the dark background. Only one carries the name. */}
              <Image
                src="/logo.png"
                alt="WHealthOS"
                width={180}
                height={60}
                className="h-9 w-auto object-contain dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt=""
                aria-hidden
                width={180}
                height={60}
                className="hidden h-9 w-auto object-contain dark:block"
              />
            </Link>

            <p className="mt-5 text-balance text-base font-semibold leading-snug tracking-tight">
              Financial clarity. Better control.
            </p>
            {/* The landing page's own promise, shortened. It describes what
                the application does today and claims nothing else.

                The reference carries a SOCIAL PROFILE label and four icons
                here. WHealthOS has no social accounts, and inventing or
                borrowing one would be a lie about where to find us, so the
                description holds the column instead. */}
            <p className="mt-2.5 max-w-[34ch] text-sm leading-6 text-foreground/70">
              Track your accounts, understand where your money goes, and plan
              against a budget.
            </p>
          </div>

          {LINK_COLUMNS.map((column) => (
            <LinkColumn key={column.title} {...column} />
          ))}

          {/* Company information. No heading of its own, as in the
              reference: the address a visitor can actually write to is the top
              of the column, and it is the only company detail the footer
              carries -- where WHealthOS is operated from is on the legal
              pages, which is where it was asked to stay. */}
          <nav aria-labelledby={groupId("contact and legal")}>
            <h2 id={groupId("contact and legal")} className="sr-only">
              Contact and legal
            </h2>
            <p className="text-base font-medium leading-7">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="rounded-sm underline underline-offset-4 transition-colors hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {CONTACT_EMAIL}
              </a>
            </p>

            <ul className="mt-6 space-y-1">
              {LEGAL_DOCUMENT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  {/* The reference puts an arrow at the far edge of each of
                      these rows; the link fills the column so the whole row is
                      the target. */}
                  <Link
                    href={href}
                    className={cn(linkClass, "flex w-full items-center justify-between gap-3")}
                  >
                    {label}
                    <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 opacity-60" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t" />

        {/* C. The copyright row. */}
        <div className="flex flex-col gap-3 pb-16 pt-6 sm:flex-row sm:items-center sm:justify-between sm:pb-6 sm:pr-16 lg:pr-0">
          {/* "Inc." is the owner's instruction. Note that lib/legal/policy.js
              records WHealthOS as not incorporated, and the privacy policy
              says so on the page -- so this line and that one disagree until
              one of them changes. */}
          <p className="text-sm text-foreground/70">
            &copy; {year}{" "}
            <span className="font-medium text-foreground">WHealthOS Inc.</span>
          </p>
          {/* The reference credits its designer here. WHealthOS has no such
              credit to give, so the row carries the two documents a visitor
              reaches for most instead. */}
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {[
              { label: "Privacy", href: LEGAL_LINKS.privacy },
              { label: "Terms", href: LEGAL_LINKS.terms },
              { label: "Security", href: SECURITY_LINK },
            ].map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* E. Back to top, in the corner the reference puts it. */}
      <BackToTop className="absolute bottom-6 right-5 sm:right-6 lg:right-8" />
    </footer>
  );
};

export default Footer;
