"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddTransactionForm } from "@/app/(main)/transaction/_components/transaction-form";
import { defaultCategories } from "@/data/categories";
import { useDemo } from "../../_components/demo-provider";

// The signed-in form, handed a guest submit handler instead of the server
// action. The receipt scanner inside it locks itself in this mode.
export default function DemoAddTransactionPage() {
  const router = useRouter();
  const { accounts, addTransaction } = useDemo();

  const onGuestSubmit = (data) => {
    addTransaction(data);
    toast.success("Added to your demo. It stays in this browser.");
    router.push("/demo/transactions");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-1">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Add Transaction</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        This is demo mode, so what you add is kept in this browser only and
        never leaves your device.
      </p>

      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        guest
        onGuestSubmit={onGuestSubmit}
      />
    </div>
  );
}
