import { notFound } from "next/navigation";
import { getNoteById } from "@/server/queries";
import { AdaptiveNotebookView } from "@/components/notes/AdaptiveNotebookView";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { noteId } = await params;
  const note = await getNoteById(noteId);

  if (!note) {
    notFound();
  }

  return (
    <div className="apple-card p-5 sm:p-7 rounded-3xl border border-black/5 bg-white shadow-xs max-w-4xl mx-auto">
      <AdaptiveNotebookView note={note} isSplitView={false} />
    </div>
  );
}
