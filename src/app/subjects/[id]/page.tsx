import { notFound } from "next/navigation";
import { getSubjectDetail } from "@/server/queries";
import { SubjectDetailView } from "@/components/subjects/SubjectDetailView";

export default async function SubjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ noteId?: string }>;
}) {
  const { id } = await params;
  const { noteId } = await searchParams;

  const subject = await getSubjectDetail(id);
  if (!subject) {
    notFound();
  }

  return <SubjectDetailView subject={subject} initialNoteId={noteId} />;
}
