"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { enforceRateLimit } from "@/lib/arcjet";
import { ActionError, runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import { balanceEffect } from "@/lib/money";
import { IMPORT_ROW_LIMIT, fingerprint, mapRows } from "@/lib/import/transactions";
import { parseCsvTable } from "@/lib/import/parse-csv";
import { parseXlsxTable } from "@/lib/import/xlsx";
import { transactionInputSchema, parseOrThrow } from "@/app/lib/schema";

// Importing transactions.
//
// Two actions over one pipeline. `analyzeImport` parses, maps, validates and
// checks for duplicates and writes nothing; `importTransactions` runs the same
// pipeline again and writes the result. Both start from the uploaded bytes, so
// nothing the browser computed is trusted -- a server action is a public HTTP
// endpoint, and the preview is a courtesy to the user, not an input.
//
// Imported rows become ordinary transactions. There is no imported flag, no
// second table and no separate calculation anywhere: once written they are
// indistinguishable from one typed into the form, which is the only way the
// dashboard, transactions list and analytics can agree about the same money.

// Vercel rejects bodies over 4.5 MB before they reach an action. A base64
// payload is a third larger than the file, so this caps the decoded size well
// under that.
const MAX_BYTES = 2_000_000;

const EXTENSIONS = /\.(csv|xlsx)$/i;

// Decodes and parses the upload into { headers, rows }, whichever format it is.
async function readFile({ fileName, data }) {
  if (typeof data !== "string" || data === "") {
    throw new ActionError("The file is empty.");
  }

  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) throw new ActionError("The file is empty.");
  if (buffer.length > MAX_BYTES) {
    throw new ActionError("That file is larger than 2 MB.");
  }

  const name = String(fileName ?? "");
  const extension = EXTENSIONS.exec(name)?.[1]?.toLowerCase();

  // The extension decides which parser to try, but it is not believed: a file
  // named .csv that is really a workbook fails in the parser below and is
  // reported, rather than being read as text and producing nonsense rows.
  // XLSX is a zip, so its first bytes are the only reliable tell.
  const looksZipped =
    buffer.length > 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);

  if (extension === "xlsx" || looksZipped) {
    if (extension === "csv") {
      throw new ActionError(
        "That file is named .csv but is a spreadsheet. Rename it to .xlsx and try again."
      );
    }
    const result = await parseXlsxTable(buffer);
    if (result.error) throw new ActionError(result.error);
    return result;
  }

  if (extension !== "csv") {
    throw new ActionError("Only CSV and XLSX files can be imported.");
  }

  const text = buffer.toString("utf8");
  // A NUL byte means this is binary, not the text CSV it claims to be.
  if (text.includes("\u0000")) {
    throw new ActionError("That file is not readable as CSV.");
  }
  return parseCsvTable(text);
}

// The shared pipeline. Returns everything the preview needs and the rows the
// writer will use, having touched nothing.
async function analyse(tx, userId, { fileName, data, accountId, mapping, accountMap }) {
  const { headers, rows, sheetName } = await readFile({ fileName, data });
  if (rows.length === 0) throw new ActionError("That file has no rows to import.");

  const mapped = mapRows(rows, headers, mapping ?? {});
  if (mapped.fatal) throw new ActionError(mapped.fatal);

  const accounts = await tx.account.findMany({
    where: { userId },
    select: { id: true, name: true, isDefault: true },
  });
  if (accounts.length === 0) {
    throw new ActionError("Create an account first — a transaction has to belong to one.");
  }

  // The destination is resolved from the user's OWN accounts, never from the
  // file. An id in a spreadsheet cannot select an account, and an id belonging
  // to someone else is simply not in this list.
  const destination =
    accounts.find((account) => account.id === accountId) ??
    accounts.find((account) => account.isDefault) ??
    accounts[0];
  if (accountId && !accounts.some((account) => account.id === accountId)) {
    throw new ActionError("Account not found");
  }

  const byName = new Map(
    accounts.map((account) => [account.name.trim().toLowerCase(), account.id])
  );

  // The user's own choice for a name in the file wins over the automatic
  // match, but only if it names an account they actually own -- the mapping
  // arrives from the browser and is no more trusted than the file is.
  const owned = new Set(accounts.map((account) => account.id));
  const chosen = new Map();
  for (const [name, id] of Object.entries(accountMap ?? {})) {
    if (owned.has(id)) chosen.set(String(name).trim().toLowerCase(), id);
  }

  const resolveAccount = (name) => {
    const key = name?.trim().toLowerCase();
    if (!key) return destination.id;
    return chosen.get(key) ?? byName.get(key) ?? destination.id;
  };

  // Validate against the same schema a hand-entered transaction goes through.
  // Import does not get a weaker gate.
  const valid = [];
  const invalid = [...mapped.rejected];

  for (const row of mapped.ready) {
    const targetId = resolveAccount(row.accountName);
    const candidate = { ...row.transaction, accountId: targetId };
    try {
      const data = parseOrThrow(transactionInputSchema, candidate);
      valid.push({ ...row, accountId: targetId, data });
    } catch (error) {
      invalid.push({
        line: row.line,
        errors: [error instanceof ActionError ? error.message : "This row is not valid"],
      });
    }
  }

  // Duplicate detection.
  //
  // CONFIRMED: the row carries an id this user already has, which only a
  // WHealthOS export produces. POSSIBLE: same account, civil date, direction,
  // amount and description as something already stored -- a real signal, but
  // two identical coffees on one day collide, so it is never silently dropped.
  const sourceIds = valid.map((row) => row.sourceId).filter(Boolean);
  const existingIds =
    sourceIds.length > 0
      ? new Set(
          (
            await tx.transaction.findMany({
              where: { userId, id: { in: sourceIds } },
              select: { id: true },
            })
          ).map((row) => row.id)
        )
      : new Set();

  // Only the window the file covers is fetched, so this is one bounded query
  // rather than one per row.
  const dates = valid.map((row) => row.data.date.getTime());
  const existingPrints = new Set();
  if (dates.length > 0) {
    const nearby = await tx.transaction.findMany({
      where: {
        userId,
        date: { gte: new Date(Math.min(...dates)), lte: new Date(Math.max(...dates)) },
      },
      select: { accountId: true, date: true, type: true, amount: true, description: true },
    });
    for (const row of nearby) {
      existingPrints.add(
        fingerprint({ ...row, amount: row.amount.toNumber() })
      );
    }
  }

  // A file that repeats a row within itself is its own kind of duplicate.
  const seen = new Set();
  const confirmed = [];
  const possible = [];
  const fresh = [];

  for (const row of valid) {
    const print = fingerprint({ ...row.data, accountId: row.accountId });
    if (row.sourceId && existingIds.has(row.sourceId)) {
      confirmed.push({ ...row, print });
    } else if (existingPrints.has(print) || seen.has(print)) {
      possible.push({ ...row, print });
    } else {
      fresh.push({ ...row, print });
    }
    seen.add(print);
  }

  // Every distinct account name the file mentions, and where each one is
  // going. Shown in the preview so a name that matched nothing is visible
  // rather than quietly folded into the destination account.
  const names = new Map();
  for (const row of mapped.ready) {
    const name = row.accountName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (names.has(key)) {
      names.get(key).rows += 1;
      continue;
    }
    names.set(key, {
      name,
      rows: 1,
      accountId: resolveAccount(name),
      matched: byName.has(key) || chosen.has(key),
    });
  }

  return {
    headers,
    sheetName: sheetName ?? null,
    accountNames: [...names.values()],
    columns: mapped.columns,
    detected: mapped.detected,
    accounts,
    destinationId: destination.id,
    truncated: Boolean(mapped.truncated),
    limit: IMPORT_ROW_LIMIT,
    total: mapped.total ?? rows.length,
    fresh,
    possible,
    confirmed,
    invalid,
  };
}

// Only what the browser needs, and no Date or Decimal instances that would not
// survive the wire.
const forPreview = (row) => ({
  line: row.line,
  accountId: row.accountId,
  categoryFellBack: Boolean(row.categoryFellBack),
  date: row.data.date.toISOString(),
  description: row.data.description ?? null,
  category: row.data.category,
  type: row.data.type,
  amount: row.data.amount,
});

// Reads the file and reports what WOULD happen. Writes nothing.
export async function analyzeImport({
  fileName,
  data,
  accountId = null,
  mapping = null,
  accountMap = null,
}) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const result = await withCurrentTenant((tx, userId) =>
      analyse(tx, userId, { fileName, data, accountId, mapping, accountMap })
    );

    return {
      success: true,
      data: {
        headers: result.headers,
        sheetName: result.sheetName,
        columns: result.columns,
        detected: result.detected,
        accounts: result.accounts,
        accountNames: result.accountNames,
        destinationId: result.destinationId,
        truncated: result.truncated,
        limit: result.limit,
        counts: {
          total: result.total,
          ready: result.fresh.length,
          possible: result.possible.length,
          confirmed: result.confirmed.length,
          invalid: result.invalid.length,
        },
        fresh: result.fresh.map(forPreview),
        possible: result.possible.map(forPreview),
        invalid: result.invalid,
      },
    };
  });
}

// Writes the import.
//
// includePossibleDuplicates is the user's explicit answer to what the preview
// showed them. Confirmed duplicates are never written: re-importing an export
// would otherwise double every figure in the app.
export async function importTransactions({
  fileName,
  data,
  accountId = null,
  mapping = null,
  accountMap = null,
  includePossibleDuplicates = false,
}) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const result = await withCurrentTenant(async (tx, userId) => {
      // Re-analysed inside the write transaction, so what is written is what
      // the rules allow right now -- not what a stale preview claimed.
      const analysis = await analyse(tx, userId, {
        fileName,
        data,
        accountId,
        mapping,
        accountMap,
      });

      const writing = includePossibleDuplicates
        ? [...analysis.fresh, ...analysis.possible]
        : analysis.fresh;

      if (writing.length === 0) {
        if (analysis.confirmed.length > 0 || analysis.possible.length > 0) {
          throw new ActionError("Every row in that file is already in WHealthOS.");
        }
        throw new ActionError("No rows in that file could be imported.");
      }

      const perAccount = new Map();
      const creates = writing.map((row) => {
        perAccount.set(
          row.accountId,
          (perAccount.get(row.accountId) ?? 0) +
            balanceEffect(row.data.type, row.data.amount)
        );
        return {
          type: row.data.type,
          amount: row.data.amount,
          description: row.data.description ?? null,
          date: row.data.date,
          category: row.data.category,
          // Import does not create recurring rules. A recurring transaction
          // schedules future writes, and inferring that from a spreadsheet
          // would invent transactions the file never contained.
          isRecurring: false,
          recurringInterval: null,
          accountId: row.accountId,
          userId,
        };
      });

      // One statement for the rows, then one per affected account, all inside
      // the surrounding interactive transaction: either the whole import lands
      // or none of it does. A partial import is the worst outcome available --
      // the user cannot tell which rows made it, and re-running duplicates the
      // ones that did.
      await tx.transaction.createMany({ data: creates });

      for (const [id, delta] of perAccount) {
        // increment, not an absolute write, so a concurrent transaction on the
        // same account cannot lose an update.
        await tx.account.update({
          where: { id },
          data: { balance: { increment: delta } },
        });
      }

      return {
        imported: creates.length,
        accounts: perAccount.size,
        skippedConfirmed: analysis.confirmed.length,
        skippedPossible: includePossibleDuplicates ? 0 : analysis.possible.length,
        invalid: analysis.invalid.length,
        truncated: analysis.truncated,
        limit: analysis.limit,
        total: analysis.total,
      };
    });

    // The pages whose figures are derived from transactions. Analytics and the
    // account pages read on every request, so they need no tag.
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/analytics");
    revalidatePath("/budgets");
    revalidateTag(LANDING_STATS_TAG);

    return { success: true, data: result };
  });
}
