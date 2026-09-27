"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

// Only the collapsible menu is a client component.
//
// The header itself stays on the server so Clerk's <SignedIn>/<SignedOut> can
// resolve there: in a client component they depend on auth state that is not
// known until Clerk loads in the browser, so the whole right-hand side of the
// bar rendered empty in the initial HTML and popped in after hydration.
const HeaderMobileNav = ({ nav = [], showDemoLink = false }) => {
  const [open, setOpen] = useState(false);

  const linkClass =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full border-t bg-background lg:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {/* No hover on a touch screen, so a section's children are simply
                listed under it rather than hidden behind a dropdown. */}
            {nav.map(({ label, href, items }) => (
              <div key={label} className="py-1.5">
                {href ? (
                  <Link
                    href={href}
                    className={linkClass}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      items
                        ? "text-xs font-semibold uppercase tracking-wider text-foreground"
                        : linkClass,
                      "cursor-default"
                    )}
                  >
                    {label}
                  </span>
                )}

                {items && (
                  <div className="mt-1.5 flex flex-col gap-1 border-l pl-3">
                    {items.map((item) =>
                      item.href ? (
                        <Link
                          key={item.label}
                          href={item.href}
                          className={cn(linkClass, "py-1")}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span
                          key={item.label}
                          className={cn(linkClass, "cursor-default py-1")}
                        >
                          {item.label}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            {showDemoLink && (
              <Button variant="outline" asChild className="mt-2 sm:hidden">
                <Link href="/demo" onClick={() => setOpen(false)}>
                  Explore WHealthOS
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderMobileNav;
