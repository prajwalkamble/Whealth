import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import AiSummaryToggle from "./_components/ai-summary-toggle";
import AppearanceCard from "./_components/appearance-card";
import { ExportButton } from "@/components/export-drawer";
import { ImportButton } from "@/components/import-drawer";
import { AI_USAGE_LINK } from "@/lib/legal/ai";
import { getMonthlyInsightsEnabled, getUserAccounts } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const [user, accounts, monthlyInsights] = await Promise.all([
    currentUser(),
    getUserAccounts(),
    getMonthlyInsightsEnabled(),
  ]);
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your account and how WHealthOS looks.
        </p>
      </div>

      <AppearanceCard />

      {/* The findable home for both directions. The buttons on Transactions
          are shortcuts to these same drawers; someone looking for "where do I
          get my data in or out" looks in Settings. */}
      <Card id="data-privacy">
        <CardHeader>
          <CardTitle>Data &amp; Privacy</CardTitle>
          <CardDescription>
            Your transactions are yours. Take them out in a format you can open
            anywhere, or bring in history from a spreadsheet or a bank export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-2" aria-labelledby="import-export-heading">
            <h3 id="import-export-heading" className="text-sm font-medium">
              Import &amp; Export
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <ImportButton accounts={accounts} label="Import transactions" />
              <ExportButton label="Export transactions" />
            </div>
            <p className="text-sm text-muted-foreground">
              Import a CSV or XLSX — every row is checked and shown to you
              before anything is added, and rows already in WHealthOS are
              skipped. Export as CSV, Excel or PDF for any period; the PDF is a
              report of your own records, not a certified or audited statement.
            </p>
          </section>

          <section className="space-y-1 border-t pt-4" aria-labelledby="privacy-heading">
            <h3 id="privacy-heading" className="text-sm font-medium">
              Privacy
            </h3>
            <p className="text-sm text-muted-foreground">
              Imported files are read to create your transactions and are not
              stored. Two features do send information to an external AI
              provider: the receipt scanner sends the photo you choose, and
              the monthly summary email sends that month&apos;s totals by
              category. The{" "}
              <Link
                href={AI_USAGE_LINK}
                className="underline underline-offset-4"
              >
                AI Usage page
              </Link>{" "}
              sets out exactly what each one sends and what it does not.
            </p>
            <div className="pt-3">
              <AiSummaryToggle enabled={monthlyInsights} />
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Your name, email and password are managed by your WHealthOS sign-in.
            Use the avatar menu in the top bar to change them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {email ?? "No email address"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
