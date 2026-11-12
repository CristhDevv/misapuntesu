"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  subjectSchema,
  updateSubjectSchema,
  scheduleBlockSchema,
  notePageSchema,
  updateNotePageSchema,
  taskAssignmentSchema,
  gradeItemSchema,
  updateGradeItemSchema,
  aiSettingsSchema,
  courseBookSchema,
  updateCourseBookCustomizationSchema,
  updateBookPageSchema,
  NotionBlock,
} from "@/lib/validations";
import { searchSpotlight } from "./queries";
import {
  generateDailyBriefingAI,
  generateFlashcardsAI,
  structureCornellAI,
  evaluateFeynmanAI,
  chatWithCopilotAI,
  checkAndGenerateSmartAlerts,
} from "@/lib/gemini";

type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Safe for unit test environments
  }
}

// ============================================================================
// 1. MATERIAS (SUBJECTS)
// ============================================================================

export async function getSidebarSubjectsAction(): Promise<
  Array<{ id: string; name: string; emoji: string; color: string }>
> {
  try {
    return await prisma.subject.findMany({
      select: { id: true, name: true, emoji: true, color: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createSubjectAction(
  rawData: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const validated = subjectSchema.parse(rawData);
    const subject = await prisma.subject.create({
      data: {
        name: validated.name,
        emoji: validated.emoji || "📚",
        color: validated.color || "#007AFF",
        teacherName: validated.teacherName || null,
        defaultRoom: validated.defaultRoom || null,
        passingGrade: validated.passingGrade ?? 3.0,
      },
    });

    safeRevalidate("/");
    safeRevalidate("/subjects");
    safeRevalidate("/schedule");
    safeRevalidate("/grades");
    return { success: true, data: { id: subject.id } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateSubjectAction(
  id: string,
  rawData: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const validated = updateSubjectSchema.parse(rawData);
    const subject = await prisma.subject.update({
      where: { id },
      data: validated,
    });

    safeRevalidate("/");
    safeRevalidate(`/subjects/${id}`);
    safeRevalidate("/subjects");
    safeRevalidate("/grades");
    return { success: true, data: { id: subject.id } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteSubjectAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    await prisma.subject.delete({ where: { id } });
    safeRevalidate("/");
    safeRevalidate("/subjects");
    safeRevalidate("/schedule");
    safeRevalidate("/grades");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 2. HORARIO HÍBRIDO (CLASES U + HÁBITOS + ESTUDIO EXTERNO)
// ============================================================================

export async function createScheduleBlockAction(
  rawData: unknown
): Promise<ActionResponse<{ ids: string[] }>> {
  try {
    const validated = scheduleBlockSchema.parse(rawData);

    // Si viene una lista de días (ej. hábito de Lunes a Viernes), creamos un bloque por día
    const days =
      Array.isArray(validated.daysOfWeek) && validated.daysOfWeek.length > 0
        ? validated.daysOfWeek
        : [validated.dayOfWeek || 1];

    const createdIds: string[] = [];

    for (const d of days) {
      const block = await prisma.scheduleBlock.create({
        data: {
          subjectId: validated.subjectId || null,
          blockType: validated.blockType || "UNIVERSITY_CLASS",
          customTitle: validated.customTitle || null,
          emoji: validated.emoji || null,
          color: validated.color || null,
          externalUrl: validated.externalUrl || null,
          resourceType: validated.resourceType || null,
          dayOfWeek: d,
          startTime: validated.startTime,
          endTime: validated.endTime,
          room: validated.room || null,
        },
      });
      createdIds.push(block.id);
    }

    safeRevalidate("/");
    safeRevalidate("/schedule");
    if (validated.subjectId) {
      safeRevalidate(`/subjects/${validated.subjectId}`);
    }
    return { success: true, data: { ids: createdIds } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteScheduleBlockAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    await prisma.scheduleBlock.delete({ where: { id } });
    safeRevalidate("/");
    safeRevalidate("/schedule");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// Alternar cumplimiento de hábito hoy
export async function toggleHabitCompletionAction(
  blockId: string
): Promise<ActionResponse<{ completedToday: boolean; currentStreak: number }>> {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const block = await prisma.scheduleBlock.findUnique({
      where: { id: blockId },
      include: {
        habitLogs: {
          where: { dateString: todayStr },
          take: 1,
        },
      },
    });

    if (!block) throw new Error("Bloque no encontrado");

    const alreadyDone = block.habitLogs.length > 0;

    let newStreak = block.currentStreak;
    let completedToday = false;

    if (alreadyDone) {
      // Desmarcar
      await prisma.habitLog.deleteMany({
        where: { scheduleBlockId: blockId, dateString: todayStr },
      });
      newStreak = Math.max(0, block.currentStreak - 1);
      await prisma.scheduleBlock.update({
        where: { id: blockId },
        data: {
          currentStreak: newStreak,
          lastCompletedDate: null,
        },
      });
      completedToday = false;
    } else {
      // Marcar cumplido hoy
      await prisma.habitLog.create({
        data: {
          scheduleBlockId: blockId,
          dateString: todayStr,
          completed: true,
        },
      });
      newStreak = block.currentStreak + 1;
      await prisma.scheduleBlock.update({
        where: { id: blockId },
        data: {
          currentStreak: newStreak,
          lastCompletedDate: todayStr,
        },
      });
      completedToday = true;
    }

    safeRevalidate("/");
    safeRevalidate("/schedule");
    return { success: true, data: { completedToday, currentStreak: newStreak } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 3. APUNTES ADAPTATIVOS (NOTE PAGES)
// ============================================================================

export async function createNotePageAction(
  rawData: unknown
): Promise<ActionResponse<{ id: string; subjectId: string }>> {
  try {
    const validated = notePageSchema.parse(rawData);
    const note = await prisma.notePage.create({
      data: validated,
    });

    safeRevalidate("/");
    safeRevalidate(`/subjects/${validated.subjectId}`);
    safeRevalidate("/subjects");
    return { success: true, data: { id: note.id, subjectId: note.subjectId } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateNotePageAction(
  id: string,
  rawData: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const validated = updateNotePageSchema.parse(rawData);
    const note = await prisma.notePage.update({
      where: { id },
      data: validated,
    });

    // safeRevalidate para listas pero no para la vista activa del apunte para evitar recrear el árbol de React durante la escritura
    safeRevalidate(`/subjects/${note.subjectId}`);
    safeRevalidate("/");
    return { success: true, data: { id: note.id } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateNoteMasteryAction(
  id: string,
  masteryLevel: "RED_HARD" | "YELLOW_MEDIUM" | "GREEN_READY"
): Promise<ActionResponse<boolean>> {
  try {
    const note = await prisma.notePage.update({
      where: { id },
      data: { masteryLevel },
    });

    safeRevalidate(`/subjects/${note.subjectId}/notes/${note.id}`);
    safeRevalidate(`/subjects/${note.subjectId}`);
    safeRevalidate("/");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteNotePageAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    const note = await prisma.notePage.delete({ where: { id } });
    safeRevalidate(`/subjects/${note.subjectId}`);
    safeRevalidate("/");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 4. ENTREGAS, TALLERES Y PARCIALES (TASKS)
// ============================================================================

export async function createTaskAction(
  rawData: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const validated = taskAssignmentSchema.parse(rawData);
    const task = await prisma.taskAssignment.create({
      data: validated,
    });

    safeRevalidate("/");
    safeRevalidate(`/subjects/${validated.subjectId}`);
    return { success: true, data: { id: task.id } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function toggleTaskAction(
  id: string,
  isCompleted: boolean
): Promise<ActionResponse<boolean>> {
  try {
    const task = await prisma.taskAssignment.update({
      where: { id },
      data: { isCompleted },
    });

    safeRevalidate("/");
    safeRevalidate(`/subjects/${task.subjectId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteTaskAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    const task = await prisma.taskAssignment.delete({ where: { id } });
    safeRevalidate("/");
    safeRevalidate(`/subjects/${task.subjectId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 5. CORTES Y CALIFICACIONES (GRADES)
// ============================================================================

export async function createGradeItemAction(
  rawData: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const validated = gradeItemSchema.parse(rawData);
    const grade = await prisma.gradeItem.create({
      data: {
        subjectId: validated.subjectId,
        name: validated.name,
        weightPercent: validated.weightPercent,
        score: validated.score ?? null,
        maxScore: validated.maxScore ?? 5.0,
      },
    });

    safeRevalidate("/grades");
    safeRevalidate(`/subjects/${validated.subjectId}`);
    return { success: true, data: { id: grade.id } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateGradeItemAction(
  id: string,
  rawData: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const validated = updateGradeItemSchema.parse(rawData);
    const grade = await prisma.gradeItem.update({
      where: { id },
      data: validated,
    });

    safeRevalidate("/grades");
    safeRevalidate(`/subjects/${grade.subjectId}`);
    return { success: true, data: { id: grade.id } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteGradeItemAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    const grade = await prisma.gradeItem.delete({ where: { id } });
    safeRevalidate("/grades");
    safeRevalidate(`/subjects/${grade.subjectId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 6. BUSCADOR SPOTLIGHT
// ============================================================================

export async function searchSpotlightAction(query: string) {
  try {
    const results = await searchSpotlight(query);
    return { success: true, data: results };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 7. MOTOR GEMINI AI & MAGIA EN APUNTES
// ============================================================================

export async function updateAISettingsAction(rawData: unknown): Promise<ActionResponse<boolean>> {
  try {
    const validated = aiSettingsSchema.parse(rawData);

    await prisma.aISettings.upsert({
      where: { id: "default" },
      update: {
        geminiApiKey: validated.geminiApiKey || null,
        modelName:
          validated.modelName && !validated.modelName.includes("2.5")
            ? validated.modelName
            : "gemini-3.5-flash",
        enableBrowserNotifications: validated.enableBrowserNotifications,
        studentGoal: validated.studentGoal || null,
      },
      create: {
        id: "default",
        geminiApiKey: validated.geminiApiKey || null,
        modelName:
          validated.modelName && !validated.modelName.includes("2.5")
            ? validated.modelName
            : "gemini-3.5-flash",
        enableBrowserNotifications: validated.enableBrowserNotifications,
        studentGoal: validated.studentGoal || null,
      },
    });

    safeRevalidate("/");
    safeRevalidate("/schedule");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateDailyBriefingAction(): Promise<ActionResponse<string>> {
  try {
    const briefing = await generateDailyBriefingAI();
    return { success: true, data: briefing };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateFlashcardsAction(noteId: string): Promise<
  ActionResponse<Array<{ id: string; question: string; answer: string; learned: boolean }>>
> {
  try {
    const note = await prisma.notePage.findUnique({ where: { id: noteId } });
    if (!note) throw new Error("Apunte no encontrado");

    const rawContent = note.freeContent || note.cornellCues || note.feynmanSimple || note.title;
    if (!rawContent.trim()) {
      throw new Error("El apunte debe tener algún contenido escrito para que Gemini pueda generar preguntas.");
    }

    const newCards = await generateFlashcardsAI(note.title, rawContent);

    // Guardar en la base de datos
    let existingCards: Array<{ id: string; question: string; answer: string; learned: boolean }> = [];
    try {
      existingCards = JSON.parse(note.flashcardsJson || "[]");
    } catch {}

    const updated = [...existingCards, ...newCards];
    await prisma.notePage.update({
      where: { id: noteId },
      data: {
        flashcardsJson: JSON.stringify(updated),
        studyMethod: "ACTIVE_RECALL", // Cambiar a la vista de active recall
      },
    });

    safeRevalidate(`/subjects/${note.subjectId}/notes/${note.id}`);
    return { success: true, data: newCards };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function structureCornellAction(noteId: string): Promise<
  ActionResponse<{ cornellCues: string; cornellSummary: string }>
> {
  try {
    const note = await prisma.notePage.findUnique({ where: { id: noteId } });
    if (!note) throw new Error("Apunte no encontrado");

    const rawContent = note.freeContent || note.title;
    if (!rawContent.trim()) {
      throw new Error("Escribe algunos apuntes libres de clase primero para estructurarlos en Cornell.");
    }

    const structured = await structureCornellAI(note.title, rawContent);

    await prisma.notePage.update({
      where: { id: noteId },
      data: {
        cornellCues: structured.cornellCues,
        cornellSummary: structured.cornellSummary,
        studyMethod: "CORNELL",
      },
    });

    safeRevalidate(`/subjects/${note.subjectId}/notes/${note.id}`);
    return { success: true, data: structured };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function evaluateFeynmanAction(noteId: string): Promise<
  ActionResponse<{ feedbackWell: string; feedbackErrors: string; analogySuggestion: string }>
> {
  try {
    const note = await prisma.notePage.findUnique({ where: { id: noteId } });
    if (!note) throw new Error("Apunte no encontrado");

    if (!note.feynmanSimple?.trim()) {
      throw new Error("Completa al menos el campo 'Explícalo a alguien de 12 años' antes de pedir la evaluación de Gemini.");
    }

    const evaluation = await evaluateFeynmanAI(
      note.title,
      note.feynmanSimple,
      note.feynmanGaps || "",
      note.feynmanExample || ""
    );

    return { success: true, data: evaluation };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function chatCopilotAction(
  message: string,
  history: Array<{ role: "user" | "model"; content: string }> = []
): Promise<ActionResponse<{ reply: string; actionExecuted?: string }>> {
  try {
    const res = await chatWithCopilotAI(message, history);
    safeRevalidate("/");
    safeRevalidate("/schedule");
    safeRevalidate("/subjects");
    return { success: true, data: res };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function checkSmartAlertsAction() {
  try {
    const alerts = await checkAndGenerateSmartAlerts();
    return { success: true, data: alerts };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function markNotificationReadAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    await prisma.aINotification.update({
      where: { id },
      data: { isRead: true },
    });
    safeRevalidate("/");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function clearAllNotificationsAction(): Promise<ActionResponse<boolean>> {
  try {
    await prisma.aINotification.deleteMany();
    safeRevalidate("/");
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 8. MIS CURSOS / BIBLIOTECA DE LIBROS (COURSEBOOKS)
// ============================================================================

export async function createCourseBookAction(
  rawInput: unknown
): Promise<ActionResponse<{ id: string; title: string }>> {
  try {
    const validated = courseBookSchema.parse(rawInput);

    const book = await prisma.courseBook.create({
      data: {
        title: validated.title,
        subtitle: validated.subtitle || null,
        description: validated.description || null,
        category: validated.category || "General",
        subjectId: validated.subjectId || null,
        coverColor: validated.coverColor || "#007AFF",
        coverGradient: validated.coverGradient || "from-blue-600 via-indigo-600 to-purple-700",
        coverIcon: validated.coverIcon || "📖",
        coverStyle: validated.coverStyle || "editorial",
        paperTexture: validated.paperTexture || "blank",
        fontFamily: validated.fontFamily || "sans",
        fontSize: validated.fontSize || "base",
        lineHeight: validated.lineHeight || "relaxed",
        pageLayout: validated.pageLayout || "spread",
        pageMargins: validated.pageMargins || "normal",
        pages: {
          create: {
            pageNumber: 1,
            title: "Capítulo 1: Introducción",
            blocksJson: JSON.stringify([
              {
                id: "b_" + Date.now() + "_1",
                type: "h1",
                content: validated.title,
              },
              {
                id: "b_" + Date.now() + "_2",
                type: "paragraph",
                content:
                  validated.description ||
                  "Bienvenido a este libro. Puedes editar el contenido bloque por bloque con formato enriquecido y hojear las páginas con animación 3D.",
              },
              {
                id: "b_" + Date.now() + "_3",
                type: "callout",
                content:
                  "Tip Pro: Escribe / para insertar encabezados, listas, código o notas destacadas. En pantallas grandes puedes cambiar a modo libro abierto a 2 páginas.",
                calloutIcon: "💡",
                calloutColor: "blue",
              },
            ]),
          },
        },
      },
      select: { id: true, title: true },
    });

    safeRevalidate("/books");
    return { success: true, data: book };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateCourseBookCustomizationAction(
  bookId: string,
  rawInput: unknown
): Promise<ActionResponse<boolean>> {
  try {
    const validated = updateCourseBookCustomizationSchema.parse(rawInput);

    await prisma.courseBook.update({
      where: { id: bookId },
      data: validated,
    });

    safeRevalidate("/books");
    safeRevalidate(`/books/${bookId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteCourseBookAction(
  bookId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    await prisma.courseBook.delete({
      where: { id: bookId },
    });

    safeRevalidate("/books");
    return { success: true, data: { id: bookId } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createBookPageAction(
  bookId: string,
  insertAfterPageNumber?: number
): Promise<ActionResponse<{ id: string; pageNumber: number }>> {
  try {
    const existingPages = await prisma.courseBookPage.findMany({
      where: { bookId },
      orderBy: { pageNumber: "asc" },
      select: { id: true, pageNumber: true },
    });

    let targetPageNumber = 1;

    if (insertAfterPageNumber !== undefined && insertAfterPageNumber > 0) {
      targetPageNumber = insertAfterPageNumber + 1;
      // Desplazar páginas posteriores
      for (const p of existingPages) {
        if (p.pageNumber >= targetPageNumber) {
          await prisma.courseBookPage.update({
            where: { id: p.id },
            data: { pageNumber: p.pageNumber + 1 },
          });
        }
      }
    } else {
      const maxPage = existingPages.reduce((max, p) => Math.max(max, p.pageNumber), 0);
      targetPageNumber = maxPage + 1;
    }

    const defaultBlocks: NotionBlock[] = [
      {
        id: "b_" + Date.now() + "_1",
        type: "h2",
        content: `Página ${targetPageNumber}`,
      },
      {
        id: "b_" + Date.now() + "_2",
        type: "paragraph",
        content: "",
      },
    ];

    const newPage = await prisma.courseBookPage.create({
      data: {
        bookId,
        pageNumber: targetPageNumber,
        title: `Página ${targetPageNumber}`,
        blocksJson: JSON.stringify(defaultBlocks),
      },
      select: { id: true, pageNumber: true },
    });

    // Tocar fecha de actualización del libro
    await prisma.courseBook.update({
      where: { id: bookId },
      data: { updatedAt: new Date() },
    });

    safeRevalidate(`/books/${bookId}`);
    return { success: true, data: newPage };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateBookPageBlocksAction(
  pageId: string,
  rawInput: unknown
): Promise<ActionResponse<boolean>> {
  try {
    const validated = updateBookPageSchema.parse(rawInput);

    const dataToUpdate: Record<string, unknown> = {};

    if (validated.title !== undefined) {
      dataToUpdate.title = validated.title;
    }
    if (validated.isBookmarked !== undefined) {
      dataToUpdate.isBookmarked = validated.isBookmarked;
    }
    if (validated.blocks !== undefined) {
      dataToUpdate.blocksJson = JSON.stringify(validated.blocks);
    } else if (validated.blocksJson !== undefined) {
      dataToUpdate.blocksJson = validated.blocksJson;
    }

    const updated = await prisma.courseBookPage.update({
      where: { id: pageId },
      data: dataToUpdate,
      select: { bookId: true },
    });

    await prisma.courseBook.update({
      where: { id: updated.bookId },
      data: { updatedAt: new Date() },
    });

    // Guardado silencioso sin revalidación de ruta para no reiniciar el árbol ni robar foco al escribir
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function togglePageBookmarkAction(
  pageId: string
): Promise<ActionResponse<{ isBookmarked: boolean }>> {
  try {
    const page = await prisma.courseBookPage.findUnique({
      where: { id: pageId },
      select: { isBookmarked: true, bookId: true },
    });
    if (!page) throw new Error("Página no encontrada");

    const newStatus = !page.isBookmarked;
    await prisma.courseBookPage.update({
      where: { id: pageId },
      data: { isBookmarked: newStatus },
    });

    safeRevalidate(`/books/${page.bookId}`);
    return { success: true, data: { isBookmarked: newStatus } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBookPageAction(
  pageId: string
): Promise<ActionResponse<boolean>> {
  try {
    const page = await prisma.courseBookPage.findUnique({
      where: { id: pageId },
      select: { bookId: true },
    });
    if (!page) throw new Error("Página no encontrada");

    const totalPages = await prisma.courseBookPage.count({
      where: { bookId: page.bookId },
    });

    if (totalPages <= 1) {
      throw new Error("El libro debe contener al menos una página.");
    }

    await prisma.courseBookPage.delete({
      where: { id: pageId },
    });

    // Reordenar páginas restantes (1..N)
    const remaining = await prisma.courseBookPage.findMany({
      where: { bookId: page.bookId },
      orderBy: { pageNumber: "asc" },
      select: { id: true },
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.courseBookPage.update({
        where: { id: remaining[i].id },
        data: { pageNumber: i + 1 },
      });
    }

    safeRevalidate(`/books/${page.bookId}`);
    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateCourseBookStructureAIAction(
  bookId: string,
  topic: string
): Promise<ActionResponse<{ pagesCreated: number }>> {
  try {
    const book = await prisma.courseBook.findUnique({ where: { id: bookId } });
    if (!book) throw new Error("Libro no encontrado");

    let outline: Array<{ title: string; summary: string }> = [];

    try {
      const { generateContentResilient } = await import("@/lib/gemini");
      const prompt = `
Actúa como un autor editorial y profesor universitario estructurando un libro o curso titulado "${book.title}".
Tema o enfoque específico: "${topic || book.description || book.title}".

Genera exactamente 5 capítulos/páginas estructuradas para el libro.
Responde ÚNICAMENTE en JSON válido con este formato:
[
  { "title": "Capítulo 1: ...", "summary": "Explicación breve de lo que se cubre..." }
]
`;
      const resText = (await generateContentResilient(prompt)).trim();
      const cleaned = resText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      outline = JSON.parse(cleaned);
    } catch {
      // Fallback limpio sin IA
      outline = [
        { title: "Módulo 1: Fundamentos y Conceptos Clave", summary: "Introducción y bases teóricas de " + (topic || book.title) },
        { title: "Módulo 2: Arquitectura y Componentes", summary: "Estructura principal y funcionamiento" },
        { title: "Módulo 3: Práctica y Casos de Uso", summary: "Ejemplos aplicados paso a paso" },
        { title: "Módulo 4: Errores Comunes y Buenas Prácticas", summary: "Optimización y prevención de fallos" },
        { title: "Módulo 5: Proyecto Final y Conclusiones", summary: "Consolidación de todo lo aprendido" },
      ];
    }

    const currentPagesCount = await prisma.courseBookPage.count({ where: { bookId } });

    for (let i = 0; i < outline.length; i++) {
      const pageNum = currentPagesCount + i + 1;
      const item = outline[i];
      const blocks: NotionBlock[] = [
        { id: "b_" + Date.now() + "_" + i + "_1", type: "h1", content: item.title },
        { id: "b_" + Date.now() + "_" + i + "_2", type: "paragraph", content: item.summary },
        { id: "b_" + Date.now() + "_" + i + "_3", type: "callout", content: "Objetivo de aprendizaje: Dominar los principios de esta sección.", calloutIcon: "🎯", calloutColor: "purple" },
        { id: "b_" + Date.now() + "_" + i + "_4", type: "paragraph", content: "" },
      ];

      await prisma.courseBookPage.create({
        data: {
          bookId,
          pageNumber: pageNum,
          title: item.title,
          blocksJson: JSON.stringify(blocks),
        },
      });
    }

    safeRevalidate(`/books/${bookId}`);
    return { success: true, data: { pagesCreated: outline.length } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
