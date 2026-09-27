"use client";

import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import AppSidebar from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DemoHeader from "./demo-header";
import { useDemo } from "./demo-provider";

// The same rail as the signed-in app, pointed at /demo. Sections a guest
// cannot use are marked `soon`, which the sidebar already renders as disabled
// with a tooltip -- rather than as links to pages that would bounce them to
// sign-in.
const DEMO_NAV = [
  { title: "Dashboard", url: "/demo", icon: LayoutDashboard },
  { title: "Transactions", url: "/demo/transactions", icon: ArrowLeftRight },
  { title: "Accounts", icon: Wallet, soon: true },
  { title: "Cards", icon: CreditCard, soon: true },
  { title: "Budgets", icon: PiggyBank, soon: true },
  { title: "Goals", icon: Target, soon: true },
  { title: "Analytics", icon: BarChart3, soon: true },
  { title: "Settings", icon: Settings, soon: true },
];

const DemoShell = ({ children }) => {
  const demo = useDemo();

  return (
    <SidebarProvider>
      <AppSidebar items={DEMO_NAV} homeHref="/demo" />

      <SidebarInset>
        <DemoHeader onReset={demo.reset} addedCount={demo.addedCount} />

        <div className="app-content flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DemoShell;
