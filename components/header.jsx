import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { LayoutDashboard, PenBox } from "lucide-react";
import ThemeToggle from "./theme-toggle";

// No user sync here. This renders on every route including the public landing
// page, so syncing the Clerk user from here meant a Clerk lookup plus a Prisma
// round trip for logged-out visitors. The sync lives in the (main) layout,
// which only wraps the authenticated routes that actually need the row.
const Header = () => {
  return (
    <div className="fixed top-0 w-full bg-background/80 backdrop-blur-md z-50 border-b">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <Image
            src={"/logo.png"}
            alt="logo"
            height={60}
            width={150}
            className="h-10 w-auto object-contain cursor-pointer"
          />
        </Link>

        <div className="flex items-center space-x-4">
          <SignedIn>
            {/* asChild: each button renders as its link. A <button> nested
                inside an <a> is invalid HTML. */}
            <Button variant="outline" asChild>
              <Link href={"/dashboard"} className="text-muted-foreground hover:text-foreground">
                <LayoutDashboard size={18} />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            </Button>

            <Button asChild>
              <Link href={"/transaction/create"}>
                <PenBox size={18} />
                <span className="hidden md:inline">Add Transaction</span>
              </Link>
            </Button>
          </SignedIn>

          <ThemeToggle />

          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline">Login</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{
              elements:{
                avatarBox: "w-10 h-10",
              }
            }} />
          </SignedIn>
        </div>
      </nav>
    </div>
  );
};

export default Header;
