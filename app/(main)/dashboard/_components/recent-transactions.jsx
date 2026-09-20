import Link from "next/link";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryColors, defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const LABELS = Object.fromEntries(
  defaultCategories.map((category) => [category.id, category.name])
);

const RecentTransactions = ({ transactions, accounts, limit = 7 }) => {
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = transactions.slice(0, limit);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your most recent activity</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No transactions yet
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((transaction) => {
              const income = transaction.type === "INCOME";
              return (
                <li
                  key={transaction.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{
                      backgroundColor:
                        categoryColors[transaction.category] ?? "hsl(var(--muted-foreground))",
                    }}
                  >
                    {income ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {transaction.description ||
                        LABELS[transaction.category] ||
                        transaction.category}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "d MMM yyyy")}
                      {accountNames.has(transaction.accountId) &&
                        ` · ${accountNames.get(transaction.accountId)}`}
                    </p>
                  </div>

                  <Badge variant="outline" className="hidden capitalize sm:inline-flex">
                    {LABELS[transaction.category] ?? transaction.category}
                  </Badge>

                  <span
                    className={cn(
                      "w-28 shrink-0 text-right text-sm font-semibold",
                      income
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {income ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;
