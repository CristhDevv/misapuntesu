import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGradesOverview } from "@/server/queries";
import { GradesCalculatorView } from "@/components/grades/GradesCalculatorView";

export default async function GradesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const subjects = await getGradesOverview(user.id);
  return <GradesCalculatorView subjects={subjects} />;
}
