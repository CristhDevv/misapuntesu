import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSubjectsList } from "@/server/queries";
import { SubjectsListView } from "@/components/subjects/SubjectsListView";

export default async function SubjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const subjects = await getSubjectsList(user.id);
  return <SubjectsListView subjects={subjects} />;
}
