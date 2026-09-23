import { getUserTransactions } from "@/actions/transaction";
import { TransactionTable } from "../account/_components/transaction-table";

export default async function TransactionsPage() {
  const result = await getUserTransactions();
  const transactions = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          {transactions.length === 0
            ? "Nothing recorded yet."
            : `Every transaction across your accounts (${transactions.length}).`}
        </p>
      </div>

      {/* showAccount: this list spans accounts, so each row names its own. */}
      <TransactionTable transactions={transactions} showAccount />
    </div>
  );
}
