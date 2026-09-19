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
// Apply the migrations to it first (prisma migrate deploy with the same two
// variables) and run prisma/rls-bootstrap.sql once.
loadEnv({ path: ".env.test", quiet: true });

const DATABASE_TESTS = [
  "tests/rls-isolation.test.js",
  "tests/actions-integration.test.js",
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
