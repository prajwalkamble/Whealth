import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { checkUser } from "@/lib/checkUser";
import ConsentForm from "./_components/consent-form";

export const metadata = {
  title: "Accept the Terms | WHealthOS",
  description:
    "Accept the WHealthOS Terms of Service and Privacy Policy to finish setting up your account.",
  // Nothing here is useful to a search engine, and the page only ever renders
  // for one signed-in person mid-signup.
  robots: { index: false, follow: false },
};

// The last step of signing up: a WHealthOS account is created here, and only
// here, once the person has accepted the Terms and the Privacy Policy.
//
// It is a separate page rather than a checkbox inside Clerk's <SignUp /> for a
// reason that is not cosmetic: this Clerk instance has Google sign-up enabled,
// and an OAuth signup never passes through that form at all. A checkbox on the
// form would gate the email path and silently miss the Google one. A step the
// server enforces after authentication is the only place that covers both.
export default async function WelcomePage() {
  const { userId } = await auth();
  // Also enforced by the middleware; this is the page refusing to render for
  // an anonymous visitor on its own account rather than trusting that.
  if (!userId) redirect("/sign-in");

  // Already has an account, so there is nothing to accept -- someone who
  // bookmarked this page, or came back to it. Never a second consent record.
  const user = await checkUser();
  if (user) redirect("/dashboard");

  return <ConsentForm />;
}
