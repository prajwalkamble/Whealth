import { cookies } from "next/headers";
import { UserButton } from "@clerk/nextjs";
import { checkUser } from "@/lib/checkUser";
import ThemeSync from "@/components/theme-sync";
import ThemeToggle from "@/components/theme-toggle";
import AppSidebar from "@/components/app-sidebar";
import PageBreadcrumb from "@/components/page-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Every route under (main) is behind the middleware's auth check, so this is
// the first point where a Clerk user is guaranteed and the local row is
// actually needed. Doing it here instead of in the shared Header keeps the
// public landing page off the database entirely.
const MainLayout = async ({ children }) => {
  const user = await checkUser();

  // The sidebar writes its open state to a cookie; reading it here renders it
  // in the right state instead of flicking open on the first paint.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {/* Applies the theme saved on the account, for a browser that has not
          seen this user before. */}
      <ThemeSync preferred={user?.theme} />

      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <PageBreadcrumb />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainLayout;
