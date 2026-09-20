import React, { Suspense } from "react";
import { BarLoader } from "react-spinners";

// Renders `children` -- the route's own page. Importing and rendering
// ./page here as well made Next run every dashboard query twice per request.
const DashboardLayout = ({ children }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Where your money stood this month.
        </p>
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
