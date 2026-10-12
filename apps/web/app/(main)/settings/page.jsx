import { currentUser } from "@clerk/nextjs/server";
import AppearanceCard from "./_components/appearance-card";
import { ExportButton } from "@/components/export-drawer";
import { ImportButton } from "@/components/import-drawer";
import { getUserAccounts } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const [user, accounts] = await Promise.all([
    currentUser(),
    getUserAccounts(),
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
