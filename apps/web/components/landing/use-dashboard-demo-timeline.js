"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

// The walkthrough's choreography, kept out of the component that renders it.
//
// Everything runs inside one gsap.context scoped to the demo root, so every
// tween is reverted on unmount and nothing can outlive the component or reach
// the rest of the page. Selectors are scoped to the root for the same reason --
// there is no document-level querySelector here.
//
// Scope is deliberately narrow: the complete dashboard, the summary, the two
// charts, the transaction list, and one interaction that the product actually
// has. Creating a transaction and switching themes are things the application
// does, but they are not what this demonstration is for, so they are not here.
//
// Roughly 28 seconds end to end. The pacing is unhurried on purpose: a visitor
// should follow each step the first time, and the final state holds longest
// because that is the state someone is actually trying to read.

const EASE = "power2.inOut";
const CURSOR_EASE = "power3.inOut";

// Where the cursor should sit for a given target, in the root's coordinates.
// Slightly inside the top-left of the element, which is where a hand would
// naturally land rather than dead centre.
const pointAt = (root, el, dx = 0.35, dy = 0.45) => {
  if (!el) return null;
  const r = root.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: b.left - r.left + b.width * dx, y: b.top - r.top + b.height * dy };
};

export function useDashboardDemoTimeline({ rootRef, cursorRef, balance }) {
  // Held in a ref and read inside the effect rather than listed as a
  // dependency: depending on `balance` rebuilt the timeline whenever the
  // figure settled, which restarted it forever.
  const latest = useRef(null);
  latest.current = { balance };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const q = (sel) => root.querySelector(sel);
      const qa = (sel) => Array.from(root.querySelectorAll(sel));
      const panel = (name) => q(`[data-demo="${name}"]`);
      const cursor = cursorRef.current;
      const ring = cursor?.querySelector("[data-demo-cursor-ring]");

      // Reduced motion: the dashboard is simply there, complete and still.
      // Nothing below runs, and no information is lost -- every number the
      // animation would have counted up is already in the DOM.
      if (reduced) {
        gsap.set(root, { opacity: 1 });
        gsap.set("[data-demo-panel]", { opacity: 1, y: 0 });
        if (cursor) gsap.set(cursor, { display: "none" });
        return;
      }

      const moveTo = (tl, name, dx, dy) => {
        const p = pointAt(root, panel(name), dx, dy);
        if (!p || !cursor) return tl;
        return tl.to(cursor, { x: p.x, y: p.y, duration: 0.9, ease: CURSOR_EASE });
      };

      const focus = (tl, name, on = true) =>
        tl.to(panel(name), { "--demo-ring": on ? 1 : 0, duration: 0.4, ease: EASE }, "<");

      const press = (tl) =>
        ring
          ? tl
              .to(ring, { scale: 1, opacity: 1, duration: 0.16, ease: "power2.out" })
              .to(ring, { scale: 1.6, opacity: 0, duration: 0.38, ease: "power2.out" })
          : tl;

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

      // ---- Scene 1 (0-3s): the complete dashboard arrives -----------------
      // Chrome first, then content, so it reads as an application opening
      // rather than a pile of cards fading in together.
      tl.set(cursor, { x: 40, y: 40, opacity: 0 })
        .from(panel("sidebar"), { opacity: 0, x: -14, duration: 0.6, ease: EASE })
        .from(panel("topbar"), { opacity: 0, y: -10, duration: 0.5, ease: EASE }, "-=0.4")
        .from(qa('[data-demo="stats"] > *'), {
          opacity: 0, y: 12, duration: 0.5, stagger: 0.07, ease: EASE,
        }, "-=0.25")
        .from(
          qa('[data-demo-panel]:not([data-demo="stats"]):not([data-demo="sidebar"]):not([data-demo="topbar"])'),
          { opacity: 0, y: 14, duration: 0.55, stagger: 0.08, ease: EASE },
          "-=0.3"
        )
        .to(cursor, { opacity: 1, duration: 0.3 }, "-=0.15")
        // Hold: "this is WHealthOS".
        .to({}, { duration: 0.9 });

      // ---- Scene 2 (3-7s): the financial summary --------------------------
      const figure = q('[data-demo="stats"] [data-figure]');
      moveTo(tl, "stats", 0.12, 0.62);
      focus(tl, "stats");
      if (figure && latest.current.balance != null) {
        const counter = { v: 0 };
        const fmt = new Intl.NumberFormat("en-IN", {
          style: "currency", currency: "INR",
          minimumFractionDigits: 2, maximumFractionDigits: 2,
        });
        tl.to(counter, {
          v: latest.current.balance,
          duration: 2.0,
          ease: "power2.out",
          // textContent, not React state: the card never re-renders.
          onUpdate: () => { figure.textContent = fmt.format(counter.v); },
        }, "-=0.2");
      }
      tl.to({}, { duration: 0.8 });
      focus(tl, "stats", false);

      // ---- Scene 3 (7-11s): cash flow -------------------------------------
      moveTo(tl, "cashflow", 0.5, 0.5);
      focus(tl, "cashflow");
      // The real chart's own bars, grown from the axis.
      tl.from(qa('[data-demo="cashflow"] .recharts-bar-rectangle path'), {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.7,
        stagger: 0.03,
        ease: "power2.out",
        // Without this the start state is applied when the timeline is built
        // rather than when the scene plays, hiding the bars from the outset.
        immediateRender: false,
      }, "-=0.2")
        .to({}, { duration: 1.2 });
      focus(tl, "cashflow", false);

      // ---- Scene 4 (11-15s): spending breakdown ---------------------------
      moveTo(tl, "breakdown", 0.5, 0.45);
      focus(tl, "breakdown");
      tl.from(
        qa('[data-demo="breakdown"] .recharts-sector, [data-demo="breakdown"] .recharts-pie path'),
        { opacity: 0, duration: 0.5, stagger: 0.12, ease: "power2.out", immediateRender: false },
        "-=0.2"
      ).to({}, { duration: 1.3 });
      focus(tl, "breakdown", false);

      // ---- Scene 5 (15-18s): recent transactions --------------------------
      moveTo(tl, "transactions", 0.4, 0.3);
      focus(tl, "transactions");
      tl.from(qa('[data-demo="transactions"] tbody tr'), {
        opacity: 0, x: -8, duration: 0.4, stagger: 0.07, ease: "power2.out",
        immediateRender: false,
      }, "-=0.2")
        .to({}, { duration: 1.0 });
      focus(tl, "transactions", false);

      // ---- Scene 6 (18-22s): one real interaction -------------------------
      // The cash-flow card genuinely has a Bars / Flow switch. The cursor uses
      // that, rather than miming a control the product does not have.
      const toggle = qa('[data-demo="cashflow"] button').find((b) =>
        /flow/i.test(b.textContent || "")
      );
      if (toggle) {
        const p = pointAt(root, toggle, 0.5, 0.5);
        if (p && cursor) {
          tl.to(cursor, { x: p.x, y: p.y, duration: 0.9, ease: CURSOR_EASE })
            .to({}, { duration: 0.3 });
          press(tl);
          tl.call(() => toggle.click()).to({}, { duration: 1.6 });
          // Put it back, so the loop starts from the state it started in.
          const bars = qa('[data-demo="cashflow"] button').find((b) =>
            /bars/i.test(b.textContent || "")
          );
          if (bars) {
            press(tl);
            tl.call(() => bars.click()).to({}, { duration: 0.7 });
          }
        }
      }

      // ---- Scene 7 (22-28s): back to the whole dashboard ------------------
      tl.to(cursor, { x: 40, y: 40, duration: 1.0, ease: CURSOR_EASE })
        .to(cursor, { opacity: 0, duration: 0.45 }, "-=0.3")
        // The longest hold on the timeline. This is the state a visitor is
        // actually reading, so it gets the time to be read.
        .to({}, { duration: 4.5 });
    }, root);

    return () => ctx.revert();
  }, [rootRef, cursorRef]);
}
