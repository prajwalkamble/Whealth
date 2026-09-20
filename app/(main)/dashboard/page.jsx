import { getDashboardPageData } from '@/actions/dashboard';
import BudgetProgress from './_components/budget-progress';
import StatCards from './_components/stat-cards';
import CashFlowChart from './_components/cash-flow-chart';
import CategoryDonut from './_components/category-donut';
import RecentTransactions from './_components/recent-transactions';
import AccountsPanel from './_components/accounts-panel';
import RatingCard from './_components/rating-card';

async function DashboardPage() {
  // One transaction for the whole page: see getDashboardPageData.
  const { accounts, transactions, summary, cashFlow, breakdown, budget, rating } =
    await getDashboardPageData();

  const defaultAccount = accounts.find((account) => account.isDefault);

  // Only users who have created an account can rate; submitRating enforces
  // the same rule on the server.
  const canRate = accounts.length > 0;

  return (
    <div className="space-y-6">
      <StatCards summary={summary} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart months={cashFlow} />
        </div>
        <CategoryDonut
          title="Expense Breakdown"
          description="Where this month's money went"
          rows={breakdown.expenses}
          emptyLabel="No expenses this month"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions transactions={transactions} accounts={accounts} />
        </div>
        <CategoryDonut
          title="Income Sources"
          description="Where this month's money came from"
          rows={breakdown.income}
          emptyLabel="No income recorded this month"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {defaultAccount && (
          <BudgetProgress
            initialBudget={budget.budget}
            currentExpenses={budget.currentExpenses}
          />
        )}
        <AccountsPanel accounts={accounts} />
        {canRate && <RatingCard initialRating={rating} />}
      </div>
    </div>
  );
};

export default DashboardPage;
