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

// Limits for callers who have no account.
//
// The instance above tracks by Clerk userId, which is the right key for
// everything inside the app and useless for a public form: every anonymous
// submission would share one empty key and the first few would exhaust the
// bucket for everyone. This one leaves `characteristics` unset, so Arcjet
// fingerprints by source IP instead.
//
// A separate arcjet() call rather than a rule on the existing one, because the
// characteristics are a property of the client, not of the rule.
const anonymous = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [],
});

const anonymousLimiters = {
  // The public enquiry form. Five an hour is more than anyone writing a real
  // message needs and low enough that a scripted flood costs the operator's
  // inbox nothing. The form is also behind the middleware's shield and bot
  // detection, which run before this.
  contact: anonymous.withRule(
    tokenBucket({ mode: "LIVE", refillRate: 5, interval: 3600, capacity: 5 })
  ),
};

// Asks whether this IP may do `kind` right now.
//
// Returns a decision instead of throwing, because the one caller -- the public
// contact form -- renders a different state for "too many messages" than for
// "that did not send", and a thrown error loses the distinction along with the
// retry timing.
//
// Deliberately fails closed. If Arcjet cannot be reached, or ARCJET_KEY is not
// set, the answer is "not allowed": an endpoint that mails someone's inbox
// should not quietly become unlimited because a dependency is down.
export async function checkAnonymousRateLimit(kind) {
  const limiter = anonymousLimiters[kind];
  if (!limiter) throw new Error(`Unknown anonymous rate limit: ${kind}`);

  let decision;
  try {
    decision = await limiter.protect(await request(), { requested: 1 });
  } catch (error) {
    console.error({ code: "RATE_LIMIT_UNAVAILABLE", details: { kind }, error });
    return { allowed: false, limited: false, retryAfterSeconds: null };
  }

  if (!decision.isDenied()) return { allowed: true, limited: false, retryAfterSeconds: null };

  if (decision.reason.isRateLimit()) {
    const { remaining, reset } = decision.reason;
    console.error({
      code: "RATE_LIMIT_EXCEEDED",
      details: { kind, anonymous: true, remaining, resetInSeconds: reset },
    });
    // reset is seconds until the bucket refills. Passed on only when Arcjet
    // actually gave one, so the page never invents a time to come back at.
    return {
      allowed: false,
      limited: true,
      retryAfterSeconds: Number.isFinite(reset) ? reset : null,
    };
  }

  console.error({ code: "REQUEST_BLOCKED", details: { kind, anonymous: true } });
  return { allowed: false, limited: false, retryAfterSeconds: null };
}

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
