import Link from "next/link";
import { Plus } from "lucide-react";
import { getUserTransactions } from "@/actions/transaction";
import { Button } from "@/components/ui/button";
import { TransactionTable } from "../account/_components/transaction-table";

export default async function TransactionsPage() {
  const result = await getUserTransactions();
  const failed = !result.success;
  const transactions = failed ? [] : result.data;
  const total = failed ? 0 : result.total;

  // A failed load is called a failure. Falling through to the empty-state copy
  // told someone their transactions did not exist when the query had simply
  // not run -- which is exactly how a serialiser crash here once read as
  // "Nothing recorded yet."
  const summary = failed
    ? result.error ?? "Couldn't load your transactions. Please try again."
    : total === 0
      ? "Nothing recorded yet."
      : result.truncated
        ? `Your ${transactions.length} most recent transactions, of ${total} in total.`
        : `Every transaction across your accounts (${total}).`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p
            className={
              failed
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-muted-foreground"
            }
          >
            {summary}
          </p>
        </div>
        {/* Same button as the dashboard header, so adding a transaction is
            reachable from the section that lists them. */}
        <Button size="sm" className="h-9" asChild>
          <Link href="/transaction/create">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Link>
        </Button>
      </div>

      {/* showAccount: this list spans accounts, so each row names its own. */}
      <TransactionTable transactions={transactions} showAccount />
    </div>
  );
}
