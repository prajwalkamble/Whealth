import { defaultCategories } from "@/data/categories";
import { APP_TIME_ZONE, zonedMidnight } from "@/lib/time";

// Turning a spreadsheet into transactions.
//
// The rule throughout: refuse rather than guess. An import that silently
// reinterprets a date or invents a category produces records the user believes
// are theirs, and they will not notice until a total is wrong months later.
// Every row either maps cleanly or is reported with the line number and the
// reason, and the user decides.
//
// This module is pure and runs on both sides. The browser uses it to show the
// preview; the server runs it again on what is submitted, because the preview
// is a courtesy and the server action is a public endpoint.

// Header aliases. The first name in each list is what WHealthOS exports, so a
// file that came out of this app goes straight back in.
const FIELDS = {
  date: ["date", "transactiondate", "valuedate", "postingdate"],
  description: ["description", "narration", "particulars", "details", "memo"],
  type: ["type", "transactiontype", "drcr"],
  category: ["category"],
  account: ["account", "accountname"],
  amount: ["amount", "value"],
  debit: ["debit", "withdrawal", "withdrawalamt"],
  credit: ["credit", "deposit", "depositamt"],
  id: ["transactionid", "id", "referenceid", "reference"],
  // Not a WHealthOS column. Read only so a row declaring a currency the app
  // does not store can be refused instead of silently reinterpreted.
  currency: ["currency", "ccy"],
};

const CATEGORY_IDS = new Map(
  defaultCategories.map((category) => [category.id, category.type])
);

// Also accept the display name ("Food & Drink"), since that is what a person
// reading the app would type into their own spreadsheet.
const CATEGORY_BY_NAME = new Map(
  defaultCategories.map((category) => [category.name.toLowerCase(), category])
);

const DEFAULT_CATEGORY = { INCOME: "other-income", EXPENSE: "other-expense" };

// Resolves which column in the file holds each field.
export function detectColumns(headers) {
  const normalise = (header) => header.toLowerCase().replace(/[\s_-]+/g, "");
  const present = new Set(headers.map(normalise));
  const mapping = {};
  for (const [field, aliases] of Object.entries(FIELDS)) {
    const found = aliases.find((alias) => present.has(alias));
    if (found) mapping[field] = found;
  }
  return mapping;
}

// Dates.
//
// ISO first, because that is what this app exports and what every spreadsheet
// agrees on. Then dd/mm/yyyy, the Indian and European convention. mm/dd/yyyy
// is deliberately NOT guessed at: 03/04/2026 is a real date under both
// readings, and picking one silently files a transaction in the wrong month.
// An unrecognised format is an error the user can see and fix.
const ISO = /^(\d{4})-(\d{2})-(\d{2})/;
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

export function parseDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return { error: "Date is missing" };

  const iso = ISO.exec(text);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return build(y, m, d, text);
  }

  const dmy = DMY.exec(text);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    if (m > 12) return { error: `"${text}" is not a date WHealthOS can read` };
    return build(y, m, d, text);
  }

  return {
    error: `"${text}" is not a date WHealthOS can read. Use YYYY-MM-DD or DD/MM/YYYY`,
  };
}

function build(year, month, day, text) {
  // An imported row carries a civil date and no time, so it is anchored to
  // midnight in the application's timezone -- the same boundary every monthly
  // figure in the app is measured against. Anchoring to UTC instead would put
  // a transaction dated the 1st into the previous month on every dashboard.
  //
  // The validity check runs first, because zonedMidnight rolls 31 February
  // forward rather than rejecting it.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return { error: `"${text}" is not a real date` };
  }

  return { value: zonedMidnight(year, month - 1, day, APP_TIME_ZONE) };
}

// Amounts.
//
// The separator rules are deterministic, because guessing here is a 1000x
// error on real money. "1.234,56" once parsed as 1.23456 by stripping commas
// and keeping the dot.
//
//   both separators present -> the LAST one is the decimal point.
//     1,234.56 -> 1234.56      1.234,56 -> 1234.56
//   only a comma -> three digits after it is a thousands separator, one or
//     two is a decimal comma. Anything else is ambiguous and refused.
//     1,234 -> 1234            1,5 -> 1.5           1,23456 -> error
//   only a dot -> a decimal point, unless it groups three digits with no
//     other decimals, which is refused rather than guessed.
//
// Brackets are the accounting convention for a negative, and a currency symbol
// or spaces are noise.
const AMBIGUOUS = (value) =>
  `"${value}" could be read two ways. Write it as 1234.56`;

export function parseAmount(value) {
  let text = String(value ?? "").trim();
  if (!text) return { error: "Amount is missing" };

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  text = text.replace(/[₹$€£\s]/g, "");
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    // The later separator is the decimal point; the earlier one groups.
    const decimal = lastComma > lastDot ? "," : ".";
    const grouping = decimal === "," ? "." : ",";
    text = text.split(grouping).join("");
    text = text.replace(decimal, ".");
  } else if (lastComma !== -1) {
    const after = text.length - lastComma - 1;
    if (text.indexOf(",") !== lastComma) {
      // Several commas: grouping only, e.g. 1,23,456 (Indian) or 1,234,567.
      text = text.split(",").join("");
    } else if (after === 3) {
      text = text.replace(",", "");
    } else if (after === 1 || after === 2) {
      text = text.replace(",", ".");
    } else {
      return { error: AMBIGUOUS(value) };
    }
  } else if (lastDot !== -1) {
    const after = text.length - lastDot - 1;
    if (text.indexOf(".") !== lastDot) {
      // 1.234.567 is grouping in several European locales, never a number
      // with two decimal points.
      text = text.split(".").join("");
    } else if (after === 3 && /^\d{1,3}\.\d{3}$/.test(text)) {
      // 1.234 -- a decimal point in one locale, a thousands separator in
      // another, and nothing in the value says which.
      return { error: AMBIGUOUS(value) };
    }
  }

  if (!/^\d*\.?\d+$/.test(text)) {
    return { error: `"${value}" is not an amount` };
  }

  const number = Number(text);
  if (!Number.isFinite(number)) return { error: `"${value}" is not an amount` };
  if (number === 0) return { error: "Amount must be greater than zero" };
  if (number > 1_000_000_000) return { error: "Amount is too large" };

  return { value: number, negative };
}

// Currency.
//
// WHealthOS has no currency column -- not on a transaction, not on an account.
// Every amount in the database is in one currency, and there is no exchange
// rate anywhere in the application.
//
// So a file that declares a currency can only be accepted when it declares the
// one the app actually stores. Importing a USD row as though it were INR would
// silently fabricate an exchange rate of 1.0, which is the single worst thing
// this importer could do. Those rows are refused and the reason is shown.
export const APP_CURRENCY = "INR";
const CURRENCY_ALIASES = new Set(["inr", "₹", "rs", "rs.", "inr."]);

export function checkCurrency(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (CURRENCY_ALIASES.has(text.toLowerCase())) return null;
  return (
    `This row is in ${text}. WHealthOS stores a single currency (${APP_CURRENCY}) ` +
    "and has no exchange rates, so it cannot convert it."
  );
}

const TYPE_WORDS = {
  income: "INCOME",
  credit: "INCOME",
  cr: "INCOME",
  deposit: "INCOME",
  in: "INCOME",
  expense: "EXPENSE",
  debit: "EXPENSE",
  dr: "EXPENSE",
  withdrawal: "EXPENSE",
  out: "EXPENSE",
};

// Maps one record to a transaction, or to the reason it cannot be.
//
// Several errors on a row are all reported together: fixing a spreadsheet one
// error per attempt is miserable.
export function mapRow(record, columns) {
  const errors = [];
  const get = (field) => (columns[field] ? record[columns[field]] : "");

  const date = parseDate(get("date"));
  if (date.error) errors.push(date.error);

  // Separate debit and credit columns (how most banks export) take precedence
  // over a single signed amount column.
  let amount = null;
  let type = null;

  const debit = String(get("debit") ?? "").trim();
  const credit = String(get("credit") ?? "").trim();

  if (columns.debit || columns.credit) {
    if (debit && credit) {
      errors.push("Row has both a debit and a credit");
    } else if (debit) {
      amount = parseAmount(debit);
      type = "EXPENSE";
    } else if (credit) {
      amount = parseAmount(credit);
      type = "INCOME";
    } else {
      errors.push("Row has neither a debit nor a credit");
    }
  } else {
    amount = parseAmount(get("amount"));
    const word = String(get("type") ?? "").trim().toLowerCase();
    if (word) {
      type = TYPE_WORDS[word] ?? null;
      if (!type) errors.push(`"${get("type")}" is not a known transaction type`);
    } else if (amount && !amount.error) {
      // No type column: the sign carries it, which is how a single-column
      // statement expresses direction.
      type = amount.negative ? "EXPENSE" : "INCOME";
    }
  }

  if (amount?.error) errors.push(amount.error);

  // A category that is not one of the app's own is not invented or created:
  // it falls back to the catch-all for the direction, and the preview says so.
  let category = null;
  let categoryFellBack = false;
  const rawCategory = String(get("category") ?? "").trim();
  if (type) {
    const byId = CATEGORY_IDS.get(rawCategory.toLowerCase());
    const byName = CATEGORY_BY_NAME.get(rawCategory.toLowerCase());
    if (byId === type) category = rawCategory.toLowerCase();
    else if (byName?.type === type) category = byName.id;
    else {
      category = DEFAULT_CATEGORY[type];
      if (rawCategory) categoryFellBack = true;
    }
  }

  const currencyError = checkCurrency(get("currency"));
  if (currencyError) errors.push(currencyError);

  const description = String(get("description") ?? "").trim().slice(0, 500);

  if (errors.length > 0) {
    return { line: record.__line, errors };
  }

  return {
    line: record.__line,
    categoryFellBack,
    sourceId: String(get("id") ?? "").trim() || null,
    accountName: String(get("account") ?? "").trim() || null,
    transaction: {
      date: date.value,
      amount: amount.value,
      type,
      category,
      description: description || null,
      isRecurring: false,
    },
  };
}

// A deterministic fingerprint for duplicate detection.
//
// The schema has no external id, source or import field to match on, so this
// is built only from columns that actually exist: the account, the civil date,
// the direction, the amount to two places, and the description folded to
// insensitive whitespace. It is deliberately NOT treated as proof -- two real
// coffees on the same day for the same amount collide -- so a match is
// reported as a POSSIBLE duplicate for the user to decide about, never
// silently dropped. Only a row carrying an id this user already has is a
// confirmed duplicate.
export const fingerprint = ({ accountId, date, type, amount, description }) =>
  [
    accountId,
    date instanceof Date ? date.toISOString().slice(0, 10) : String(date),
    type,
    Number(amount).toFixed(2),
    String(description ?? "").trim().toLowerCase().replace(/\s+/g, " "),
  ].join("|");

// The ceiling on one import. Large enough for a year of a busy account, small
// enough that the whole thing stays inside one database transaction.
export const IMPORT_ROW_LIMIT = 2000;

// Runs every row and splits the result.
//
// `overrides` is the user's column mapping from the preview screen: a field
// name to the normalised header it should read. It wins over detection, so a
// file whose columns were guessed wrongly can be corrected without editing it.
export function mapRows(records, headers, overrides = {}) {
  const detected = detectColumns(headers);
  const columns = { ...detected };
  for (const [field, header] of Object.entries(overrides)) {
    // "" means the user explicitly unmapped the field.
    if (header === "" || header === null) delete columns[field];
    else if (header) columns[field] = header;
  }

  const missing = [];
  if (!columns.date) missing.push("Date");
  if (!columns.amount && !columns.debit && !columns.credit) {
    missing.push("Amount (or Debit/Credit)");
  }
  if (missing.length > 0) {
    // detected is carried even here: the mapping UI opens precisely when a
    // file is unusable, and it needs to show what was recognised.
    return {
      columns,
      detected,
      ready: [],
      rejected: [],
      total: records.length,
      fatal: `This file has no ${missing.join(" and no ")} column.`,
    };
  }

  const ready = [];
  const rejected = [];
  for (const record of records.slice(0, IMPORT_ROW_LIMIT)) {
    const mapped = mapRow(record, columns);
    if (mapped.errors) rejected.push(mapped);
    else ready.push(mapped);
  }

  return {
    columns,
    detected,
    ready,
    rejected,
    truncated: records.length > IMPORT_ROW_LIMIT,
    total: records.length,
    fatal: null,
  };
}

// The fields the mapping UI offers, and whether the import can run without
// them. Kept here so the UI and the validator cannot disagree about what is
// required.
export const MAPPABLE_FIELDS = [
  { field: "date", label: "Date", required: true },
  { field: "amount", label: "Amount", required: false, note: "or Debit and Credit" },
  { field: "debit", label: "Debit", required: false },
  { field: "credit", label: "Credit", required: false },
  { field: "type", label: "Type", required: false, note: "Income or Expense" },
  { field: "description", label: "Description", required: false },
  { field: "category", label: "Category", required: false },
  { field: "account", label: "Account", required: false },
  { field: "currency", label: "Currency", required: false, note: "INR only" },
  { field: "id", label: "Transaction ID", required: false, note: "used to skip re-imports" },
];
