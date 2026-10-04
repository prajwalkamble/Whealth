import { getAnalytics } from "@/lib/queries";
import AnalyticsWorkspace from "./_components/analytics-workspace";

export const metadata = { title: "Analytics" };

// Filters live in the URL, so a particular view can be linked, reloaded and
// shared, and so the aggregation stays on the server where the rows already
// are. Changing a control is a navigation, not a client-side refetch.
export default async function AnalyticsPage({ searchParams }) {
  const params = await searchParams;

  const data = await getAnalytics({
    months: params?.months,
    accountId: params?.account || null,
    type: params?.type || null,
  });

  return (
    <AnalyticsWorkspace
      data={data}
      filters={{
        months: String(data.span),
        account: params?.account ?? "",
        type: params?.type ?? "",
      }}
    />
  );
}
