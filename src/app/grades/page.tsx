import { getGradesOverview } from "@/server/queries";
import { GradesCalculatorView } from "@/components/grades/GradesCalculatorView";

export default async function GradesPage() {
  const subjects = await getGradesOverview();
  return <GradesCalculatorView subjects={subjects} />;
}
