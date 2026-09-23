import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Widget,
  WidgetHeader,
} from "@/components/dashboard/widget";
import { categoryColors, defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const LABELS = Object.fromEntries(
  defaultCategories.map((category) => [category.id, category.name])
);

const initialOf = (text) => (text?.trim()?.[0] ?? "•").toUpperCase();

// Recent activity as a table, like the reference: columns line up, so the eye
// can run down dates or amounts without re-reading each row.
const RecentTransactions = ({ transactions, accounts, limit = 7 }) => {
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = transactions.slice(0, limit);

  return (
    <Widget className="h-full w-full">
      <WidgetHeader
        title="Transactions"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">View All</Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No transactions yet
        </p>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Transaction</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Date</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Type</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((transaction) => {
                const income = transaction.type === "INCOME";
                const label =
                  transaction.description ||
                  LABELS[transaction.category] ||
                  transaction.category;
                return (
                  <tr key={transaction.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              categoryColors[transaction.category] ??
                              "hsl(var(--muted-foreground))",
                          }}
                        >
                          {initialOf(label)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{label}</p>
                          <p className="truncate text-xs capitalize text-muted-foreground">
                            {LABELS[transaction.category] ?? transaction.category}
                            {accountNames.has(transaction.accountId) &&
                              ` · ${accountNames.get(transaction.accountId)}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3 text-muted-foreground md:table-cell">
                      {format(new Date(transaction.date), "d MMM yyyy")}
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      <span className="rounded-md border px-2 py-0.5 text-xs">
                        {income ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums",
                        income
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {income ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Widget>
  );
};

export default RecentTransactions;
