"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Loader,
} from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { analyzeImport, importTransactions } from "@/actions/import";
import { MAPPABLE_FIELDS } from "@/lib/import/transactions";
import { formatCurrency } from "@/lib/format";
import { dateCell } from "@/lib/export/csv";
import { APP_TIME_ZONE } from "@/lib/time";

// The import flow.
//
//   pick a file -> the server parses, maps, validates and checks for
//   duplicates -> the user reviews and can correct the column mapping ->
//   explicit confirmation -> the rows are written -> a result.
//
// Nothing is written before the Import button. The file is parsed on the
// server because XLSX needs exceljs, which is a megabyte that should not be
// shipped to every visitor, and because duplicate detection needs the
// database. The preview and the write run the same pipeline over the same
// bytes, so what is shown is what happens.

const TEMPLATE = [
  "Date,Description,Type,Category,Amount",
  "2026-09-01,Salary for September,INCOME,salary,85000.00",
  "2026-09-02,Groceries at the market,EXPENSE,groceries,2450.50",
  "2026-09-03,Electricity bill,EXPENSE,utilities,1890.00",
].join("\r\n");

const PREVIEW_ROWS = 10;
const UNMAPPED = "__none";

// base64 without blowing the stack on a large file: String.fromCharCode
// applied to a whole megabyte-long array throws.
const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
};

const Stat = ({ icon: Icon, tone, children }) => (
  <span className={`inline-flex items-center gap-1.5 ${tone}`}>
    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
    {children}
  </span>
);

export function ImportDrawer({ children, accounts = [], defaultAccountId = null }) {
  const router = useRouter();
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | reading | preview | importing | done
  const [file, setFile] = useState(null);
  const [accountId, setAccountId] = useState(
    defaultAccountId ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? ""
  );
  const [mapping, setMapping] = useState({});
  const [accountMap, setAccountMap] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [includePossible, setIncludePossible] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const reset = () => {
    setStage("idle");
    setFile(null);
    setMapping({});
    setAccountMap({});
    setAnalysis(null);
    setIncludePossible(false);
    setResult(null);
    setFailure(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyse = async (
    next,
    nextMapping = mapping,
    nextAccountId = accountId,
    nextAccountMap = accountMap
  ) => {
    setStage("reading");
    setFailure(null);
    try {
      const response = await analyzeImport({
        fileName: next.name,
        data: next.data,
        accountId: nextAccountId || null,
        mapping: nextMapping,
        accountMap: nextAccountMap,
      });
      if (!response?.success) {
        setFailure(response?.error ?? "That file could not be read.");
        setAnalysis(null);
        setStage("preview");
        return;
      }
      setAnalysis(response.data);
      if (!nextAccountId) setAccountId(response.data.destinationId);
      setStage("preview");
    } catch {
      setFailure("Could not reach the server. Please try again.");
      setStage("preview");
    }
  };

  const onPick = async (event) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    if (!/\.(csv|xlsx)$/i.test(picked.name)) {
      toast.error("Only CSV and XLSX files can be imported.");
      reset();
      return;
    }
    if (picked.size > 2_000_000) {
      toast.error("That file is larger than 2 MB.");
      reset();
      return;
    }

    try {
      const data = toBase64(await picked.arrayBuffer());
      const next = { name: picked.name, data };
      setFile(next);
      setMapping({});
      setAccountMap({});
      await analyse(next, {}, accountId, {});
    } catch {
      toast.error("That file could not be read.");
      reset();
    }
  };

  const remap = (field, header) => {
    const next = { ...mapping, [field]: header === UNMAPPED ? "" : header };
    setMapping(next);
    if (file) analyse(file, next);
  };

  const changeAccount = (next) => {
    setAccountId(next);
    if (file) analyse(file, mapping, next);
  };

  const remapAccountName = (name, id) => {
    const next = { ...accountMap, [name]: id };
    setAccountMap(next);
    if (file) analyse(file, mapping, accountId, next);
  };

  const confirm = async () => {
    if (!file || !analysis) return;
    setStage("importing");
    try {
      const response = await importTransactions({
        fileName: file.name,
        data: file.data,
        accountId,
        mapping,
        accountMap,
        includePossibleDuplicates: includePossible,
      });
      if (!response?.success) {
        setFailure(response?.error ?? "Could not import that file.");
        setStage("preview");
        return;
      }
      setResult(response.data);
      setStage("done");
      // The pages are revalidated server-side; this makes the open tab pick
      // the new figures up without a reload.
      router.refresh();
    } catch {
      setFailure("Could not reach the server. Please try again.");
      setStage("preview");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([`﻿${TEMPLATE}\r\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "WHealthOS_Import_Template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const counts = analysis?.counts;
  const willImport = counts ? counts.ready + (includePossible ? counts.possible : 0) : 0;
  const previewRows = analysis
    ? [...analysis.fresh, ...(includePossible ? analysis.possible : [])]
    : [];

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex max-h-[88vh] w-full max-w-3xl flex-col">
          <DrawerHeader>
            <DrawerTitle>
              {stage === "done" ? "Import complete" : "Import transactions"}
            </DrawerTitle>
            <DrawerDescription>
              {stage === "done"
                ? "These are now ordinary WHealthOS transactions."
                : "A CSV or XLSX file. Nothing is added until you have reviewed it and pressed Import."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
            {accounts.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Create an account first — an imported transaction has to belong
                to one.
              </p>
            )}

            {stage === "done" && result ? (
              <ImportResult result={result} onClose={() => setOpen(false)} />
            ) : (
              accounts.length > 0 && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="import-account" className="text-sm font-medium">
                      Import into
                    </label>
                    <Select value={accountId} onValueChange={changeAccount}>
                      <SelectTrigger id="import-account" className="w-full">
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Rows naming an account you already have go there instead.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="import-file" className="text-sm font-medium">
                      File
                    </label>
                    <input
                      ref={inputRef}
                      id="import-file"
                      type="file"
                      accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={onPick}
                      className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
                    />
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download a template
                    </button>
                  </div>

                  {stage === "reading" && (
                    <p
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Reading the file, checking every row and looking for
                      duplicates…
                    </p>
                  )}

                  {failure && (
                    <p
                      className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {failure}
                    </p>
                  )}

                  {analysis && stage !== "reading" && (
                    <>
                      <div
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                        role="status"
                        aria-live="polite"
                      >
                        <Stat icon={Check} tone="font-medium text-emerald-600 dark:text-emerald-400">
                          {counts.ready} ready
                        </Stat>
                        {counts.possible > 0 && (
                          <Stat icon={CircleAlert} tone="text-amber-600 dark:text-amber-400">
                            {counts.possible} possible duplicate
                            {counts.possible === 1 ? "" : "s"}
                          </Stat>
                        )}
                        {counts.confirmed > 0 && (
                          <Stat icon={Check} tone="text-muted-foreground">
                            {counts.confirmed} already imported
                          </Stat>
                        )}
                        {counts.invalid > 0 && (
                          <Stat icon={AlertTriangle} tone="text-red-600 dark:text-red-400">
                            {counts.invalid} need attention
                          </Stat>
                        )}
                        <Stat icon={FileSpreadsheet} tone="text-muted-foreground">
                          {file?.name}
                          {analysis.sheetName ? ` · ${analysis.sheetName}` : ""}
                        </Stat>
                      </div>

                      {analysis.truncated && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          This file has {counts.total} rows. Only the first{" "}
                          {analysis.limit} are read — split the file to import
                          the rest.
                        </p>
                      )}

                      <ColumnMapping
                        headers={analysis.headers}
                        columns={analysis.columns}
                        onChange={remap}
                      />

                      {analysis.accountNames?.length > 0 && (
                        <AccountMapping
                          names={analysis.accountNames}
                          accounts={analysis.accounts}
                          onChange={remapAccountName}
                        />
                      )}

                      {counts.possible > 0 && (
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                          <Checkbox
                            checked={includePossible}
                            onCheckedChange={(v) => setIncludePossible(v === true)}
                            aria-describedby="possible-help"
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">
                              Import the {counts.possible} possible duplicate
                              {counts.possible === 1 ? "" : "s"} as well
                            </span>
                            <span id="possible-help" className="block text-muted-foreground">
                              Each matches the date, amount, description and
                              account of a transaction you already have. That
                              can mean a genuine repeat — two identical fares in
                              one day — so nothing is dropped without your say.
                            </span>
                          </span>
                        </label>
                      )}

                      {previewRows.length > 0 && (
                        <PreviewTable
                          rows={previewRows}
                          accounts={analysis.accounts}
                          total={willImport}
                        />
                      )}

                      {analysis.invalid.length > 0 && (
                        <details className="rounded-lg border p-3 text-sm">
                          <summary className="cursor-pointer font-medium">
                            {analysis.invalid.length} row
                            {analysis.invalid.length === 1 ? "" : "s"} will be
                            skipped
                          </summary>
                          <ul className="mt-2 space-y-1 text-muted-foreground">
                            {analysis.invalid.slice(0, 25).map((row) => (
                              <li key={row.line}>
                                <span className="font-medium text-foreground">
                                  Line {row.line}:
                                </span>{" "}
                                {row.errors.join("; ")}
                              </li>
                            ))}
                            {analysis.invalid.length > 25 && (
                              <li>and {analysis.invalid.length - 25} more</li>
                            )}
                          </ul>
                        </details>
                      )}

                      {willImport === 0 && (
                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          Nothing in this file is ready to import. Fix the rows
                          above, or correct the column mapping, and try again.
                        </p>
                      )}
                    </>
                  )}
                </>
              )
            )}
          </div>

          {stage !== "done" && (
            <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="sm:flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                type="button"
                className="sm:flex-1"
                onClick={confirm}
                disabled={stage !== "preview" || willImport === 0}
              >
                {stage === "importing" ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Importing
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Import {willImport > 0 ? willImport : ""} transaction
                    {willImport === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// What each WHealthOS field is reading, and the chance to correct it. Shown
// after detection rather than before, because detection is right for the app's
// own exports and for most bank files -- making everyone map columns by hand
// first would be a worse default.
function ColumnMapping({ headers, columns, onChange }) {
  const normalise = (header) => header.toLowerCase().replace(/[\s_-]+/g, "");
  const options = headers.filter(Boolean);

  return (
    <details className="rounded-lg border p-3 text-sm" open={!columns.date}>
      <summary className="cursor-pointer font-medium">Column mapping</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {MAPPABLE_FIELDS.map(({ field, label, required, note }) => {
          const current =
            options.find((header) => normalise(header) === columns[field]) ?? UNMAPPED;
          return (
            <div key={field} className="space-y-1.5">
              <label htmlFor={`map-${field}`} className="text-sm font-medium">
                {label}
                {required && <span className="text-red-600 dark:text-red-400"> *</span>}
                {note && (
                  <span className="font-normal text-muted-foreground"> — {note}</span>
                )}
              </label>
              <Select value={current} onValueChange={(v) => onChange(field, v)}>
                <SelectTrigger id={`map-${field}`} className="w-full">
                  <SelectValue placeholder="Not used" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNMAPPED}>Not used</SelectItem>
                  {options.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </details>
  );
}

// Where each account name in the file is going.
//
// Shown whenever the file names an account, so a name that matched nothing is
// visible rather than quietly folded into the destination. Only accounts the
// user owns are offered, and the server checks the choice again.
function AccountMapping({ names, accounts, onChange }) {
  const unmatched = names.filter((entry) => !entry.matched).length;

  return (
    <details className="rounded-lg border p-3 text-sm" open={unmatched > 0}>
      <summary className="cursor-pointer font-medium">
        Accounts in this file
        {unmatched > 0 && (
          <span className="font-normal text-muted-foreground">
            {" "}
            — {unmatched} not recognised
          </span>
        )}
      </summary>
      <div className="mt-3 space-y-3">
        {names.map((entry) => (
          <div
            key={entry.name}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{entry.name}</span>
              <span className="text-xs text-muted-foreground">
                {entry.rows} row{entry.rows === 1 ? "" : "s"}
                {entry.matched ? " · matched" : " · no account of this name"}
              </span>
            </span>
            <label className="sr-only" htmlFor={`acct-${entry.name}`}>
              Account for {entry.name}
            </label>
            <Select
              value={entry.accountId}
              onValueChange={(id) => onChange(entry.name, id)}
            >
              <SelectTrigger id={`acct-${entry.name}`} className="sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </details>
  );
}

function PreviewTable({ rows, accounts, total }) {
  const nameOf = (id) => accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        About to import {total} transaction{total === 1 ? "" : "s"}
      </p>
      {/* Scrolls on a narrow screen rather than pushing the drawer sideways. */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">
            The transactions that will be created, showing the first{" "}
            {Math.min(rows.length, PREVIEW_ROWS)} of {rows.length}.
          </caption>
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Date</th>
              <th scope="col" className="px-3 py-2 font-medium">Description</th>
              <th scope="col" className="px-3 py-2 font-medium">Category</th>
              <th scope="col" className="px-3 py-2 font-medium">Account</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, PREVIEW_ROWS).map((row) => (
              <tr key={`${row.line}-${row.date}`} className="border-t">
                <td className="whitespace-nowrap px-3 py-2">
                  {dateCell(new Date(row.date), APP_TIME_ZONE)}
                </td>
                <td className="max-w-[14rem] truncate px-3 py-2">
                  {row.description ?? "—"}
                </td>
                <td className="px-3 py-2 capitalize">
                  {row.category.replace(/-/g, " ")}
                  {row.categoryFellBack && (
                    <span className="block text-xs text-muted-foreground">
                      not in the file
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{nameOf(row.accountId)}</td>
                <td
                  className={
                    row.type === "EXPENSE"
                      ? "whitespace-nowrap px-3 py-2 text-right text-red-600 dark:text-red-400"
                      : "whitespace-nowrap px-3 py-2 text-right text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {row.type === "EXPENSE" ? "−" : "+"}
                  {formatCurrency(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_ROWS && (
        <p className="text-xs text-muted-foreground">
          and {rows.length - PREVIEW_ROWS} more
        </p>
      )}
    </div>
  );
}

function ImportResult({ result, onClose }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-2xl font-semibold">
        {result.imported} transaction{result.imported === 1 ? "" : "s"} imported
      </p>

      <ul className="space-y-1 text-sm text-muted-foreground">
        {result.skippedConfirmed > 0 && (
          <li>
            {result.skippedConfirmed} already in WHealthOS — skipped, so nothing
            was counted twice.
          </li>
        )}
        {result.skippedPossible > 0 && (
          <li>
            {result.skippedPossible} possible duplicate
            {result.skippedPossible === 1 ? "" : "s"} skipped.
          </li>
        )}
        {result.invalid > 0 && (
          <li>
            {result.invalid} row{result.invalid === 1 ? "" : "s"} could not be
            read and {result.invalid === 1 ? "was" : "were"} not imported.
          </li>
        )}
        <li>
          {result.accounts === 1
            ? "Balances updated for one account."
            : `Balances updated across ${result.accounts} accounts.`}
        </li>
      </ul>

      <p className="text-sm text-muted-foreground">
        These are ordinary transactions now, counted on their own dates — a row
        from March affects March, not this month.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="sm:flex-1" onClick={onClose}>
          <Link href="/transactions">
            View transactions
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="sm:flex-1" onClick={onClose}>
          <Link href="/analytics">View analytics</Link>
        </Button>
      </div>
    </div>
  );
}

// The standard trigger, matching ExportButton: an inward arrow against its
// outward one.
export function ImportButton({ className, label = "Import", ...props }) {
  return (
    <ImportDrawer {...props}>
      <Button size="sm" variant="outline" className={className ?? "h-9"}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    </ImportDrawer>
  );
}
