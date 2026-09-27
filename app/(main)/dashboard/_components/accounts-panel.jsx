import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Widget,
  WidgetContent,
  WidgetHeader,
} from "@/components/dashboard/widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Compact list, the counterpart to the reference dashboard's wallet panel.
// The full cards live on /accounts.
const AccountsPanel = ({ accounts, guest = false }) => {
  const Row = guest ? "div" : Link;
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Widget className="w-full">
      <WidgetHeader
        title={
          <>
            Accounts
            {accounts.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {formatCurrency(total)} total
              </span>
            )}
          </>
        }
        action={
          guest ? null : (
            <CreateAccountDrawer>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </CreateAccountDrawer>
          )
        }
      />
      <WidgetContent className="p-2">
        {accounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Add an account to start tracking.
          </p>
        ) : (
          <ul className="grid gap-1">
            {accounts.map((account) => (
              <li key={account.id}>
                {/* In demo mode there is no account page to open, so the row
                    is not a link -- better than one that bounces to sign-in. */}
                <Row
                  {...(guest
                    ? {}
                    : { href: `/account/${account.id}` })}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-3 transition-colors",
                    !guest && "hover:bg-accent"
                  )}
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
                      "shrink-0 text-sm font-semibold tabular-nums",
                      account.balance < 0 && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                </Row>
              </li>
            ))}
          </ul>
        )}
      </WidgetContent>
    </Widget>
  );
};

export default AccountsPanel;
