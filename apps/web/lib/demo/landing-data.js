import { DEMO_ACCOUNTS, DEMO_BUDGET, demoTransactions } from "./data";
import { accountsWithTotals, dashboardFrom } from "./compute";

// The landing page's dashboard data.
//
// Same sample rows and the same aggregation the demo uses, deliberately: the
// numbers on the landing page are the numbers a visitor meets a click later at
// /demo, and neither is a second financial engine written for marketing.
//
// What this does NOT do is go through lib/demo/store.js. That hook layers a
// guest's own localStorage rows on top and exposes addTransaction / reset. The
// landing page is a demonstration, not a workspace: it reads, it never writes,
// and it must render the same thing for every visitor. So it calls the pure
// derivation directly and stops there.
export function landingDashboard() {
  const transactions = demoTransactions();
  const accounts = accountsWithTotals(DEMO_ACCOUNTS, transactions);

  return {
    transactions,
    accounts,
    dashboard: dashboardFrom(accounts, transactions, DEMO_BUDGET),
  };
}
