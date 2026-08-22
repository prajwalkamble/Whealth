import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The RLS suite connects with the real DATABASE_URL and DIRECT_URL. Vitest does
// not read .env into process.env on its own, so without this the pg pools fall
// back to a default localhost connection and every test fails to connect.
loadEnv({ path: ".env" });

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
    // One database, shared fixtures: running the files in parallel would have
    // them clobber each other's rows.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
