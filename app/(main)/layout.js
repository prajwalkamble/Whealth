import React from "react";
import { checkUser } from "@/lib/checkUser";

// Every route under (main) is behind the middleware's auth check, so this is
// the first point where a Clerk user is guaranteed and the local row is
// actually needed. Doing it here instead of in the shared Header keeps the
// public landing page off the database entirely.
const MainLayout = async ({ children }) => {
  await checkUser();

  return <div className="container mx-auto my-32">{children}</div>;
};

export default MainLayout;
