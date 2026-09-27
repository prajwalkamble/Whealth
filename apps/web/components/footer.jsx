import Image from "next/image";
import Link from "next/link";
import { Github, Linkedin, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

// The marketing footer.
//
// Entries whose page does not exist yet carry no href. They render as plain
// text rather than as a link to "#", which would look live and then scroll the
// visitor back to the top -- the same dead-link problem the sidebar's unbuilt
// sections avoid. Give an entry an href and it becomes a link, nothing else to
// change.
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Transactions", href: "/transactions" },
      { label: "Accounts", href: "/accounts" },
      { label: "Pricing", href: "/pricing" },
      { label: "Cards & Wallet" },
      { label: "Budgets" },
      { label: "Goals" },
      { label: "Analytics" },
      { label: "AI Insights" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation" },
      { label: "Help Center" },
      { label: "Getting Started" },
      { label: "Changelog" },
      { label: "Roadmap" },
      { label: "Status" },
    ],
  },
  // Commented out until there is a registered company behind it. Uncomment to
  // bring the column back; the grid below counts the columns, so nothing else
  // needs changing.
  // {
  //   title: "Company",
  //   links: [
  //     { label: "About" },
  //     { label: "Contact" },
  //     { label: "Careers" },
  //     { label: "Open Source" },
  //     { label: "Contributors" },
  //     { label: "Blog" },
  //   ],
  // },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy" },
      { label: "Terms of Service" },
      { label: "Security" },
      { label: "Cookie Policy" },
      { label: "AI Usage" },
      { label: "Data & Privacy" },
    ],
  },
];

// href stays null until there is a real profile to point at. An invented URL
// is worse than no icon: it sends people somewhere that is not ours.
const SOCIALS = [
  { label: "GitHub", icon: Github, href: null },
  { label: "LinkedIn", icon: Linkedin, href: null },
  { label: "X", icon: XIcon, href: null },
  { label: "YouTube", icon: Youtube, href: null },
];

// lucide ships the old bird as `Twitter`; this is the current mark.
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const BOTTOM_LINKS = [
  { label: "Privacy" },
  { label: "Terms" },
  { label: "Security" },
  { label: "Status" },
];

// Written out per count rather than interpolated: Tailwind only generates the
// classes it can see in the source, so a template string would produce a rule
// that does not exist.
const COLUMN_GRID = {
  2: "lg:grid-cols-[1.4fr_repeat(2,1fr)]",
  3: "lg:grid-cols-[1.4fr_repeat(3,1fr)]",
  4: "lg:grid-cols-[1.4fr_repeat(4,1fr)]",
  5: "lg:grid-cols-[1.4fr_repeat(5,1fr)]",
};

const linkClass =
  "text-sm text-muted-foreground transition-colors hover:text-foreground";

// One renderer for both states, so a live entry and a not-yet-built one are
// identical apart from being clickable.
const FooterLink = ({ label, href, className }) =>
  href ? (
    <Link href={href} className={cn(linkClass, className)}>
      {label}
    </Link>
  ) : (
    <span className={cn(linkClass, "cursor-default", className)}>{label}</span>
  );

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4">
        {/* Brand block plus the four link columns. The brand takes roughly a
            quarter of the width once there is room for the full row. */}
        <div
          className={cn(
            "grid gap-10 py-14 md:grid-cols-2 lg:gap-8",
            COLUMN_GRID[COLUMNS.length]
          )}
        >
          <div className="lg:pr-8">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo.png"
                alt="WHealthOS"
                width={180}
                height={60}
                className="h-9 w-auto object-contain"
              />
            </Link>

            <p className="mt-5 text-lg font-semibold leading-snug tracking-tight">
              Understand your money.
              <br />
              Make smarter decisions.
            </p>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A smarter way to manage your finances with powerful insights and
              AI.
            </p>

            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map(({ label, icon: Icon, href }) => {
                const shared =
                  "flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors";
                return href ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className={cn(shared, "hover:bg-accent hover:text-foreground")}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ) : (
                  <span key={label} aria-label={label} className={shared}>
                    <Icon className="h-4 w-4" />
                  </span>
                );
              })}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {year} <span className="font-medium text-foreground">WHealthOS</span>. All
            rights reserved.
          </p>

          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {BOTTOM_LINKS.map((link, index) => (
              <li key={link.label} className="flex items-center gap-4">
                {index > 0 && (
                  <span aria-hidden className="h-4 w-px bg-border" />
                )}
                <FooterLink {...link} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
