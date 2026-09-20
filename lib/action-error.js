// An error whose message is written for the user and safe to show them:
// validation failures, "not found", rate limits. Anything else -- a Prisma
// error, a network failure -- is reported as a generic failure instead, since
// its message can carry query or infrastructure details.
export class ActionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ActionError";
  }
}

export const GENERIC_ACTION_ERROR = "Something went wrong. Please try again.";

// Runs the body of a server action that the browser calls, and turns a
// failure into a returned { success: false, error } instead of a throw.
//
// Returning matters: in production Next.js replaces the message of any error
// a server action throws with a generic one, so every "Amount must be greater
// than zero" or "Too many requests" the user was meant to see arrived as the
// same unhelpful text. A returned value crosses the wire intact.
// Next signals control flow by throwing: redirect(), notFound(), and the
// "this route cannot be static" error all arrive here as exceptions carrying a
// digest. Catching them would turn a redirect into a silent failure, so they
// are passed straight through.
const NEXT_CONTROL_FLOW =
  /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE)/;

const isNextControlFlow = (error) =>
  typeof error?.digest === "string" && NEXT_CONTROL_FLOW.test(error.digest);

export async function runAction(fn) {
  try {
    return await fn();
  } catch (error) {
    if (isNextControlFlow(error)) throw error;

    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    console.error("Server action failed:", error);
    return { success: false, error: GENERIC_ACTION_ERROR };
  }
}
