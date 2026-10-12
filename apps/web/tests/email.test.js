import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Resend is mocked throughout: these tests must never send real mail.
const sent = [];
let nextResult = { data: { id: "re_test_1" }, error: null };

vi.mock("resend", () => ({
  Resend: class {
    constructor(key) {
      this.key = key;
      this.emails = {
        send: async (options) => {
          sent.push(options);
          return nextResult;
        },
      };
    }
  },
}));

const { sendEmail } = await import("@/lib/email/send");
const { parseInboundEvent, INBOUND_EVENT } = await import("@/lib/email/inbound");
const { domainOf, senderConfigured } = await import("@/lib/email/config");

const ORIGINAL = { ...process.env };

beforeEach(() => {
  sent.length = 0;
  nextResult = { data: { id: "re_test_1" }, error: null };
  process.env.RESEND_API_KEY = "re_fake_key_for_tests";
  process.env.RESEND_FROM_EMAIL = "WHealthOS <hello@whealthos.com>";
  delete process.env.RESEND_REPLY_TO_EMAIL;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("sender configuration", () => {
  // The regression this pins. The guard used to compare the resolved sender
  // against the fallback string, so setting RESEND_FROM_EMAIL to that exact
  // address -- the obvious value, since it is this project's own domain --
  // silently disabled sending in production.
  it("treats the fallback address as configured when it was set deliberately", () => {
    process.env.RESEND_FROM_EMAIL = "WHealthOS <hello@whealthos.com>";
    expect(senderConfigured()).toBe(true);
  });

  it("reports an unset sender as not configured", () => {
    delete process.env.RESEND_FROM_EMAIL;
    expect(senderConfigured()).toBe(false);
  });

  it("sends from the configured address, never one a caller chose", async () => {
    process.env.RESEND_FROM_EMAIL = "WHealthOS <reports@whealthos.com>";
    await sendEmail({ to: "someone@example.test", subject: "s", text: "b", from: "evil@attacker.test" });
    expect(sent[0].from).toBe("WHealthOS <reports@whealthos.com>");
    expect(JSON.stringify(sent[0])).not.toContain("attacker.test");
  });
});

describe("failing safely", () => {
  it("refuses rather than sending when the API key is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({ to: "a@example.test", subject: "s", text: "b" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("api-key-missing");
  });

  it("refuses with no recipient", async () => {
    const result = await sendEmail({ to: null, subject: "s", text: "b" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no-recipient");
    expect(sent).toHaveLength(0);
  });

  // Resend v4 reports API failures in the response body rather than throwing.
  it("treats a body-reported error as a failure, not a success", async () => {
    nextResult = { data: null, error: { name: "validation_error", message: "bad from" } };
    const result = await sendEmail({ to: "a@example.test", subject: "s", text: "b" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("rejected");
  });

  it("survives the client throwing", async () => {
    nextResult = null; // destructuring null throws inside send
    const result = await sendEmail({ to: "a@example.test", subject: "s", text: "b" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("exception");
  });

  it("returns the Resend id on success, which is acceptance and not delivery", async () => {
    const result = await sendEmail({ to: "a@example.test", subject: "s", text: "b" });
    expect(result.success).toBe(true);
    expect(result.id).toBe("re_test_1");
  });
});

describe("reply-to", () => {
  it("adds no header when nothing is configured", async () => {
    await sendEmail({ to: "a@example.test", subject: "s", text: "b" });
    expect(sent[0].replyTo).toBeUndefined();
  });

  it("uses the configured default", async () => {
    process.env.RESEND_REPLY_TO_EMAIL = "support@whealthos.com";
    await sendEmail({ to: "a@example.test", subject: "s", text: "b" });
    expect(sent[0].replyTo).toBe("support@whealthos.com");
  });

  // Feedback passes the author's address, resolved from the verified session.
  it("lets a caller override it", async () => {
    process.env.RESEND_REPLY_TO_EMAIL = "support@whealthos.com";
    await sendEmail({ to: "a@example.test", subject: "s", text: "b", replyTo: "user@example.test" });
    expect(sent[0].replyTo).toBe("user@example.test");
  });
});

describe("logging", () => {
  it("never writes the API key or the recipient's full address", async () => {
    const lines = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      lines.push(args.map((a) => JSON.stringify(a)).join(" "));
    });
    process.env.RESEND_API_KEY = "re_super_secret_value";
    nextResult = { data: null, error: { name: "validation_error", message: "nope" } };

    await sendEmail({ to: "person@example.test", subject: "s", text: "b", type: "feedback" });

    const all = lines.join("\n");
    expect(all).not.toContain("re_super_secret_value");
    expect(all).not.toContain("person@example.test");
    // The domain is enough to tell one provider's delivery problem from a
    // broken configuration.
    expect(all).toContain("example.test");
    spy.mockRestore();
  });

  it("extracts a domain from a formatted address", () => {
    expect(domainOf("WHealthOS <hello@whealthos.com>")).toBe("whealthos.com");
    expect(domainOf("plain@gmail.com")).toBe("gmail.com");
    expect(domainOf(null)).toBe("unknown");
  });
});

// The payload is from the public internet. Nothing in it is trusted.
describe("inbound payload parsing", () => {
  const event = (over = {}) => ({
    type: INBOUND_EVENT,
    created_at: "2026-10-05T09:00:00.000Z",
    data: {
      from: "sender@example.test",
      to: "hello@whealthos.com",
      subject: "Help please",
      text: "My budget page looks wrong.",
      ...over,
    },
  });

  it("reads a well-formed event", () => {
    const parsed = parseInboundEvent(event());
    expect(parsed.ok).toBe(true);
    expect(parsed.type).toBe(INBOUND_EVENT);
    expect(parsed.data.fromAddress).toBe("sender@example.test");
    expect(parsed.data.subject).toBe("Help please");
  });

  it("accepts an address given as an array or an object", () => {
    expect(parseInboundEvent(event({ to: ["hello@whealthos.com"] })).data.toAddress)
      .toBe("hello@whealthos.com");
    expect(parseInboundEvent(event({ from: { address: "x@example.test" } })).data.fromAddress)
      .toBe("x@example.test");
  });

  it("rejects a payload that is not an object", () => {
    expect(parseInboundEvent(null).ok).toBe(false);
    expect(parseInboundEvent("a string").ok).toBe(false);
  });

  it("rejects an event with no type", () => {
    expect(parseInboundEvent({ data: {} }).ok).toBe(false);
  });

  it("reports a non-inbound type rather than treating it as inbound", () => {
    const parsed = parseInboundEvent({ type: "email.delivered", data: {} });
    expect(parsed.ok).toBe(true);
    expect(parsed.type).not.toBe(INBOUND_EVENT);
  });

  // The HTML part is read and dropped: storing a stranger's markup creates
  // something that could be rendered into a page later.
  it("never carries the HTML body through", () => {
    const parsed = parseInboundEvent(
      event({ html: "<img src=x onerror=alert(1)><script>steal()</script>" })
    );
    expect(JSON.stringify(parsed.data)).not.toContain("onerror");
    expect(JSON.stringify(parsed.data)).not.toContain("script");
    expect(parsed.data.html).toBeUndefined();
  });

  it("keeps a script-looking plain-text body as inert text", () => {
    const parsed = parseInboundEvent(event({ text: "<script>alert(1)</script>" }));
    // Stored as text; React escapes it when the forward is rendered.
    expect(parsed.data.text).toBe("<script>alert(1)</script>");
  });

  it("truncates an oversized body instead of storing all of it", () => {
    const parsed = parseInboundEvent(event({ text: "x".repeat(200_000) }));
    expect(parsed.data.text.length).toBeLessThan(70_000);
    expect(parsed.data.text).toMatch(/\[truncated\]$/);
  });

  it("truncates an absurd subject", () => {
    const parsed = parseInboundEvent(event({ subject: "s".repeat(5000) }));
    expect(parsed.data.subject.length).toBeLessThan(600);
  });

  // Counted, never fetched: downloading what a stranger attached, from a URL
  // in the same payload, is a request this server should not make.
  it("counts attachments without taking their contents", () => {
    const parsed = parseInboundEvent(
      event({ attachments: [{ filename: "a.pdf", url: "http://attacker.test/a" }, { filename: "b" }] })
    );
    expect(parsed.data.attachments).toBe(2);
    expect(JSON.stringify(parsed.data)).not.toContain("attacker.test");
  });

  it("tolerates missing fields rather than throwing", () => {
    const parsed = parseInboundEvent({ type: INBOUND_EVENT, data: {} });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.fromAddress).toBeNull();
    expect(parsed.data.subject).toBeNull();
  });

  it("falls back to now when the timestamp is unusable", () => {
    const parsed = parseInboundEvent({ type: INBOUND_EVENT, created_at: "not a date", data: {} });
    expect(parsed.data.receivedAt instanceof Date).toBe(true);
    expect(Number.isNaN(parsed.data.receivedAt.getTime())).toBe(false);
  });

  it("records the key names it saw, never their values", () => {
    const parsed = parseInboundEvent(event({ secret_token: "abc123" }));
    expect(parsed.shape).toContain("secret_token");
    expect(JSON.stringify(parsed.shape)).not.toContain("abc123");
  });
});

// The service carries a body in whichever form the caller has. Resend rejects
// a send with none of react/text/html, and the first live test hit exactly
// that: a text-only message was accepted here and then dropped before the API
// call, so the failure surfaced as an unhelpful Resend validation error.
describe("message body", () => {
  it("sends a React template", async () => {
    await sendEmail({ to: "a@example.test", subject: "s", react: { type: "div" } });
    expect(sent[0].react).toBeTruthy();
  });

  it("sends a plain-text body", async () => {
    await sendEmail({ to: "a@example.test", subject: "s", text: "hello" });
    expect(sent[0].text).toBe("hello");
  });

  it("sends an HTML body", async () => {
    await sendEmail({ to: "a@example.test", subject: "s", html: "<p>hi</p>" });
    expect(sent[0].html).toBe("<p>hi</p>");
  });

  it("refuses a message with no body rather than letting Resend reject it", async () => {
    const result = await sendEmail({ to: "a@example.test", subject: "s" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no-body");
    expect(sent).toHaveLength(0);
  });
})
