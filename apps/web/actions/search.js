"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import { defaultCategories } from "@/data/categories";

// Category ids whose name matches the query, so "food" finds transactions
// filed under Food even though the row stores the id rather than the label.
const matchingCategories = (query) => {
  const wanted = query.toLowerCase();
  return defaultCategories
    .filter(
      (category) =>
        category.id.includes(wanted) ||
        category.name.toLowerCase().includes(wanted)
    )
    .map((category) => category.id);
};

const ACCOUNT_LIMIT = 4;
const TRANSACTION_LIMIT = 8;

// Minimum before anything is sent: a single character matches most of a
// ledger and costs a query per keystroke for a result nobody can use.
const MIN_QUERY = 2;
const MAX_QUERY = 100;

export async function searchEverything(rawQuery) {
  return runAction(async () => {
    await requireClerkUserId();

    const query = String(rawQuery ?? "").trim().slice(0, MAX_QUERY);
    if (query.length < MIN_QUERY) {
      return { success: true, data: { accounts: [], transactions: [], query } };
    }

    const categories = matchingCategories(query);

    const data = await withCurrentTenant(async (tx, userId) => {
      const [accounts, transactions] = await Promise.all([
        tx.account.findMany({
          // userId last, so nothing in the filter can replace the tenant scope.
          where: { name: { contains: query, mode: "insensitive" }, userId },
          select: { id: true, name: true, type: true, balance: true },
          orderBy: { createdAt: "desc" },
          take: ACCOUNT_LIMIT,
        }),
        tx.transaction.findMany({
          where: {
            OR: [
              { description: { contains: query, mode: "insensitive" } },
              ...(categories.length ? [{ category: { in: categories } }] : []),
            ],
            userId,
          },
          select: {
            id: true,
            description: true,
            category: true,
            amount: true,
            type: true,
            date: true,
            accountId: true,
            account: { select: { name: true } },
          },
          orderBy: { date: "desc" },
          take: TRANSACTION_LIMIT,
        }),
      ]);

      // Decimal cannot cross the server/client boundary.
      return {
        accounts: accounts.map((a) => ({ ...a, balance: a.balance.toNumber() })),
        transactions: transactions.map((t) => ({
          ...t,
          amount: t.amount.toNumber(),
        })),
      };
    });

    return { success: true, data: { ...data, query } };
  });
}
