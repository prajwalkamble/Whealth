import { sendEmail } from "@/actions/send-email";
import { adminDb, withTenant } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { GoogleGenerativeAI } from "@google/generative-ai";

// These jobs run on a cron with no Clerk session, so they enumerate tenants
// through adminDb (which is exempt from RLS) and then do every per-tenant read
// and write inside withTenant, where the policies apply again.

const monthBounds = (reference = new Date()) => ({
  startOfMonth: new Date(reference.getFullYear(), reference.getMonth(), 1),
  // Day 0 of the next month is the last day of this one; without an explicit
  // end-of-day the final day's transactions fall outside the range.
  endOfMonth: new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ),
});

export const checkBudgetAlert = inngest.createFunction(
  { id: "check-budget-alerts", name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      const rows = await adminDb.budget.findMany({
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
          name: budget.user.name,
          email: budget.user.email,
          defaultAccount: budget.user.accounts[0]
            ? {
                id: budget.user.accounts[0].id,
                name: budget.user.accounts[0].name,
              }
            : null,
        },
      }));
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.defaultAccount;
      if (!defaultAccount) continue; // Skip if no default account
      if (!budget.amount) continue; // Nothing to measure against

      await step.run(`check-budget-${budget.id}`, async () => {
        const { startOfMonth, endOfMonth } = monthBounds();

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

        if (
          percentageUsed >= 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          // Send Email
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name} account`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                // Number, not parseInt -- parseInt would drop the paise before
                // toFixed(2) put two zeroes back on.
                budgetAmount: Number(budget.amount),
                totalExpenses: Number(totalExpenses),
                accountName: defaultAccount.name,
              },
            }),
          });

          // Update lastAlertSent
          await withTenant(budget.userId, (tx) =>
            tx.budget.updateMany({
              where: { id: budget.id, userId: budget.userId },
              data: { lastAlertSent: new Date() },
            })
          );
        }
      });
    }
  }
);

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
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

        // Create new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description
              ? `${transaction.description} (Recurring)`
              : "Recurring transaction",
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        // Update account balance
        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.updateMany({
          where: { id: transaction.accountId, userId },
          data: { balance: { increment: balanceChange } },
        });

        // Update last process date and next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
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

// Must stay in step with the RecurringInterval enum in prisma/schema.prisma.
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" }, // First day of each month
  async ({ step }) => {
    const users = await step.run("fetch-users", async () =>
      adminDb.user.findMany({ select: { id: true, name: true, email: true } })
    );

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });

        const insights = await generateFinancialInsights(stats, monthName);

        // Send Email
        await sendEmail({
          to: user.email,
          subject: `Your monthly Financial Report for ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

export async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // text() is a method on the response; reading it as a property made every
    // call throw and silently fall back to the canned insights below.
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    const parsed = JSON.parse(cleanedText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Unexpected insights payload");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to generate insights: ", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings to optimize your spending.",
    ];
  }
}

const getMonthlyStats = async (userId, month) => {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
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
