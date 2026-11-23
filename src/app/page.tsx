import { getCurrentUser } from "@/lib/auth";
import { getTodayOverview } from "@/server/queries";
import { TodayView } from "@/components/home/TodayView";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <LandingPage />;
  }

  const data = await getTodayOverview(user.id);
  return <TodayView data={data} />;
}
