import { getTodayOverview } from "@/server/queries";
import { TodayView } from "@/components/home/TodayView";

export default async function HomePage() {
  const data = await getTodayOverview();
  return <TodayView data={data} />;
}
