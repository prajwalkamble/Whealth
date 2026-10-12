import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The database suites create and delete rows. They used to read .env, which
// points at the production database, so `pnpm test` wrote test fixtures into
// production. They now read only .env.test -- or DATABASE_URL / DIRECT_URL
// set explicitly in the shell -- and never .env.
//
//   .env.test
//     DATABASE_URL=postgresql://whealth_app:...@127.0.0.1:5432/whealth_test
//     DIRECT_URL=postgresql://owner:...@127.0.0.1:5432/whealth_test
//
// A disposable local one is enough, and docker is the quickest route:
//
//   docker run -d --name whealth-test-db -e POSTGRES_PASSWORD=testpw \
//     -e POSTGRES_DB=whealth_test -p 55432:5432 postgres:17-alpine
//   DATABASE_URL=postgresql://postgres:testpw@127.0.0.1:55432/whealth_test \
//     DIRECT_URL=$DATABASE_URL \
//     pnpm --filter @whealthos/database exec prisma migrate deploy
//   psql "$DIRECT_URL" -v app_password=testapppw \
//     -f database/prisma/rls-bootstrap.sql
//
// Then point DATABASE_URL at the whealth_app role and DIRECT_URL at the owner.
loadEnv({ path: ".env.test", quiet: true });

const DATABASE_TESTS = [
  "tests/rls-isolation.test.js",
  "tests/actions-integration.test.js",
  "tests/import-integration.test.js",
  "tests/webhook-integration.test.js",
  "tests/consent-integration.test.js",
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const testDatabase = ["DATABASE_URL", "DIRECT_URL"].map((key) => ({
  key,
  url: process.env[key],
}));
const hasTestDatabase = testDatabase.every(({ url }) => Boolean(url));

if (hasTestDatabase && process.env.ALLOW_REMOTE_TEST_DB !== "1") {
  for (const { key, url } of testDatabase) {
    const host = new URL(url).hostname;
    if (!LOCAL_HOSTS.has(host)) {
      throw new Error(
        `${key} points at ${host}. The database tests create and delete ` +
          "rows, so they only run against a local database. Use a local " +
          "one in .env.test, or set ALLOW_REMOTE_TEST_DB=1 if this host " +
          "really is a disposable test database."
      );
    }
  }
}

if (!hasTestDatabase) {
  console.warn(
    "No test database configured (.env.test): skipping " +
      DATABASE_TESTS.join(", ")
  );
}

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // The server actions import through the same "@/..." alias jsconfig.json
    // gives Next, so the action suite needs it resolved here too.
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    exclude: hasTestDatabase ? [] : DATABASE_TESTS,
    // One database, shared fixtures: running the files in parallel would have
    // them clobber each other's rows.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
