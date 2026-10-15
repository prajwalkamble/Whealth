import { auth } from "@clerk/nextjs/server";
import UserAvatar from "./user-avatar";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { LayoutDashboard } from "lucide-react";
import ThemeToggle from "./theme-toggle";
import HeaderMobileNav from "./header-mobile-nav";
import HeaderNav, { NAV } from "./header-nav";

// Deliberately a server component, and now deliberately free of Clerk's
// client components. It reads the session with auth(), which runs on the
// server off the verified cookie, so the right-hand side is in the first HTML
// rather than appearing a moment after hydration -- and, unlike <SignedIn> /
// <SignedOut>, it needs no ClerkProvider and therefore loads no Clerk
// JavaScript for a visitor who is not signed in. The collapsible menu is the
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

const Header = async () => {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <div className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <nav className="relative flex w-full items-center gap-6 px-4 py-3 md:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          {/* Two files rather than a CSS filter: the wordmark is near-black
              navy, which disappears against the dark background, and no filter
              lifts it without flattening the gradient on the bar chart.
              logo-dark.png is the same mark with lightness remapped and hue
              untouched. Only one carries the accessible name. */}
          <Image
            src="/logo.png"
            alt="WHealthOS"
            height={60}
            width={150}
            className="h-9 w-auto cursor-pointer object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt=""
            aria-hidden
            height={60}
            width={150}
            className="hidden h-9 w-auto cursor-pointer object-contain dark:block"
          />
        </Link>

        {/* Centred on the bar from xl up, where there is room for it: the
            nav is absolutely positioned there, so it sits in the middle of
            the bar rather than wherever the logo and the buttons happen to
            leave it.

            Below xl it stays in the flow with ml-auto instead. Absolute
            centring cannot be pushed: on a 1024-wide screen the centred nav
            reached under the buttons, and dropping About and Contact from the
            bar leaves only about 20px of clearance there -- still not enough
            to centre on. In the flow the two auto margins split the slack
            evenly, so the nav reads as centred between the logo and the
            buttons and cannot collide with either. */}
        <HeaderNav className="hidden lg:ml-auto lg:flex xl:absolute xl:left-1/2 xl:ml-0 xl:-translate-x-1/2" />

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle persist={signedIn} />

          {signedIn ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard size={18} />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>
              </Button>
              {/* The one Clerk component left on a public page, and it only
                  renders for someone who is signed in -- which is also the
                  only case where the marketing layout mounts ClerkProvider. */}
              <UserAvatar size="h-9 w-9" />
              <HeaderMobileNav nav={NAV} />
            </>
          ) : (
            <>
              {/* asChild: each button renders as its link. A <button> nested
                  inside an <a> is invalid HTML. */}
              <Button variant="outline" asChild className="hidden sm:inline-flex">
                <Link href="/demo">Explore WHealthOS</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-in">Log in</Link>
              </Button>
              {/* showDemoLink: the desktop button is hidden below sm, so the
                  menu carries it at those widths. */}
              <HeaderMobileNav nav={NAV} showDemoLink />
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Header;
