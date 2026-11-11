import { getScheduleWeekly } from "@/server/queries";
import { ScheduleWeeklyView } from "@/components/schedule/ScheduleWeeklyView";

export default async function SchedulePage() {
  const data = await getScheduleWeekly();
  return <ScheduleWeeklyView data={data} />;
}
