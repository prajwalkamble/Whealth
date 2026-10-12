"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, resolveCategory, toolsInCategory, visibleCategories } from "@/lib/tools/registry";

// The category filter and the grid it controls.
//
// The URL is the source of truth. There is no second copy of the selected
// category in component state, so nothing can drift out of sync with the
// address bar, and a refresh, a bookmark or the back button all land on the
// same view.
//
// The catalogue is a static module import, not data that is fetched. Changing
// category is an array filter over ten entries — there is no request to make,
// no endpoint to call and nothing to cache.

export default function ToolsDirectory() {
  const params = useSearchParams();
  const { id: activeId, valid } = resolveCategory(params.get("category"));
  const tools = useMemo(() => toolsInCategory(activeId), [activeId]);
  // Only categories that actually hold a tool, plus whichever is selected --
  // so a direct link to an empty category still shows its chip as active.
  const tabs = useMemo(
    () => [{ id: null, name: "All" }, ...visibleCategories(activeId)],
    [activeId]
  );

  // On a narrow screen the chips scroll sideways, so an active category near
  // the end would start out of sight — someone arriving on a shared link would
  // see an unselected row. Nearest, not centre, so nothing moves when the chip
  // is already visible.
  const navRef = useRef(null);
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  // Navigating with the History API rather than router.push.
  //
  // A router navigation would ask the server for this route again. The page is
  // already rendered and the catalogue is already here, so that request would
  // fetch nothing this page does not have. pushState updates the URL and
  // useSearchParams re-reads it; back and forward keep working because they
  // are ordinary history entries.
  const select = (event, id) => {
    // Anything that is not a plain left click stays a real navigation, so
    // middle-click and ⌘-click still open a tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const url = id ? `/tools?category=${id}` : "/tools";
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, "", url);
    }
  };

  return (
    <>
      {/* Links, not buttons: each category is a real address someone can copy,
          bookmark or open in a new tab. The handler only short-circuits the
          navigation that would otherwise go to the server. */}
      <nav aria-label="Tool categories" className="mt-10 sm:mt-12">
        <ul
          ref={navRef}
          className={cn(
            "flex gap-2 overflow-x-auto pb-1",
            // Bleeds to the viewport edge while scrolling on a phone, so the
            // row does not look clipped, then centres once it fits.
            "-mx-4 px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {tabs.map((tab) => {
            const active = tab.id === activeId;
            return (
              <li key={tab.id ?? "all"} className="shrink-0">
                <Link
                  href={tab.id ? `/tools?category=${tab.id}` : "/tools"}
                  onClick={(event) => select(event, tab.id)}
                  // The selection is conveyed to assistive technology, not
                  // only through colour.
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {tab.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Announced when filtering changes, because nothing navigates and a
          screen-reader user would otherwise get no signal. Visually quiet: the
          grid itself is the answer. */}
      <p className="sr-only" role="status" aria-live="polite">
        {activeId
          ? `${tools.length} ${CATEGORIES.find((c) => c.id === activeId).name} tool${tools.length === 1 ? "" : "s"}`
          : `${tools.length} tools`}
        {!valid && " — that category does not exist, so all tools are shown."}
      </p>

      {tools.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed px-6 py-16 text-center text-muted-foreground">
          No tools available in this category yet.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={tool.href}
                className={cn(
                  // h-full on the link, not the card, so every card in a row
                  // is the same height whatever the description length.
                  "flex h-full flex-col rounded-2xl border bg-card p-6 transition-colors",
                  "hover:border-foreground/20 hover:bg-accent/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                <h2 className="text-base font-semibold tracking-tight">{tool.name}</h2>
                {/* flex-1 pushes the affordance to the bottom edge, so it sits
                    on one line across the row rather than wherever the text
                    happens to end. */}
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {tool.summary}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                  Explore
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
