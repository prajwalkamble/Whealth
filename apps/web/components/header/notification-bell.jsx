"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Info, TriangleAlert } from "lucide-react";
import { getNotifications } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Which notifications have been seen is a display concern, so it lives in the
// browser rather than costing a column and a write. The cost is that the dot
// reappears on another device, which is the right way round: better to show a
// notice twice than to hide one that was never read.
const SEEN_KEY = "whealth-notifications-seen";

const ICONS = {
  alert: { icon: AlertTriangle, tone: "text-red-600 dark:text-red-400" },
  warning: { icon: TriangleAlert, tone: "text-amber-600 dark:text-amber-400" },
  info: { icon: Info, tone: "text-blue-600 dark:text-blue-400" },
};

const readSeen = () => {
  try {
    return window.localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
};

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [seenAt, setSeenAt] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Fetched once per page load rather than in the layout: the bell is not
  // worth delaying the page's HTML for, and a failure here must not take the
  // whole app down.
  useEffect(() => {
    let cancelled = false;
    setSeenAt(readSeen());

    getNotifications()
      .then((response) => {
        if (cancelled || !response?.success) return;
        setItems(response.data);
      })
      .catch((error) => console.error("Could not load notifications:", error));

    return () => {
      cancelled = true;
    };
  }, []);

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

  const unread = items.filter((item) => !seenAt || item.at > seenAt);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && items.length > 0) {
      const stamp = new Date().toISOString();
      setSeenAt(stamp);
      try {
        window.localStorage.setItem(SEEN_KEY, stamp);
      } catch {
        // Not being able to remember is not worth failing over.
      }
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label={
          unread.length > 0
            ? `Notifications, ${unread.length} unread`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                You&rsquo;re all caught up.
              </p>
            ) : (
              items.map((item) => {
                const { icon: Icon, tone } = ICONS[item.kind] ?? ICONS.info;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
