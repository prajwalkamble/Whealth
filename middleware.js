import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Every route under app/(main). Listed one by one rather than relying on
// "/account(.*)" to also cover "/accounts": a new page that does not match an
// existing prefix would otherwise be reachable signed out.
// Budgets, Goals and Analytics are listed before they exist on purpose: they
// are already in the sidebar, and adding the page later without remembering
// this file is exactly how one ends up reachable signed out.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/accounts(.*)",
  "/transaction(.*)",
  "/transactions(.*)",
  "/budgets(.*)",
  "/goals(.*)",
  "/analytics(.*)",
  "/settings(.*)",
]);

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: "LIVE",
    }),
    detectBot({
      // LIVE only in production so local tooling is not blocked while developing.
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
      allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"],
    }),
  ],
});

const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if(!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();

    return redirectToSignIn();
  }
});

export default createMiddleware(aj, clerk);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};