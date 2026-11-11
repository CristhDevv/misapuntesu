import { getSubjectsList } from "@/server/queries";
import { SubjectsListView } from "@/components/subjects/SubjectsListView";

export default async function SubjectsPage() {
  const subjects = await getSubjectsList();
  return <SubjectsListView subjects={subjects} />;
}
