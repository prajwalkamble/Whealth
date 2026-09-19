"use server";

import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { withCurrentTenant } from "@/lib/prisma";
import { accountInputSchema, parseOrThrow } from "@/app/lib/schema";

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

export async function createAccount(rawData) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");

    // Re-validated server-side: the form schema only ever ran in the browser.
    // Parsing also drops unknown keys, so the create below cannot be fed extra
    // columns such as id or userId.
    const data = parseOrThrow(accountInputSchema, rawData);

    // Get request data for Arcjet
    const req = await request();

    //Check rate limit
    const decision = await aj.protect(req, {
      userId: clerkUserId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const account = await withCurrentTenant(async (tx, userId) => {
      // Check if this is the user's first account
      const existingAccounts = await tx.account.count({ where: { userId } });

      const shouldBeDefault = existingAccounts === 0 ? true : data.isDefault;

      // If the account should be default, unset other default accounts
      if (shouldBeDefault) {
        await tx.account.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.account.create({
        data: {
          name: data.name,
          type: data.type,
          balance: data.balance,
          userId,
          isDefault: shouldBeDefault,
        },
      });
    });

    revalidatePath("/dashboard");
    // A first account turns a signed-up user into an active one.
    revalidateTag(LANDING_STATS_TAG);
    return { success: true, data: serializeTransaction(account) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getUserAccounts() {
  return withCurrentTenant(async (tx, userId) => {
    const accounts = await tx.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });
    return accounts.map(serializeTransaction);
  });
}

// The dashboard overview needs exactly two things: the handful of most recent
// transactions per account, and this month's expenses for the category
// breakdown. It used to load every transaction the user had ever made and ship
// all of them to the browser to be filtered there.
const RECENT_TRANSACTION_LIMIT = 100;
const MONTHLY_TRANSACTION_LIMIT = 2000;

export async function getDashboardData() {
  return withCurrentTenant(async (tx, userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [recent, thisMonth] = await Promise.all([
      tx.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: RECENT_TRANSACTION_LIMIT,
      }),
      tx.transaction.findMany({
        where: { userId, date: { gte: startOfMonth } },
        orderBy: { date: "desc" },
        take: MONTHLY_TRANSACTION_LIMIT,
      }),
    ]);

    // The two windows overlap, so de-duplicate before handing them over.
    const byId = new Map();
    for (const row of [...recent, ...thisMonth]) byId.set(row.id, row);

    return [...byId.values()]
      .sort((a, b) => b.date - a.date)
      .map(serializeTransaction);
  });
}
