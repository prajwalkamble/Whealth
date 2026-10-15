import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import { defaultCategories } from "@/data/categories";
import { CONTACT_TOPICS } from "@/lib/company/contact";

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

// The ceiling on any money value. An opening balance may be negative -- an
// overdrawn current account is a real thing -- but it needs the same ceiling
// as a transaction. It was only checked for being finite, so a direct call
// could store 1e308 and every total on the dashboard became unreadable.
const AMOUNT_LIMIT = 1_000_000_000;

const positiveAmount = z
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a number")
  .positive("Amount must be greater than zero")
  .max(AMOUNT_LIMIT, "Amount is too large");

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["CURRENT", "SAVINGS"]),
  balance: z.coerce
    .number({ invalid_type_error: "Invalid balance amount" })
    .finite("Invalid balance amount")
    .min(-AMOUNT_LIMIT, "Balance is too large")
    .max(AMOUNT_LIMIT, "Balance is too large"),
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

// 1-31, or nothing. A day of the month rather than a date: billing and due
// days repeat, so storing a specific date would go stale after one cycle.
const dayOfMonth = z
  .union([z.literal(""), z.null(), z.undefined(), z.coerce.number()])
  .transform((v) => (v === "" || v === null || v === undefined ? null : v))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 31), "Day must be 1-31");

// A budget is an amount plus the thing it limits. category null means the
// overall monthly budget; otherwise it must be a category the app actually
// knows about, so a limit cannot be set against a name nothing is filed under.
export const EXPENSE_CATEGORY_IDS = defaultCategories
  .filter((c) => c.type === "EXPENSE")
  .map((c) => c.id);

export const budgetEntrySchema = z.object({
  amount: z.coerce.number().pipe(positiveAmount),
  category: z
    .union([z.literal(""), z.null(), z.undefined(), z.string()])
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || EXPENSE_CATEGORY_IDS.includes(v),
      "Choose a category from the list"
    ),
});

export const budgetInputSchema = z.coerce.number().pipe(positiveAmount);

// Cards.
//
// Everything a card record is allowed to hold. The list is a whitelist on
// purpose: a card number, a CVV or a PIN has no field to land in, so a client
// that sends one gets it stripped rather than stored.
export const CARD_NETWORKS = ["VISA", "MASTERCARD", "RUPAY", "AMEX", "DINERS", "OTHER"];
export const CARD_TYPES = ["CREDIT", "DEBIT"];

const currentYear = () => new Date().getFullYear();

export const cardInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
    issuer: z.string().trim().min(1, "Issuer is required").max(60, "Issuer is too long"),
    network: z.enum(CARD_NETWORKS, { message: "Choose a network" }),
    type: z.enum(CARD_TYPES, { message: "Choose a card type" }),
    // Four digits as text, so a card ending 0042 keeps its leading zeros.
    last4: z
      .string()
      .trim()
      .regex(/^[0-9]{4}$/, "Enter the last 4 digits"),
    expiryMonth: z.coerce.number().int().min(1, "Month must be 1-12").max(12, "Month must be 1-12"),
    expiryYear: z.coerce
      .number()
      .int()
      .min(currentYear() - 20, "Year looks wrong")
      .max(currentYear() + 20, "Year looks wrong"),
    // Credit cards only. Empty string from an untouched input means "not set".
    creditLimit: z
      .union([z.literal(""), z.null(), z.undefined(), z.coerce.number()])
      .transform((v) => (v === "" || v === null || v === undefined ? null : v))
      .refine((v) => v === null || (v >= 0 && v <= AMOUNT_LIMIT), "Credit limit is out of range"),
    billingDay: dayOfMonth,
    dueDay: dayOfMonth,
    accountId: z
      .union([z.literal(""), z.null(), z.undefined(), z.string().uuid()])
      .transform((v) => (v ? v : null)),
  })
  .superRefine((data, ctx) => {
    // A debit card has no limit of its own, so storing one would be a number
    // nothing could ever be measured against.
    if (data.type === "DEBIT" && data.creditLimit !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only credit cards have a credit limit",
        path: ["creditLimit"],
      });
    }
  });

// Goals.
export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"];

export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  description: z
    .union([z.literal(""), z.null(), z.undefined(), z.string().trim().max(300, "Description is too long")])
    .transform((v) => (v ? v : null)),
  targetAmount: z.coerce.number().pipe(positiveAmount),
  // Optional: not every objective has a deadline. A date that will not parse
  // is rejected rather than quietly stored as Invalid Date.
  targetDate: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.date()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v))
    .refine((v) => v === null || !Number.isNaN(v.getTime()), "Enter a valid date"),
});

export const goalContributionSchema = z.object({
  amount: z.coerce.number().pipe(positiveAmount),
  date: z.coerce
    .date()
    .refine((v) => !Number.isNaN(v.getTime()), "Enter a valid date"),
  note: z
    .union([z.literal(""), z.null(), z.undefined(), z.string().trim().max(120, "Note is too long")])
    .transform((v) => (v ? v : null)),
});

// The kinds of feedback the widget offers. Rating is handled by
// ratingInputSchema and actions/rating.js, since it is stored rather than
// only mailed.
export const FEEDBACK_TYPES = {
  feedback: "Share Feedback",
  problem: "Report an issue",
};

// A word count reads better to the person writing than a character count: "at
// least 3 words" is a clear instruction, where "at least 5 characters" is an
// arbitrary threshold they have to discover by typing.
export const FEEDBACK_WORD_MINIMUM = 3;

export const countWords = (text) =>
  String(text ?? "").trim().split(/\s+/).filter(Boolean).length;

export const feedbackInputSchema = z.object({
  type: z.enum(Object.keys(FEEDBACK_TYPES), {
    errorMap: () => ({ message: "Choose what kind of feedback this is" }),
  }),
  // Long enough to be worth reading, short enough not to be a payload.
  message: z
    .string()
    .trim()
    .max(4000, "That is too long; please keep it under 4000 characters")
    .refine(
      (value) => countWords(value) >= FEEDBACK_WORD_MINIMUM,
      `Please use at least ${FEEDBACK_WORD_MINIMUM} words`
    ),
});

// The public enquiry form on /contact.
//
// Stricter than the in-app widget, because this one has no session behind it:
// anyone on the internet can post to it, so every field is bounded, the email
// address is normalised, and the subject is stripped of anything that could
// break out of the header it ends up in.
//
// z.object() drops keys it does not know about, so an extra field posted by a
// crafted request never reaches the action.

// Subject lines are written into an email header. A carriage return or line
// feed in one ends the header and begins another, which is how a subject field
// becomes a way to add recipients to somebody else's mail. Control characters
// go, and runs of whitespace collapse, before the value is ever used.
const headerSafe = (value) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const CONTACT_SUBJECT_MAX = 120;
export const CONTACT_NAME_MAX = 80;
export const CONTACT_MESSAGE_MAX = 4000;
export const CONTACT_EMAIL_MAX = 254;

export const contactInputSchema = z.object({
  topic: z.enum(CONTACT_TOPICS.map((topic) => topic.id), {
    errorMap: () => ({ message: "Choose what your message is about" }),
  }),

  name: z
    .string()
    .trim()
    .min(2, "Please give a name we can address a reply to")
    .max(CONTACT_NAME_MAX, "That name is too long"),

  // Normalised before it is used: trimmed, and lower-cased so the same address
  // typed two ways is one address. 254 is the practical maximum length of an
  // address, so anything longer is not one.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "An email address is needed so we can reply")
    .max(CONTACT_EMAIL_MAX, "That email address is too long")
    .email("That does not look like an email address"),

  subject: z
    .string()
    .transform(headerSafe)
    .pipe(
      z
        .string()
        .min(3, "Please summarise your message in a few words")
        .max(CONTACT_SUBJECT_MAX, "That subject is too long")
    ),

  message: z
    .string()
    .trim()
    .max(CONTACT_MESSAGE_MAX, `That is too long; please keep it under ${CONTACT_MESSAGE_MAX} characters`)
    .refine(
      (value) => countWords(value) >= FEEDBACK_WORD_MINIMUM,
      `Please use at least ${FEEDBACK_WORD_MINIMUM} words`
    ),

  // A field no person sees and no person fills in. A bot that fills every
  // input it finds fills this one too, and the action refuses the submission
  // without telling it which field gave it away.
  website: z
    .union([z.literal(""), z.null(), z.undefined(), z.string()])
    .transform((value) => (value ? String(value) : "")),
});

// The field a validation failure belongs to, so the form can mark the control
// rather than only printing a sentence above it.
export function firstFieldError(error) {
  const issue = error?.issues?.[0];
  return {
    field: typeof issue?.path?.[0] === "string" ? issue.path[0] : null,
    message: issue?.message ?? "Please check the form and try again",
  };
}

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
