"use client";

import { forwardRef } from "react";

// The pointer in the walkthrough.
//
// Deliberately the size of a real cursor rather than the oversized arrow these
// demos usually use: it is there to say where attention is going, not to be
// the thing you look at. Positioning is left to the timeline, which sets x/y
// on the wrapper; this component only draws.
//
// aria-hidden throughout. Everything the cursor points at is already in the
// document and readable without it, so to assistive technology it is noise.
const DemoCursor = forwardRef(({ className }, ref) => (
  <div
    ref={ref}
    aria-hidden
    className={
      "pointer-events-none absolute left-0 top-0 z-20 opacity-0 will-change-transform " +
      (className ?? "")
    }
  >
    {/* The ring reads as a press when the timeline scales it up. */}
    <span
      data-demo-cursor-ring
      className="absolute -left-3 -top-3 h-6 w-6 scale-0 rounded-full bg-foreground/10 opacity-0"
    />
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M2 1.5 L2 14 L5.4 10.9 L7.8 15.6 L10.2 14.4 L7.9 9.9 L12.4 9.6 Z"
        className="fill-foreground stroke-background"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  </div>
));

DemoCursor.displayName = "DemoCursor";

export default DemoCursor;
