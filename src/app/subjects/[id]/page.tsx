import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSubjectDetail } from "@/server/queries";
import { SubjectDetailView } from "@/components/subjects/SubjectDetailView";

export default async function SubjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ noteId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { noteId } = await searchParams;

  const subject = await getSubjectDetail(id, user.id);
  if (!subject) {
    notFound();
  }

  return <SubjectDetailView subject={subject} initialNoteId={noteId} />;
}
