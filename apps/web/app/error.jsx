"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isStaleBuildError, reloadOnceForStaleBuild } from "@/lib/chunk-error";

// Shown instead of Next's bare "Application error: a server-side exception
// has occurred" screen. In production the real message is withheld from the
// browser; the digest is what ties this screen to the entry in the server log.
export default function Error({ error, reset }) {
  // A stale build is handled rather than reported: the page the browser is
  // running is older than the one the server now serves, so reset() would
  // re-request the same missing chunk and fail again. Reloading is the only
  // thing that fixes it, and it happens at most once per tab.
  const [reloading, setReloading] = useState(false);
  const stale = isStaleBuildError(error);

  useEffect(() => {
    if (stale && reloadOnceForStaleBuild()) {
      setReloading(true);
      return;
    }
    console.error(error);
  }, [error, stale]);

  if (reloading) {
    return (
      <div
        className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-muted-foreground">Updating to the latest version…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="gradient-title mb-4 text-5xl font-bold">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        {stale
          ? "This page was updated while you had it open, and reloading didn't pick up the new version. A hard refresh usually fixes it."
          : "We couldn't load this page. It's usually temporary, so please try again. If it keeps happening, let us know and quote the reference below."}
      </p>
      <div className="flex gap-4">
        {/* reset() re-renders the same tree, which is useless against a stale
            build -- that case gets a real reload instead. */}
        <Button
          onClick={() => (stale ? window.location.reload() : reset())}
        >
          {stale ? "Reload" : "Try again"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
      {error?.digest && (
        <p className="mt-6 text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
