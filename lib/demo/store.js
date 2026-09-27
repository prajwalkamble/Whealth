"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_ACCOUNTS, DEMO_BUDGET, demoTransactions } from "./data";
import { accountsWithTotals, dashboardFrom } from "./compute";

// Demo mode keeps everything in the browser. Nothing a guest enters reaches
// the database: there is no signed-in user to own the row, and inventing one
// would mean a second identity path alongside Clerk, with tenant isolation no
// longer resting solely on a verified session. For a finance app that trade is
// not worth making for a product tour.
export const DEMO_STORAGE_KEY = "whealth-demo-transactions";

// A guest who adds hundreds of rows is stress-testing, not evaluating; the cap
// keeps localStorage from filling up.
const MAX_GUEST_TRANSACTIONS = 200;

const read = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    // Missing, corrupt, or blocked storage: the sample data alone is fine.
    return [];
  }
};

const write = (rows) => {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Private browsing, or the quota is full. The change still applies for
    // this page; not remembering it is not worth failing over.
  }
};

const byNewest = (a, b) => new Date(b.date) - new Date(a.date);

export function useDemoData() {
  const [added, setAdded] = useState([]);

  // Storage is only readable in the browser, so the first render matches the
  // server's and the guest's own rows appear on the pass after mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setAdded(read());
    setReady(true);
  }, []);

  // Generated per mount rather than at module scope, so a tab left open across
  // midnight on the 1st still gets the right month on the next navigation.
  const sample = useMemo(() => demoTransactions(), []);

  const transactions = useMemo(
    () => [...sample, ...added].sort(byNewest),
    [sample, added]
  );

  const accounts = useMemo(
    () => accountsWithTotals(DEMO_ACCOUNTS, transactions),
    [transactions]
  );

  const addTransaction = useCallback((input) => {
    const row = {
      ...input,
      id: `guest-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: Number(input.amount),
      date: new Date(input.date).toISOString(),
      isRecurring: Boolean(input.isRecurring),
      guest: true,
    };

    setAdded((current) => {
      const next = [row, ...current].slice(0, MAX_GUEST_TRANSACTIONS);
      write(next);
      return next;
    });

    return row;
  }, []);

  const removeTransaction = useCallback((id) => {
    setAdded((current) => {
      const next = current.filter((row) => row.id !== id);
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setAdded([]);
    write([]);
  }, []);

  const dashboard = useMemo(
    () => dashboardFrom(accounts, transactions, DEMO_BUDGET),
    [accounts, transactions]
  );

  return {
    ready,
    accounts,
    transactions,
    dashboard,
    addedCount: added.length,
    addTransaction,
    removeTransaction,
    reset,
  };
}
