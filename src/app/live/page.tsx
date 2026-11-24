import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSubjectsList } from "@/server/queries";
import { prisma } from "@/lib/prisma";
import { LiveLauncherView } from "@/components/live/LiveLauncherView";

export const metadata = {
  title: "Clase en Vivo | MisApuntesU",
  description: "Toma notas rápidas en tus clases síncronas con marcas de tiempo y organización automática.",
};

export default async function LiveClassIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; title?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { subjectId, title } = await searchParams;

  // Si ya viene subjectId en la URL (desde Hoy o Materias), crear el apunte en vivo y abrirlo al instante
  if (subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, userId: true },
    });
    if (subject && (!subject.userId || subject.userId === user.id)) {
      const dateLabel = new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      });
      const note = await prisma.notePage.create({
        data: {
          subjectId: subject.id,
          title: title?.trim() || `Clase en vivo — ${dateLabel}`,
          studyMethod: "FREE",
          masteryLevel: "YELLOW_MEDIUM",
          freeContent: "",
        },
        select: { id: true },
      });
      redirect(`/live/${note.id}`);
    }
  }

  const subjects = await getSubjectsList(user.id);
  return <LiveLauncherView subjects={subjects} />;
}
