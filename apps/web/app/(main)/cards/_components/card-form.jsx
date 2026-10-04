"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CARD_NETWORKS, CARD_TYPES } from "@/app/lib/schema";
import { createCard, updateCard } from "@/actions/cards";

const NETWORK_LABEL = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  RUPAY: "RuPay",
  AMEX: "American Express",
  DINERS: "Diners Club",
  OTHER: "Other",
};

const EMPTY = {
  name: "",
  issuer: "",
  network: "VISA",
  type: "CREDIT",
  last4: "",
  expiryMonth: "",
  expiryYear: "",
  creditLimit: "",
  billingDay: "",
  dueDay: "",
  accountId: "",
};

const NONE = "__none__";

const Field = ({ label, htmlFor, children, hint }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

// One drawer for both create and edit: the fields and the validation are the
// same, and keeping them in one place means an added column cannot be wired
// into one path and forgotten in the other.
const CardForm = ({ open, onOpenChange, card, accounts, onSaved }) => {
  const [values, setValues] = useState(EMPTY);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setValues(
      card
        ? {
            name: card.name,
            issuer: card.issuer,
            network: card.network,
            type: card.type,
            last4: card.last4,
            expiryMonth: String(card.expiryMonth),
            expiryYear: String(card.expiryYear),
            creditLimit: card.creditLimit == null ? "" : String(card.creditLimit),
            billingDay: card.billingDay == null ? "" : String(card.billingDay),
            dueDay: card.dueDay == null ? "" : String(card.dueDay),
            accountId: card.accountId ?? "",
          }
        : EMPTY
    );
  }, [open, card]);

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  const submit = (event) => {
    event.preventDefault();

    startTransition(async () => {
      const payload = { ...values, accountId: values.accountId || null };
      const result = card
        ? await updateCard(card.id, payload)
        : await createCard(payload);

      if (result?.success) {
        toast.success(card ? "Card updated" : "Card added");
        onOpenChange(false);
        onSaved?.();
        return;
      }

      // parseOrThrow surfaces the first failing rule as one message, so there
      // is a single error to show rather than a map keyed by field.
      toast.error(result?.error ?? "Could not save the card");
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{card ? "Edit card" : "Add card"}</DrawerTitle>
          <DrawerDescription>
            Reference details only. WHealthOS never stores a full card number,
            a CVV or a PIN.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={submit}
          className="space-y-4 overflow-y-auto px-4 pb-6 sm:mx-auto sm:w-full sm:max-w-lg"
        >
          <Field label="Name" htmlFor="card-name">
            <Input
              id="card-name"
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Everyday credit card"
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issuer" htmlFor="card-issuer">
              <Input
                id="card-issuer"
                value={values.issuer}
                onChange={(e) => set("issuer")(e.target.value)}
                placeholder="HDFC Bank"
                autoComplete="off"
              />
            </Field>

            <Field label="Network" htmlFor="card-network">
              <Select value={values.network} onValueChange={set("network")}>
                <SelectTrigger id="card-network">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_NETWORKS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {NETWORK_LABEL[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="card-type">
              <Select value={values.type} onValueChange={set("type")}>
                <SelectTrigger id="card-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "CREDIT" ? "Credit" : "Debit"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Last 4 digits"
              htmlFor="card-last4"
             
              hint="So you can tell your cards apart."
            >
              <Input
                id="card-last4"
                value={values.last4}
                onChange={(e) =>
                  set("last4")(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                maxLength={4}
                placeholder="0042"
                // Nothing here should be offered to a password manager or
                // remembered by the browser as a payment credential.
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expiry month" htmlFor="card-exp-month">
              <Input
                id="card-exp-month"
                value={values.expiryMonth}
                onChange={(e) => set("expiryMonth")(e.target.value)}
                inputMode="numeric"
                placeholder="09"
                autoComplete="off"
              />
            </Field>
            <Field label="Expiry year" htmlFor="card-exp-year">
              <Input
                id="card-exp-year"
                value={values.expiryYear}
                onChange={(e) => set("expiryYear")(e.target.value)}
                inputMode="numeric"
                placeholder="2028"
                autoComplete="off"
              />
            </Field>
          </div>

          {values.type === "CREDIT" && (
            <Field
              label="Credit limit"
              htmlFor="card-limit"
             
              hint="Optional."
            >
              <Input
                id="card-limit"
                value={values.creditLimit}
                onChange={(e) => set("creditLimit")(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                autoComplete="off"
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Billing day"
              htmlFor="card-billing"
             
              hint="Day of the month, optional."
            >
              <Input
                id="card-billing"
                value={values.billingDay}
                onChange={(e) => set("billingDay")(e.target.value)}
                inputMode="numeric"
                placeholder="1"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Payment due day"
              htmlFor="card-due"
             
              hint="Day of the month, optional."
            >
              <Input
                id="card-due"
                value={values.dueDay}
                onChange={(e) => set("dueDay")(e.target.value)}
                inputMode="numeric"
                placeholder="18"
                autoComplete="off"
              />
            </Field>
          </div>

          <Field
            label="Settles from"
            htmlFor="card-account"
           
            hint="Optional. Link the account this card is paid from."
          >
            <Select
              value={values.accountId || NONE}
              onValueChange={(v) => set("accountId")(v === NONE ? "" : v)}
            >
              <SelectTrigger id="card-account">
                <SelectValue placeholder="No linked account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No linked account</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DrawerFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : card ? "Save changes" : "Add card"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};

export default CardForm;
