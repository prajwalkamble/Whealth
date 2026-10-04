"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import { monthBounds, monthName, previousMonth, zonedYearMonth } from "@/lib/time";

// Notifications are derived from the data that already exists rather than
// stored in a table of their own.
//
// A stored feed would mean a migration plus writes from every Inngest job, and
// would then need its own backfill for anyone who signed up before it landed.
// Everything shown here is a fact the database already knows, computed on
// demand -- so it is never stale and there is nothing to keep in sync. "Seen"
// is tracked per browser by the bell itself, since it is a display concern.

const BUDGET_WARNING_AT = 80;
const RECURRING_WINDOW_DAYS = 7;
// The monthly report goes out on the 1st; mention it while it is still news.
const REPORT_NOTICE_DAYS = 5;

export async function getNotifications() {
  return runAction(async () => {
    await requireClerkUserId();

    const notifications = await withCurrentTenant(async (tx, userId) => {
      const { startOfMonth, endOfMonth } = monthBounds();
      const now = new Date();

      const since = new Date(now);
      since.setDate(since.getDate() - RECURRING_WINDOW_DAYS);

      const [budget, defaultAccount, recentRecurring] = await Promise.all([
        // The overall budget, not a per-category one.
        tx.budget.findFirst({ where: { userId, category: null } }),
        tx.account.findFirst({
          where: { userId, isDefault: true },
          select: { id: true, name: true },
        }),
        tx.transaction.count({
          where: { userId, isRecurring: true, lastProcessed: { gte: since } },
        }),
      ]);

      const rows = [];

      if (budget && defaultAccount) {
        const spent = await tx.transaction.aggregate({
          where: {
            userId,
            type: "EXPENSE",
            accountId: defaultAccount.id,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        });

        const amount = budget.amount.toNumber();
        const used = spent._sum.amount?.toNumber() ?? 0;
        const percent = amount > 0 ? (used / amount) * 100 : 0;

        if (percent >= BUDGET_WARNING_AT) {
          rows.push({
            id: `budget-${startOfMonth.toISOString()}`,
            kind: percent >= 100 ? "alert" : "warning",
            title:
              percent >= 100
                ? "You are over your monthly budget"
                : "You are close to your monthly budget",
            body: `${percent.toFixed(0)}% of your budget used on ${defaultAccount.name}.`,
            href: "/dashboard",
            at: now.toISOString(),
          });
        }
      }

      if (recentRecurring > 0) {
        rows.push({
          id: `recurring-${since.toISOString().slice(0, 10)}`,
          kind: "info",
          title: `${recentRecurring} recurring ${
            recentRecurring === 1 ? "transaction" : "transactions"
          } posted`,
          body: `Added automatically in the last ${RECURRING_WINDOW_DAYS} days.`,
          href: "/transactions",
          at: now.toISOString(),
        });
      }

      // Only for the first few days, and only once there is a month to report
      // on -- the job itself runs at 01:00 on the 1st.
      const dayOfMonth = Number(
        new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          timeZone: "UTC",
        }).format(now)
      );
      if (dayOfMonth <= REPORT_NOTICE_DAYS) {
        const { year, month } = previousMonth(zonedYearMonth(now));
        const had = await tx.transaction.count({
          where: { userId, date: { lt: startOfMonth } },
        });
        if (had > 0) {
          rows.push({
            id: `report-${year}-${month}`,
            kind: "info",
            title: `Your ${monthName(year, month)} report is on its way`,
            body: "Sent to your email address with this month's insights.",
            href: "/transactions",
            at: startOfMonth.toISOString(),
          });
        }
      }

      return rows;
    });

    return { success: true, data: notifications };
  });
}
