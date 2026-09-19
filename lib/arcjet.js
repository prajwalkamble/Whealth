import arcjet, { request, tokenBucket } from "@arcjet/next";
import { ActionError } from "./action-error";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"], // Track based on Clerk userId
  rules: [],
});

// One bucket per kind of action. A single shared 10-per-hour bucket used to
// cover creating transactions, scanning receipts and creating accounts, so a
// scan-then-save cost two tokens and a normal user was blocked after about
// five receipts -- while edits, deletes and budget changes had no limit at
// all. Each rule has its own settings, so each keeps its own count.
const limiters = {
  // Entering transactions by hand; a busy user can log dozens in a sitting.
  transaction: aj.withRule(
    tokenBucket({ mode: "LIVE", refillRate: 60, interval: 3600, capacity: 60 })
  ),
  // Every scan is a Gemini request, which has its own quota.
  receiptScan: aj.withRule(
    tokenBucket({ mode: "LIVE", refillRate: 20, interval: 3600, capacity: 10 })
  ),
  account: aj.withRule(
    tokenBucket({ mode: "LIVE", refillRate: 10, interval: 3600, capacity: 10 })
  ),
  // Edits, deletes, default-account, budget and rating changes.
  write: aj.withRule(
    tokenBucket({ mode: "LIVE", refillRate: 120, interval: 3600, capacity: 60 })
  ),
};

// Throws an ActionError when the caller is over the limit for `kind`. Arcjet
// makes a network call, so callers run this before opening a database
// transaction rather than holding a connection for the round trip.
export async function enforceRateLimit(kind, userId) {
  const limiter = limiters[kind];
  if (!limiter) throw new Error(`Unknown rate limit: ${kind}`);

  const decision = await limiter.protect(await request(), {
    userId,
    requested: 1,
  });
  if (!decision.isDenied()) return;

  if (decision.reason.isRateLimit()) {
    const { remaining, reset } = decision.reason;
    console.error({
      code: "RATE_LIMIT_EXCEEDED",
      details: { kind, remaining, resetInSeconds: reset },
    });
    throw new ActionError("Too many requests. Please try again later.");
  }

  throw new ActionError("Request blocked");
}
