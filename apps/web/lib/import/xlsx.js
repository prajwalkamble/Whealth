import ExcelJS from "exceljs";

// XLSX parsing.
//
// Server-side only. exceljs is around a megabyte, and shipping it to every
// visitor so that a few of them can import a spreadsheet is not a trade worth
// making -- the file is posted to the action, parsed there, and only the
// resulting preview comes back.
//
// The output is deliberately the same shape parseCsvTable returns, so
// everything downstream -- detection, mapping, validation, duplicates -- has
// one code path regardless of which format the file arrived in.

// A cell's text. exceljs returns rich text, formulas, hyperlinks and errors as
// objects rather than strings, and each needs unwrapping to the value a person
// sees in the cell.
//
// A formula cell contributes its CACHED RESULT, never its formula. Nothing
// here evaluates anything from the file: a spreadsheet is data, and executing
// what it contains is how a malicious workbook would get a foothold.
function cellText(cell) {
  const value = cell?.value;
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    // Dates come back as JS Dates. ISO, so parseDate reads them unambiguously
    // rather than through a locale.
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    // { formula, result } -- the cached result only.
    if ("result" in value) {
      const result = value.result;
      if (result instanceof Date) return result.toISOString().slice(0, 10);
      // { error: '#REF!' } as a result is not a value.
      if (result && typeof result === "object") return "";
      return result === null || result === undefined ? "" : String(result);
    }
    // { richText: [{ text }] }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
    // { text, hyperlink }
    if ("text" in value) return String(value.text ?? "");
    // { error: '#DIV/0!' }
    if ("error" in value) return "";
    return "";
  }

  return String(value);
}

const rowTexts = (row) => {
  const cells = [];
  // Not row.values: it is 1-based, sparse, and drops trailing empties, so the
  // columns stop lining up with the header as soon as a cell is blank.
  const width = row.worksheet.columnCount;
  for (let i = 1; i <= width; i += 1) cells.push(cellText(row.getCell(i)).trim());
  return cells;
};

// Scores a worksheet on how much it looks like a transaction table, so a
// workbook whose first sheet is a cover page or a chart does not import zero
// rows while the real data sits on sheet two.
const HEADER_WORDS = [
  "date", "description", "narration", "particulars", "details", "memo",
  "amount", "value", "debit", "credit", "withdrawal", "deposit",
  "type", "category", "account", "currency", "balance", "reference",
];

function findHeaderRow(sheet) {
  let best = null;
  // Only the top of the sheet: a header further down than this is a layout
  // nobody writes, and scanning the whole sheet would match a stray word.
  const limit = Math.min(sheet.rowCount, 25);

  for (let number = 1; number <= limit; number += 1) {
    const cells = rowTexts(sheet.getRow(number));
    const filled = cells.filter(Boolean);
    if (filled.length < 2) continue;

    const hits = filled.filter((cell) =>
      HEADER_WORDS.includes(cell.toLowerCase().replace(/[\s_-]+/g, ""))
    ).length;
    if (hits === 0) continue;

    if (!best || hits > best.hits) best = { number, cells, hits };
  }

  return best;
}

// Parses a workbook into { headers, rows } -- the shape parseCsvTable returns.
export async function parseXlsxTable(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { headers: [], rows: [], error: "That file is not a readable spreadsheet." };
  }

  const sheets = workbook.worksheets.filter((sheet) => sheet.rowCount > 0);
  if (sheets.length === 0) {
    return { headers: [], rows: [], error: "That workbook has no sheets with any content." };
  }

  // The sheet whose header row matches the most known column names, with the
  // first usable sheet as the tie-break so a single-sheet file is unaffected.
  let chosen = null;
  for (const sheet of sheets) {
    const header = findHeaderRow(sheet);
    if (!header) continue;
    if (!chosen || header.hits > chosen.header.hits) chosen = { sheet, header };
  }

  if (!chosen) {
    return {
      headers: [],
      rows: [],
      error:
        "No sheet in that workbook has a recognisable header row. It needs at least a Date column and an Amount (or Debit and Credit) column.",
    };
  }

  const { sheet, header } = chosen;
  const headers = header.cells.map((cell) => cell.trim());
  const key = (text) => text.toLowerCase().replace(/[\s_-]+/g, "");

  const rows = [];
  for (let number = header.number + 1; number <= sheet.rowCount; number += 1) {
    const cells = rowTexts(sheet.getRow(number));
    if (!cells.some((cell) => cell !== "")) continue;

    const record = {};
    headers.forEach((name, column) => {
      if (name) record[key(name)] = cells[column] ?? "";
    });
    // The row number in the sheet, so an error names the line the user sees.
    record.__line = number;
    rows.push(record);
  }

  return { headers, rows, sheetName: sheet.name, error: null };
}
