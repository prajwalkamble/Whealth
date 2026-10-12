import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { LEGAL_LINKS } from '@/lib/legal/versions';

export default function Page () {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 px-4 pb-16">
      {/* forceRedirectUrl, not fallbackRedirectUrl: the consent step is not a
          suggestion to be overridden by a ?redirect_url on the way in. The
          (main) layout refuses to render without an account either, so a
          signup that lands anywhere else still arrives there -- this just
          means the usual path is the direct one. */}
      <SignUp forceRedirectUrl="/welcome" />

      {/* Both documents, reachable before anyone commits to anything. The
          acceptance itself is the next step, once Clerk has verified who this
          is; saying so here means the checkbox is not a surprise. */}
      <p className="text-center text-sm text-muted-foreground">
        After verifying your email you will be asked to accept the{' '}
        <Link
          href={LEGAL_LINKS.terms}
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          Terms of Service
        </Link>{' '}
        and the{' '}
        <Link
          href={LEGAL_LINKS.privacy}
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
