import { getCardsPageData } from "@/lib/queries";
import CardsClient from "./_components/cards-client";

export const metadata = { title: "Cards" };

// One transaction for both reads. Two concurrent withCurrentTenant calls meant
// two interactive transactions competing for pool connections on every load.
export default async function CardsPage() {
  const { cards, accounts } = await getCardsPageData();
  return <CardsClient cards={cards} accounts={accounts} />;
}
