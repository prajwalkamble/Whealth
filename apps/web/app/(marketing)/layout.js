import { auth } from "@clerk/nextjs/server";
import Clerk from "@/components/clerk";
import Header from "@/components/header";
import Footer from "@/components/footer";

// The public pages keep the marketing header and footer. The signed-in app
// lives under (main), which has its own sidebar shell instead.
//
// ClerkProvider is mounted here only for a visitor who is already signed in,
// because the only Clerk component on these pages is the avatar menu in the
// header and that is the only case it renders. Signed out -- which is every
// first visit, every calculator and every legal page -- no Clerk JavaScript
// loads, no Clerk cookie is set and nothing is written to localStorage. The
// header itself reads the session through auth(), on the server, so nothing
// about the page depends on the provider being there.
const MarketingLayout = async ({ children }) => {
  const { userId } = await auth();

  const shell = (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );

  return userId ? <Clerk>{shell}</Clerk> : shell;
};

export default MarketingLayout;
