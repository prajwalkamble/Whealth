import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";

const owner = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const app = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const A = { id: "11111111-1111-1111-1111-111111111111", clerk: "user_alice" };
const B = { id: "22222222-2222-2222-2222-222222222222", clerk: "user_bob" };
let acctA, acctB, txnA, txnB;

async function asTenant(tenantId, fn) {
  const c = await app.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    return await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

beforeAll(async () => {
  for (const u of [A, B]) {
    await owner.query(
      `INSERT INTO users (id,"clerkUserId",email,name,"imageUrl","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,'',now(),now()) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.clerk, `${u.clerk}@test.local`, u.clerk]
    );
  }
  const mk = async (u) => {
    const a = await owner.query(
      `INSERT INTO accounts (id,name,type,balance,"isDefault","userId","createdAt","updatedAt")
       VALUES (gen_random_uuid(),'Main','SAVINGS',1000,true,$1,now(),now()) RETURNING id`,
      [u.id]
    );
    const t = await owner.query(
      `INSERT INTO transactions (id,type,amount,date,category,"userId","accountId","createdAt","updatedAt")
       VALUES (gen_random_uuid(),'EXPENSE',500,now(),'food',$1,$2,now(),now()) RETURNING id`,
      [u.id, a.rows[0].id]
    );
    return [a.rows[0].id, t.rows[0].id];
  };
  [acctA, txnA] = await mk(A);
  [acctB, txnB] = await mk(B);
});

afterAll(async () => {
  await owner.query(`DELETE FROM users WHERE id = ANY($1)`, [[A.id, B.id]]);
  await owner.end();
  await app.end();
});

describe("RLS configuration", () => {
  it("every tenant table has RLS ENABLED and FORCED", async () => {
    const { rows } = await app.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
        WHERE relname IN ('users','accounts','transactions','budgets')`
    );
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.relrowsecurity, `${r.relname} ENABLE`).toBe(true);
      expect(r.relforcerowsecurity, `${r.relname} FORCE`).toBe(true);
    }
  });

  it("the application role cannot bypass RLS", async () => {
    const { rows } = await app.query(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`
    );
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });

  it("no future table ships without a policy", async () => {
    const { rows } = await app.query(
      `SELECT c.relname FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname NOT LIKE '\\_prisma%'
          AND NOT (c.relrowsecurity AND c.relforcerowsecurity)`
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });
});

describe("Tenant isolation", () => {
  it("reads only its own transactions", async () => {
    const rows = await asTenant(A.id, (c) =>
      c.query("SELECT id FROM transactions").then((r) => r.rows)
    );
    expect(rows.map((r) => r.id)).toContain(txnA);
    expect(rows.map((r) => r.id)).not.toContain(txnB);
  });

  it("cannot read another tenant's row by direct id", async () => {
    const rows = await asTenant(A.id, (c) =>
      c.query("SELECT * FROM transactions WHERE id = $1", [txnB]).then((r) => r.rows)
    );
    expect(rows).toHaveLength(0);
  });

  it("aggregates exclude other tenants", async () => {
    const n = await asTenant(A.id, (c) =>
      c.query("SELECT count(*)::int AS n FROM transactions").then((r) => r.rows[0].n)
    );
    expect(n).toBe(1);
  });

  it("joins cannot leak across tenants", async () => {
    const rows = await asTenant(A.id, (c) =>
      c.query(
        `SELECT t.id FROM transactions t
           JOIN accounts a ON a.id = t."accountId"
          WHERE a."userId" = $1`,
        [B.id]
      ).then((r) => r.rows)
    );
    expect(rows).toHaveLength(0);
  });

  it("cannot INSERT a row belonging to another tenant", async () => {
    await expect(
      asTenant(A.id, (c) =>
        c.query(
          `INSERT INTO transactions (id,type,amount,date,category,"userId","accountId","createdAt","updatedAt")
           VALUES (gen_random_uuid(),'EXPENSE',1,now(),'x',$1,$2,now(),now())`,
          [B.id, acctB]
        )
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("cannot UPDATE another tenant's row", async () => {
    const res = await asTenant(A.id, (c) =>
      c.query("UPDATE transactions SET amount = 9999 WHERE id = $1", [txnB])
    );
    expect(res.rowCount).toBe(0);
  });

  it("cannot DELETE another tenant's row", async () => {
    const res = await asTenant(A.id, (c) =>
      c.query("DELETE FROM transactions WHERE id = $1", [txnB])
    );
    expect(res.rowCount).toBe(0);
  });

  it("cannot re-parent its own row to another tenant", async () => {
    await expect(
      asTenant(A.id, (c) =>
        c.query(`UPDATE transactions SET "userId" = $1 WHERE id = $2`, [B.id, txnA])
      )
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("Fail-closed behaviour", () => {
  it("returns zero rows when tenant context is absent", async () => {
    const c = await app.connect();
    try {
      const r = await c.query("SELECT id FROM transactions");
      expect(r.rows).toHaveLength(0);
    } finally {
      c.release();
    }
  });

  it("returns zero rows when context is an empty string", async () => {
    const rows = await asTenant("", (c) =>
      c.query("SELECT id FROM transactions").then((r) => r.rows)
    );
    expect(rows).toHaveLength(0);
  });

  it("does not leak context to the next user of a pooled connection", async () => {
    const c = await app.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [A.id]);
      expect((await c.query("SELECT id FROM transactions")).rows.length).toBe(1);
      await c.query("COMMIT");
      const after = await c.query("SELECT id FROM transactions");
      expect(after.rows).toHaveLength(0);
    } finally {
      c.release();
    }
  });
});

// The cron jobs in lib/inngest/functions.js enumerate every tenant through a
// second Prisma client bound to DIRECT_URL, then narrow to one tenant with
// withTenant(). That works because the policies name the whealth_jobs role --
// not because the connecting role happens to be a SUPERUSER. If this wiring
// breaks the jobs silently process zero rows, which is exactly the failure
// this suite exists to catch.
describe("Background job access path", () => {
  it("the DIRECT_URL role is a job runner", async () => {
    const { rows } = await owner.query(
      `SELECT pg_has_role(current_user, 'whealth_jobs', 'USAGE') AS ok`
    );
    expect(
      rows[0].ok,
      "DIRECT_URL role must inherit whealth_jobs so cron jobs can enumerate tenants"
    ).toBe(true);
  });

  it("the DIRECT_URL role can read across tenants", async () => {
    const { rows } = await owner.query(
      `SELECT "userId" FROM transactions WHERE id = ANY($1)`,
      [[txnA, txnB]]
    );
    expect(rows.map((r) => r.userId).sort()).toEqual([A.id, B.id].sort());
  });

  it("does not depend on the connecting role being a superuser", async () => {
    // The whole point of the whealth_jobs branch: cross-tenant access is
    // granted explicitly, so it survives a managed Postgres that never hands
    // out SUPERUSER or BYPASSRLS.
    const { rows } = await owner.query(
      `SELECT pg_has_role(current_user, 'whealth_jobs', 'USAGE') AS granted,
              rolsuper, rolbypassrls
         FROM pg_roles WHERE rolname = current_user`
    );
    expect(rows[0].granted).toBe(true);
  });

  it("the application role is NOT a job runner", async () => {
    const { rows } = await app.query(
      `SELECT pg_has_role(current_user, 'whealth_jobs', 'USAGE') AS ok`
    );
    expect(
      rows[0].ok,
      "whealth_app must never inherit whealth_jobs -- that would defeat every policy"
    ).toBe(false);
  });

  it("the application role still cannot read across tenants", async () => {
    const rows = await asTenant(A.id, (c) =>
      c
        .query(`SELECT id FROM transactions WHERE id = ANY($1)`, [[txnA, txnB]])
        .then((r) => r.rows)
    );
    expect(rows.map((r) => r.id)).toEqual([txnA]);
  });
});
