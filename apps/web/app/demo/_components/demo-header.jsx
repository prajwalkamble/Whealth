"use client";

import Link from "next/link";
import { Eye, LogIn, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeToggle from "@/components/theme-toggle";

// The demo shell's top bar: a standing reminder that none of this is real,
// and the one action that matters -- creating an account.
const DemoHeader = ({ onReset, addedCount = 0 }) => {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />

      {/* Below sm the pill drops to its icon. At 320px the full row -- trigger,
          pill, theme toggle, Create Account -- was 22px wider than the screen
          and scrolled the page sideways. The label stays in the accessible
          name, so nothing is lost to a screen reader. */}
      <span
        aria-label="Demo mode"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 sm:px-2.5"
      >
        <Eye aria-hidden className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Demo mode</span>
      </span>

      <Separator orientation="vertical" className="hidden h-4 sm:block" />

      <p className="hidden truncate text-sm text-muted-foreground sm:block">
        You&rsquo;re exploring WHealthOS with sample data.
      </p>

      <div className="ml-auto flex items-center gap-1">
        {/* Only offered once there is something of the guest's own to clear,
            so the control is not a puzzle on a fresh visit. */}
        {addedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="hidden text-muted-foreground sm:inline-flex"
          >
            <RotateCcw className="h-4 w-4" />
            Reset demo
          </Button>
        )}

        {/* Search is signed-in only: it queries the caller's own rows, and a
            guest has none to query. Shown disabled rather than hidden, so the
            demo still reflects the real layout. */}
        <Button
          variant="ghost"
          size="icon"
          disabled
          aria-label="Search (available once you create an account)"
          title="Search is available once you create an account"
          className="hidden sm:inline-flex"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* No persist: the demo is public and mounts no ClerkProvider, so
            there is no account here to save a theme against. */}
        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1 h-4" />

        <Button size="sm" asChild>
          <Link href="/sign-up">Create Account</Link>
        </Button>

        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/sign-in">
            <LogIn className="h-4 w-4" />
            Log in
          </Link>
        </Button>
      </div>
    </header>
  );
};

export default DemoHeader;
