import { NEAR_LIMIT_PERCENT } from "@/lib/budget-pace";
import { sendEmail } from "@/lib/email/send";
import { adminDb, withTenant } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { generateContent } from "@/lib/ai/gemini";
import { uptimeSlot } from "@/lib/stats";
import { nextOccurrenceAfter } from "@/lib/recurring";
import {
  APP_TIME_ZONE,
  monthBounds,
  monthBoundsFor,
  monthName as monthNameFor,
  previousMonth,
  zonedYearMonth,
} from "@/lib/time";

// These jobs run on a cron with no Clerk session, so they enumerate tenants
// through adminDb (which is exempt from RLS) and then do every per-tenant read
// and write inside withTenant, where the policies apply again.

// Month boundaries come from lib/time, on the app's calendar rather than the
// server's UTC one.

// Uptime heartbeat for the landing page. Inngest calls the app on this
// schedule; recording the slot proves the app answered and the database took
// a write. When either is down nothing is recorded, and the missing slot is
// what getLandingStats counts as downtime -- so this job must not try to
// report failures itself, and must not retry: a retry that lands after an
// outage would fill in a slot the site was down for.
const UPTIME_RETENTION_DAYS = 31;

export const recordUptime = inngest.createFunction(
  { id: "record-uptime", name: "Record Uptime", retries: 0 },
  { cron: "*/5 * * * *" },
  async () => {
    const slot = uptimeSlot(new Date());

    await adminDb.uptimeCheck.upsert({
      where: { slot },
      create: { slot },
      update: {},
    });

    // Only the last 30 days are ever read.
    const cutoff = new Date(
      Date.now() - UPTIME_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    await adminDb.uptimeCheck.deleteMany({ where: { slot: { lt: cutoff } } });

    return { slot };
  }
);

// Retries for a single budget alert email.
const BUDGET_ALERT_RETRIES = 4;

// Decides who is over budget. Sending is handed to sendBudgetAlert, one run
// per alert, so a failed email is retried on its own and shows up in Inngest
// instead of being recorded as sent.
export const checkBudgetAlert = inngest.createFunction(
  { id: "check-budget-alerts", name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      const rows = await adminDb.budget.findMany({
        // Overall budgets only. Per-category budgets exist now, and alerting
        // on them is a separate decision rather than something this job should
        // start doing silently.
        where: { category: null },
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });

      // step.run round-trips through JSON, so hand back plain numbers.
      return rows.map((budget) => ({
        id: budget.id,
        userId: budget.userId,
        amount: budget.amount.toNumber(),
        lastAlertSent: budget.lastAlertSent,
        user: {
          defaultAccount: budget.user.accounts[0]
            ? {
                id: budget.user.accounts[0].id,
                name: budget.user.accounts[0].name,
              }
            : null,
        },
      }));
    });

    const alerts = [];

    for (const budget of budgets) {
      const defaultAccount = budget.user.defaultAccount;
      if (!defaultAccount) continue; // Skip if no default account
      if (!budget.amount) continue; // Nothing to measure against

      const alert = await step.run(`check-budget-${budget.id}`, async () => {
        const now = new Date();
        const { startOfMonth, endOfMonth } = monthBounds(now);

        const totalExpenses = await withTenant(budget.userId, async (tx) => {
          const expenses = await tx.transaction.aggregate({
            where: {
              userId: budget.userId,
              accountId: defaultAccount.id, // Only consider default account
              type: "EXPENSE",
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _sum: {
              amount: true,
            },
          });

          return expenses._sum.amount?.toNumber() || 0;
        });

        const percentageUsed = (totalExpenses / budget.amount) * 100;
        const alreadyAlerted =
          budget.lastAlertSent &&
          !isNewMonth(new Date(budget.lastAlertSent), now);

        // NEAR_LIMIT_PERCENT, not a literal 80: the budgets page shows the
        // same threshold, and the two must not drift apart or the email and
        // the UI disagree about whether a budget is near its limit.
        if (percentageUsed < NEAR_LIMIT_PERCENT || alreadyAlerted) return null;

        const { year, month } = zonedYearMonth(now);

        return {
          name: "budget.alert.send",
          // One alert per budget per month. While lastAlertSent is still unset
          // -- because the send is retrying, or failed -- every 6-hourly check
          // finds this budget again; the id stops those becoming duplicate
          // emails. Inngest remembers ids for 24 hours, so a send that failed
          // for good is attempted again roughly once a day, not lost.
          id: `budget-alert-${budget.id}-${year}-${month}`,
          data: {
            budgetId: budget.id,
            userId: budget.userId,
            year,
            month,
            percentageUsed,
            // Number, not parseInt -- parseInt would drop the paise before
            // toFixed(2) put two zeroes back on.
            budgetAmount: Number(budget.amount),
            totalExpenses: Number(totalExpenses),
            accountName: defaultAccount.name,
          },
        };
      });

      if (alert) alerts.push(alert);
    }

    if (alerts.length > 0) {
      await step.sendEvent("send-budget-alerts", alerts);
    }

    return { checked: budgets.length, alerts: alerts.length };
  }
);

export const sendBudgetAlert = inngest.createFunction(
  {
    id: "send-budget-alert",
    name: "Send Budget Alert",
    retries: BUDGET_ALERT_RETRIES,
  },
  { event: "budget.alert.send" },
  async ({ event, step }) => {
    const { budgetId, userId, year, month, ...alert } = event.data;

    const recipient = await step.run("fetch-recipient", async () => {
      const now = new Date();
      // The alert describes one month's spending. If that month is over by
      // the time this runs, the numbers are stale; the next check will
      // measure the new month from scratch.
      const current = zonedYearMonth(now);
      if (current.year !== year || current.month !== month) {
        return { skip: "month ended before the alert was sent" };
      }

      const budget = await adminDb.budget.findUnique({
        where: { id: budgetId },
        select: {
          lastAlertSent: true,
          user: { select: { name: true, email: true } },
        },
      });
      if (!budget) return { skip: "budget no longer exists" };

      // Another run may have delivered this month's alert since this one was
      // queued.
      if (
        budget.lastAlertSent &&
        !isNewMonth(new Date(budget.lastAlertSent), now)
      ) {
        return { skip: "already alerted this month" };
      }

      // Users who signed in without an email address get no mail.
      if (!budget.user.email) return { skip: "user has no email address" };

      return { name: budget.user.name, email: budget.user.email };
    });
    if (recipient.skip) return { budgetId, skipped: recipient.skip };

    await step.run("send-email", async () => {
      const result = await sendEmail({
        type: "budget-alert",
        to: recipient.email,
        subject: `Budget Alert for ${alert.accountName} account`,
        react: EmailTemplate({
          userName: recipient.name,
          type: "budget-alert",
          data: alert,
        }),
      });

      // Throwing is what keeps lastAlertSent unset: the step below only runs
      // once this one succeeds. Recording the alert regardless of the result
      // used to silence it for the rest of the month when the email failed.
      if (!result.success) {
        throw new Error(
          `Budget alert email to user ${userId} failed: ` +
            (result.error?.message ?? "unknown error")
        );
      }
    });

    await step.run("mark-alert-sent", () =>
      withTenant(userId, (tx) =>
        tx.budget.updateMany({
          where: { id: budgetId, userId },
          data: { lastAlertSent: new Date() },
        })
      )
    );

    return { budgetId, sent: true };
  }
);

function isNewMonth(lastAlertDate, currentDate) {
  const last = zonedYearMonth(lastAlertDate);
  const current = zonedYearMonth(currentDate);
  return last.month !== current.month || last.year !== current.year;
}

export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    // 1. Fetch all due recurring transactions
    const recurringTransactions = await step.run(
      "fetch-due-recurring-transactions",
      async () => {
        const rows = await adminDb.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              // Due: its next occurrence has arrived.
              { nextRecurringDate: { lte: new Date() } },
              // Legacy rows written before nextRecurringDate was populated.
              { nextRecurringDate: null, lastProcessed: null },
            ],
          },
          select: { id: true, userId: true },
        });
        return rows;
      }
    );

    // 2. Create events for each transaction
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: { transactionId: transaction.id, userId: transaction.userId },
      }));

      // 3. Send events to be processed
      await inngest.send(events);
    }

    return { triggered: recurringTransactions.length };
  }
);

export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10, // Only process 10 transactions
      period: "1m", // per minute
      key: "event.data.userId", // Throttle per user
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    // Validate event data
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data: ", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const { transactionId, userId } = event.data;

      await withTenant(userId, async (tx) => {
        const transaction = await tx.transaction.findFirst({
          where: {
            id: transactionId,
            userId,
          },
        });

        if (!transaction || !isTransactionDue(transaction)) return;

        const now = new Date();
        const { date: anchor, recurringInterval: interval } = transaction;

        // Every occurrence that has come due, each posted on its own date.
        // This used to post a single copy dated "now" and schedule the next
        // one from the processing time, so the series drifted with the cron,
        // and a run missed during an outage was simply lost. Occurrences are
        // counted from the series' own start (lib/recurring), so a series on
        // the 31st stays on month-ends instead of slipping to the 3rd.
        // Legacy rows with no schedule have one occurrence due: now.
        const due = [];
        let occurrence = transaction.nextRecurringDate ?? now;
        while (occurrence <= now && due.length < MAX_RECURRING_CATCH_UP) {
          due.push(occurrence);
          occurrence = nextOccurrenceAfter(anchor, interval, occurrence);
        }
        // Past the catch-up cap, skip ahead rather than post dozens at once.
        const nextRecurringDate =
          occurrence > now ? occurrence : nextOccurrenceAfter(anchor, interval, now);

        await tx.transaction.createMany({
          data: due.map((date) => ({
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description
              ? `${transaction.description} (Recurring)`
              : "Recurring transaction",
            date,
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          })),
        });

        // Update account balance
        const perOccurrence =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.updateMany({
          where: { id: transaction.accountId, userId },
          data: { balance: { increment: perOccurrence * due.length } },
        });

        // Update last process date and next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { lastProcessed: now, nextRecurringDate },
        });
      });
    });
  }
);

export function isTransactionDue(transaction) {
  // Never look only at lastProcessed. createTransaction stores a
  // nextRecurringDate but leaves lastProcessed null, so treating "never
  // processed" as "due now" made the nightly cron post a copy of every new
  // recurring transaction the following night instead of on its schedule.
  if (!transaction.nextRecurringDate) return !transaction.lastProcessed;

  return new Date(transaction.nextRecurringDate) <= new Date();
}

// Occurrences one run may post for a single recurring transaction: a month
// of a daily series, which covers any realistic outage of the nightly cron.
const MAX_RECURRING_CATCH_UP = 31;

// Retries for a single user's report. Inngest backs off between attempts, so
// together they ride out a busy model or a spent per-minute quota.
const MONTHLY_REPORT_RETRIES = 4;

// The cron only decides which month to report on and who gets a report. Each
// report then runs as its own function, so one user's failure or retry never
// holds up anyone else's, and a failure is visible per user in Inngest.
export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  // 01:00 on the 1st on the app's calendar. At 00:00 UTC, in a zone behind
  // UTC it would still be the last day of the month, and "last month" would
  // be the wrong one.
  { cron: `TZ=${APP_TIME_ZONE} 0 1 1 * *` },
  async ({ step }) => {
    const { users, year, month } = await step.run("fetch-users", async () => {
      // Pinned here rather than recomputed per report: a retry that lands on
      // a later day must still report on the month the cron fired for.
      const { year, month } = previousMonth(zonedYearMonth(new Date()));

      return {
        // Users who signed in without an email address get no report.
        users: await adminDb.user.findMany({
          where: { email: { not: null } },
          select: { id: true },
        }),
        year,
        month,
      };
    });

    if (users.length > 0) {
      await step.sendEvent(
        "fan-out-monthly-reports",
        users.map((user) => ({
          name: "report.monthly.send",
          // The id makes a re-run of this cron a no-op instead of a second
          // email: Inngest drops events whose id it has already seen.
          id: `monthly-report-${user.id}-${year}-${month}`,
          data: { userId: user.id, year, month },
        }))
      );
    }

    return { queued: users.length, year, month };
  }
);

export const sendMonthlyReport = inngest.createFunction(
  {
    id: "send-monthly-report",
    name: "Send Monthly Report",
    retries: MONTHLY_REPORT_RETRIES,
    // Keeps a month-start burst under Gemini's per-minute request limits.
    throttle: { limit: 10, period: "1m" },
  },
  { event: "report.monthly.send" },
  async ({ event, step, attempt, maxAttempts }) => {
    const { userId, year, month } = event.data;
    const monthName = monthNameFor(year, month);

    const user = await step.run("fetch-user", () =>
      adminDb.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
    );
    if (!user) return { skipped: "user no longer exists" };
    if (!user.email) return { skipped: "user has no email address" };

    const stats = await step.run("monthly-stats", () =>
      getMonthlyStats(userId, year, month)
    );

    // Nothing to report on: no email, and no Gemini request spent on an
    // empty month.
    if (stats.transactionCount === 0) {
      return { skipped: "no transactions that month" };
    }

    const insights = await step.run("ai-insights", async () => {
      try {
        return await generateFinancialInsights(stats, monthName);
      } catch (error) {
        // Throwing hands the step back to Inngest to retry later.
        const lastAttempt =
          attempt >= (maxAttempts ?? MONTHLY_REPORT_RETRIES + 1) - 1;
        if (!lastAttempt) throw error;

        // Out of attempts. The report still goes out -- the totals and the
        // category breakdown are real -- but with no insights section, rather
        // than the generic advice that used to be passed off as AI output and
        // hid this failure every month.
        console.error(
          `AI insights unavailable for user ${userId}, ${monthName} ${year}; ` +
            "sending the report without them.",
          error
        );
        return null;
      }
    });

    await step.run("send-email", async () => {
      const result = await sendEmail({
        type: "monthly-report",
        to: user.email,
        subject: `Your monthly Financial Report for ${monthName}`,
        react: EmailTemplate({
          userName: user.name,
          type: "monthly-report",
          data: { stats, month: monthName, insights },
        }),
      });

      // sendEmail reports failure in its return value. Throwing makes Inngest
      // retry the send and, if it keeps failing, mark this run as failed.
      if (!result.success) {
        throw new Error(
          `Monthly report email to user ${userId} failed: ` +
            (result.error?.message ?? "unknown error")
        );
      }
    });

    return { userId, insights: insights ? "ai" : "none" };
  }
);

// Throws when the model fails or answers with something unusable. The caller
// decides what a failure means; there is deliberately no canned fallback here.
export async function generateFinancialInsights(stats, month) {
  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: ₹${stats.totalIncome}
    - Total Expenses: ₹${stats.totalExpenses}
    - Net Income: ₹${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: ₹${amount}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]`;

  const text = await generateContent(prompt);
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  const parsed = JSON.parse(cleanedText);
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every((insight) => typeof insight === "string" && insight.trim())
  ) {
    throw new Error("Unexpected insights payload from the model");
  }
  return parsed;
}

const getMonthlyStats = async (userId, year, month) => {
  const { startOfMonth: startDate, endOfMonth: endDate } = monthBoundsFor(
    year,
    month
  );

  const transactions = await withTenant(userId, (tx) =>
    tx.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
  );

  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
};
