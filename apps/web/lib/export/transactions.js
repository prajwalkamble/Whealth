import { amountCell, dateCell, toCsv } from "./csv";
import { APP_TIME_ZONE } from "../time";

// The transaction export schema.
//
// Every column is a real column on the Transaction model -- verified against
// prisma/schema.prisma, not assumed. Fields the brief suggested that do NOT
// exist are absent rather than invented: there is no notes, merchant,
// referenceId, cardId, exchangeRate, baseAmount or baseCurrency.
//
// Currency is a single fixed column because the schema has no currency field
// at all. It documents what the amounts are in rather than implying a
// per-transaction choice the application does not offer.
export const TRANSACTION_COLUMNS = [
  { key: "date", header: "Date", value: (r) => dateCell(r.date, APP_TIME_ZONE) },
  { key: "description", header: "Description" },
  { key: "type", header: "Type" },
  { key: "category", header: "Category" },
  { key: "accountName", header: "Account" },
  { key: "amount", header: "Amount", value: (r) => amountCell(r.amount) },
  { key: "currency", header: "Currency", value: () => "INR" },
  { key: "status", header: "Status" },
  { key: "isRecurring", header: "Recurring", value: (r) => (r.isRecurring ? "Yes" : "No") },
  { key: "id", header: "Transaction ID" },
];

export const transactionsToCsv = (rows) => toCsv(rows, TRANSACTION_COLUMNS);
