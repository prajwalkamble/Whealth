// CSV generation.
//
// Two jobs, and the second is a security control rather than a formatting one.
//
// 1. RFC 4180 quoting, so a description containing a comma, a quote or a
//    newline survives a round trip through Excel, Sheets and LibreOffice.
//
// 2. Formula-injection defence. A spreadsheet treats a cell beginning =, +, -
//    or @ as a formula, so a description a user (or an imported file) can
//    control is a way to run something in whoever opens the export. The
//    defence must not corrupt legitimate values: -2499.00 is a number, not an
//    attack, which is why text and numbers are handled separately rather than
//    blanket-prefixing every cell.

// The characters a spreadsheet may treat as the start of a formula. Tab and
// carriage return are included because Excel strips leading whitespace before
// deciding, so "\t=cmd" is still a formula to it.
const FORMULA_START = /^[=+\-@\t\r]/;

// Neutralises a text cell without changing what it says.
//
// A leading apostrophe makes a spreadsheet treat the rest as literal text. It
// is applied only to strings, so numeric columns keep their sign and remain
// numeric. A legitimate description beginning with a dash reads identically on
// screen; only the formula interpretation is removed.
export function escapeFormula(value) {
  if (typeof value !== "string") return value;
  return FORMULA_START.test(value) ? `'${value}` : value;
}

// RFC 4180: quote when the value contains a delimiter, a quote or a newline,
// and double any quote inside.
function quote(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// One cell, defended then quoted. Null and undefined become empty rather than
// the strings "null" and "undefined", which would otherwise be imported back
// as real values.
function cell(value) {
  if (value === null || value === undefined) return "";
  return quote(escapeFormula(value));
}

// Builds a CSV document.
//
// `columns` is [{ key, header }], which keeps the column order deterministic:
// an export that reorders itself between runs cannot be diffed, and an import
// template has to match what the exporter produces.
//
// CRLF line endings, per RFC 4180 and because Excel on Windows needs them.
// A UTF-8 BOM is prepended so Excel reads accented and Devanagari text as
// UTF-8 rather than as the local codepage -- without it ₹ and नमस्ते arrive
// mangled, which is the single most common complaint about CSV exports.
export function toCsv(rows, columns, { bom = true } = {}) {
  const header = columns.map((c) => cell(c.header ?? c.key)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => cell(typeof c.value === "function" ? c.value(row) : row[c.key])).join(",")
  );
  const text = [header, ...body].join("\r\n") + "\r\n";
  return bom ? `﻿${text}` : text;
}

// Amounts are written as plain decimal strings, not as "₹2,499.00".
//
// A formatted currency string is not a number to any spreadsheet, so it cannot
// be summed, sorted or charted -- which defeats the point of exporting data.
// The currency belongs in its own column or in the report header.
export const amountCell = (value) => {
  // Checked before converting: Number(null) and Number("") are both 0, so a
  // missing amount would otherwise export as "0.00" -- indistinguishable from
  // a real zero-value transaction, which is exactly the kind of invented
  // figure a financial export must never produce.
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
};

// Dates as ISO-8601 civil dates, which every spreadsheet parses unambiguously
// and which sort correctly as text. The app timezone is applied first so the
// date matches what the user sees in the application.
export const dateCell = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
};

// A filename that is safe to put in a Content-Disposition header and on any
// filesystem: no path separators, no traversal, no control characters.
export function safeFilename(parts, extension) {
  const cleaned = parts
    .filter(Boolean)
    .map((part) =>
      String(part)
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
    )
    .filter(Boolean)
    .join("_")
    .slice(0, 150);
  return `${cleaned || "WHealthOS_Export"}.${extension}`;
}
