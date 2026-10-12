import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// The pieces the legal pages are set in.
//
// Server components throughout: a policy is text, and it should render — and
// be readable by a regulator or a screen reader — without any JavaScript.

// A value the business still has to supply.
//
// Rendered loudly on purpose. A placeholder that looked like ordinary prose
// would eventually be published as though it were a fact; this one cannot be
// mistaken for one.
export function Pending({ what }) {
  return (
    <mark className="mx-0.5 inline-flex items-baseline gap-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.95em] font-medium text-amber-800 dark:text-amber-300">
      <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0 self-center" />
      <span>
        <span className="sr-only">Pending confirmation: </span>
        To be confirmed — {what}
      </span>
    </mark>
  );
}

// Renders either a verified value or its placeholder.
export const Fact = ({ value }) =>
  value?.pending ? <Pending what={value.what} /> : <>{value?.value ?? value}</>;

export function Section({ id, number, title, children }) {
  return (
    <section
      id={id}
      // The header is sticky, so an anchored heading would otherwise land
      // underneath it.
      className="scroll-mt-24 border-t pt-10 first:border-t-0 first:pt-0"
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight sm:text-2xl">
        <span className="mr-2 text-muted-foreground tabular-nums">{number}.</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export const P = ({ children, className }) => (
  // max-w on the container rather than here, so tables can run wider than the
  // prose they sit among.
  <p className={cn("text-[0.975rem] leading-7 text-muted-foreground", className)}>{children}</p>
);

export const H3 = ({ id, children }) => (
  <h3 id={id} className="scroll-mt-24 pt-2 text-base font-semibold text-foreground">
    {children}
  </h3>
);

export const List = ({ children }) => (
  <ul className="space-y-2 text-[0.975rem] leading-7 text-muted-foreground">{children}</ul>
);

export const Item = ({ children }) => (
  <li className="flex gap-3">
    <span aria-hidden className="mt-3 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
    <span className="min-w-0">{children}</span>
  </li>
);

// Something stated plainly because it is the answer people arrive looking for.
export const Callout = ({ children }) => (
  <div className="rounded-xl border bg-muted/40 p-5 text-[0.975rem] leading-7">{children}</div>
);

// A table that becomes a stack of labelled blocks on a narrow screen, rather
// than a grid with a horizontal scrollbar nobody finds.
export function DataTable({ columns, rows }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t align-top">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 leading-6 text-muted-foreground">
                    {row[c.key]}
                    {c.key === columns[0].key && row.note && (
                      <span className="mt-2 block font-medium text-foreground">{row.note}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {rows.map((row, i) => (
          <li key={i} className="rounded-xl border p-4">
            <p className="font-semibold">{row[columns[0].key]}</p>
            {row.note && <p className="mt-2 text-sm font-medium">{row.note}</p>}
            <dl className="mt-3 space-y-2 text-sm">
              {columns.slice(1).map((c) => (
                <div key={c.key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </dt>
                  <dd className="mt-0.5 leading-6 text-muted-foreground">{row[c.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

// Plain anchors, so the list works with no JavaScript and every entry is a
// real address someone can copy or open in a new tab.
export function TableOfContents({ sections }) {
  return (
    <nav aria-labelledby="toc-heading" className="rounded-xl border bg-muted/30 p-5 lg:sticky lg:top-24">
      <h2 id="toc-heading" className="text-xs font-semibold uppercase tracking-wider">
        On this page
      </h2>
      <ol className="mt-3 space-y-1.5">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block rounded text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="mr-1.5 tabular-nums text-muted-foreground/70">{i + 1}.</span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
