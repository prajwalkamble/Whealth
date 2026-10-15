// The pieces an article is set in.
//
// Separate from components/legal/prose.jsx, which numbers its sections and is
// shaped for a policy document. These are plain: a heading, a paragraph, a
// list, a pull-out and a code block. Server components, so an article renders
// without any JavaScript.

export const H2 = ({ id, children }) => (
  <h2
    id={id}
    // The header is sticky, so an anchored heading would land underneath it.
    className="scroll-mt-24 pt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
  >
    {children}
  </h2>
);

export const H3 = ({ id, children }) => (
  <h3 id={id} className="scroll-mt-24 pt-2 text-base font-semibold text-foreground">
    {children}
  </h3>
);

export const P = ({ children }) => (
  <p className="text-[1.0125rem] leading-[1.8] text-muted-foreground">{children}</p>
);

export const List = ({ children }) => (
  <ul className="space-y-2.5 text-[1.0125rem] leading-[1.8] text-muted-foreground">
    {children}
  </ul>
);

export const Item = ({ children }) => (
  <li className="flex gap-3">
    <span
      aria-hidden
      className="mt-3.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60"
    />
    <span className="min-w-0">{children}</span>
  </li>
);

// A sentence worth stopping on. Used sparingly -- one or two per article, or
// it stops meaning anything.
export const Pullout = ({ children }) => (
  <p className="border-l-2 border-primary/60 pl-5 text-[1.0625rem] font-medium leading-[1.7] text-foreground">
    {children}
  </p>
);

export const Code = ({ children }) => (
  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
    {children}
  </code>
);

// A code block. tabIndex makes it reachable by keyboard, since it scrolls
// horizontally on a narrow screen and a scroll container nobody can focus is
// a scroll container some people cannot read.
export const CodeBlock = ({ label, children }) => (
  <figure className="space-y-2">
    <pre
      tabIndex={0}
      role="region"
      aria-label={label ?? "Code"}
      className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-[0.85rem] leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <code className="font-mono text-foreground">{children}</code>
    </pre>
    {label && (
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    )}
  </figure>
);
