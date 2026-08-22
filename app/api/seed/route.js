import { auth } from "@clerk/nextjs/server";
import { seedTransactions } from "@/actions/seed";

// Development helper. It deletes and regenerates transactions, so it is gated
// behind a session and refuses to run in production.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedTransactions();
  return Response.json(result, { status: result.success ? 200 : 400 });
}
