import { describe, it, expect, beforeEach, vi } from "vitest";

const { isStaleBuildError, reloadOnceForStaleBuild, clearStaleBuildFlag } =
  await import("@/lib/chunk-error");

// The error class that reset() cannot fix: the running page references chunk
// filenames the server no longer has, so re-rendering requests the same
// missing file and the "Try again" button loops forever.
describe("recognising a stale build", () => {
  it.each([
    ["ChunkLoadError", "Loading chunk 243 failed."],
    ["Error", "Failed to load chunk /_next/static/chunks/node_modules__pnpm_c50a40ce._.js"],
    ["TypeError", "error loading dynamically imported module: /_next/static/chunks/x.js"],
    ["TypeError", "Importing a module script failed."],
    ["TypeError", "Failed to fetch dynamically imported module"],
    ["Error", "Loading CSS chunk 7 failed."],
  ])("recognises %s: %s", (name, message) => {
    expect(isStaleBuildError({ name, message })).toBe(true);
  });

  // An ordinary application failure must still reach the error screen and its
  // digest, not be silently reloaded away.
  it.each([
    ["TypeError", "Cannot read properties of undefined (reading 'findMany')"],
    ["Error", "Something went wrong. Please try again."],
    ["Error", "Too many requests"],
    ["ActionError", "Amount must be greater than zero"],
  ])("leaves %s: %s alone", (name, message) => {
    expect(isStaleBuildError({ name, message })).toBe(false);
  });

  it("handles a missing or malformed error without throwing", () => {
    expect(isStaleBuildError(null)).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
    expect(isStaleBuildError({})).toBe(false);
  });
});

describe("reloading once", () => {
  let reload;

  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    });
    reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });
  });

  it("reloads the first time", () => {
    expect(reloadOnceForStaleBuild()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // The guard that matters: without it a genuinely missing chunk would reload
  // the page forever.
  it("refuses to reload a second time", () => {
    reloadOnceForStaleBuild();
    expect(reloadOnceForStaleBuild()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("allows another reload once the app has rendered again", () => {
    reloadOnceForStaleBuild();
    clearStaleBuildFlag();
    expect(reloadOnceForStaleBuild()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  // A private window throws on every storage access. Reloading blind there
  // risks a loop, so the error screen is shown instead.
  it("shows the error screen rather than looping when storage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    });
    expect(reloadOnceForStaleBuild()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not throw when clearing with storage blocked", () => {
    vi.stubGlobal("sessionStorage", {
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => clearStaleBuildFlag()).not.toThrow();
  });
});
