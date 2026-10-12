import { describe, it, expect } from "vitest";

const { parseCsv, parseCsvTable } = await import("@/lib/import/parse-csv");
const {
  detectColumns,
  parseDate,
  parseAmount,
  checkCurrency,
  fingerprint,
  mapRow,
  mapRows,
} = await import("@/lib/import/transactions");
const { parseXlsxTable } = await import("@/lib/import/xlsx");
const { monthlyFlow, periodTotals } = await import("@/lib/analytics");
const { balanceEffect } = await import("@/lib/money");
const ExcelJS = (await import("exceljs")).default;
const { toCsv, dateCell } = await import("@/lib/export/csv");

// Imported dates are anchored to the app timezone, so they must be read back
// in it -- toISOString would report the UTC day, which is the day before.
const appDay = (date) => dateCell(date, "Asia/Kolkata");
const { TRANSACTION_COLUMNS } = await import("@/lib/export/transactions");

describe("csv parsing", () => {
  it("splits plain rows", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps a quoted comma inside its field", () => {
    expect(parseCsv('a,b\r\n"Rent, October",2')).toEqual([
      ["a", "b"],
      ["Rent, October", "2"],
    ]);
  });

  it("unescapes a doubled quote", () => {
    expect(parseCsv('a\r\n"He said ""hi"""')[1]).toEqual(['He said "hi"']);
  });

  it("keeps a newline inside a quoted field", () => {
    expect(parseCsv('a\r\n"line one\nline two"')[1]).toEqual(["line one\nline two"]);
  });

  it("strips the BOM Excel writes", () => {
    expect(parseCsv("﻿a,b\r\n1,2")[0]).toEqual(["a", "b"]);
  });

  it("accepts bare LF line endings", () => {
    expect(parseCsv("a,b\n1,2")).toHaveLength(2);
  });

  it("does not invent a row from a trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toHaveLength(2);
  });

  it("treats a quote inside an unquoted field as a literal", () => {
    expect(parseCsv('a\r\n6" pipe')[1]).toEqual(['6" pipe']);
  });

  it("keys rows by header, ignoring case and spacing", () => {
    const { rows } = parseCsvTable("Transaction Date,AMOUNT\r\n2026-09-01,10");
    expect(rows[0].transactiondate).toBe("2026-09-01");
    expect(rows[0].amount).toBe("10");
  });

  it("numbers rows by their line in the file", () => {
    const { rows } = parseCsvTable("a\r\nx\r\ny");
    expect(rows.map((r) => r.__line)).toEqual([2, 3]);
  });
});

// The pair that matters: a file this app produced must go back into it.
describe("round trip with the exporter", () => {
  const original = [
    {
      id: "txn_1",
      date: new Date(Date.UTC(2026, 8, 1, 6, 30)),
      description: 'Rent, October "advance"',
      type: "EXPENSE",
      category: "housing",
      amount: 24000,
      status: "COMPLETED",
      isRecurring: false,
      accountName: "HDFC Savings",
    },
    {
      id: "txn_2",
      date: new Date(Date.UTC(2026, 8, 2, 6, 30)),
      description: "Salary",
      type: "INCOME",
      category: "salary",
      amount: 85000,
      status: "COMPLETED",
      isRecurring: false,
      accountName: "HDFC Savings",
    },
  ];

  const csv = toCsv(original, TRANSACTION_COLUMNS);

  it("reads every exported row back", () => {
    const { headers, rows } = parseCsvTable(csv);
    const mapped = mapRows(rows, headers);
    expect(mapped.fatal).toBeNull();
    expect(mapped.ready).toHaveLength(2);
    expect(mapped.rejected).toHaveLength(0);
  });

  it("recovers the type, amount, category and date unchanged", () => {
    const { headers, rows } = parseCsvTable(csv);
    const [first, second] = mapRows(rows, headers).ready;
    expect(first.transaction.type).toBe("EXPENSE");
    expect(first.transaction.amount).toBe(24000);
    expect(first.transaction.category).toBe("housing");
    expect(appDay(first.transaction.date)).toBe("2026-09-01");
    expect(second.transaction.type).toBe("INCOME");
    expect(second.transaction.amount).toBe(85000);
  });

  it("recovers a description containing a comma and quotes", () => {
    const { headers, rows } = parseCsvTable(csv);
    expect(mapRows(rows, headers).ready[0].transaction.description).toBe(
      'Rent, October "advance"'
    );
  });

  it("carries the account name and the source id, so a re-import can dedupe", () => {
    const { headers, rows } = parseCsvTable(csv);
    const [first] = mapRows(rows, headers).ready;
    expect(first.accountName).toBe("HDFC Savings");
    expect(first.sourceId).toBe("txn_1");
  });
});

describe("column detection", () => {
  it("finds the app's own headers", () => {
    const columns = detectColumns(["Date", "Description", "Type", "Category", "Amount"]);
    expect(columns).toMatchObject({
      date: "date",
      description: "description",
      type: "type",
      amount: "amount",
    });
  });

  it("finds common bank headers", () => {
    const columns = detectColumns(["Value Date", "Narration", "Withdrawal Amt", "Deposit Amt"]);
    expect(columns.date).toBe("valuedate");
    expect(columns.description).toBe("narration");
    expect(columns.debit).toBe("withdrawalamt");
    expect(columns.credit).toBe("depositamt");
  });
});

describe("dates", () => {
  it("reads ISO", () => {
    expect(appDay(parseDate("2026-09-01").value)).toBe("2026-09-01");
  });

  it("reads dd/mm/yyyy", () => {
    expect(appDay(parseDate("01/09/2026").value)).toBe("2026-09-01");
  });

  // Refusing is the point: 03/04/2026 is a real date under both readings, and
  // guessing files a transaction in the wrong month without telling anyone.
  it("refuses a format it cannot read rather than guessing", () => {
    expect(parseDate("Sept 1 2026").error).toBeTruthy();
    expect(parseDate("09/01/26").error).toBeTruthy();
  });

  it("refuses a date that does not exist", () => {
    expect(parseDate("2026-02-30").error).toBeTruthy();
    expect(parseDate("31/02/2026").error).toBeTruthy();
  });

  it("refuses an empty date", () => {
    expect(parseDate("").error).toBeTruthy();
  });

  // Anchored to the app's timezone, not UTC: a row dated the 1st has to read
  // as the 1st on the dashboard, whose month boundaries come from lib/time.
  it("anchors the date to the application timezone", () => {
    const date = parseDate("2026-09-01").value;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
    expect(day).toBe("2026-09-01");
    // Stored before midnight UTC on the 1st, i.e. 18:30 UTC on 31 August.
    expect(date.toISOString()).toBe("2026-08-31T18:30:00.000Z");
  });
});

describe("amounts", () => {
  it("reads a plain number", () => {
    expect(parseAmount("2499.50").value).toBe(2499.5);
  });

  it("strips grouping and a currency symbol", () => {
    expect(parseAmount("₹1,23,456.78").value).toBeCloseTo(123456.78, 2);
  });

  it("reads a negative as a negative", () => {
    expect(parseAmount("-500").negative).toBe(true);
    expect(parseAmount("-500").value).toBe(500);
  });

  it("reads the accounting bracket convention", () => {
    expect(parseAmount("(500.00)").negative).toBe(true);
  });

  it("refuses text rather than importing it as zero", () => {
    expect(parseAmount("abc").error).toBeTruthy();
    expect(parseAmount("").error).toBeTruthy();
    expect(parseAmount("0").error).toBeTruthy();
  });

  it("refuses an absurd amount", () => {
    expect(parseAmount("99999999999").error).toBeTruthy();
  });
});

describe("row mapping", () => {
  const columns = detectColumns(["Date", "Description", "Type", "Category", "Amount"]);
  const row = (over = {}) => ({
    date: "2026-09-01",
    description: "Groceries",
    type: "EXPENSE",
    category: "groceries",
    amount: "2450.50",
    __line: 2,
    ...over,
  });

  it("maps a good row", () => {
    const mapped = mapRow(row(), columns);
    expect(mapped.errors).toBeUndefined();
    expect(mapped.transaction).toMatchObject({
      type: "EXPENSE",
      amount: 2450.5,
      category: "groceries",
      isRecurring: false,
    });
  });

  it("accepts a category by its display name", () => {
    expect(mapRow(row({ category: "Groceries" }), columns).transaction.category).toBe(
      "groceries"
    );
  });

  // Never invented: an unknown category becomes the catch-all and is flagged,
  // rather than creating a category the app has no name or colour for.
  it("files an unknown category under Other and says so", () => {
    const mapped = mapRow(row({ category: "Yacht maintenance" }), columns);
    expect(mapped.transaction.category).toBe("other-expense");
    expect(mapped.categoryFellBack).toBe(true);
  });

  it("does not flag a fallback when no category was given", () => {
    expect(mapRow(row({ category: "" }), columns).categoryFellBack).toBe(false);
  });

  it("rejects a category belonging to the other direction", () => {
    // salary is an INCOME category; on an expense it falls back rather than
    // storing an income category against an expense.
    expect(mapRow(row({ category: "salary" }), columns).transaction.category).toBe(
      "other-expense"
    );
  });

  it("reports every problem on a row at once", () => {
    const mapped = mapRow(row({ date: "nonsense", amount: "abc" }), columns);
    expect(mapped.errors).toHaveLength(2);
    expect(mapped.line).toBe(2);
  });

  it("takes the direction from the sign when there is no type column", () => {
    const cols = detectColumns(["Date", "Amount"]);
    expect(mapRow({ date: "2026-09-01", amount: "-500", __line: 2 }, cols).transaction.type)
      .toBe("EXPENSE");
    expect(mapRow({ date: "2026-09-01", amount: "500", __line: 2 }, cols).transaction.type)
      .toBe("INCOME");
  });

  it("reads separate debit and credit columns", () => {
    const cols = detectColumns(["Date", "Withdrawal Amt", "Deposit Amt"]);
    const debit = mapRow(
      { date: "2026-09-01", withdrawalamt: "500", depositamt: "", __line: 2 },
      cols
    );
    const credit = mapRow(
      { date: "2026-09-01", withdrawalamt: "", depositamt: "900", __line: 3 },
      cols
    );
    expect(debit.transaction.type).toBe("EXPENSE");
    expect(debit.transaction.amount).toBe(500);
    expect(credit.transaction.type).toBe("INCOME");
    expect(credit.transaction.amount).toBe(900);
  });

  it("rejects a row that is both a debit and a credit", () => {
    const cols = detectColumns(["Date", "Debit", "Credit"]);
    expect(
      mapRow({ date: "2026-09-01", debit: "1", credit: "2", __line: 2 }, cols).errors
    ).toBeTruthy();
  });

  it("truncates an over-long description rather than failing the row", () => {
    const mapped = mapRow(row({ description: "x".repeat(900) }), columns);
    expect(mapped.transaction.description).toHaveLength(500);
  });
});

describe("whole-file mapping", () => {
  it("refuses a file with no date column", () => {
    const { headers, rows } = parseCsvTable("Thing,Amount\r\nx,10");
    expect(mapRows(rows, headers).fatal).toMatch(/Date/);
  });

  it("refuses a file with no amount column", () => {
    const { headers, rows } = parseCsvTable("Date,Description\r\n2026-09-01,x");
    expect(mapRows(rows, headers).fatal).toMatch(/Amount/);
  });

  it("separates good rows from bad instead of failing the whole file", () => {
    const { headers, rows } = parseCsvTable(
      "Date,Type,Category,Amount\r\n2026-09-01,EXPENSE,groceries,100\r\nbroken,EXPENSE,groceries,100"
    );
    const mapped = mapRows(rows, headers);
    expect(mapped.ready).toHaveLength(1);
    expect(mapped.rejected).toHaveLength(1);
    expect(mapped.rejected[0].line).toBe(3);
  });

  it("caps a very large file and says it did", () => {
    const lines = ["Date,Type,Category,Amount"];
    for (let i = 0; i < 2100; i++) lines.push("2026-09-01,EXPENSE,groceries,100");
    const { headers, rows } = parseCsvTable(lines.join("\r\n"));
    const mapped = mapRows(rows, headers);
    expect(mapped.ready).toHaveLength(2000);
    expect(mapped.truncated).toBe(true);
    expect(mapped.total).toBe(2100);
  });
});

// Separator handling. The regression this pins cost three orders of
// magnitude: "1.234,56" parsed as 1.23456 by stripping commas and keeping the
// dot, which on a real statement is the difference between ₹1,234 and ₹1.
describe("amount separators", () => {
  it("reads 1,234.56 as one thousand two hundred", () => {
    expect(parseAmount("1,234.56").value).toBeCloseTo(1234.56, 2);
  });

  it("reads the European 1.234,56 as the same number", () => {
    expect(parseAmount("1.234,56").value).toBeCloseTo(1234.56, 2);
  });

  it("reads Indian grouping", () => {
    expect(parseAmount("1,23,456.78").value).toBeCloseTo(123456.78, 2);
    expect(parseAmount("₹12,34,567.00").value).toBeCloseTo(1234567, 2);
  });

  it("reads a lone comma with two decimals as a decimal comma", () => {
    expect(parseAmount("1234,56").value).toBeCloseTo(1234.56, 2);
  });

  it("reads a lone comma grouping three digits as thousands", () => {
    expect(parseAmount("1,234").value).toBe(1234);
  });

  it("reads European grouping without decimals", () => {
    expect(parseAmount("1.234.567").value).toBe(1234567);
  });

  // The whole point: refuse rather than pick one reading of real money.
  it("refuses a genuinely ambiguous value", () => {
    expect(parseAmount("1.234").error).toBeTruthy();
    expect(parseAmount("1,23456").error).toBeTruthy();
  });

  it("names the ambiguity instead of failing silently", () => {
    expect(parseAmount("1.234").error).toMatch(/two ways/i);
  });

  it("still reads an ordinary decimal", () => {
    expect(parseAmount("2499.50").value).toBeCloseTo(2499.5, 2);
    expect(parseAmount("0.01").value).toBeCloseTo(0.01, 2);
  });
});

// WHealthOS has no currency column and no exchange rate. Importing a USD row
// as INR would invent a rate of 1.0.
describe("currency", () => {
  it("accepts the currency the app stores", () => {
    expect(checkCurrency("INR")).toBeNull();
    expect(checkCurrency("inr")).toBeNull();
    expect(checkCurrency("₹")).toBeNull();
  });

  it("accepts a blank currency column", () => {
    expect(checkCurrency("")).toBeNull();
    expect(checkCurrency(null)).toBeNull();
  });

  it("refuses a foreign currency rather than converting it", () => {
    expect(checkCurrency("USD")).toMatch(/single currency/i);
    expect(checkCurrency("EUR")).toBeTruthy();
  });

  it("rejects the row, naming the currency", () => {
    const columns = detectColumns(["Date", "Amount", "Currency"]);
    const mapped = mapRow(
      { date: "2026-09-01", amount: "100", currency: "USD", __line: 7 },
      columns
    );
    expect(mapped.errors.join(" ")).toContain("USD");
  });
});

describe("duplicate fingerprints", () => {
  const base = {
    accountId: "acc_1",
    date: new Date(Date.UTC(2026, 8, 1)),
    type: "EXPENSE",
    amount: 2450.5,
    description: "Groceries at the market",
  };

  it("matches an identical transaction", () => {
    expect(fingerprint(base)).toBe(fingerprint({ ...base }));
  });

  it("ignores case and spacing in the description", () => {
    expect(fingerprint({ ...base, description: "  GROCERIES  at the   market " }))
      .toBe(fingerprint(base));
  });

  it("separates a different account", () => {
    expect(fingerprint({ ...base, accountId: "acc_2" })).not.toBe(fingerprint(base));
  });

  it("separates a different amount, date or direction", () => {
    expect(fingerprint({ ...base, amount: 2450.51 })).not.toBe(fingerprint(base));
    expect(fingerprint({ ...base, date: new Date(Date.UTC(2026, 8, 2)) }))
      .not.toBe(fingerprint(base));
    expect(fingerprint({ ...base, type: "INCOME" })).not.toBe(fingerprint(base));
  });
});

describe("column mapping overrides", () => {
  const csv = "When,What,How much\r\n2026-09-01,Coffee,-250";

  it("refuses the file when nothing is recognised", () => {
    const { headers, rows } = parseCsvTable(csv);
    expect(mapRows(rows, headers).fatal).toBeTruthy();
  });

  it("imports once the user maps the columns", () => {
    const { headers, rows } = parseCsvTable(csv);
    const mapped = mapRows(rows, headers, { date: "when", description: "what", amount: "howmuch" });
    expect(mapped.fatal).toBeNull();
    expect(mapped.ready).toHaveLength(1);
    expect(mapped.ready[0].transaction.type).toBe("EXPENSE");
    expect(mapped.ready[0].transaction.amount).toBe(250);
    expect(mapped.ready[0].transaction.description).toBe("Coffee");
  });

  it("lets the user unmap a column that was detected wrongly", () => {
    const { headers, rows } = parseCsvTable(
      "Date,Category,Amount\r\n2026-09-01,salary,100"
    );
    const mapped = mapRows(rows, headers, { category: "" });
    expect(mapped.ready[0].transaction.category).toBe("other-income");
  });

  it("reports what it detected alongside what is in use", () => {
    const { headers, rows } = parseCsvTable("Date,Amount\r\n2026-09-01,100");
    const mapped = mapRows(rows, headers, { amount: "" });
    expect(mapped.detected.amount).toBe("amount");
    expect(mapped.columns.amount).toBeUndefined();
  });
});

describe("xlsx parsing", () => {
  const build = async (sheets) => {
    const workbook = new ExcelJS.Workbook();
    for (const [name, rows] of sheets) {
      const sheet = workbook.addWorksheet(name);
      for (const row of rows) sheet.addRow(row);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  };

  it("reads a simple workbook", async () => {
    const buffer = await build([
      ["Sheet1", [["Date", "Description", "Type", "Category", "Amount"],
                  ["2026-09-01", "Groceries", "EXPENSE", "groceries", 2450.5]]],
    ]);
    const { headers, rows, error } = await parseXlsxTable(buffer);
    expect(error).toBeNull();
    expect(headers).toContain("Amount");
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe("2450.5");
  });

  it("maps a workbook through the same pipeline as a CSV", async () => {
    const buffer = await build([
      ["Sheet1", [["Date", "Description", "Type", "Category", "Amount"],
                  ["2026-09-01", "Groceries", "EXPENSE", "groceries", 2450.5],
                  ["2026-09-02", "Salary", "INCOME", "salary", 85000]]],
    ]);
    const { headers, rows } = await parseXlsxTable(buffer);
    const mapped = mapRows(rows, headers);
    expect(mapped.ready).toHaveLength(2);
    expect(mapped.ready[0].transaction.amount).toBe(2450.5);
    expect(mapped.ready[1].transaction.type).toBe("INCOME");
  });

  // The first sheet is not assumed to be the right one.
  it("picks the sheet that actually holds the table", async () => {
    const buffer = await build([
      ["Cover", [["Statement of account"], ["Prepared for a customer"]]],
      ["Data", [["Date", "Description", "Amount"], ["2026-09-01", "Coffee", -250]]],
    ]);
    const { rows, sheetName, error } = await parseXlsxTable(buffer);
    expect(error).toBeNull();
    expect(sheetName).toBe("Data");
    expect(rows).toHaveLength(1);
  });

  it("finds a header row below a title block", async () => {
    const buffer = await build([
      ["Sheet1", [["HDFC Bank"], ["Account statement"], [],
                  ["Date", "Narration", "Withdrawal Amt", "Deposit Amt"],
                  ["2026-09-01", "ATM", 500, ""]]],
    ]);
    const { rows, error } = await parseXlsxTable(buffer);
    expect(error).toBeNull();
    expect(rows[0].narration).toBe("ATM");
    // The line number is the real row in the sheet, so the user can find it.
    expect(rows[0].__line).toBe(5);
  });

  it("keeps columns lined up when a cell is empty", async () => {
    const buffer = await build([
      ["Sheet1", [["Date", "Description", "Category", "Amount"],
                  ["2026-09-01", "", "groceries", 100]]],
    ]);
    const { rows } = await parseXlsxTable(buffer);
    expect(rows[0].category).toBe("groceries");
    expect(rows[0].amount).toBe("100");
  });

  // A formula contributes its cached result, never anything evaluated here.
  it("uses a formula's cached result and never evaluates it", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Date", "Description", "Amount"]);
    const row = sheet.addRow(["2026-09-01", "Total", null]);
    row.getCell(3).value = { formula: "SUM(A1:A2)", result: 1500 };
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const { rows } = await parseXlsxTable(buffer);
    expect(rows[0].amount).toBe("1500");
    expect(rows[0].amount).not.toContain("SUM");
  });

  it("reads a real date cell as an unambiguous ISO date", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Date", "Description", "Amount"]);
    sheet.addRow([new Date(Date.UTC(2026, 8, 1)), "Coffee", -250]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const { headers, rows } = await parseXlsxTable(buffer);
    expect(rows[0].date).toBe("2026-09-01");
    expect(mapRows(rows, headers).ready).toHaveLength(1);
  });

  it("reports a workbook it cannot read instead of throwing", async () => {
    const { error } = await parseXlsxTable(Buffer.from("not a workbook"));
    expect(error).toBeTruthy();
  });

  it("reports a workbook with no recognisable header", async () => {
    const buffer = await build([["Sheet1", [["alpha", "beta"], ["1", "2"]]]]);
    const { error } = await parseXlsxTable(buffer);
    expect(error).toMatch(/header/i);
  });

  it("ignores rows that are entirely empty", async () => {
    const buffer = await build([
      ["Sheet1", [["Date", "Amount"], ["2026-09-01", 100], [], ["", ""], ["2026-09-02", 200]]],
    ]);
    const { rows } = await parseXlsxTable(buffer);
    expect(rows).toHaveLength(2);
  });
});

// Where imported money lands.
//
// An imported transaction is an ordinary transaction, so it is counted by the
// same functions the dashboard and analytics already use, on its OWN date. A
// row from March must affect March -- not the month the import happened to run
// in. These assertions run the real aggregation over rows in the shape the
// importer produces.
describe("imported transactions in the existing calculations", () => {
  const imported = (over) => ({
    type: "EXPENSE",
    amount: 1000,
    category: "groceries",
    ...over,
  });

  const march = parseDate("2026-03-15").value;
  const september = parseDate("2026-09-15").value;

  it("counts a historical row in its own month, not the current one", () => {
    const window = [
      { year: 2026, month: 2 }, // March, 0-indexed as lib/time uses
      { year: 2026, month: 8 }, // September
    ];
    const flow = monthlyFlow(window, [
      imported({ date: march, amount: 5000 }),
      imported({ date: september, amount: 300 }),
    ]);

    // Months are 0-11 throughout lib/time, so March is 2 and September is 8.
    const byMonth = Object.fromEntries(flow.map((m) => [m.month, m]));
    expect(byMonth[2].expenses).toBe(5000);
    expect(byMonth[8].expenses).toBe(300);
  });

  it("leaves a month the import did not touch at zero", () => {
    const flow = monthlyFlow(
      [{ year: 2026, month: 2 }, { year: 2026, month: 8 }],
      [imported({ date: march, amount: 5000 })]
    );
    expect(flow.find((m) => m.month === 8).expenses).toBe(0);
  });

  it("totals an import exactly as the dashboard would", () => {
    // Example A from the brief: 50,000 income and 20,000 expenses.
    const totals = periodTotals([
      imported({ type: "INCOME", amount: 30000, date: september }),
      imported({ type: "INCOME", amount: 20000, date: september }),
      imported({ amount: 12000, date: september }),
      imported({ amount: 8000, date: september }),
    ]);
    expect(totals.income).toBe(50000);
    expect(totals.expenses).toBe(20000);
    expect(totals.net).toBe(30000);
    expect(totals.savingsRate).toBeCloseTo(60, 6);
  });

  it("moves an account balance by the same rule a typed transaction does", () => {
    const rows = [
      imported({ type: "INCOME", amount: 85000 }),
      imported({ amount: 2450.5 }),
    ];
    const delta = rows.reduce((sum, row) => sum + balanceEffect(row.type, row.amount), 0);
    expect(delta).toBeCloseTo(82549.5, 2);
  });
});
