import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Compact list, the counterpart to the reference dashboard's wallet panel.
// The full cards live on /accounts.
const AccountsPanel = ({ accounts }) => {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>My Accounts</CardTitle>
          <CardDescription>
            {accounts.length === 0
              ? "No accounts yet"
              : `${formatCurrency(total)} across ${accounts.length} account${accounts.length > 1 ? "s" : ""}`}
          </CardDescription>
        </div>
        <CreateAccountDrawer>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </CreateAccountDrawer>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Add an account to start tracking.
          </p>
        ) : (
          <ul className="space-y-1">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/account/${account.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    {/* div, not p: Badge renders a div, and a div inside a
                        p is invalid HTML that breaks hydration. */}
                    <div className="flex items-center gap-2 truncate text-sm font-medium capitalize">
                      {account.name}
                      {account.isDefault && (
                        <Badge variant="secondary" className="h-5 text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs capitalize text-muted-foreground">
                      {account.type.toLowerCase()} · {account._count.transactions}{" "}
                      transactions
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      account.balance < 0 && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsPanel;
