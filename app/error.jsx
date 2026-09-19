"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

// Shown instead of Next's bare "Application error: a server-side exception
// has occurred" screen. In production the real message is withheld from the
// browser; the digest is what ties this screen to the entry in the server log.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="gradient-title mb-4 text-5xl font-bold">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-gray-600">
        We couldn&apos;t load this page. It&apos;s usually temporary, so please
        try again. If it keeps happening, let us know and quote the reference
        below.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()}>Try again</Button>
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
