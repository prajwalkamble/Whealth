"use client";

import { createContext, useContext } from "react";
import { useDemoData } from "@/lib/demo/store";

// One demo state for the whole shell.
//
// Each page could call useDemoData() itself -- the sample data is
// deterministic and the guest's own rows come from localStorage, so two
// instances would start out identical -- but they would immediately drift:
// adding a transaction on one page would not reach the header's counter or
// the other pages' state until a reload. Context keeps a single source.
const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const demo = useDemoData();
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) {
    throw new Error("useDemo must be used inside the demo shell");
  }
  return value;
}
