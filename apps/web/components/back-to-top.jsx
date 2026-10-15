"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// The footer's back-to-top control.
//
// The only client component the footer has, and it exists because the button
// has to do something: a decorative circle that does not scroll is worse than
// no circle. It is a real <button>, so it is in the tab order and carries its
// own name.
//
// Smooth, unless the visitor has asked for less motion -- scrollTo's "smooth"
// ignores prefers-reduced-motion, so the preference is read here and the jump
// is instant for anyone who set it.
const BackToTop = ({ className }) => {
  const toTop = () => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={cn(
        // gradient is the brand's own blue-to-purple, the one accent on the
        // whole footer.
        "gradient flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition",
        "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <ArrowUp aria-hidden className="h-5 w-5" />
    </button>
  );
};

export default BackToTop;
