import { cookies } from "next/headers";
import Clerk from "@/components/clerk";
import { checkUser } from "@/lib/checkUser";
import FeedbackWidget from "@/components/feedback-widget";
import PreferencesSync from "@/components/preferences-sync";
import AppSidebar from "@/components/app-sidebar";
import AppHeader from "@/components/header/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Every route under (main) is behind the middleware's auth check, so this is
// the first point where a Clerk user is guaranteed and the local row is
// actually needed. Doing it here instead of in the shared Header keeps the
// public landing page off the database entirely.
const MainLayout = async ({ children }) => {
  const user = await checkUser();
  // Comes back on the row checkUser already fetches. Reading it separately
  // meant a whole extra tenant transaction on every navigation, for a panel
  // most people never open -- and a transient failure there would have taken
  // down every page in the app rather than one widget.
  const rating = user?.rating?.score ?? null;

  // The sidebar writes its open state to a cookie; reading it here renders it
  // in the right state instead of flicking open on the first paint.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    // Always wrapped: everything under (main) is signed in, and the shell is
    // full of Clerk components -- the avatar menu, the profile screen.
    <Clerk>
    <SidebarProvider defaultOpen={defaultOpen}>
      {/* Applies the theme saved on the account, for a browser that has not
          seen this user before. */}
      <PreferencesSync saved={user?.preferences} />

      <AppSidebar />

      <SidebarInset>
        <AppHeader />


        {/* app-content: the Content Layout setting centres this column. */}
        <div className="app-content flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>

      {/* Pinned to the viewport, so it belongs to the shell rather than any
          one page. */}
      <FeedbackWidget initialRating={rating} />
    </SidebarProvider>
    </Clerk>
  );
};

export default MainLayout;
