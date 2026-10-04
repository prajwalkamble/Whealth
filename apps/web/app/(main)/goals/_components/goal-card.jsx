"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import { APP_TIME_ZONE } from "@/lib/time";
import { cn } from "@/lib/utils";
import { paceOf } from "./pace";

const dateLabel = (iso) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));

const GoalCard = ({ goal, onEdit, onContribute, onComplete, onArchive, onDelete }) => {
  const pace = paceOf(goal);
  const closed = goal.status !== "ACTIVE";

  return (
    <Card className={cn(closed && "border-dashed bg-muted/30")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{goal.name}</h3>
            {/* The status is a word, not only a colour, so it survives
                greyscale and a screen reader. */}
            <p className={cn("mt-0.5 text-xs", pace.tone)}>
              {pace.label}
              {goal.targetDate && ` · by ${dateLabel(goal.targetDate)}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {closed && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {goal.status === "COMPLETED" ? "Done" : "Archived"}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Actions for ${goal.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(goal)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onComplete(goal)}>
                  {goal.status === "ACTIVE" ? "Mark complete" : "Reopen"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onArchive(goal)}>
                  {goal.status === "ARCHIVED" ? "Restore" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(goal)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {goal.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {goal.description}
          </p>
        )}

        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {formatCurrency(goal.saved)}
          </p>
          <p className="text-sm tabular-nums text-muted-foreground">
            of {formatCurrency(goal.targetAmount)}
          </p>
        </div>

        <Progress
          value={goal.percentComplete}
          className="mt-3"
          aria-label={`${Math.round(goal.percentComplete)}% of ${goal.name} saved`}
        />

        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {Math.round(goal.percentComplete)}% ·{" "}
          {goal.remaining > 0
            ? `${formatCurrency(goal.remaining)} to go`
            : "Target reached"}
          {goal.contributions > 0 &&
            ` · ${goal.contributions} contribution${goal.contributions === 1 ? "" : "s"}`}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => onContribute(goal)}
        >
          <Plus className="h-4 w-4" />
          Add contribution
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoalCard;
