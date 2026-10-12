import { getTransactionsForExport } from "@/lib/queries";
import { resolveRange, isoDay, formatRange } from "@/lib/export/date-ranges";
import { safeFilename } from "@/lib/export/csv";
import { transactionsToCsv } from "@/lib/export/transactions";
import { transactionsWorkbook } from "@/lib/export/xlsx";
import { transactionStatement } from "@/lib/export/pdf";
import { requireClerkUserId } from "@/lib/session";
import { enforceRateLimit } from "@/lib/arcjet";
import { APP_TIME_ZONE } from "@/lib/time";

// Server-side generation: the rows are queried, rendered and streamed back as
// a file. Nothing sensitive is shipped to the browser to be assembled there,
// and the query is scoped to the caller by withCurrentTenant inside
// getTransactionsForExport.
//
// A route handler rather than a server action because the response is a file
// download with its own Content-Type and Content-Disposition, which an action
// cannot express.
//
// One route for all three formats rather than three routes. Everything before
// the render -- authentication, rate limiting, range resolution, the tenant
// scoped query, the empty-result refusal -- is identical, and three copies of
// that is three places for a security fix to be applied to two of them.

// pdfkit resolves its font metrics from the filesystem and exceljs is CommonJS,
// so this route needs the Node runtime rather than edge.
export const runtime = "nodejs";

const FORMATS = {
  csv: {
    extension: "csv",
    contentType: "text/csv; charset=utf-8",
    render: ({ rows }) => transactionsToCsv(rows),
  },
  xlsx: {
    extension: "xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    render: ({ rows, range, generatedAt }) =>
      transactionsWorkbook({ rows, range: formatRange(range), generatedAt }),
  },
  pdf: {
    extension: "pdf",
    contentType: "application/pdf",
    render: ({ rows, range, generatedAt }) =>
      transactionStatement({
        rows,
        range: formatRange(range),
        generatedAt,
        timeZone: APP_TIME_ZONE,
      }),
  },
};

// The moment the file was produced, in the app timezone, for the header of the
// report. Not the range -- a reader needs to know how current the document is.
const stamp = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

export async function GET(request) {
  let clerkUserId;
  try {
    clerkUserId = await requireClerkUserId();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Exports are heavier than an ordinary read, so they go through the same
  // limiter the write paths use.
  try {
    await enforceRateLimit("write", clerkUserId);
  } catch {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;

  const format = FORMATS[(params.get("format") ?? "csv").toLowerCase()];
  if (!format) {
    return Response.json({ error: "Unsupported export format" }, { status: 400 });
  }

  let range;
  try {
    range = resolveRange(params.get("range") ?? "this-month", {
      from: params.get("from"),
      to: params.get("to"),
    });
  } catch (error) {
    // resolveRange throws only on input the user chose, so its message is safe
    // to show. Nothing internal is surfaced.
    return Response.json({ error: error.message }, { status: 400 });
  }

  try {
    const { rows, total, truncated } = await getTransactionsForExport({
      from: range.from,
      to: range.to,
      accountId: params.get("account") || null,
      type: params.get("type") || null,
      category: params.get("category") || null,
    });

    // An empty file that looks like a successful export is worse than a clear
    // refusal: the user would file it believing it was their record.
    if (total === 0) {
      return Response.json(
        { error: "No transactions found for this period." },
        { status: 404 }
      );
    }

    const filename = safeFilename(
      ["WHealthOS", "Transactions", isoDay(range.from), "to", isoDay(range.to)],
      format.extension
    );

    const body = await format.render({ rows, range, generatedAt: stamp() });

    return new Response(body, {
      headers: {
        "Content-Type": format.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Financial data: never cached by a proxy or the browser.
        "Cache-Control": "no-store, private",
        // Tells the caller when a ceiling was hit, so a truncated export is
        // never mistaken for a complete record.
        "X-Export-Rows": String(rows.length),
        "X-Export-Total": String(total),
        "X-Export-Truncated": String(truncated),
      },
    });
  } catch (error) {
    console.error("Transaction export failed:", error);
    return Response.json({ error: "Could not generate the export." }, { status: 500 });
  }
}
