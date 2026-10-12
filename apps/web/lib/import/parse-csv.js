// CSV parsing.
//
// Hand-written rather than pulled in as a dependency, because the exporter is
// hand-written too: the two have to agree about quoting, and the surest way to
// keep them agreeing is to keep both in the repository with tests across the
// pair.
//
// RFC 4180, plus the things real files do that the RFC does not mention: a
// UTF-8 BOM from Excel, bare LF line endings from everything else, and a
// trailing newline.
//
// This runs in the browser -- the file never leaves the machine until the user
// has seen what it contains and pressed Import.

const BOM = "﻿";

// Splits the text into rows of cells. A quoted field may contain commas,
// newlines and doubled quotes; everything outside quotes is literal.
export function parseCsv(text, { delimiter = "," } = {}) {
  const input = text.startsWith(BOM) ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;

  // A field is only "quoted" if the quote opened it. A quote in the middle of
  // an unquoted field is a literal character, which is what spreadsheets do
  // and what a description like 6" pipe needs.
  while (i < input.length) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"' && field === "") {
      quoted = true;
      i += 1;
      continue;
    }

    if (char === delimiter) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (char === "\r" || char === "\n") {
      // CRLF is one break, not two.
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // The last field only ends at end-of-input, and a file ending in a newline
  // must not produce a trailing row of one empty cell.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

// Separates the header row from the body and returns objects keyed by header.
//
// Headers are matched case- and space-insensitively, because a file that has
// been through Excel and back rarely keeps their exact spelling.
export function parseCsvTable(text, options) {
  const rows = parseCsv(text, options);
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((header) => header.trim());
  const key = (header) => header.toLowerCase().replace(/[\s_-]+/g, "");

  return {
    headers,
    rows: rows.slice(1).map((cells, index) => {
      const record = {};
      headers.forEach((header, column) => {
        record[key(header)] = (cells[column] ?? "").trim();
      });
      // The line number in the file, for error messages that a person can act
      // on: +2 because the header is line 1 and rows are zero-indexed.
      record.__line = index + 2;
      return record;
    }),
  };
}
