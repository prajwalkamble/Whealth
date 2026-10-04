import { Eye, KeyRound, ShieldCheck } from "lucide-react";
import Section from "./section";

// Claims kept to what the implementation supports. No certifications, no
// "bank-grade", no percentages: the product holds none of those and saying
// otherwise in a finance context is worse than saying nothing.
const BLOCKS = [
  {
    icon: KeyRound,
    title: "Privacy",
    body: "Designed around collecting what the product needs and leaving you in control of it.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    body: "Authentication and authorisation throughout, with isolation between accounts enforced by the database rather than by application code.",
  },
  {
    icon: Eye,
    title: "Transparency",
    body: "Clear about what the product does with your data, what the intelligence layer is, and what is still only planned.",
  },
];

const Trust = () => (
  <Section
    id="trust"
    title="Your financial data is yours."
    lead="WHealthOS is built around the principle that financial information should be handled with care, protected through appropriate security controls, and used only for clearly defined purposes."
  >
    {/* No card boxes here. Three bordered tiles would be the same shape as the
        capability grid further up the page, and nothing about these three
        claims needs to look raised -- they are a statement, not a set of
        objects. A single rule above and hairlines between is enough. */}
    <ul className="mt-10 grid border-t pt-8 md:grid-cols-3 md:divide-x md:border-t-0 md:pt-0">
      {BLOCKS.map(({ icon: Icon, title, body }) => (
        <li
          key={title}
          className="py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0"
        >
          <div className="flex items-center gap-2.5">
            <Icon aria-hidden className="h-[18px] w-[18px] text-muted-foreground" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  </Section>
);

export default Trust;
