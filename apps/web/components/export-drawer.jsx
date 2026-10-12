"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader, Table2, Upload } from "lucide-react";
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
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RANGE_PRESETS } from "@/lib/export/date-ranges";

// The export control.
//
// The preset list comes from lib/export/date-ranges rather than being written
// out again here: the server validates against those same keys, so a list
// typed separately in the UI would offer ranges the route rejects as soon as
// either side changed.

const FORMATS = [
  {
    key: "csv",
    label: "CSV",
    icon: Table2,
    hint: "Opens anywhere. Best for importing into another tool.",
  },
  {
    key: "xlsx",
    label: "Excel",
    icon: FileSpreadsheet,
    hint: "Typed amounts and dates, with a summary sheet.",
  },
  {
    key: "pdf",
    label: "PDF",
    icon: FileText,
    hint: "A formatted statement to read, print or file.",
  },
];

// Pulls the filename the server chose out of Content-Disposition. The server
// builds it through safeFilename, so trusting it here is not the same as
// trusting arbitrary input -- but it is still quoted and sanitised rather than
// used raw, and there is a fallback for a proxy that strips the header.
const filenameFrom = (header, fallback) => {
  const match = /filename="([^"]+)"/.exec(header ?? "");
  const name = match?.[1]?.replace(/[/\\]/g, "");
  return name || fallback;
};

// yyyy-mm-dd for the native date inputs.
const today = () => new Date().toISOString().slice(0, 10);

// accountId narrows the export to one account, for the account detail page.
// title names what is being exported, so the drawer does not say "all your
// transactions" when it means one account's.
export function ExportDrawer({
  children,
  defaultRange = "this-month",
  accountId = null,
  scopeLabel = null,
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(defaultRange);
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState(false);

  const custom = range === "custom";
  const chosen = FORMATS.find((f) => f.key === format);

  const download = async () => {
    if (custom && (!from || !to)) {
      toast.error("Choose both a start and an end date.");
      return;
    }
    if (custom && from > to) {
      toast.error("The start date is after the end date.");
      return;
    }

    setBusy(true);
    try {
      const params = new URLSearchParams({ format, range });
      if (accountId) params.set("account", accountId);
      if (custom) {
        params.set("from", from);
        params.set("to", to);
      }

      // fetch rather than navigating to the URL: a failure here is a JSON
      // body, and navigating would replace the page the user is on with it.
      const response = await fetch(`/api/export/transactions?${params}`);

      if (!response.ok) {
        // The route's own messages are written for the user; anything else
        // (an HTML error page, a redirect to sign-in) is not, so it is not
        // shown.
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Could not generate the export.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFrom(
        response.headers.get("Content-Disposition"),
        `WHealthOS_Transactions.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoked on the next tick: Safari has not finished reading the blob
      // when click() returns.
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // A ceiling was hit, so the file is not the complete record. Saying so
      // is the whole point of the header -- a truncated export filed as a
      // full one is a quietly wrong financial record.
      if (response.headers.get("X-Export-Truncated") === "true") {
        toast.warning(
          `Exported the first ${response.headers.get("X-Export-Rows")} of ` +
            `${response.headers.get("X-Export-Total")} transactions. ` +
            "Narrow the date range to export the rest."
        );
      } else {
        toast.success(`Exported ${response.headers.get("X-Export-Rows")} transactions.`);
      }

      setOpen(false);
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Export transactions</DrawerTitle>
            <DrawerDescription>
              {scopeLabel
                ? `${scopeLabel}, for the period you choose. Amounts are in INR.`
                : "Your own records, for the period you choose. Amounts are in INR."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-5 px-4 pb-6">
            <div className="space-y-2">
              <label htmlFor="export-range" className="text-sm font-medium">
                Period
              </label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger id="export-range" className="w-full">
                  <SelectValue placeholder="Choose a period" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RANGE_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {custom && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="export-from" className="text-sm font-medium">
                    From
                  </label>
                  <Input
                    id="export-from"
                    type="date"
                    max={to || today()}
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="export-to" className="text-sm font-medium">
                    To
                  </label>
                  <Input
                    id="export-to"
                    type="date"
                    min={from || undefined}
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </div>
              </div>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Format</legend>
              {/* Three buttons rather than a second dropdown: the choice is
                  short, and seeing all of it at once is what makes the hint
                  below useful. */}
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {FORMATS.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={format === key}
                    variant={format === key ? "default" : "outline"}
                    className="h-auto flex-col gap-1.5 py-3"
                    onClick={() => setFormat(key)}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{chosen.hint}</p>
            </fieldset>

            <div className="flex gap-3 pt-1">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                type="button"
                className="flex-1"
                onClick={download}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Preparing
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// The standard trigger, so every page's export button looks and reads the same.
export function ExportButton({ className, label = "Export", ...props }) {
  return (
    <ExportDrawer {...props}>
      <Button size="sm" variant="outline" className={className ?? "h-9"}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>
    </ExportDrawer>
  );
}
