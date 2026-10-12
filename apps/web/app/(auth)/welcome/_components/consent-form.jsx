"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";
import { acceptLegalTerms } from "@/actions/legal";
import { LEGAL_LINKS } from "@/lib/legal/versions";
import useFetch from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Both documents open in a new tab, so reading them does not navigate away
// from a half-finished signup. target="_blank" needs the accessible name to
// say so, or a screen reader announces an ordinary link and the new tab is a
// surprise; the icon carries the same meaning for everyone else.
const LegalLink = ({ href, children }) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
  >
    {children}
    <span className="sr-only"> (opens in a new tab)</span>
    <ExternalLink aria-hidden className="ml-0.5 inline h-3 w-3 align-baseline" />
  </Link>
);

// Static rather than useId(): a useId value must never reach rendered markup
// here. It encodes the component's position in the tree, and the one time this
// repo put one in an attribute the server and the client disagreed about that
// position and every page load mismatched on hydration. One consent form
// renders per page, so a fixed id is unambiguous anyway.
const CHECKBOX_ID = "legal-consent";
const ERROR_ID = "legal-consent-error";

const ConsentForm = () => {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  // Only shown after an attempt, so the page does not open already telling
  // someone off for not having done anything yet.
  const [showRequired, setShowRequired] = useState(false);
  const { loading, fn: accept } = useFetch(acceptLegalTerms);
  const checkboxRef = useRef(null);

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!accepted) {
      setShowRequired(true);
      // Say why, and put the cursor on the thing that needs doing. A disabled
      // button would have swallowed the click silently and left a keyboard
      // user tabbing past a control that never explains itself.
      checkboxRef.current?.focus();
      return;
    }

    // The action takes a single boolean and decides everything else itself:
    // which versions were accepted, when, and for whom.
    const result = await accept(true);
    // useFetch has already shown the failure; nothing to add.
    if (result?.success !== true) return;

    // refresh() before the push, so the layout re-reads the account that now
    // exists instead of serving the cached render that sent us here.
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-md px-4 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">One last thing</CardTitle>
          <CardDescription>
            Before we set up your WHealthOS account, please read and accept the
            documents that govern how the service works and how your data is
            handled.
          </CardDescription>
        </CardHeader>

        <form onSubmit={submit} noValidate>
          <CardContent>
            {/* items-start, not items-center: the label wraps to two or three
                lines on a phone, and a centred checkbox then floats beside the
                middle of the sentence. */}
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
              <Checkbox
                ref={checkboxRef}
                id={CHECKBOX_ID}
                checked={accepted}
                onCheckedChange={(value) => {
                  const next = value === true;
                  setAccepted(next);
                  if (next) setShowRequired(false);
                }}
                aria-describedby={showRequired ? ERROR_ID : undefined}
                aria-invalid={showRequired || undefined}
                disabled={loading}
                className="mt-0.5"
              />
              <label
                htmlFor={CHECKBOX_ID}
                className="cursor-pointer text-sm leading-relaxed text-foreground"
              >
                I agree to the{" "}
                <LegalLink href={LEGAL_LINKS.terms}>
                  Terms of Service
                </LegalLink>{" "}
                and acknowledge the{" "}
                <LegalLink href={LEGAL_LINKS.privacy}>
                  Privacy Policy
                </LegalLink>
                .
              </label>
            </div>

            {showRequired && (
              <p
                id={ERROR_ID}
                role="alert"
                className="mt-3 text-sm font-medium text-destructive"
              >
                Please accept the Terms of Service and Privacy Policy to
                continue.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3">
            {/* Reads as inactive until the box is checked, but stays
                focusable and clickable so that pressing it says what is
                missing. A truly disabled button is skipped by the tab order
                and explains nothing, which leaves a keyboard or screen reader
                user stuck at a form that will not submit for no stated reason.
                Either way this is for clarity and not for safety: the action
                refuses anything that is not an explicit acceptance, whatever
                the page allowed. */}
            <Button
              type="submit"
              aria-disabled={!accepted || undefined}
              disabled={loading}
              className={cn(
                !accepted && "opacity-60 hover:bg-primary"
              )}
            >
              {loading ? "Setting up your account..." : "Agree and continue"}
            </Button>

            {/* Someone who does not want to accept needs a way out that is not
                the back button. No account has been created at this point. */}
            <SignOutButton redirectUrl="/">
              <Button type="button" variant="ghost" disabled={loading}>
                Cancel and sign out
              </Button>
            </SignOutButton>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ConsentForm;
