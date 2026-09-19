"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function updateDefaultAccount(accountId) {
  try {
    const account = await withCurrentTenant(async (tx, userId) => {
      const target = await tx.account.findFirst({
        where: { id: accountId, userId },
        select: { id: true },
      });
      if (!target) throw new Error("Account not found");

      await tx.account.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.account.update({
        where: { id: accountId },
        data: { isDefault: true },
      });
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  } catch (error) {
    // Thrown, not returned: useFetch only populates its `error` state from a
    // rejection, so a returned {success:false} was invisible to every caller
    // and the UI reported it as a success.
    throw new Error(error.message);
  }
}

// The account page paginates and charts client-side, so it used to pull every
// transaction on the account into the RSC payload. Bounded here, with the
// truncation reported rather than hidden.
// Not exported: a "use server" module may only export async functions.
const ACCOUNT_TRANSACTION_LIMIT = 500;

export async function getAccountWithTransactions(accountId) {
  return withCurrentTenant(async (tx, userId) => {
    const account = await tx.account.findFirst({
      where: { id: accountId, userId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: ACCOUNT_TRANSACTION_LIMIT,
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) return null;

    return {
      ...serializeTransaction(account),
      transactions: account.transactions.map(serializeTransaction),
      transactionLimit: ACCOUNT_TRANSACTION_LIMIT,
      hasMoreTransactions:
        account._count.transactions > account.transactions.length,
    };
  });
}

export async function bulkDeleteTransactions(transactionIds) {
  try {
    const deletedCount = await withCurrentTenant(async (tx, userId) => {
      const transactions = await tx.transaction.findMany({
        where: {
          id: { in: transactionIds },
          userId,
        },
        select: { id: true, type: true, amount: true, accountId: true },
      });

      if (transactions.length === 0) return 0;

      // Deleting an expense returns money to the account and deleting income
      // takes it back out. amount is a Prisma Decimal, whose valueOf() is a
      // string -- call toNumber() or the accumulator concatenates instead of
      // adding.
      const accountBalanceChanges = transactions.reduce((acc, transaction) => {
        const amount = transaction.amount.toNumber();
        const change = transaction.type === "EXPENSE" ? amount : -amount;

        acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
        return acc;
      }, {});

      await tx.transaction.deleteMany({
        where: {
          id: { in: transactions.map((t) => t.id) },
          userId,
        },
      });

      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.updateMany({
          where: { id: accountId, userId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      return transactions.length;
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]", "page");
    revalidateTag(LANDING_STATS_TAG);

    return { success: true, data: { deleted: deletedCount } };
  } catch (error) {
    throw new Error(error.message);
  }
}
