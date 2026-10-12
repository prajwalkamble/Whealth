import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Webhook } from "svix";
import { PrismaClient } from "@whealthos/database";

// The Resend webhook, with real Svix signatures and a real database.
//
// Signatures are generated with the same library the route verifies with, so
// a valid request here is genuinely valid and an invalid one genuinely is not.
// Resend is mocked: forwarding must never send real mail from a test.

const sent = [];
let sendResult = { data: { id: "re_fwd_1" }, error: null };

vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      this.emails = {
        send: async (options) => {
          sent.push(options);
          return sendResult;
        },
      };
    }
  },
}));

const { POST, GET } = await import("@/app/api/webhooks/resend/route");

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

// A valid Svix secret is base64 after the whsec_ prefix.
const SECRET = `whsec_${Buffer.from("whealthos-test-signing-key-0123456789").toString("base64")}`;

const signed = (payload, { secret = SECRET, id = `msg_${Math.random().toString(36).slice(2)}` } = {}) => {
  const body = JSON.stringify(payload);
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(id, timestamp, body);
  return {
    body,
    id,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  };
};

const post = (body, headers) =>
  POST(
    new Request("https://whealthos.com/api/webhooks/resend", {
      method: "POST",
      headers: new Headers(headers),
      body,
    })
  );

const inboundEvent = (over = {}) => ({
  type: "email.received",
  created_at: "2026-10-05T09:00:00.000Z",
  data: {
    from: "writer@example.test",
    to: "hello@whealthos.com",
    subject: "A question",
    text: "How do I export my transactions?",
    ...over,
  },
});

const ORIGINAL = { ...process.env };

beforeAll(async () => {
  await admin.inboundEmail.deleteMany({ where: { toAddress: "hello@whealthos.com" } });
});

beforeEach(() => {
  sent.length = 0;
  sendResult = { data: { id: "re_fwd_1" }, error: null };
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.RESEND_API_KEY = "re_fake_key";
  process.env.RESEND_FROM_EMAIL = "WHealthOS <hello@whealthos.com>";
  process.env.FEEDBACK_EMAIL = "maintainer@example.test";
});

afterAll(async () => {
  process.env = { ...ORIGINAL };
  await admin.inboundEmail.deleteMany({ where: { toAddress: "hello@whealthos.com" } });
  await admin.$disconnect();
  const { db, adminDb } = await import("@/lib/prisma");
  await db.$disconnect();
  await adminDb.$disconnect();
});

describe("authenticity", () => {
  it("accepts a correctly signed delivery", async () => {
    const { body, headers } = signed(inboundEvent());
    const res = await post(body, headers);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("rejects a missing signature", async () => {
    const { body } = signed(inboundEvent());
    const res = await post(body, { "content-type": "application/json" });
    expect(res.status).toBe(401);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const other = `whsec_${Buffer.from("a-completely-different-signing-key-99").toString("base64")}`;
    const { body, headers } = signed(inboundEvent(), { secret: other });
    const res = await post(body, headers);
    expect(res.status).toBe(401);
  });

  // The body is what is signed, so altering it after signing must fail.
  it("rejects a tampered body", async () => {
    const { headers } = signed(inboundEvent());
    const tampered = JSON.stringify(inboundEvent({ subject: "Rewritten by an attacker" }));
    const res = await post(tampered, headers);
    expect(res.status).toBe(401);
  });

  it("rejects a replayed delivery whose timestamp is old", async () => {
    const { body, headers } = signed(inboundEvent());
    const res = await post(body, {
      ...headers,
      "svix-timestamp": String(Math.floor(Date.now() / 1000) - 60 * 60 * 24),
    });
    expect(res.status).toBe(401);
  });

  // A missing secret must never be read as "skip verification".
  it("refuses everything when no secret is configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const { body, headers } = signed(inboundEvent());
    const res = await post(body, headers);
    expect(res.status).toBe(500);
  });

  it("writes nothing for an unsigned request", async () => {
    const before = await admin.inboundEmail.count();
    await post(JSON.stringify(inboundEvent()), {});
    expect(await admin.inboundEmail.count()).toBe(before);
  });

  it("refuses a method Resend does not use", async () => {
    expect((await GET()).status).toBe(405);
  });

  it("refuses an oversized body before verifying it", async () => {
    const huge = JSON.stringify({ type: "email.received", data: { text: "x".repeat(1_100_000) } });
    const res = await post(huge, { "svix-id": "a", "svix-timestamp": "1", "svix-signature": "v1,x" });
    expect(res.status).toBe(413);
  });
});

describe("event handling", () => {
  it("acknowledges an event it does not act on, rather than erroring", async () => {
    const { body, headers } = signed({ type: "email.delivered", created_at: "", data: {} });
    const res = await post(body, headers);
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("email.delivered");
    expect(sent).toHaveLength(0);
  });

  it("acknowledges a verified payload it cannot read", async () => {
    const { body, headers } = signed({ no_type_here: true });
    const res = await post(body, headers);
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
  });
});

describe("storing and forwarding", () => {
  it("stores the email and forwards it", async () => {
    const { body, headers, id } = signed(inboundEvent({ subject: "Stored once" }));
    const res = await post(body, headers);
    expect(res.status).toBe(200);

    const row = await admin.inboundEmail.findUnique({ where: { eventId: id } });
    expect(row.subject).toBe("Stored once");
    expect(row.fromAddress).toBe("writer@example.test");
    expect(row.status).toBe("FORWARDED");
    expect(row.forwardedAt).not.toBeNull();

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("maintainer@example.test");
    // Replying to the forward reaches whoever wrote in.
    expect(sent[0].replyTo).toBe("writer@example.test");
  });

  // Resend retries until it gets a 2xx, so the same delivery arrives again.
  it("processes a retried delivery exactly once", async () => {
    const { body, headers, id } = signed(inboundEvent({ subject: "Retried" }));

    const first = await post(body, headers);
    expect((await first.json()).ok).toBe(true);
    const second = await post(body, headers);
    expect(second.status).toBe(200);
    expect((await second.json()).duplicate).toBe(true);

    expect(await admin.inboundEmail.count({ where: { eventId: id } })).toBe(1);
    // The forward was sent once, not twice.
    expect(sent.filter((m) => m.subject.includes("Retried"))).toHaveLength(1);
  });

  it("treats two different deliveries as two emails", async () => {
    const a = signed(inboundEvent({ subject: "First" }));
    const b = signed(inboundEvent({ subject: "Second" }));
    await post(a.body, a.headers);
    await post(b.body, b.headers);
    expect(await admin.inboundEmail.count({ where: { eventId: { in: [a.id, b.id] } } })).toBe(2);
  });

  it("never stores the HTML part", async () => {
    const { body, headers, id } = signed(
      inboundEvent({ subject: "Nasty", html: "<script>alert(1)</script>" })
    );
    await post(body, headers);
    const row = await admin.inboundEmail.findUnique({ where: { eventId: id } });
    expect(JSON.stringify(row)).not.toContain("script");
  });

  it("records a failed forward as FAILED instead of claiming success", async () => {
    sendResult = { data: null, error: { name: "validation_error", message: "nope" } };
    const { body, headers, id } = signed(inboundEvent({ subject: "Undeliverable" }));
    const res = await post(body, headers);
    expect(res.status).toBe(200);

    const row = await admin.inboundEmail.findUnique({ where: { eventId: id } });
    expect(row.status).toBe("FAILED");
    expect(row.forwardedAt).toBeNull();
  });

  it("still stores the email when no inbox is configured", async () => {
    delete process.env.FEEDBACK_EMAIL;
    const { body, headers, id } = signed(inboundEvent({ subject: "No inbox" }));
    await post(body, headers);

    const row = await admin.inboundEmail.findUnique({ where: { eventId: id } });
    expect(row.status).toBe("FAILED");
    expect(row.error).toMatch(/FEEDBACK_EMAIL/);
    expect(sent).toHaveLength(0);
  });

  it("stores an email with no body or subject rather than failing", async () => {
    const { body, headers, id } = signed({
      type: "email.received",
      created_at: "2026-10-05T09:00:00.000Z",
      data: { from: "x@example.test", to: "hello@whealthos.com" },
    });
    const res = await post(body, headers);
    expect(res.status).toBe(200);
    const row = await admin.inboundEmail.findUnique({ where: { eventId: id } });
    expect(row.subject).toBeNull();
  });
});

// The table carries no tenant column, so its policy admits only the job runner.
describe("isolation", () => {
  it("is not readable through the restricted application role", async () => {
    const app = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    try {
      const rows = await app.inboundEmail.findMany();
      expect(rows).toHaveLength(0);
    } finally {
      await app.$disconnect();
    }
  });
});
