"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Bug, MessageSquare, PenLine, SendHorizonal, Star, X } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/actions/feedback";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import useFetch from "@/hooks/use-fetch";
import RatingScale from "./rating-scale";
import { FEEDBACK_WORD_MINIMUM, countWords } from "@/app/lib/schema";
import { cn } from "@/lib/utils";

// The three things the tab offers. `rate` is the odd one out: it is stored on
// the account (and feeds the average on the landing page) rather than mailed,
// so it has its own action and its own panel.
const CHOICES = [
  {
    id: "feedback",
    label: "Share Feedback",
    description: "Tell us about your experience with WHealthOS",
    icon: MessageSquare,
    placeholder:
      "What has worked well for you, and what could be better?",
  },
  {
    id: "problem",
    label: "Report an issue",
    description: "Something isn't working as expected",
    icon: Bug,
    placeholder:
      "What happened, what did you expect instead, and where in the app were you?",
  },
  {
    id: "rate",
    label: "Rate WHealthOS",
    description: "Rate your overall experience",
    icon: Star,
  },
];

// How far the tab sits above the bottom of the viewport. Left deliberately
// clear of the very bottom so an assistant button can live below it later.
// The panel's anchor uses the same value, so the two stay in step.
const TAB_BOTTOM = "bottom-28";

// The draft lives in the widget, not here. This panel unmounts on every close,
// so a message held locally was silently destroyed by Escape, an outside
// click, or a trip back to the menu -- after someone had typed it out.
const MessagePanel = ({ choice, message, onMessageChange, onSent }) => {
  const { loading, fn: send } = useFetch(submitFeedback);

  const words = countWords(message);
  const tooShort = words < FEEDBACK_WORD_MINIMUM;

  const submit = async (event) => {
    event.preventDefault();
    if (loading || tooShort) return;

    const result = await send({ type: choice.id, message });
    // useFetch raises the toast on failure; the text stays put so nothing
    // anyone typed is thrown away by a failed send.
    if (result?.success) {
      toast.success("Thank you — your message has been sent.");
      onSent?.();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Textarea
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        placeholder={choice.placeholder}
        className="min-h-[180px] resize-y"
        maxLength={4000}
        autoFocus
        disabled={loading}
        aria-describedby="feedback-hint"
      />

      <div className="flex items-center justify-between gap-3">
        {/* Says what is still needed, rather than leaving a disabled button
            with no explanation for why it will not submit. */}
        <p id="feedback-hint" className="text-xs text-muted-foreground">
          {tooShort
            ? `Please enter at least ${FEEDBACK_WORD_MINIMUM} words.`
            : `${words} ${words === 1 ? "word" : "words"}`}
        </p>
        <Button type="submit" disabled={loading || tooShort}>
          <SendHorizonal className="h-4 w-4" />
          {loading ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
};


// The tab and its panel are positioned directly rather than through a popover
// library. The geometry here is fixed and known -- the panel's bottom-right
// corner sits exactly where the pen is -- and a floating-ui anchor that is
// zero-sized and hidden measured as an empty rect, which put the panel in the
// top-left of the screen. Placing it by CSS removes that whole class of
// failure, at the cost of handling dismissal by hand below.
const FeedbackWidget = ({ initialRating = null }) => {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(null);

  // Both of these outlive the panel, which unmounts on every close: the rating
  // so a fresh one is not replaced by the page's original value, and the
  // drafts so an accidental dismissal does not throw away what was typed.
  // Drafts are per type, so switching between them does not mix messages up.
  const [rating, setRating] = useState(initialRating);
  const [drafts, setDrafts] = useState({});

  const panelRef = useRef(null);
  const tabRef = useRef(null);

  // The tab is fixed to the viewport and has no server-rendered equivalent, so
  // it waits for mount rather than risking a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape closes, and a press outside the panel closes -- the two things a
  // popover would otherwise give us. The tab is excluded from "outside" so its
  // own click does not close and immediately reopen.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (tabRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    // Capture phase, so a click is caught before anything in the page can
    // stop it propagating.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  // Focus moves into the panel when it opens and back to the tab when it
  // closes, so the widget is usable from the keyboard.
  //
  // wasOpen guards the first run: an effect keyed on `open` also fires on
  // mount, where open is false, which pulled focus onto the tab on every
  // single page load.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) panelRef.current?.focus();
    else if (wasOpen.current) tabRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  const openPanel = () => {
    setChoice(null);
    setOpen(true);
  };

  if (!mounted) return null;

  // Portalled to the body so that no ancestor's stacking context or overflow
  // can put the page's own content in front of the widget.
  return createPortal(
    <>
      {/* The pen. Hidden while the panel is open -- the panel's own corner
          takes its place -- but kept mounted so focus has somewhere to return
          to, and so it can fade rather than vanish. */}
      <button
        ref={tabRef}
        type="button"
        onClick={openPanel}
        aria-label="Write a Review"
        aria-expanded={open}
        tabIndex={open ? -1 : undefined}
        className={cn(
          "group fixed right-0 z-[60] flex items-center overflow-hidden",
          TAB_BOTTOM,
          "rounded-l-lg border border-r-0 bg-primary p-3 text-primary-foreground shadow-lg",
          "transition-[opacity,transform,box-shadow] duration-200 hover:shadow-xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "pointer-events-none scale-90 opacity-0"
        )}
      >
        <PenLine className="h-5 w-5 shrink-0" />
        {/* The label carries its own left margin rather than the row using a
            gap: a flex gap applies even to a zero-width item, which pushed the
            icon off-centre whenever the tab was collapsed. */}
        <span
          className={cn(
            "ml-0 max-w-0 whitespace-nowrap text-sm font-medium opacity-0",
            "transition-[max-width,opacity,margin] duration-200",
            "group-hover:ml-2 group-hover:max-w-[10rem] group-hover:opacity-100",
            "group-focus-visible:ml-2 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100"
          )}
        >
          Write a Review
        </span>
      </button>

      {open && (
        // Same right edge and same bottom edge as the tab, so the panel's
        // bottom-right corner lands exactly where the pen was. It grows up and
        // to the left out of that corner, which is what the animation origin
        // describes.
        <div
          ref={panelRef}
          role="dialog"
          aria-label={choice ? choice.label : "Write a Review"}
          tabIndex={-1}
          className={cn(
            "fixed right-0 z-[70] flex w-[22rem] max-w-[calc(100vw-1rem)] flex-col",
            TAB_BOTTOM,
            "max-h-[min(32rem,70vh)] overflow-hidden rounded-l-xl border bg-popover text-popover-foreground shadow-2xl",
            "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200",
            "focus-visible:outline-none"
          )}
        >
          <div className="flex items-start gap-2 border-b px-4 py-3">
            {/* Back sits at the top, where someone looks to go back, rather
                than pinned to the bottom of the panel. */}
            {choice && (
              <button
                type="button"
                onClick={() => setChoice(null)}
                aria-label="Back to all options"
                className="-ml-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {choice ? choice.label : "Write a Review"}
              </p>
              <p className="text-xs text-muted-foreground">
                {choice ? choice.description : "Help us improve WHealthOS"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {choice === null ? (
              <div className="grid gap-2">
                {CHOICES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setChoice(option)}
                    className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <option.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : choice.id === "rate" ? (
              <RatingScale
                rating={rating}
                onRated={setRating}
                onDone={() => setOpen(false)}
              />
            ) : (
              <MessagePanel
                choice={choice}
                message={drafts[choice.id] ?? ""}
                onMessageChange={(value) =>
                  setDrafts((current) => ({ ...current, [choice.id]: value }))
                }
                onSent={() => {
                  // Only cleared once it has actually been delivered.
                  setDrafts((current) => ({ ...current, [choice.id]: "" }));
                  setOpen(false);
                }}
              />
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default FeedbackWidget;
