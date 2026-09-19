import { getDashboardData, getUserAccounts } from '@/actions/dashboard';
import CreateAccountDrawer from '@/components/create-account-drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import React, { Suspense } from 'react'
import AccountCard from './_components/account-card';
import { getCurrentBudget } from '@/actions/budget';
import BudgetProgress from './_components/budget-progress';
import DashboardOverview from './_components/transaction-overview';
import { getMyRating } from '@/actions/rating';
import RatingCard from './_components/rating-card';

async function DashboardPage() {
  // Independent queries run side by side; they used to run one after another,
  // each waiting on the previous round trip to the database.
  const [accounts, transactions] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
  ]);

  const defaultAccount = accounts?.find((account) => account.isDefault);

  // Only users who have created an account can rate; submitRating enforces
  // the same rule on the server.
  const canRate = accounts.length > 0;

  const [budgetData, myRating] = await Promise.all([
    defaultAccount ? getCurrentBudget(defaultAccount.id) : null,
    canRate ? getMyRating() : null,
  ]);

  return (
    <div className="space-y-8">
      {/* Budget Progress */}
      {defaultAccount && (
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
      )}

      {/* Overview */}
      <Suspense fallback={"Loading Overview..."}>
        <DashboardOverview
          accounts={accounts}
          transactions={transactions || []}
        />
      </Suspense>

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts.length > 0 && accounts?.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>

      {canRate && <RatingCard initialRating={myRating} />}
    </div>
  );
};

export default DashboardPage;
