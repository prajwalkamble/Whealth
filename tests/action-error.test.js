import { describe, it, expect, vi } from "vitest";
import { ActionError, GENERIC_ACTION_ERROR, runAction } from "@/lib/action-error";

describe("runAction", () => {
  it("passes a successful result through", async () => {
    expect(await runAction(async () => ({ success: true, data: 1 }))).toEqual({
      success: true,
      data: 1,
    });
  });

  it("returns an ActionError's message instead of throwing it", async () => {
    const result = await runAction(async () => {
      throw new ActionError("Amount must be greater than zero");
    });
    expect(result).toEqual({
      success: false,
      error: "Amount must be greater than zero",
    });
  });

  it.each([
    "NEXT_REDIRECT;replace;/sign-in;307;",
    "NEXT_NOT_FOUND",
    "DYNAMIC_SERVER_USAGE",
  ])("re-throws Next's control-flow error %s instead of swallowing it", async (digest) => {
    // redirect() and notFound() report themselves by throwing; catching them
    // would turn a redirect into a silent "Something went wrong".
    const control = Object.assign(new Error("control flow"), { digest });
    await expect(
      runAction(async () => {
        throw control;
      })
    ).rejects.toBe(control);
  });

  it("hides the message of anything else and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runAction(async () => {
      throw new Error('relation "users" does not exist at character 15');
    });
    expect(result).toEqual({ success: false, error: GENERIC_ACTION_ERROR });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
