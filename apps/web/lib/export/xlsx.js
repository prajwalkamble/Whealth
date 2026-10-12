import ExcelJS from "exceljs";
import { escapeFormula } from "./csv";
import { periodTotals } from "../analytics";

// XLSX generation.
//
// A real workbook, not a renamed CSV. The distinction that matters is typing:
// amounts are written as numbers and dates as dates, with a display format
// applied, so a recipient can sum a column, sort by date and chart the result.
// Writing "₹2,499.00" into a cell produces a spreadsheet that looks right and
// cannot do arithmetic, which defeats the point of exporting.
//
// Formula injection applies here too. ExcelJS writes a string beginning "=" as
// a formula unless it is told otherwise, so every text cell goes through the
// same escapeFormula used by the CSV path. Numbers and dates are typed, so
// they are never candidates.

// Indian number formatting, matching what the application displays. The symbol
// lives in the cell format rather than in the value, so the underlying datum
// stays a plain number.
const CURRENCY_FORMAT = '[$₹-en-IN]#,##0.00;[RED]-[$₹-en-IN]#,##0.00';
const DATE_FORMAT = "dd mmm yyyy";

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15173D" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

// Widths that fit the content without a reader having to drag columns. Not
// auto-fitted: ExcelJS cannot measure text, and guessing from string length
// makes long descriptions produce absurd widths.
const COLUMN_WIDTH = {
  Date: 13,
  Description: 38,
  Type: 11,
  Category: 16,
  Account: 20,
  Amount: 15,
  Currency: 10,
  Status: 12,
  Recurring: 11,
  "Transaction ID": 38,
};

const styleHeader = (sheet) => {
  const header = sheet.getRow(1);
  header.font = HEADER_FONT;
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle" };
  header.height = 20;
  // Frozen, so the header stays visible while scrolling a long export.
  sheet.views = [{ state: "frozen", ySplit: 1 }];
};

// Writes the transaction rows as a typed sheet.
function addTransactionsSheet(workbook, rows) {
  const sheet = workbook.addWorksheet("Transactions");

  const headers = [
    "Date",
    "Description",
    "Type",
    "Category",
    "Account",
    "Amount",
    "Currency",
    "Status",
    "Recurring",
    "Transaction ID",
  ];
  sheet.addRow(headers);
  sheet.columns = headers.map((h) => ({ width: COLUMN_WIDTH[h] ?? 14 }));

  for (const row of rows) {
    sheet.addRow([
      row.date instanceof Date ? row.date : new Date(row.date),
      escapeFormula(row.description ?? ""),
      escapeFormula(row.type ?? ""),
      escapeFormula(row.category ?? ""),
      escapeFormula(row.accountName ?? ""),
      // A number, so the column sums. Expenses are written negative so a
      // recipient's own total matches the net the application reports.
      row.type === "EXPENSE" ? -Number(row.amount) : Number(row.amount),
      "INR",
      escapeFormula(row.status ?? ""),
      row.isRecurring ? "Yes" : "No",
      escapeFormula(row.id ?? ""),
    ]);
  }

  sheet.getColumn(1).numFmt = DATE_FORMAT;
  sheet.getColumn(6).numFmt = CURRENCY_FORMAT;
  styleHeader(sheet);

  // Autofilter over the populated range, so the recipient can slice it.
  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  }

  return sheet;
}

// A summary sheet, computed with the same periodTotals the Analytics page
// uses. There is deliberately no second income/expense formula here.
function addSummarySheet(workbook, { rows, range, generatedAt }) {
  const sheet = workbook.addWorksheet("Summary");
  const totals = periodTotals(rows);

  sheet.columns = [{ width: 26 }, { width: 24 }];

  sheet.addRow(["WHealthOS Financial Export"]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow([]);
  sheet.addRow(["Period", `${range.from} to ${range.to}`]);
  sheet.addRow(["Generated", generatedAt]);
  sheet.addRow([]);

  const figures = [
    ["Total income", totals.income],
    ["Total expenses", totals.expenses],
    ["Net cash flow", totals.net],
  ];
  for (const [label, value] of figures) {
    const row = sheet.addRow([label, value]);
    row.getCell(2).numFmt = CURRENCY_FORMAT;
    row.getCell(1).font = { bold: true };
  }

  // null, not 0%, when there is no income: a savings rate against nothing is
  // not zero, it is unanswerable. periodTotals already returns null.
  const savings = sheet.addRow([
    "Savings rate",
    totals.savingsRate === null ? "Not available" : totals.savingsRate / 100,
  ]);
  savings.getCell(1).font = { bold: true };
  if (totals.savingsRate !== null) savings.getCell(2).numFmt = "0.0%";

  sheet.addRow([]);
  const count = sheet.addRow(["Transactions", rows.length]);
  count.getCell(1).font = { bold: true };

  sheet.addRow([]);
  sheet.addRow([
    "All amounts are in INR. WHealthOS stores a single currency, so no conversion is applied.",
  ]);

  return sheet;
}

// Builds the workbook and returns it as a Buffer ready to stream.
export async function transactionsWorkbook({ rows, range, generatedAt }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WHealthOS";
  workbook.created = new Date();

  // Summary first, so it is the sheet that opens.
  addSummarySheet(workbook, { rows, range, generatedAt });
  addTransactionsSheet(workbook, rows);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
