import { cookies } from "next/headers";
import { checkUser } from "@/lib/checkUser";
import PreferencesSync from "@/components/preferences-sync";
import ThemeToggle from "@/components/theme-toggle";
import ThemeCustomizer from "@/components/theme-customizer";
import UserAvatar from "@/components/user-avatar";
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
      <PreferencesSync saved={user?.preferences} />

      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <PageBreadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <ThemeCustomizer />
            <ThemeToggle />
            <UserAvatar />
          </div>
        </header>

        {/* app-content: the Content Layout setting centres this column. */}
        <div className="app-content flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainLayout;
