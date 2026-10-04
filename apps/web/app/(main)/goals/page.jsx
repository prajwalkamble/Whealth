import { getGoals } from "@/lib/queries";
import GoalsClient from "./_components/goals-client";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const goals = await getGoals();
  return <GoalsClient goals={goals} />;
}
