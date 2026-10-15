"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// The marketing nav. Where it sits in the bar is the caller's business --
// header.jsx centres it from xl up and lets it flow below that.
//
// Its own client component so the header itself can stay on the server, where
// Clerk's <SignedIn>/<SignedOut> resolve from the verified session. Nothing
// here depends on auth.

// Items without an href have no page behind them yet, so they render as plain
// text rather than as links that go nowhere.
//
// No About or Contact. They are the footer's Company group now, by
// instruction, and the bar carries what someone is deciding between rather
// than what they read once.
export const NAV = [
  {
    label: "Product",
    items: [
      {
        label: "Dashboard",
        description: "Balances, cash flow and spending at a glance",
        href: "/demo",
      },
      {
        label: "Transactions",
        description: "Every payment in one searchable ledger",
        href: "/demo/transactions",
      },
      {
        label: "Budgets",
        description: "Set a monthly limit and track against it",
      },
      {
        label: "AI Insights",
        description: "A monthly read on where your money went",
      },
    ],
  },
  {
    label: "Features",
    items: [
      {
        label: "Advanced Analytics",
        description: "Trends across months, not just this one",
        href: "/#features",
      },
      {
        label: "Smart Receipt Scanner",
        description: "Photograph a receipt, get a filled-in transaction",
        href: "/#features",
      },
      {
        label: "Multi-Account Support",
        description: "Current and savings accounts side by side",
        href: "/#features",
      },
      {
        label: "Multi-Currency",
        description: "Track money held in more than one currency",
        href: "/#features",
      },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  {
    label: "Resources",
    items: [
      { label: "Documentation", description: "How everything works" },
      { label: "Help Center", description: "Answers to common questions" },
      { label: "Getting Started", description: "From sign-up to first insight" },
      { label: "Changelog", description: "What shipped recently" },
    ],
  },
];

// A short grace period on leaving, so moving the pointer diagonally from the
// trigger down into the panel does not close it on the way.
const CLOSE_DELAY_MS = 120;

const triggerClass =
  "flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

const HeaderNav = ({ className }) => {
  const [openLabel, setOpenLabel] = useState(null);
  const timer = useRef(null);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpenLabel(null), CLOSE_DELAY_MS);
  };

  const open = (label) => {
    cancelClose();
    setOpenLabel(label);
  };

  useEffect(() => cancelClose, []);

  // Escape closes, the way any menu should.
  useEffect(() => {
    if (!openLabel) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenLabel(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openLabel]);

  return (
    <div className={cn("flex items-center gap-6", className)}>
      {NAV.map(({ label, href, items }) => {
        if (!items) {
          return href ? (
            <Link key={label} href={href} className={triggerClass}>
              {label}
            </Link>
          ) : (
            <span key={label} className={cn(triggerClass, "cursor-default")}>
              {label}
            </span>
          );
        }

        const isOpen = openLabel === label;

        return (
          <div
            key={label}
            className="relative"
            onMouseEnter={() => open(label)}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              className={triggerClass}
              aria-expanded={isOpen}
              aria-haspopup="true"
              // Keyboard users get the same menu: focus opens it, and the
              // panel closes when focus leaves the whole group.
              onFocus={() => open(label)}
              onClick={() => setOpenLabel(isOpen ? null : label)}
            >
              {label}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {isOpen && (
              <div
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenLabel(null);
                  }
                }}
                className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3"
              >
                {/* The padding above sits inside the hover area, so the gap
                    between trigger and panel does not count as "left". */}
                <div className="overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
                  {items.map((item) =>
                    item.href ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpenLabel(null)}
                        className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
                      >
                        <span className="block text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </Link>
                    ) : (
                      <span
                        key={item.label}
                        className="block cursor-default rounded-lg px-3 py-2.5"
                      >
                        <span className="block text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HeaderNav;
