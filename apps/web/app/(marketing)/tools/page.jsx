import { Suspense } from "react";
import { TOOLS, describeTool, resolveCategory, visibleCategories } from "@/lib/tools/registry";
import ToolsDirectory from "./_components/directory";

export const metadata = {
  title: "Financial Tools | WHealthOS",
  description:
    "Practical tools to help you plan, compare, and understand your finances — from how long your savings would last to what clearing a debt really costs.",
  // Every ?category= view is this same directory, filtered. They all point
  // back here, so filtering does not create separate indexable URLs competing
  // for the same content.
  alternates: { canonical: "/tools" },
};

// The tools directory.
//
// The hero is server-rendered and ships no JavaScript. The filter and grid are
// one client island, because the selected category lives in the URL and has to
// be read on the client for filtering to happen without a round trip.
//
// The catalogue is a static module — lib/tools/registry.js. It is not fetched,
// not queried and not cached: there is no API behind this page.
export default async function ToolsPage({ searchParams }) {
  const params = await searchParams;
  const { id } = resolveCategory(params?.category);

  // Rendered on the server for the first paint, so a shared link shows the
  // right tools before any JavaScript runs and a crawler sees real content.
  const initial = (id ? TOOLS.filter((tool) => tool.category === id) : TOOLS).map(describeTool);

  return (
    // One content column, centred, with the grid capped well short of the
    // viewport. Letting cards run to the full width of a 1440 screen is what
    // makes a directory feel like a spreadsheet.
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <header className="text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Free Financial Tools for Smarter Decisions
        </h1>
        {/* max-w-xl keeps the line length readable rather than letting it run
            the full width of the heading above it. */}
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Practical tools to help you plan, compare, and understand your
          finances.
        </p>
      </header>

      {/* useSearchParams needs a Suspense boundary or the production build
          fails, even though the dev server is perfectly happy. The fallback is
          the server-rendered grid, so there is no flash of empty space. */}
      <Suspense fallback={<StaticDirectory tools={initial} activeId={id} />}>
        <ToolsDirectory />
      </Suspense>
    </div>
  );
}

// The same composition without JavaScript, used as the Suspense fallback.
// Deliberately identical markup, so the hand-off is invisible.
function StaticDirectory({ tools, activeId }) {
  return (
    <>
      <nav aria-label="Tool categories" className="mt-10 sm:mt-12">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: null, name: "All" }, ...visibleCategories(activeId)].map((tab) => {
            const active = tab.id === activeId;
            return (
              <li key={tab.id ?? "all"} className="shrink-0">
                <a
                  href={tab.id ? `/tools?category=${tab.id}` : "/tools"}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {tab.name}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {tools.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed px-6 py-16 text-center text-muted-foreground">
          No tools available in this category yet.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <a
                href={tool.href}
                className="flex h-full flex-col rounded-2xl border bg-card p-6"
              >
                <h2 className="text-base font-semibold tracking-tight">{tool.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {tool.summary}
                </p>
                <span className="mt-6 text-sm font-medium">Explore</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
