import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { periodTotals } from "../analytics";

// PDF reporting.
//
// This is a report, not a data dump: the CSV and XLSX paths exist for machine
// readable data. The job here is a document a person can read and file.
//
// Deliberately print-first. It is always light with dark text regardless of
// the theme the application is in, because a dark PDF wastes toner and reads
// badly on paper.
//
// Nothing here claims more than the application can support. It is a report
// generated from the user's own records -- not a bank statement, not certified
// and not audited -- and the footer says exactly that.

// The brand's own colours, sampled from public/logo.png rather than invented:
// the navy of the wordmark and the blue of the chart mark.
const NAVY = "#15173D";
const BLUE = "#0D89C9";
const RULE = "#D9DCE5";
const MUTED = "#5B6071";

const PAGE = { size: "A4", margins: { top: 48, bottom: 56, left: 48, right: 48 } };

// The real wordmark, read once as a Buffer rather than handed to pdfkit as a
// path. `public/` is served by Next, not resolvable from the server bundle, and
// cwd differs between `next dev`, `next start` and a standalone build -- so the
// candidates are tried in order and the result is cached. A Buffer also means
// the file is read once per process instead of once per generated page.
const LOGO = (() => {
  const candidates = [
    path.join(process.cwd(), "public", "logo.png"),
    path.join(process.cwd(), "apps", "web", "public", "logo.png"),
  ];
  for (const candidate of candidates) {
    try {
      return fs.readFileSync(candidate);
    } catch {
      // Try the next one.
    }
  }
  // Not fatal: drawHeader falls back to the wordmark set in type.
  return null;
})();

// Amounts carry no currency symbol.
//
// pdfkit's standard fonts are WinAnsi-encoded and have no U+20B9 glyph: the
// rupee sign measures zero width in Helvetica, so printing it would both show
// nothing and corrupt the column layout that depends on measured widths.
// Rather than embed a font subset for one character, the currency is stated
// once in the column headers and the summary, where a formal statement wants
// it anyway. Grouping is Indian (1,23,456.00), matching the application.
const money = (value) => {
  const n = Number(value) || 0;
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Column layout for the transaction table. Fixed widths rather than measured,
// so a long description wraps inside its cell instead of pushing the amount
// off the page.
const COLUMNS = [
  { key: "date", label: "Date", width: 60 },
  { key: "description", label: "Description", width: 141 },
  { key: "category", label: "Category", width: 76 },
  { key: "account", label: "Account", width: 86 },
  { key: "debit", label: "Debit (INR)", width: 68, align: "right" },
  { key: "credit", label: "Credit (INR)", width: 68, align: "right" },
];

// Adds a page with pdfkit's automatic text flow disabled.
//
// Every element here is positioned at an explicit y, so the automatic flow is
// not merely unnecessary -- it is harmful. A `.text()` call that lands below
// the bottom margin makes pdfkit insert a page and continue the text on it,
// which is how drawing the footers turned a three-row report into three pages.
// Zeroing the margin after the page exists disables that; the genuine bottom
// of the content area is enforced by the row loop, which is where the decision
// belongs. The margin is zeroed per page because addPage re-reads the options.
const addPage = (doc) => {
  doc.addPage();
  doc.page.margins.bottom = 0;
  return doc;
};

const dateLabel = (value, timeZone) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value instanceof Date ? value : new Date(value));

function drawHeader(doc, { title, range, generatedAt }) {
  const top = PAGE.margins.top;
  const right = doc.page.width - PAGE.margins.right;
  let x = PAGE.margins.left;

  // logo.png already contains the wordmark, so setting "WHealthOS" beside it
  // would print the name twice. The typeset wordmark is the fallback for when
  // the asset could not be read, not a companion to it.
  let drawn = false;
  if (LOGO) {
    try {
      doc.image(LOGO, x, top - 2, { height: 24 });
      // 890x460 at 24pt tall is ~46pt wide; the gap after it is deliberate.
      x += 62;
      drawn = true;
    } catch {
      // A report that renders without its logo is still a usable report; one
      // that throws is not.
    }
  }
  if (!drawn) {
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16).text("WHealthOS", x, top);
    x += 90;
  }

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(10)
    .text(title, x, top + 7);

  doc
    .fillColor(MUTED)
    .fontSize(8.5)
    .text(`Period: ${range.from} to ${range.to}`, right - 200, top, {
      width: 200,
      align: "right",
    })
    .text(`Generated: ${generatedAt}`, right - 200, top + 12, {
      width: 200,
      align: "right",
    });

  const ruleY = top + 40;
  doc.moveTo(PAGE.margins.left, ruleY).lineTo(right, ruleY).strokeColor(BLUE).lineWidth(1.5).stroke();
  return ruleY + 18;
}

// The figures, from periodTotals -- the same function Analytics and the XLSX
// summary use. No second income/expense formula exists anywhere.
function drawSummary(doc, rows, y) {
  const totals = periodTotals(rows);
  const right = doc.page.width - PAGE.margins.right;
  const width = (right - PAGE.margins.left) / 4;

  const cells = [
    ["Income (INR)", money(totals.income)],
    ["Expenses (INR)", money(totals.expenses)],
    ["Net cash flow (INR)", money(totals.net)],
    [
      "Savings rate",
      // Unanswerable without income, and said so rather than shown as 0%.
      totals.savingsRate === null ? "Not available" : `${totals.savingsRate.toFixed(1)}%`,
    ],
  ];

  cells.forEach(([label, value], i) => {
    const x = PAGE.margins.left + i * width;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(label.toUpperCase(), x, y);
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12).text(value, x, y + 12, {
      width: width - 8,
    });
  });

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      `${rows.length} transaction${rows.length === 1 ? "" : "s"} in this period. ` +
        "All amounts in INR; WHealthOS stores a single currency, so no conversion is applied.",
      PAGE.margins.left,
      y + 36,
      { width: right - PAGE.margins.left }
    );

  return y + 56;
}

function drawTableHeader(doc, y) {
  let x = PAGE.margins.left;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(NAVY);
  for (const col of COLUMNS) {
    doc.text(col.label.toUpperCase(), x, y, { width: col.width, align: col.align ?? "left" });
    x += col.width;
  }
  const ruleY = y + 13;
  doc
    .moveTo(PAGE.margins.left, ruleY)
    .lineTo(doc.page.width - PAGE.margins.right, ruleY)
    .strokeColor(RULE)
    .lineWidth(0.75)
    .stroke();
  return ruleY + 7;
}

// The closing totals row.
//
// Summed from the same rows the table printed, so the figure at the foot of
// the statement cannot disagree with the lines above it. Debit and credit are
// totalled under their own columns, and the net is stated in words beneath --
// a reader should not have to subtract two numbers to learn whether the period
// was up or down.
function drawTotals(doc, rows, y, bottom, header) {
  const totals = periodTotals(rows);
  const needed = 46;

  // The totals belong with the table, so they move to a new page whole rather
  // than being split from the rule that introduces them.
  if (y + needed > bottom) {
    addPage(doc);
    y = drawHeader(doc, header);
    y = drawTableHeader(doc, y);
  }

  const right = doc.page.width - PAGE.margins.right;
  doc
    .moveTo(PAGE.margins.left, y)
    .lineTo(right, y)
    .strokeColor(NAVY)
    .lineWidth(0.75)
    .stroke();

  y += 7;

  let x = PAGE.margins.left;
  const cells = {
    date: "",
    description: "Total for this period",
    category: "",
    account: "",
    debit: money(totals.expenses),
    credit: money(totals.income),
  };
  for (const col of COLUMNS) {
    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(cells[col.key], x, y, { width: col.width - 6, align: col.align ?? "left" });
    x += col.width;
  }

  y += 16;
  // Signed, and named, so "net" is never ambiguous about direction.
  const net = totals.net;
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8.5)
    .text(
      `Net for this period: ${net < 0 ? "-" : ""}${money(Math.abs(net))} INR ` +
        `(${net < 0 ? "spent more than received" : "received more than spent"})`,
      PAGE.margins.left,
      y,
      { width: right - PAGE.margins.left, align: "right" }
    );

  return y + 14;
}

// Renders the statement. Returns a Buffer so the route can stream it.
export function transactionStatement({
  rows,
  range,
  generatedAt,
  timeZone,
  title = "Financial Statement",
  // Streams are flate-compressed in the delivered file. The tests turn this
  // off so they can read the page text back out of the buffer and assert on
  // what was actually drawn -- there is no PDF parser in the dependency tree,
  // and shipping one to check our own output is not worth it.
  compress = true,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...PAGE, autoFirstPage: false, bufferPages: true, compress });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    addPage(doc);
    let y = drawHeader(doc, { title, range, generatedAt });
    y = drawSummary(doc, rows, y);
    y = drawTableHeader(doc, y);

    // From the configured margin, not doc.page.margins.bottom -- addPage
    // zeroes that to switch off the automatic flow.
    const bottom = doc.page.height - PAGE.margins.bottom;

    for (const row of rows) {
      const expense = row.type === "EXPENSE";
      const cells = {
        date: dateLabel(row.date, timeZone),
        description: row.description || "—",
        category: row.category || "",
        account: row.accountName || "",
        debit: expense ? money(row.amount) : "",
        credit: expense ? "" : money(row.amount),
      };

      // Measured before drawing, so a wrapped description decides the row
      // height and nothing overlaps the row beneath it.
      doc.font("Helvetica").fontSize(8.5);
      const height = Math.max(
        ...COLUMNS.map((c) =>
          doc.heightOfString(String(cells[c.key]), { width: c.width - 6 })
        ),
        12
      );

      // Page break before drawing, never mid-row.
      if (y + height > bottom) {
        addPage(doc);
        y = drawHeader(doc, { title, range, generatedAt });
        y = drawTableHeader(doc, y);
      }

      let x = PAGE.margins.left;
      for (const col of COLUMNS) {
        doc
          .fillColor(NAVY)
          .font("Helvetica")
          .fontSize(8.5)
          .text(String(cells[col.key]), x, y, {
            width: col.width - 6,
            align: col.align ?? "left",
          });
        x += col.width;
      }
      y += height + 6;
    }

    y = drawTotals(doc, rows, y, bottom, { title, range, generatedAt });

    // Footers last, once the total page count is known. bufferPages keeps the
    // pages in memory so "Page X of Y" can be written retrospectively -- it
    // cannot be known while the first page is being drawn.
    const range_ = doc.bufferedPageRange();
    for (let i = 0; i < range_.count; i++) {
      doc.switchToPage(range_.start + i);
      const footY = doc.page.height - PAGE.margins.bottom + 16;
      doc
        .moveTo(PAGE.margins.left, footY - 8)
        .lineTo(doc.page.width - PAGE.margins.right, footY - 8)
        .strokeColor(RULE)
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(7.5)
        // Neutral wording on purpose: this is generated from the user's own
        // records. It is not a bank statement, not certified, not audited.
        .text(
          "Financial report generated by WHealthOS from your own records. Not a certified or audited statement.",
          PAGE.margins.left,
          footY,
          { width: 380 }
        )
        .text(
          `Page ${i + 1} of ${range_.count}`,
          doc.page.width - PAGE.margins.right - 120,
          footY,
          { width: 120, align: "right" }
        );
    }

    doc.end();
  });
}
