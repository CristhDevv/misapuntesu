import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScheduleWeekly } from "@/server/queries";
import { ScheduleWeeklyView } from "@/components/schedule/ScheduleWeeklyView";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getScheduleWeekly(user.id);
  return <ScheduleWeeklyView data={data} />;
}
