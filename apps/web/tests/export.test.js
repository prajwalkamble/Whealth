import { describe, it, expect } from "vitest";

const { toCsv, escapeFormula, amountCell, dateCell, safeFilename } = await import(
  "@/lib/export/csv"
);
const { resolveRange, RANGE_KEYS } = await import("@/lib/export/date-ranges");
const { balanceEffect, openingBalance } = await import("@/lib/money");
const { transactionsWorkbook } = await import("@/lib/export/xlsx");
const { transactionStatement } = await import("@/lib/export/pdf");
const ExcelJS = (await import("exceljs")).default;

const COLS = [
  { key: "date", header: "Date" },
  { key: "description", header: "Description" },
  { key: "amount", header: "Amount" },
];
const body = (csv) => csv.replace(/^﻿/, "").trim().split("\r\n");

describe("csv escaping", () => {
  it("quotes a value containing a comma", () => {
    const [, row] = body(toCsv([{ description: "Rent, October" }], COLS));
    expect(row).toContain('"Rent, October"');
  });

  it("doubles embedded quotes", () => {
    const [, row] = body(toCsv([{ description: 'He said "hi"' }], COLS));
    expect(row).toContain('"He said ""hi"""');
  });

  it("quotes a value containing a newline", () => {
    const csv = toCsv([{ description: "line one\nline two" }], COLS);
    expect(csv).toContain('"line one\nline two"');
  });

  it("writes an empty cell for null and undefined, not the words", () => {
    const [, row] = body(toCsv([{ date: null, description: undefined, amount: 1 }], COLS));
    expect(row.startsWith(",,")).toBe(true);
    expect(row).not.toContain("null");
    expect(row).not.toContain("undefined");
  });

  it("keeps unicode intact and leads with a BOM so Excel reads it as UTF-8", () => {
    const csv = toCsv([{ description: "नमस्ते ☕" }], COLS);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("नमस्ते ☕");
  });

  it("uses CRLF line endings", () => {
    expect(toCsv([{ description: "a" }], COLS)).toContain("\r\n");
  });

  it("emits columns in the declared order every time", () => {
    const [header] = body(toCsv([{ amount: 1, description: "x", date: "y" }], COLS));
    expect(header).toBe("Date,Description,Amount");
  });
});

// The security control. A spreadsheet runs a cell beginning =, +, - or @, so a
// description is an execution vector if it is written through unchanged.
describe("formula injection", () => {
  it.each([
    ["=1+1"],
    ["=cmd|' /c calc'!A1"],
    ["+1234"],
    ["@SUM(A1:A9)"],
    ["\t=1+1"],
  ])("neutralises %s", (payload) => {
    expect(escapeFormula(payload).startsWith("'")).toBe(true);
  });

  it("leaves ordinary text completely alone", () => {
    expect(escapeFormula("Coffee at Blue Tokai")).toBe("Coffee at Blue Tokai");
    expect(escapeFormula("Rent - October")).toBe("Rent - October");
  });

  // The failure mode to avoid while fixing the first one: a negative amount is
  // a number, not an attack, and must stay numeric and summable.
  it("does not corrupt a negative amount", () => {
    expect(escapeFormula(-2499)).toBe(-2499);
    expect(amountCell(-2499)).toBe("-2499.00");
    expect(Number(amountCell(-2499))).toBe(-2499);
  });

  it("neutralises a dangerous value inside a real csv row", () => {
    const [, row] = body(toCsv([{ description: "=HYPERLINK(\"http://x\")" }], COLS));
    expect(row).toContain("'=HYPERLINK");
  });
});

describe("amount and date cells", () => {
  it("writes a plain decimal, not a formatted currency string", () => {
    expect(amountCell(2499)).toBe("2499.00");
    expect(amountCell("2499.5")).toBe("2499.50");
    expect(amountCell(2499)).not.toContain("₹");
  });

  it("keeps large and small values numeric", () => {
    expect(Number(amountCell(1e9))).toBe(1e9);
    expect(amountCell(0.005)).toBe("0.01");
  });

  it("writes an empty cell rather than NaN for an unusable amount", () => {
    expect(amountCell("abc")).toBe("");
    expect(amountCell(null)).toBe("");
  });

  it("writes dates as ISO civil dates in the app timezone", () => {
    expect(dateCell(new Date("2026-09-30T20:00:00Z"), "Asia/Kolkata")).toBe("2026-10-01");
    expect(dateCell("not a date", "Asia/Kolkata")).toBe("");
  });
});

describe("filenames", () => {
  it("strips path traversal and separators", () => {
    const name = safeFilename(["../../etc/passwd"], "csv");
    expect(name).not.toContain("..");
    expect(name).not.toContain("/");
    expect(name.endsWith(".csv")).toBe(true);
  });

  it("builds a readable deterministic name", () => {
    expect(safeFilename(["WHealthOS", "Transactions", "2026-09-01", "to", "2026-09-30"], "csv"))
      .toBe("WHealthOS_Transactions_2026-09-01_to_2026-09-30.csv");
  });

  it("survives an account name full of punctuation", () => {
    const name = safeFilename(["WHealthOS", 'HDFC "Savings" <#1>'], "pdf");
    expect(name).toMatch(/^[\w.-]+$/);
  });

  it("never produces a bare extension", () => {
    expect(safeFilename(["///"], "csv")).toBe("WHealthOS_Export.csv");
  });
});

describe("date ranges", () => {
  const now = new Date("2026-10-04T09:00:00Z"); // a Sunday, 14:30 IST

  it("resolves every preset to an ordered range", () => {
    for (const key of RANGE_KEYS) {
      const { from, to } = resolveRange(key, {}, now);
      expect(from instanceof Date, key).toBe(true);
      expect(Number.isNaN(from.getTime()), key).toBe(false);
      expect(from <= to, key).toBe(true);
    }
  });

  it("covers a whole single day for today", () => {
    const { from, to } = resolveRange("today", {}, now);
    expect(Math.round((to - from) / 36e5)).toBe(24);
  });

  it("puts yesterday entirely before today", () => {
    expect(resolveRange("yesterday", {}, now).to < resolveRange("today", {}, now).from).toBe(true);
  });

  it("starts the week on Monday", () => {
    const { from } = resolveRange("this-week", {}, now);
    const weekday = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(from);
    expect(weekday).toBe("Mon");
  });

  it("makes a week exactly seven days", () => {
    const { from, to } = resolveRange("this-week", {}, now);
    expect(Math.round((to - from) / 864e5)).toBe(7);
  });

  it("makes a quarter three months, and the previous one adjacent", () => {
    const q = resolveRange("this-quarter", {}, now);
    const prev = resolveRange("previous-quarter", {}, now);
    expect(prev.to < q.from).toBe(true);
    expect(Math.round((q.to - q.from) / 864e5)).toBeGreaterThan(80);
  });

  it("makes a year span twelve months", () => {
    const { from, to } = resolveRange("this-year", {}, now);
    expect(Math.round((to - from) / 864e5)).toBeGreaterThan(360);
  });

  it("widens a custom range to cover both whole days", () => {
    const { from, to } = resolveRange(
      "custom",
      { from: "2026-09-10", to: "2026-09-12" },
      now
    );
    expect(Math.round((to - from) / 864e5)).toBe(3);
  });

  // Refusing is the right answer: an export over a range the caller did not
  // mean is worse than one that does not run.
  it("refuses a reversed custom range", () => {
    expect(() => resolveRange("custom", { from: "2026-09-12", to: "2026-09-10" }, now)).toThrow();
  });

  it("refuses an unparseable custom range", () => {
    expect(() => resolveRange("custom", { from: "banana", to: "2026-09-10" }, now)).toThrow();
  });

  it("refuses an unknown preset", () => {
    expect(() => resolveRange("last-decade", {}, now)).toThrow();
  });
});

// Statements can show real balances only because Account.balance is maintained
// by this exact function on every write. These assertions pin that contract.
describe("balances", () => {
  it("expenses decrease and income increases", () => {
    expect(balanceEffect("EXPENSE", 500)).toBe(-500);
    expect(balanceEffect("INCOME", 500)).toBe(500);
  });

  it("recovers an opening balance by unwinding the period", () => {
    const since = [
      { type: "INCOME", amount: 90000 },
      { type: "EXPENSE", amount: 24000 },
      { type: "EXPENSE", amount: 6000 },
    ];
    // 100000 now, after +90000 -24000 -6000, so the period opened at 40000.
    expect(openingBalance(100000, since)).toBe(40000);
  });

  it("returns the current balance when nothing happened in the period", () => {
    expect(openingBalance(12345.67, [])).toBeCloseTo(12345.67, 2);
  });

  it("round-trips: opening plus the period's effects is the current balance", () => {
    const since = [
      { type: "EXPENSE", amount: 1200.5 },
      { type: "INCOME", amount: 3400.25 },
    ];
    const opening = openingBalance(5000, since);
    const replayed = since.reduce((b, t) => b + balanceEffect(t.type, t.amount), opening);
    expect(replayed).toBeCloseTo(5000, 6);
  });
});

// A fixture long enough to force the PDF onto several pages, with a formula
// payload in the first description and a long description to force wrapping.
const SAMPLE_ROWS = Array.from({ length: 90 }, (_, i) => ({
  id: `txn_${i}`,
  date: new Date(Date.UTC(2026, 8, (i % 29) + 1, 6, 30)),
  description:
    i === 0
      ? "=cmd|' /c calc'!A1"
      : `Transaction ${i} with a description long enough to wrap inside its column`,
  type: i % 3 === 0 ? "INCOME" : "EXPENSE",
  category: "groceries",
  amount: 1234.5 + i,
  status: "COMPLETED",
  isRecurring: i % 5 === 0,
  accountName: "HDFC Savings",
}));

const SAMPLE_RANGE = { from: "01 Sep 2026", to: "30 Sep 2026" };

// The point of XLSX over CSV is typed cells. These assertions are what makes
// the format worth having: if amounts arrive as strings the recipient cannot
// sum the column, and the export may as well have been a CSV.
describe("xlsx workbook", () => {
  const load = async (rows = SAMPLE_ROWS) => {
    const buffer = await transactionsWorkbook({
      rows,
      range: SAMPLE_RANGE,
      generatedAt: "04 Oct 2026, 14:30",
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return { buffer, workbook };
  };

  it("produces a workbook that reads back", async () => {
    const { buffer, workbook } = await load();
    expect(buffer.length).toBeGreaterThan(0);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["Summary", "Transactions"]);
  });

  it("opens on the summary sheet", async () => {
    const { workbook } = await load();
    expect(workbook.worksheets[0].name).toBe("Summary");
  });

  it("writes one row per transaction, plus a header", async () => {
    const { workbook } = await load();
    expect(workbook.getWorksheet("Transactions").rowCount).toBe(SAMPLE_ROWS.length + 1);
  });

  it("writes amounts as numbers, not formatted strings", async () => {
    const { workbook } = await load();
    const cell = workbook.getWorksheet("Transactions").getRow(2).getCell(6);
    expect(typeof cell.value).toBe("number");
    expect(String(cell.value)).not.toContain("₹");
  });

  it("writes dates as dates, so the column sorts chronologically", async () => {
    const { workbook } = await load();
    const cell = workbook.getWorksheet("Transactions").getRow(2).getCell(1);
    expect(cell.value instanceof Date).toBe(true);
  });

  it("signs expenses negative so the recipient's own total matches the net", async () => {
    const { workbook } = await load();
    const sheet = workbook.getWorksheet("Transactions");
    let sum = 0;
    for (let r = 2; r <= sheet.rowCount; r++) sum += sheet.getRow(r).getCell(6).value;
    const expected = SAMPLE_ROWS.reduce(
      (total, row) => total + (row.type === "EXPENSE" ? -row.amount : row.amount),
      0
    );
    expect(sum).toBeCloseTo(expected, 6);
  });

  it("neutralises a formula payload in a description", async () => {
    const { workbook } = await load();
    const cell = workbook.getWorksheet("Transactions").getRow(2).getCell(2);
    // A string cell, prefixed -- never a formula object.
    expect(typeof cell.value).toBe("string");
    expect(cell.value.startsWith("'=")).toBe(true);
    expect(cell.formula).toBeUndefined();
  });

  it("carries a currency display format on the amount column", async () => {
    const { workbook } = await load();
    expect(workbook.getWorksheet("Transactions").getColumn(6).numFmt).toContain("#,##0.00");
  });

  it("freezes the header row", async () => {
    const { workbook } = await load();
    expect(workbook.getWorksheet("Transactions").views[0]).toMatchObject({
      state: "frozen",
      ySplit: 1,
    });
  });

  // The summary must agree with the rows it summarises; a report that disagrees
  // with its own data is worse than one without a summary.
  it("summarises the same figures the rows contain", async () => {
    const { workbook } = await load();
    const summary = workbook.getWorksheet("Summary");
    const income = SAMPLE_ROWS.filter((r) => r.type === "INCOME").reduce((t, r) => t + r.amount, 0);
    const values = [];
    summary.eachRow((row) => values.push([row.getCell(1).value, row.getCell(2).value]));
    const found = values.find(([label]) => label === "Total income");
    expect(found[1]).toBeCloseTo(income, 6);
  });

  it("says a savings rate is unavailable rather than showing it as zero", async () => {
    const { workbook } = await load(SAMPLE_ROWS.filter((r) => r.type === "EXPENSE"));
    const summary = workbook.getWorksheet("Summary");
    const values = [];
    summary.eachRow((row) => values.push([row.getCell(1).value, row.getCell(2).value]));
    expect(values.find(([label]) => label === "Savings rate")[1]).toBe("Not available");
  });
});

// Reading a PDF back without a parser.
//
// There is no PDF parser in the dependency tree and adding one to check our own
// output is not worth it, so the statements are rendered with compression off
// and the text is recovered from the content streams. pdfkit writes standard
// font text as hex strings inside a kerned TJ array -- "Period:" arrives as
// [<50> 50 <6572> -15 <696f643a>] -- so each array's hex runs are concatenated
// to rebuild the string. Everything asserted is drawn by the same code path
// that produces the delivered file; only the compression differs.
const pdfText = (buffer) => {
  const raw = buffer.toString("latin1");
  const lines = [];
  for (const [, array] of raw.matchAll(/\[((?:\s*(?:<[0-9a-fA-F]*>|-?[\d.]+))*)\s*\]\s*TJ/g)) {
    let line = "";
    for (const [, hex] of array.matchAll(/<([0-9a-fA-F]*)>/g)) {
      line += Buffer.from(hex, "hex").toString("latin1");
    }
    if (line) lines.push(line);
  }
  return lines.join("\n");
};

const pdfPageCount = (buffer) => Number(buffer.toString("latin1").match(/\/Count (\d+)/)[1]);

describe("pdf statement", () => {
  const render = async (rows = SAMPLE_ROWS) => {
    const buffer = await transactionStatement({
      rows,
      range: SAMPLE_RANGE,
      generatedAt: "04 Oct 2026, 14:30",
      timeZone: "Asia/Kolkata",
      compress: false,
    });
    return { buffer, raw: buffer.toString("latin1"), text: pdfText(buffer) };
  };

  it("produces a valid PDF", async () => {
    const { buffer, raw } = await render();
    expect(raw.startsWith("%PDF-")).toBe(true);
    expect(raw.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("paginates a long export instead of clipping it", async () => {
    const { buffer } = await render();
    expect(pdfPageCount(buffer)).toBeGreaterThan(1);
  });

  it("numbers every page, with the total known", async () => {
    const { buffer, text } = await render();
    const pages = pdfPageCount(buffer);
    const stamps = text.match(/Page \d+ of \d+/g) ?? [];
    expect(stamps).toHaveLength(pages);
    expect(stamps[0]).toBe(`Page 1 of ${pages}`);
    expect(stamps.at(-1)).toBe(`Page ${pages} of ${pages}`);
  });

  // The regression this pins: pdfkit inserts a page when text is drawn below
  // the bottom margin, so drawing the footers used to turn a three-row report
  // into a three-page one.
  it("fits a short export on exactly one page", async () => {
    const { buffer, text } = await render(SAMPLE_ROWS.slice(0, 3));
    expect(pdfPageCount(buffer)).toBe(1);
    expect(text).toContain("Page 1 of 1");
  });

  it("repeats the branding and the table header on every page", async () => {
    const { buffer, text } = await render();
    const pages = pdfPageCount(buffer);
    expect((text.match(/WHealthOS/g) ?? []).length).toBeGreaterThanOrEqual(pages);
    expect((text.match(/DESCRIPTION/g) ?? []).length).toBe(pages);
  });

  it("reports the figures its own rows contain", async () => {
    const { text } = await render();
    const income = SAMPLE_ROWS.filter((r) => r.type === "INCOME").reduce((t, r) => t + r.amount, 0);
    expect(text).toContain(
      income.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    expect(text).toContain("90 transactions in this period");
  });

  // The document is generated from the user's own records. Claiming more than
  // that -- "official", "certified" -- would misrepresent what it is.
  // The figure a reader looks for last. It is summed from the rows the table
  // printed, so it cannot disagree with the lines above it.
  describe("totals", () => {
    const sum = (type) =>
      SAMPLE_ROWS.filter((r) => r.type === type).reduce((t, r) => t + r.amount, 0);
    const inr = (n) =>
      n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    it("closes the table with a total for the period", async () => {
      const { text } = await render();
      expect(text).toContain("Total for this period");
    });

    it("totals debit and credit to what the rows contain", async () => {
      const { text } = await render();
      const flat = text.replace(/\s+/g, " ");
      expect(flat).toContain(inr(sum("EXPENSE")));
      expect(flat).toContain(inr(sum("INCOME")));
    });

    it("states the net and which way it went", async () => {
      const { text } = await render();
      const flat = text.replace(/\s+/g, " ");
      const net = sum("INCOME") - sum("EXPENSE");
      expect(flat).toContain(`Net for this period: ${net < 0 ? "-" : ""}${inr(Math.abs(net))} INR`);
      expect(flat).toContain(
        net < 0 ? "spent more than received" : "received more than spent"
      );
    });

    it("names the direction correctly when the period is negative", async () => {
      const { text } = await render(SAMPLE_ROWS.filter((r) => r.type === "EXPENSE"));
      expect(text.replace(/\s+/g, " ")).toContain("spent more than received");
    });

    it("prints the totals once, not once per page", async () => {
      const { text } = await render();
      expect((text.match(/Total for this period/g) ?? []).length).toBe(1);
    });

    // The totals move to a new page whole rather than being split from the
    // rule that introduces them.
    it("keeps the totals on a page with the table header", async () => {
      const { buffer, text } = await render();
      const pages = pdfPageCount(buffer);
      expect((text.match(/DESCRIPTION/g) ?? []).length).toBe(pages);
      expect(text).toContain("Total for this period");
    });
  });

  it("does not claim to be an official or certified statement", async () => {
    const { text } = await render();
    // Collapsed, because the footer wraps across lines at its column width.
    const flat = text.replace(/\s+/g, " ");
    expect(flat).toContain("Not a certified or audited statement");
    expect(flat).toContain("generated by WHealthOS from your own records");
    expect(flat).not.toMatch(/\bofficial\b/i);
    expect(flat).not.toMatch(/\bcertified by\b/i);
  });

  // Helvetica has no U+20B9 glyph: it measures zero width, so printing it both
  // shows nothing and corrupts the measured column layout.
  it("states the currency in words rather than printing an unsupported glyph", async () => {
    const { text } = await render();
    expect(text).not.toContain("₹");
    expect(text).toContain("All amounts in INR");
  });

  it("renders without throwing when a description is long enough to wrap", async () => {
    const { buffer } = await render([
      { ...SAMPLE_ROWS[1], description: "x".repeat(600) },
    ]);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
