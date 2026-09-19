import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import { defaultCategories } from "@/data/categories";

// --- Form schemas -----------------------------------------------------------
// These describe what the *browser form* holds, where number inputs are still
// strings. They run in the client through react-hook-form.

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CURRENT", "SAVINGS"]),
  balance: z.string().min(1, "Initial balance is required"),
  isDefault: z.boolean().default(false),
});

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    date: z.date({ required_error: "Date is required" }),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"],
      });
    }
  });

// --- Server schemas ---------------------------------------------------------
// A server action is a public HTTP endpoint: the form schemas above only ever
// ran in the browser, so anything could be posted straight past them. These
// re-validate the payload after it crosses the wire, and because zod strips
// unknown keys they also stop a crafted body from smuggling extra columns
// (userId, id, status) into a Prisma create/update.

// category id -> the transaction types it may be used with.
const CATEGORY_TYPES = defaultCategories.reduce((map, category) => {
  if (!map.has(category.id)) map.set(category.id, new Set());
  map.get(category.id).add(category.type);
  return map;
}, new Map());

const positiveAmount = z
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a number")
  .positive("Amount must be greater than zero")
  .max(1_000_000_000, "Amount is too large");

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["CURRENT", "SAVINGS"]),
  balance: z.coerce
    .number({ invalid_type_error: "Invalid balance amount" })
    .finite("Invalid balance amount"),
  isDefault: z.boolean().default(false),
});

export const transactionInputSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.coerce.number().pipe(positiveAmount),
    description: z.string().trim().max(500).optional().nullable(),
    date: z.coerce.date({ invalid_type_error: "Invalid date" }),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().trim().min(1, "Category is required").max(100),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"],
      });
    }

    // Any string used to be accepted, so a receipt scan that answered
    // "Groceries" (or an expense category on an income) was stored as a
    // category the app has no name or colour for.
    if (!CATEGORY_TYPES.get(data.category)?.has(data.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a category from the list",
        path: ["category"],
      });
    }
  });

export const budgetInputSchema = z.coerce.number().pipe(positiveAmount);

export const ratingInputSchema = z.coerce
  .number({ invalid_type_error: "Rating must be a number" })
  .int("Rating must be a whole number of stars")
  .min(1, "Rating must be between 1 and 5")
  .max(5, "Rating must be between 1 and 5");

// Turns a ZodError into the single-line message the client toasts.
export function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ActionError(result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}
