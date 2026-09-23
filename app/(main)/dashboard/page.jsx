import { getDashboardPageData } from '@/actions/dashboard';
import BudgetProgress from './_components/budget-progress';
import StatCards from './_components/stat-cards';
import CashFlowChart from './_components/cash-flow-chart';
import CategoryDonut from './_components/category-donut';
import IncomeSources from './_components/income-sources';
import RecentTransactions from './_components/recent-transactions';
import AccountsPanel from './_components/accounts-panel';

async function DashboardPage() {
  // One transaction for the whole page: see getDashboardPageData.
  const { accounts, transactions, summary, cashFlow, breakdown, budget } =
    await getDashboardPageData();

  const defaultAccount = accounts.find((account) => account.isDefault);

  return (
    <div className="space-y-6">
      <StatCards
        summary={summary}
        accountCount={accounts.length}
        hasTransactions={transactions.length > 0}
      />

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <IncomeSources
          rows={breakdown.income}
          total={summary.monthlyIncome}
          previousTotal={summary.previous.income}
        />
        <CashFlowChart months={cashFlow} />
        <CategoryDonut
          title="Expense Breakdown"
          rows={breakdown.expenses}
          emptyLabel="No expenses this month"
        />
      </div>

      {/* The last row, as in the reference: two equal halves. Transactions
          fills the left; Budget and Accounts stack on the right and between
          them fill the same height, Accounts taking whatever Budget leaves. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex">
          <RecentTransactions
            transactions={transactions}
            accounts={accounts}
            limit={8}
          />
        </div>
        <div className="flex flex-col gap-6">
          {/* shrink-0: the column is a flex stack, and the Accounts card
              used to claim its full height, squeezing this card until the
              bar spilled out of it. */}
          <div className="shrink-0">
            <BudgetProgress
              initialBudget={budget.budget}
              currentExpenses={budget.currentExpenses}
              hasAccount={Boolean(defaultAccount)}
            />
          </div>
          <div className="flex flex-1">
            <AccountsPanel accounts={accounts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
