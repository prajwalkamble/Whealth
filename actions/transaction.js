"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { generateContent } from "@/lib/ai/gemini";
import { enforceRateLimit } from "@/lib/arcjet";
import { ActionError, runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import { nextOccurrenceAfter } from "@/lib/recurring";
import { defaultCategories } from "@/data/categories";
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
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("transaction", clerkUserId);

    // A server action is a public endpoint, so the payload is re-validated here
    // rather than trusted from the browser form. Parsing also drops unknown
    // keys, so a crafted body cannot smuggle userId/id/status into the create.
    const data = parseOrThrow(transactionInputSchema, rawData);

    const transaction = await withCurrentTenant(async (tx, userId) => {
      const account = await tx.account.findFirst({
        where: { id: data.accountId, userId },
        select: { id: true },
      });
      if (!account) throw new ActionError("Account not found");

      const newTransaction = await tx.transaction.create({
        data: {
          ...transactionColumns(data),
          userId,
          nextRecurringDate: data.isRecurring
            ? nextOccurrenceAfter(data.date, data.recurringInterval)
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
  });
}

// Null when the id does not exist or belongs to someone else; the edit page
// turns that into a 404 instead of an error screen.
export async function getTransaction(id) {
  return withCurrentTenant(async (tx, userId) => {
    const transaction = await tx.transaction.findFirst({
      where: { id, userId },
    });

    return transaction ? serializeAmount(transaction) : null;
  });
}

const sameSchedule = (original, data) =>
  original.date.getTime() === data.date.getTime() &&
  original.isRecurring === data.isRecurring &&
  original.recurringInterval ===
    (data.isRecurring ? data.recurringInterval : null);

export async function updateTransaction(id, rawData) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const data = parseOrThrow(transactionInputSchema, rawData);

    const { transaction, previousAccountId } = await withCurrentTenant(
      async (tx, userId) => {
        const original = await tx.transaction.findFirst({
          where: { id, userId },
        });
        if (!original) throw new ActionError("Transaction not found");

        const targetAccount = await tx.account.findFirst({
          where: { id: data.accountId, userId },
          select: { id: true },
        });
        if (!targetAccount) throw new ActionError("Account not found");

        const oldEffect = balanceEffect(
          original.type,
          original.amount.toNumber()
        );
        const newEffect = balanceEffect(data.type, data.amount);

        // Keep the existing schedule unless the edit changed it. Recomputing
        // it from the original date on every edit -- fixing a typo in the
        // description, say -- usually produced a date in the past, and the
        // nightly job then posted the occurrence a second time.
        let nextRecurringDate = null;
        if (data.isRecurring) {
          nextRecurringDate =
            sameSchedule(original, data) && original.nextRecurringDate
              ? original.nextRecurringDate
              : nextOccurrenceAfter(data.date, data.recurringInterval);
        }

        const updated = await tx.transaction.update({
          where: { id: original.id },
          data: { ...transactionColumns(data), nextRecurringDate },
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
  });
}

// The only filters a caller may pass. The query used to be spread into the
// where clause after userId, so { userId: { not: "" } } overrode the tenant
// scope and returned every user's transactions.
const USER_TRANSACTION_FILTERS = ["accountId", "type", "category", "isRecurring"];

// Get User Transactions
export async function getUserTransactions(query = {}) {
  return runAction(async () => {
    const filters = {};
    for (const key of USER_TRANSACTION_FILTERS) {
      const value = query?.[key];
      if (typeof value === "string" || typeof value === "boolean") {
        filters[key] = value;
      }
    }

    const transactions = await withCurrentTenant(async (tx, userId) => {
      const rows = await tx.transaction.findMany({
        // userId last, so nothing in filters can replace it.
        where: { ...filters, userId },
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
  });
}

// Vercel rejects request bodies over 4.5 MB before they reach this action; the
// browser shrinks photos to fit, and this is the server-side backstop.
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

const EXPENSE_CATEGORIES = defaultCategories.filter(
  (category) => category.type === "EXPENSE"
);

// The model is asked for one of our category ids but answers in its own
// words often enough ("Groceries", "Food & Dining"). Match on id or name,
// ignoring case; anything unrecognised becomes "other-expense" rather than an
// unknown category.
function toExpenseCategory(suggestion) {
  const wanted = String(suggestion ?? "").trim().toLowerCase();
  const match = EXPENSE_CATEGORIES.find(
    (category) =>
      category.id === wanted || category.name.toLowerCase() === wanted
  );
  return match ? match.id : "other-expense";
}

// Scan Receipt
export async function scanReceipt(file) {
  return runAction(async () => {
    // Guarded like every other action: this one spends Gemini quota, so it
    // must not be reachable without a session or past the rate limit.
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("receiptScan", clerkUserId);

    if (!file || typeof file.arrayBuffer !== "function") {
      throw new ActionError("No receipt image provided");
    }
    if (!file.type?.startsWith("image/")) {
      throw new ActionError("Please choose an image file");
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      throw new ActionError("That image is too large. Please use one under 4MB.");
    }

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
      - Suggested category (one of: ${EXPENSE_CATEGORIES.map((c) => c.id).join(",")} )

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

    let text;
    try {
      text = await generateContent([
        {
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        },
        prompt,
      ]);
    } catch (error) {
      console.error("Error scanning receipt:", error);
      // 429 is a spent quota and 503 a model that stayed busy through the
      // retries in generateContent; both clear on their own.
      if (error.status === 429 || error.status === 503) {
        throw new ActionError(
          "Receipt scanning is busy right now. Please try again in a little while."
        );
      }
      throw error;
    }

    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new ActionError(
        "Couldn't read that receipt. Try a clearer photo."
      );
    }

    // The prompt tells the model to return {} for a non-receipt, so an absent
    // or unparseable amount means "this wasn't a receipt", not a crash.
    const amount = Number.parseFloat(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ActionError("That image doesn't look like a receipt");
    }

    const parsedDate = new Date(data.date);

    return {
      success: true,
      data: {
        amount,
        date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        description: data.description ?? "",
        // A receipt is money going out, so the category is always an expense
        // one, and the form switches to Expense when it applies the scan.
        type: "EXPENSE",
        category: toExpenseCategory(data.category),
        merchantName: data.merchantName ?? "",
      },
    };
  });
}
