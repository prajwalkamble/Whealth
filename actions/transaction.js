"use server";

import { auth } from "@clerk/nextjs/server";
import { withCurrentTenant } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { generateContent } from "@/lib/ai/gemini";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";
import {
  transactionInputSchema,
  parseOrThrow,
} from "@/app/lib/schema";

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
  ...(obj.account
    ? { account: { ...obj.account, balance: obj.account.balance.toNumber() } }
    : {}),
});

// Arcjet talks to the network, so it runs before the tenant transaction opens
// rather than holding a database connection for the round trip.
async function enforceRateLimit(clerkUserId) {
  const req = await request();
  const decision = await aj.protect(req, { userId: clerkUserId, requested: 1 });

  if (!decision.isDenied()) return;

  if (decision.reason.isRateLimit()) {
    const { remaining, reset } = decision.reason;
    console.error({
      code: "RATE_LIMIT_EXCEEDED",
      details: { remaining, resetInSeconds: reset },
    });
    throw new Error("Too many requests. Please try again later.");
  }

  throw new Error("Request blocked");
}

async function requireClerkUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// The signed change a transaction applies to its account balance.
const balanceEffect = (type, amount) =>
  type === "EXPENSE" ? -Number(amount) : Number(amount);

// The columns a client is allowed to set. Spreading the validated payload
// straight into Prisma would still carry whatever zod chose to keep, so the
// writable surface is named explicitly here.
const transactionColumns = (data) => ({
  type: data.type,
  amount: data.amount,
  description: data.description ?? null,
  date: data.date,
  category: data.category,
  isRecurring: data.isRecurring,
  recurringInterval: data.isRecurring ? data.recurringInterval : null,
  accountId: data.accountId,
});

// Create Transaction
export async function createTransaction(rawData) {
  try {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit(clerkUserId);

    // A server action is a public endpoint, so the payload is re-validated here
    // rather than trusted from the browser form. Parsing also drops unknown
    // keys, so a crafted body cannot smuggle userId/id/status into the create.
    const data = parseOrThrow(transactionInputSchema, rawData);

    const transaction = await withCurrentTenant(async (tx, userId) => {
      const account = await tx.account.findFirst({
        where: { id: data.accountId, userId },
        select: { id: true },
      });
      if (!account) throw new Error("Account not found");

      const newTransaction = await tx.transaction.create({
        data: {
          ...transactionColumns(data),
          userId,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // increment, not an absolute write computed from an earlier read, so
      // concurrent transactions on the same account cannot lose an update.
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: balanceEffect(data.type, data.amount) } },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);
    revalidateTag(LANDING_STATS_TAG);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getTransaction(id) {
  return withCurrentTenant(async (tx, userId) => {
    const transaction = await tx.transaction.findFirst({
      where: { id, userId },
    });

    if (!transaction) throw new Error("Transaction not found");

    return serializeAmount(transaction);
  });
}

export async function updateTransaction(id, rawData) {
  try {
    const data = parseOrThrow(transactionInputSchema, rawData);

    // withCurrentTenant rejects an unauthenticated caller before any query runs.
    const { transaction, previousAccountId } = await withCurrentTenant(
      async (tx, userId) => {
        const original = await tx.transaction.findFirst({
          where: { id, userId },
        });
        if (!original) throw new Error("Transaction not found");

        const targetAccount = await tx.account.findFirst({
          where: { id: data.accountId, userId },
          select: { id: true },
        });
        if (!targetAccount) throw new Error("Account not found");

        const oldEffect = balanceEffect(
          original.type,
          original.amount.toNumber()
        );
        const newEffect = balanceEffect(data.type, data.amount);

        const updated = await tx.transaction.update({
          where: { id: original.id },
          data: {
            ...transactionColumns(data),
            nextRecurringDate:
              data.isRecurring && data.recurringInterval
                ? calculateNextRecurringDate(data.date, data.recurringInterval)
                : null,
          },
        });

        if (original.accountId === data.accountId) {
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { increment: newEffect - oldEffect } },
          });
        } else {
          // Moved to a different account: back the old effect out of the
          // account that is losing it before applying it to the new one.
          await tx.account.updateMany({
            where: { id: original.accountId, userId },
            data: { balance: { increment: -oldEffect } },
          });
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { increment: newEffect } },
          });
        }

        return { transaction: updated, previousAccountId: original.accountId };
      }
    );

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);
    if (previousAccountId !== data.accountId) {
      revalidatePath(`/account/${previousAccountId}`);
    }

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const transactions = await withCurrentTenant(async (tx, userId) => {
      const rows = await tx.transaction.findMany({
        where: {
          userId,
          ...query,
        },
        include: {
          account: true,
        },
        orderBy: {
          date: "desc",
        },
      });

      // Decimal instances cannot cross the server/client boundary.
      return rows.map(serializeAmount);
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Scan Receipt
export async function scanReceipt(file) {
  // Guarded like every other action: this one spends Gemini quota, so it must
  // not be reachable without a session or past the rate limit.
  const clerkUserId = await requireClerkUserId();
  await enforceRateLimit(clerkUserId);

  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("No receipt image provided");
  }

  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert ArrayBuffer to Base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )

      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a receipt, return an empty object
    `;

    const text = await generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Invalid response format from Gemini");
    }

    // The prompt tells the model to return {} for a non-receipt, so an absent
    // or unparseable amount means "this wasn't a receipt", not a crash.
    const amount = Number.parseFloat(data.amount);
    if (!Number.isFinite(amount)) {
      throw new Error("That image doesn't look like a receipt");
    }

    const parsedDate = new Date(data.date);

    return {
      amount,
      date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      description: data.description ?? "",
      category: data.category ?? "",
      merchantName: data.merchantName ?? "",
    };
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw new Error(error.message || "Failed to scan receipt");
  }
}

// Helper function to calculate next recurring date.
// The intervals here must stay in step with the RecurringInterval enum in
// prisma/schema.prisma -- anything else cannot be persisted.
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
