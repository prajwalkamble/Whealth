"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { searchEverything } from "@/actions/search";
import { defaultCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const LABELS = Object.fromEntries(
  defaultCategories.map((category) => [category.id, category.name])
);

// Long enough that a fast typist sends one request rather than six, short
// enough that results feel immediate.
const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

const GlobalSearch = ({ className }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const boxRef = useRef(null);
  // Guards against an earlier, slower request overwriting a later one's
  // results -- the classic out-of-order autocomplete bug.
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      const response = await searchEverything(term);
      if (ticket !== latest.current) return;

      setResults(response?.success ? response.data : { accounts: [], transactions: [] });
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on a click outside or Escape, the way any dropdown should.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const go = (href) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results && (results.accounts.length > 0 || results.transactions.length > 0);
  const showPanel = open && query.trim().length >= MIN_QUERY;

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search transactions, accounts, cards..."
          aria-label="Search"
          className="h-9 w-full rounded-lg border bg-muted/50 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[26rem] overflow-y-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg">
          {!results && loading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          )}

          {results && !hasResults && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing matches &ldquo;{query.trim()}&rdquo;.
            </p>
          )}

          {results?.accounts.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Accounts
              </p>
              {results.accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => go(`/account/${account.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="truncate capitalize">{account.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCurrency(account.balance)}
                  </span>
                </button>
              ))}
            </>
          )}

          {results?.transactions.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transactions
              </p>
              {results.transactions.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => go(`/transaction/create?edit=${transaction.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {transaction.description ||
                        LABELS[transaction.category] ||
                        transaction.category}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {LABELS[transaction.category] ?? transaction.category}
                      {transaction.account?.name
                        ? ` · ${transaction.account.name}`
                        : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      transaction.type === "INCOME"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {transaction.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
