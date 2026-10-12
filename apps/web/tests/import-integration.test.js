import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@whealthos/database";
import ExcelJS from "exceljs";

// Import, against a real database.
//
// These are the assertions that cannot be made against pure functions: that a
// duplicate is recognised among rows actually stored, that a file naming
// somebody else's account cannot reach it, that a refused import leaves
// nothing behind, and that imported rows land in the same tables the dashboard
// and analytics already read.

let currentClerkId = null;
let rateLimitDenied = false;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: currentClerkId }),
  currentUser: async () => null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn) => fn,
}));

vi.mock("@/lib/arcjet", async () => {
  const { ActionError } = await import("@/lib/action-error");
  return {
    enforceRateLimit: async () => {
      if (rateLimitDenied) throw new ActionError("Too many requests. Please try again later.");
    },
  };
});

const { analyzeImport, importTransactions } = await import("@/actions/import");
const { createAccount } = await import("@/actions/dashboard");
const { getUserTransactions } = await import("@/actions/transaction");
const { getUserAccounts, getAnalytics } = await import("@/lib/queries");

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const TENANTS = {
  ida: { clerkUserId: "clerk_imp_ida", email: "imp-ida@example.test" },
  jon: { clerkUserId: "clerk_imp_jon", email: "imp-jon@example.test" },
};
const asTenant = (name) => {
  currentClerkId = TENANTS[name].clerkUserId;
};

const b64 = (text) => Buffer.from(text, "utf8").toString("base64");

const csv = (rows) =>
  b64(["Date,Description,Type,Category,Amount", ...rows].join("\r\n") + "\r\n");

const xlsxOf = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Transactions");
  sheet.addRow(["Date", "Description", "Type", "Category", "Amount"]);
  for (const row of rows) sheet.addRow(row);
  return (await workbook.xlsx.writeBuffer()).toString("base64");
};

const balanceOf = async (id) =>
  (await admin.account.findUnique({ where: { id } })).balance.toNumber();
const countFor = async (name) =>
  admin.transaction.count({ where: { userId: TENANTS[name].id } });

let idaAccount;
let idaSecond;
let jonAccount;

beforeAll(async () => {
  await admin.user.deleteMany({
    where: { clerkUserId: { in: Object.values(TENANTS).map((t) => t.clerkUserId) } },
  });
  for (const [name, t] of Object.entries(TENANTS)) {
    const user = await admin.user.create({
      data: { ...t, name, imageUrl: "https://example.test/a.png" },
    });
    TENANTS[name].id = user.id;
  }

  asTenant("ida");
  idaAccount = (
    await createAccount({ name: "Ida Checking", type: "CURRENT", balance: "0", isDefault: true })
  ).data.id;
  idaSecond = (
    await createAccount({ name: "Shared Name", type: "SAVINGS", balance: "0", isDefault: false })
  ).data.id;

  asTenant("jon");
  // Deliberately the same name as Ida's second account: an imported file must
  // never be able to reach it by naming it.
  jonAccount = (
    await createAccount({ name: "Shared Name", type: "CURRENT", balance: "0", isDefault: true })
  ).data.id;
});

afterAll(async () => {
  await admin.user.deleteMany({
    where: { clerkUserId: { in: Object.values(TENANTS).map((t) => t.clerkUserId) } },
  });
  await admin.$disconnect();
  const { db, adminDb } = await import("@/lib/prisma");
  await db.$disconnect();
  await adminDb.$disconnect();
});

describe("analyze writes nothing", () => {
  it("reports what would happen without creating a row", async () => {
    asTenant("ida");
    const before = await countFor("ida");
    const res = await analyzeImport({
      fileName: "a.csv",
      data: csv(["2026-03-15,Rent,EXPENSE,housing,24000"]),
      accountId: idaAccount,
    });
    expect(res.success).toBe(true);
    expect(res.data.counts.ready).toBe(1);
    expect(await countFor("ida")).toBe(before);
  });
});

describe("importing a CSV", () => {
  it("creates canonical transactions and moves the balance", async () => {
    asTenant("ida");
    const res = await importTransactions({
      fileName: "sept.csv",
      data: csv([
        "2026-09-01,Salary,INCOME,salary,85000",
        "2026-09-02,Groceries,EXPENSE,groceries,2450.50",
        "2026-09-03,Electricity,EXPENSE,utilities,1890",
      ]),
      accountId: idaAccount,
    });
    expect(res.success).toBe(true);
    expect(res.data.imported).toBe(3);
    // 85000 - 2450.50 - 1890
    expect(await balanceOf(idaAccount)).toBeCloseTo(80659.5, 2);
  });

  it("stores them as ordinary transactions with no import marker", async () => {
    const rows = await admin.transaction.findMany({
      where: { userId: TENANTS.ida.id, accountId: idaAccount },
    });
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.status).toBe("COMPLETED");
      expect(row.isRecurring).toBe(false);
      expect(row.recurringInterval).toBeNull();
      expect(["INCOME", "EXPENSE"]).toContain(row.type);
    }
  });

  it("shows them on the transactions page query like any other", async () => {
    asTenant("ida");
    const res = await getUserTransactions();
    expect(res.success).toBe(true);
    expect(res.data.map((t) => t.description)).toEqual(
      expect.arrayContaining(["Salary", "Groceries", "Electricity"])
    );
    for (const t of res.data) expect(typeof t.amount).toBe("number");
  });
});

describe("importing an XLSX", () => {
  it("creates transactions from a workbook", async () => {
    asTenant("ida");
    const before = await balanceOf(idaAccount);
    const res = await importTransactions({
      fileName: "oct.xlsx",
      data: await xlsxOf([["2026-10-01", "Freelance invoice", "INCOME", "freelance", 15000]]),
      accountId: idaAccount,
    });
    expect(res.success).toBe(true);
    expect(res.data.imported).toBe(1);
    expect(await balanceOf(idaAccount)).toBeCloseTo(before + 15000, 2);
  });
});

// The historical-period requirement: a row from March is March's, not the
// month the import ran in.
describe("historical dates", () => {
  it("lands in the month the transaction is dated, not today", async () => {
    asTenant("ida");
    await importTransactions({
      fileName: "march.csv",
      data: csv(["2026-03-15,March rent,EXPENSE,housing,24000"]),
      accountId: idaAccount,
    });

    const row = await admin.transaction.findFirst({
      where: { userId: TENANTS.ida.id, description: "March rent" },
    });
    // Stored as midnight in the app timezone, so it reads as 15 March there.
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(row.date);
    expect(day).toBe("2026-03-15");
  });

  it("is picked up by analytics over its own window", async () => {
    asTenant("ida");
    const analytics = await getAnalytics({ months: "12" });
    const march = analytics.flow.find((m) => m.year === 2026 && m.month === 2);
    expect(march.expenses).toBeGreaterThanOrEqual(24000);
  });
});

describe("duplicate detection against stored rows", () => {
  const sameRow = ["2026-11-02,Coffee at the counter,EXPENSE,groceries,250"];

  it("imports the row the first time", async () => {
    asTenant("ida");
    const res = await importTransactions({
      fileName: "nov.csv",
      data: csv(sameRow),
      accountId: idaAccount,
    });
    expect(res.data.imported).toBe(1);
  });

  it("flags the identical row as a possible duplicate on a re-run", async () => {
    asTenant("ida");
    const res = await analyzeImport({
      fileName: "nov.csv",
      data: csv(sameRow),
      accountId: idaAccount,
    });
    expect(res.data.counts.possible).toBe(1);
    expect(res.data.counts.ready).toBe(0);
  });

  it("refuses to write it again by default", async () => {
    asTenant("ida");
    const before = await countFor("ida");
    const res = await importTransactions({
      fileName: "nov.csv",
      data: csv(sameRow),
      accountId: idaAccount,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already in WHealthOS/i);
    expect(await countFor("ida")).toBe(before);
  });

  it("writes it when the user explicitly opts in", async () => {
    asTenant("ida");
    const before = await countFor("ida");
    const res = await importTransactions({
      fileName: "nov.csv",
      data: csv(sameRow),
      accountId: idaAccount,
      includePossibleDuplicates: true,
    });
    expect(res.success).toBe(true);
    expect(res.data.imported).toBe(1);
    expect(await countFor("ida")).toBe(before + 1);
  });

  // A WHealthOS export carries real transaction ids, so re-importing one is a
  // confirmed duplicate rather than a guess.
  it("skips a row carrying an id already stored", async () => {
    asTenant("ida");
    const existing = await admin.transaction.findFirst({
      where: { userId: TENANTS.ida.id, description: "Salary" },
    });
    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Transaction ID",
        `2026-09-01,Salary,INCOME,salary,85000,${existing.id}`,
      ].join("\r\n")
    );
    const res = await analyzeImport({ fileName: "re-export.csv", data, accountId: idaAccount });
    expect(res.data.counts.confirmed).toBe(1);
    expect(res.data.counts.ready).toBe(0);
  });
});

// The security requirement: the file must never choose whose data it writes.
describe("authorization", () => {
  it("refuses an account id belonging to another user", async () => {
    asTenant("ida");
    const res = await importTransactions({
      fileName: "x.csv",
      data: csv(["2026-09-10,Nope,EXPENSE,groceries,100"]),
      accountId: jonAccount,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not found/i);
    expect(await countFor("jon")).toBe(0);
  });

  it("cannot reach another user's account by naming it in the file", async () => {
    asTenant("ida");
    const jonBefore = await balanceOf(jonAccount);
    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Account",
        "2026-09-11,Reaching across,EXPENSE,groceries,500,Shared Name",
      ].join("\r\n")
    );
    const res = await importTransactions({ fileName: "x.csv", data, accountId: idaAccount });
    expect(res.success).toBe(true);

    // The name matched Ida's OWN account of that name, never Jon's.
    const row = await admin.transaction.findFirst({
      where: { description: "Reaching across" },
    });
    expect(row.userId).toBe(TENANTS.ida.id);
    expect(row.accountId).toBe(idaSecond);
    expect(await balanceOf(jonAccount)).toBe(jonBefore);
    expect(await countFor("jon")).toBe(0);
  });

  it("refuses a signed-out caller", async () => {
    currentClerkId = null;
    const res = await importTransactions({
      fileName: "x.csv",
      data: csv(["2026-09-12,Anonymous,EXPENSE,groceries,100"]),
      accountId: idaAccount,
    });
    expect(res.success).toBe(false);
  });

  it("is subject to the rate limiter", async () => {
    asTenant("ida");
    rateLimitDenied = true;
    const res = await importTransactions({
      fileName: "x.csv",
      data: csv(["2026-09-13,Limited,EXPENSE,groceries,100"]),
      accountId: idaAccount,
    });
    rateLimitDenied = false;
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/too many/i);
  });
});

describe("refusing a file leaves nothing behind", () => {
  it("writes nothing when every row is invalid", async () => {
    asTenant("ida");
    const before = await countFor("ida");
    const balance = await balanceOf(idaAccount);
    const res = await importTransactions({
      fileName: "bad.csv",
      data: csv([
        "not-a-date,Broken,EXPENSE,groceries,100",
        "2026-09-20,Broken amount,EXPENSE,groceries,abc",
      ]),
      accountId: idaAccount,
    });
    expect(res.success).toBe(false);
    expect(await countFor("ida")).toBe(before);
    expect(await balanceOf(idaAccount)).toBe(balance);
  });

  it("writes nothing for an unreadable file", async () => {
    asTenant("ida");
    const before = await countFor("ida");
    const res = await importTransactions({
      fileName: "x.csv",
      data: b64("Thing,Other\r\n1,2"),
      accountId: idaAccount,
    });
    expect(res.success).toBe(false);
    expect(await countFor("ida")).toBe(before);
  });

  it("refuses a foreign currency rather than converting it", async () => {
    asTenant("ida");
    const before = await countFor("ida");
    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Currency",
        "2026-09-21,US purchase,EXPENSE,groceries,100,USD",
      ].join("\r\n")
    );
    const analysis = await analyzeImport({ fileName: "usd.csv", data, accountId: idaAccount });
    expect(analysis.data.counts.invalid).toBe(1);
    expect(analysis.data.invalid[0].errors.join(" ")).toMatch(/USD/);

    const res = await importTransactions({ fileName: "usd.csv", data, accountId: idaAccount });
    expect(res.success).toBe(false);
    expect(await countFor("ida")).toBe(before);
  });
});

describe("balances across several accounts", () => {
  it("moves each account by exactly its own rows", async () => {
    asTenant("ida");
    const first = await balanceOf(idaAccount);
    const second = await balanceOf(idaSecond);

    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Account",
        "2026-12-01,To checking,INCOME,salary,1000,Ida Checking",
        "2026-12-02,To savings,EXPENSE,groceries,400,Shared Name",
      ].join("\r\n")
    );
    const res = await importTransactions({ fileName: "split.csv", data, accountId: idaAccount });
    expect(res.success).toBe(true);
    expect(res.data.accounts).toBe(2);
    expect(await balanceOf(idaAccount)).toBeCloseTo(first + 1000, 2);
    expect(await balanceOf(idaSecond)).toBeCloseTo(second - 400, 2);
  });

  it("leaves the balances the dashboard reads consistent with the rows", async () => {
    asTenant("ida");
    const accounts = await getUserAccounts();
    for (const account of accounts) {
      const rows = await admin.transaction.findMany({
        where: { userId: TENANTS.ida.id, accountId: account.id },
        select: { type: true, amount: true },
      });
      const expected = rows.reduce(
        (sum, r) => sum + (r.type === "EXPENSE" ? -r.amount.toNumber() : r.amount.toNumber()),
        0
      );
      expect(account.balance).toBeCloseTo(expected, 2);
    }
  });
});

// Per-account mapping. The file names an account; the user decides where it
// goes, and the server re-checks that the choice is theirs.
describe("account name mapping", () => {
  it("reports every account name the file mentions and where it is going", async () => {
    asTenant("ida");
    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Account",
        "2027-01-01,One,EXPENSE,groceries,100,Ida Checking",
        "2027-01-02,Two,EXPENSE,groceries,100,HDFC Imported",
        "2027-01-03,Three,EXPENSE,groceries,100,HDFC Imported",
      ].join("\r\n")
    );
    const res = await analyzeImport({ fileName: "m.csv", data, accountId: idaAccount });
    const names = res.data.accountNames;
    expect(names).toHaveLength(2);

    const known = names.find((n) => n.name === "Ida Checking");
    expect(known.matched).toBe(true);
    expect(known.accountId).toBe(idaAccount);

    const unknown = names.find((n) => n.name === "HDFC Imported");
    expect(unknown.matched).toBe(false);
    expect(unknown.rows).toBe(2);
    // Falls back to the destination, and says it did rather than hiding it.
    expect(unknown.accountId).toBe(idaAccount);
  });

  it("sends the rows where the user maps the name", async () => {
    asTenant("ida");
    const before = await balanceOf(idaSecond);
    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Account",
        "2027-02-01,Mapped row,EXPENSE,groceries,750,HDFC Imported",
      ].join("\r\n")
    );
    const res = await importTransactions({
      fileName: "m.csv",
      data,
      accountId: idaAccount,
      accountMap: { "hdfc imported": idaSecond },
    });
    expect(res.success).toBe(true);

    const row = await admin.transaction.findFirst({ where: { description: "Mapped row" } });
    expect(row.accountId).toBe(idaSecond);
    expect(await balanceOf(idaSecond)).toBeCloseTo(before - 750, 2);
  });

  // The mapping comes from the browser, so it is no more trusted than the file.
  it("ignores a mapping that points at another user's account", async () => {
    asTenant("ida");
    const jonBefore = await balanceOf(jonAccount);
    const data = b64(
      [
        "Date,Description,Type,Category,Amount,Account",
        "2027-03-01,Hijack attempt,EXPENSE,groceries,900,HDFC Imported",
      ].join("\r\n")
    );
    const res = await importTransactions({
      fileName: "m.csv",
      data,
      accountId: idaAccount,
      accountMap: { "hdfc imported": jonAccount },
    });
    expect(res.success).toBe(true);

    const row = await admin.transaction.findFirst({ where: { description: "Hijack attempt" } });
    expect(row.userId).toBe(TENANTS.ida.id);
    expect(row.accountId).toBe(idaAccount);
    expect(await balanceOf(jonAccount)).toBe(jonBefore);
    expect(await countFor("jon")).toBe(0);
  });
});
