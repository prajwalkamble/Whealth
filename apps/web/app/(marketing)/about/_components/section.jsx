import { cn } from "@/lib/utils";

// The page's section rhythm in one place, so spacing and heading sizes cannot
// drift between fourteen sections.
const Section = ({ id, eyebrow, title, lead, children, className, headingClassName }) => (
  <section aria-labelledby={id} className={cn("reveal mt-24 md:mt-32", className)}>
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {eyebrow}
      </p>
    )}
    <h2
      id={id}
      className={cn(
        "max-w-3xl scroll-mt-28 text-balance text-2xl font-bold tracking-tight md:text-4xl",
        eyebrow && "mt-3",
        headingClassName
      )}
    >
      {title}
    </h2>
    {lead && (
      <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
        {lead}
      </p>
    )}
    {children}
  </section>
);

export default Section;
