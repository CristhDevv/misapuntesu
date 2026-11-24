import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseBooksList, getNoteById } from "@/server/queries";
import { LiveClassView } from "@/components/live/LiveClassView";

export default async function LiveClassNotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { noteId } = await params;
  const [note, books] = await Promise.all([
    getNoteById(noteId, user.id),
    getCourseBooksList(user.id),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <LiveClassView
      note={{
        id: note.id,
        subjectId: note.subjectId,
        title: note.title,
        freeContent: note.freeContent,
        attachmentsJson: note.attachmentsJson,
        subject: {
          id: note.subject.id,
          name: note.subject.name,
          emoji: note.subject.emoji,
          color: note.subject.color,
        },
      }}
      books={books.map((b) => ({
        id: b.id,
        title: b.title,
        coverIcon: b.coverIcon,
        subjectId: b.subjectId,
      }))}
    />
  );
}
