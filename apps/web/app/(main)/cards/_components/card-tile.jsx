"use client";

import { CreditCard, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const NETWORK_LABEL = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  RUPAY: "RuPay",
  AMEX: "American Express",
  DINERS: "Diners Club",
  OTHER: "Other",
};

// "09/28". Padded so the column stays aligned down the list.
const expiry = (month, year) =>
  `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;

// An expired card is still worth showing -- it is part of the user's own
// history -- but it should not look current.
const isExpired = (month, year) => {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
};

const CardTile = ({ card, onEdit, onArchive, onDelete }) => {
  const archived = card.status === "ARCHIVED";
  const expired = isExpired(card.expiryMonth, card.expiryYear);

  return (
    <Card className={cn(archived && "border-dashed bg-muted/30")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CreditCard aria-hidden className="h-[18px] w-[18px]" />
          </span>

          <div className="flex items-center gap-1.5">
            {archived && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                Archived
              </Badge>
            )}
            {!archived && expired && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                Expired
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Actions for ${card.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(card)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onArchive(card)}>
                  {archived ? "Restore" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete(card)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h3 className="mt-4 truncate text-sm font-semibold">{card.name}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {card.issuer} · {NETWORK_LABEL[card.network] ?? card.network}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {/* Four digits is all that is stored, and the bullets make that
                obvious rather than implying the rest is hidden somewhere. */}
            <p className="font-mono text-sm tabular-nums">•••• {card.last4}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {card.type === "CREDIT" ? "Credit" : "Debit"} · Expires{" "}
              <span className="tabular-nums">
                {expiry(card.expiryMonth, card.expiryYear)}
              </span>
            </p>
          </div>

          {card.creditLimit != null && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Limit</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(card.creditLimit)}
              </p>
            </div>
          )}
        </div>

        {(card.account || card.billingDay || card.dueDay) && (
          <dl className="mt-4 space-y-1 border-t pt-3 text-xs">
            {card.account && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Settles from</dt>
                <dd className="truncate">{card.account.name}</dd>
              </div>
            )}
            {card.billingDay && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Billing day</dt>
                <dd className="tabular-nums">{card.billingDay}</dd>
              </div>
            )}
            {card.dueDay && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Payment due</dt>
                <dd className="tabular-nums">{card.dueDay}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
};

export default CardTile;
