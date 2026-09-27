import { SignedIn, SignedOut } from "@clerk/nextjs";
import UserAvatar from "./user-avatar";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { LayoutDashboard } from "lucide-react";
import ThemeToggle from "./theme-toggle";
import HeaderMobileNav from "./header-mobile-nav";
import HeaderNav, { NAV } from "./header-nav";

// Deliberately a server component. Clerk's <SignedIn>/<SignedOut> resolve here
// from the verified session, so the right-hand side is in the first HTML
// rather than appearing a moment after hydration. The collapsible menu is the
// only part that needs state, and it lives in its own client component.
//
// No appearance customizer here: it tunes the signed-in dashboard, so it
// belongs to the (main) shell rather than the public pages. The light/dark
// toggle stays, since that is useful to a logged-out visitor too.
//
// No user sync here either. This renders on every route including the landing
// page, so syncing the Clerk user from here meant a Clerk lookup plus a Prisma
// round trip for logged-out visitors. The sync lives in the (main) layout,
// which only wraps the authenticated routes that actually need the row.

const Header = () => {
  return (
    <div className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <nav className="container relative mx-auto flex items-center gap-6 px-4 py-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="WHealthOS"
            height={60}
            width={150}
            className="h-9 w-auto cursor-pointer object-contain"
          />
        </Link>

        {/* Absolutely centred, so the nav sits in the middle of the bar
            rather than wherever the logo and the buttons happen to leave it. */}
        <HeaderNav className="absolute left-1/2 hidden -translate-x-1/2 lg:flex" />

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          <SignedOut>
            {/* asChild: each button renders as its link. A <button> nested
                inside an <a> is invalid HTML. */}
            <Button variant="outline" asChild className="hidden sm:inline-flex">
              <Link href="/demo">Explore WHealthOS</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">Log in</Link>
            </Button>
          </SignedOut>

          <SignedIn>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <LayoutDashboard size={18} />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            </Button>
            <UserAvatar size="h-9 w-9" />
          </SignedIn>

          {/* showDemoLink: the desktop button is hidden below sm, so the menu
              carries it at those widths. */}
          <SignedOut>
            <HeaderMobileNav nav={NAV} showDemoLink />
          </SignedOut>
          <SignedIn>
            <HeaderMobileNav nav={NAV} />
          </SignedIn>
        </div>
      </nav>
    </div>
  );
};

export default Header;
