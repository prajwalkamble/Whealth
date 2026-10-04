"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/format";
import { deleteCard, setCardStatus } from "@/actions/cards";
import CardForm from "./card-form";
import CardTile from "./card-tile";

const CardsClient = ({ cards, accounts }) => {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [, startTransition] = useTransition();

  const { active, archived, creditLimit } = useMemo(() => {
    const active = cards.filter((c) => c.status === "ACTIVE");
    return {
      active,
      archived: cards.filter((c) => c.status === "ARCHIVED"),
      // Only credit cards carry a limit, and only active ones are current.
      creditLimit: active.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0),
    };
  }, [cards]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setFormOpen(true);
  };

  const toggleArchive = (card) => {
    startTransition(async () => {
      const next = card.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
      const result = await setCardStatus(card.id, next);
      if (result?.success) {
        toast.success(next === "ARCHIVED" ? "Card archived" : "Card restored");
        router.refresh();
        return;
      }
      toast.error(result?.error ?? "Could not update the card");
    });
  };

  const confirmDelete = () => {
    const card = confirming;
    setConfirming(null);
    startTransition(async () => {
      const result = await deleteCard(card.id);
      if (result?.success) {
        toast.success("Card deleted");
        router.refresh();
        return;
      }
      toast.error(result?.error ?? "Could not delete the card");
    });
  };

  const summary =
    cards.length === 0
      ? "No cards yet."
      : `${active.length} active card${active.length === 1 ? "" : "s"}` +
        (creditLimit > 0 ? `, ${formatCurrency(creditLimit)} of credit limit.` : ".");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cards</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Card
        </Button>
      </div>

      {cards.length === 0 ? (
        // Says what the page is for and what to do, rather than "No data".
        <div className="rounded-xl border border-dashed p-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CreditCard aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">No cards yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add the cards you use so you can keep track of their limits, billing
            dates and which account each one is paid from. WHealthOS stores
            reference details only &mdash; never a full card number, a CVV or a
            PIN.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add your first card
          </Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((card) => (
              <li key={card.id}>
                <CardTile
                  card={card}
                  onEdit={openEdit}
                  onArchive={toggleArchive}
                  onDelete={setConfirming}
                />
              </li>
            ))}
          </ul>

          {archived.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Archived
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {archived.map((card) => (
                  <li key={card.id}>
                    <CardTile
                      card={card}
                      onEdit={openEdit}
                      onArchive={toggleArchive}
                      onDelete={setConfirming}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <CardForm
        open={formOpen}
        onOpenChange={setFormOpen}
        card={editing}
        accounts={accounts}
        onSaved={() => router.refresh()}
      />

      {/* Drawer rather than a dialog primitive: the project has no AlertDialog
          and this is the same confirmation shape the rest of the app uses. */}
      <Drawer
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Delete this card?</DrawerTitle>
              <DrawerDescription>
                {confirming?.name} will be removed. Archiving keeps it out of
                the way without losing the record.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default CardsClient;
