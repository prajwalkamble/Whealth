import { getUserAccounts } from "@/actions/dashboard";
import AccountCard from "../dashboard/_components/account-card";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Plus } from "lucide-react";

export default async function AccountsPage() {
  const accounts = await getUserAccounts();
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.length === 0
              ? "No accounts yet."
              : `${accounts.length} account${accounts.length > 1 ? "s" : ""}, ${formatCurrency(total)} in total.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="cursor-pointer border-border transition-shadow hover:shadow-md">
            <CardContent className="flex h-full flex-col items-center justify-center pt-5 text-muted-foreground">
              <Plus className="mb-2 h-10 w-10" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>

        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
