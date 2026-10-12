import { Suspense } from 'react'
import { getAccountWithTransactions } from '@/actions/accounts';
import { BarLoader, HashLoader } from 'react-spinners';
import { TransactionTable } from '../_components/transaction-table';
import { notFound } from 'next/navigation';
import { AccountChart } from '../_components/account-chart';
import { ExportButton } from "@/components/export-drawer";

export default async function AccountsPage({ params }) {
  const { id } = await params;
  const accountData = await getAccountWithTransactions(id);

  if(!accountData) {
    notFound();
  }

  const { transactions, ...account } = accountData;

  return (
    <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}>
      <div className="space-y-8 px-5">
        <div className="flex gap-4 items-end justify-between">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold gradient-title capitalize">
              {account.name}
            </h1>
            <p className="text-muted-foreground">
              {account.type.charAt(0) + account.type.slice(1).toLowerCase()} Account
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 pb-2 text-right">
            <div className="text-xl sm:text-2xl font-bold">
              &#8377;{parseFloat(account.balance).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              {account._count.transactions} Transactions
            </p>
            {account.hasMoreTransactions && (
              <p className="text-xs text-muted-foreground">
                The table shows the most recent {account.transactionLimit}
              </p>
            )}
            {/* Scoped to this account, so the file matches the page. */}
            <ExportButton
              accountId={account.id}
              scopeLabel={`${account.name} transactions`}
            />
          </div>
        </div>

        {/* Chart Section */}
        <Suspense
          fallback={<HashLoader className="mt-4" width={"100%"} color="#9333ea" />}
        >
          <AccountChart dailyTotals={account.dailyTotals} />
        </Suspense>

        {/* Transaction Table */}
        <Suspense
          fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
        >
          <TransactionTable transactions={transactions} />
        </Suspense>
      </div>
    </Suspense>
  );
};
