"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { subDays } from "date-fns";

// Categories with their typical amount ranges
const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

// Helper to generate random amount within a range
function getRandomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Helper to get random category with amount
function getRandomCategory(type) {
  const categories = CATEGORIES[type];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const amount = getRandomAmount(category.range[0], category.range[1]);
  return { category: category.name, amount };
}

export async function seedTransactions() {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "Seeding is disabled in production" };
  }

  try {
    return await withCurrentTenant(async (tx, userId) => {
      // Seeds the signed-in user's own default account rather than a pair of
      // ids hardcoded from someone's local database.
      const account =
        (await tx.account.findFirst({
          where: { userId, isDefault: true },
          select: { id: true },
        })) ??
        (await tx.account.findFirst({
          where: { userId },
          select: { id: true },
        }));

      if (!account) {
        return {
          success: false,
          error: "Create an account before seeding transactions",
        };
      }

      // Generate 90 days of transactions
      const transactions = [];
      let totalBalance = 0;

      for (let i = 90; i >= 0; i--) {
        const date = subDays(new Date(), i);

        // Generate 1-3 transactions per day
        const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < transactionsPerDay; j++) {
          // 40% chance of income, 60% chance of expense
          const type = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
          const { category, amount } = getRandomCategory(type);

          transactions.push({
            id: crypto.randomUUID(),
            type,
            amount,
            description: `${
              type === "INCOME" ? "Received" : "Paid for"
            } ${category}`,
            date,
            category,
            status: "COMPLETED",
            userId,
            accountId: account.id,
            createdAt: date,
            updatedAt: date,
          });

          totalBalance += type === "INCOME" ? amount : -amount;
        }
      }

      // Clear existing transactions
      await tx.transaction.deleteMany({
        where: { accountId: account.id, userId },
      });

      // Insert new transactions
      await tx.transaction.createMany({ data: transactions });

      // Update account balance
      await tx.account.updateMany({
        where: { id: account.id, userId },
        data: { balance: totalBalance },
      });

      return {
        success: true,
        message: `Created ${transactions.length} transactions`,
      };
    });
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return { success: false, error: error.message };
  }
}
