import React, { Suspense } from "react";
import Link from "next/link";
import { BarLoader } from "react-spinners";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_TIME_ZONE } from "@/lib/time";

// "1 – 21 Sep 2026": the period the dashboard's monthly figures cover, on the
// app's calendar, so the numbers below have a stated frame of reference.
function currentPeriod() {
  const now = new Date();
  const part = (options) =>
    new Intl.DateTimeFormat("en-IN", { ...options, timeZone: APP_TIME_ZONE }).format(now);
  return `1 – ${part({ day: "numeric" })} ${part({ month: "short" })} ${part({ year: "numeric" })}`;
}

// Renders `children` -- the route's own page. Importing and rendering
// ./page here as well made Next run every dashboard query twice per request.
const DashboardLayout = ({ children }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm tabular-nums">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {currentPeriod()}
          </span>
          <Button size="sm" className="h-9" asChild>
            <Link href="/transaction/create">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        {children}
      </Suspense>
    </div>
  );
};

export default DashboardLayout;
