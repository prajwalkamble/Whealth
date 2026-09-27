"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionTable } from "@/app/(main)/account/_components/transaction-table";
import { useDemo } from "../_components/demo-provider";

export default function DemoTransactionsPage() {
  const { ready, transactions, accounts } = useDemo();

  // The table expects each row to carry its account, the way the real query
  // joins it.
  const rows = transactions.map((transaction) => ({
    ...transaction,
    account: accounts.find((a) => a.id === transaction.accountId) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {ready
              ? `Sample data, plus anything you add (${rows.length}).`
              : "Loading…"}
          </p>
        </div>
        <Button size="sm" className="h-9" asChild>
          <Link href="/demo/transaction/create">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Link>
        </Button>
      </div>

      {ready ? (
        <TransactionTable transactions={rows} showAccount />
      ) : (
        <Skeleton className="h-96 rounded-xl" />
      )}
    </div>
  );
}
