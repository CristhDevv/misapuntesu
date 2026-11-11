import { prisma } from "@/lib/prisma";
import { formatDateFull } from "@/lib/utils";

// ============================================================================
// 1. PANTALLA "HOY" (RESUMEN INTELIGENTE DEL DÍA)
// ============================================================================

export async function getTodayOverview() {
  const now = new Date();
  // En JS: 0=Domingo, 1=Lunes, 2=Martes... 6=Sábado -> convertimos a 1..7 (7 = Domingo)
  let dayOfWeek = now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;

  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const [todaySchedules, upcomingTasks, reviewNotes, allSubjects, unreadNotificationsCount] = await Promise.all([
    // Horario del día actual con logs de hoy
    prisma.scheduleBlock.findMany({
      where: { dayOfWeek },
      orderBy: { startTime: "asc" },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            emoji: true,
            color: true,
            teacherName: true,
            defaultRoom: true,
          },
        },
        habitLogs: {
          where: { dateString: todayStr },
          take: 1,
        },
      },
    }),

    // Próximos parciales y entregas
    prisma.taskAssignment.findMany({
      where: { isCompleted: false },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: {
        subject: {
          select: { id: true, name: true, emoji: true, color: true },
        },
      },
    }),

    // Para repasar hoy (Semáforo: Rojo o Amarillo)
    prisma.notePage.findMany({
      where: {
        masteryLevel: { in: ["RED_HARD", "YELLOW_MEDIUM"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        subject: {
          select: { id: true, name: true, emoji: true, color: true },
        },
      },
    }),

    // Lista de materias para accesos rápidos
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { notes: true, tasks: true } },
      },
    }),

    // Notificaciones no leídas
    prisma.aINotification.count({
      where: { isRead: false },
    }),
  ]);

  // Formatear bloques de hoy calculando si están completados hoy
  const formattedTodayBlocks = todaySchedules.map((block) => {
    const isCompletedToday =
      block.lastCompletedDate === todayStr || (block.habitLogs && block.habitLogs.length > 0);
    return {
      ...block,
      isCompletedToday,
    };
  });

  // Determinar la clase o bloque actual o próximo hoy
  let currentOrNextClass = formattedTodayBlocks.find(
    (s) => s.startTime <= currentTime && s.endTime >= currentTime
  );

  let isHappeningNow = true;
  if (!currentOrNextClass) {
    isHappeningNow = false;
    currentOrNextClass = formattedTodayBlocks.find((s) => s.startTime > currentTime);
  }

  // Si no hay más bloques hoy, tomar el primero de la jornada
  if (!currentOrNextClass && formattedTodayBlocks.length > 0) {
    currentOrNextClass = formattedTodayBlocks[0];
    isHappeningNow = false;
  }

  return {
    dayOfWeek,
    todayDateLabel: formatDateFull(now),
    currentTime,
    currentOrNextClass,
    isHappeningNow,
    todaySchedules: formattedTodayBlocks,
    upcomingTasks,
    reviewNotes,
    subjectsCount: allSubjects.length,
    allSubjects,
    unreadNotificationsCount,
  };
}

// ============================================================================
// 2. HORARIO SEMANAL (HÍBRIDO: CLASES + HÁBITOS + ESTUDIO EXTERNO)
// ============================================================================

export async function getScheduleWeekly() {
  const now = new Date();
  let dayOfWeek = now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;
  const todayStr = now.toISOString().slice(0, 10);

  const [schedulesRaw, subjects] = await Promise.all([
    prisma.scheduleBlock.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            emoji: true,
            color: true,
            teacherName: true,
            defaultRoom: true,
          },
        },
        habitLogs: {
          where: { dateString: todayStr },
          take: 1,
        },
      },
    }),

    prisma.subject.findMany({
      select: { id: true, name: true, emoji: true, color: true, defaultRoom: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const schedules = schedulesRaw.map((block) => ({
    ...block,
    isCompletedToday:
      block.lastCompletedDate === todayStr || (block.habitLogs && block.habitLogs.length > 0),
  }));

  return { schedules, subjects, currentDayOfWeek: dayOfWeek };
}

// ============================================================================
// 3. MIS MATERIAS (LISTA Y DETALLE)
// ============================================================================

export async function getSubjectsList() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      grades: true,
      notes: {
        select: { masteryLevel: true },
      },
      _count: {
        select: {
          notes: true,
          tasks: true,
          schedules: true,
        },
      },
    },
  });

  return subjects.map((sub) => {
    const gradedItems = sub.grades.filter((g) => g.score !== null);
    const totalCompletedWeight = gradedItems.reduce((acc, g) => acc + g.weightPercent, 0);
    const accumulatedScore = gradedItems.reduce(
      (acc, g) => acc + (g.score! * g.weightPercent) / 100,
      0
    );
    const currentAverage =
      totalCompletedWeight > 0 ? (accumulatedScore / totalCompletedWeight) * 100 : 0;

    const hardCount = sub.notes.filter((n) => n.masteryLevel === "RED").length;
    const readyCount = sub.notes.filter((n) => n.masteryLevel === "GREEN").length;

    return {
      ...sub,
      currentAverage: Number(currentAverage.toFixed(2)),
      accumulatedScore: Number(accumulatedScore.toFixed(2)),
      completedWeight: totalCompletedWeight,
      hardCount,
      readyCount,
    };
  });
}

export async function getSubjectDetail(id: string) {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      notes: {
        orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      },
      tasks: {
        orderBy: { dueDate: "asc" },
      },
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      grades: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!subject) return null;

  const gradedItems = subject.grades.filter((g) => g.score !== null);
  const totalCompletedWeight = gradedItems.reduce((acc, g) => acc + g.weightPercent, 0);
  const accumulatedScore = gradedItems.reduce(
    (acc, g) => acc + (g.score! * g.weightPercent) / 100,
    0
  );

  return {
    ...subject,
    accumulatedScore: Number(accumulatedScore.toFixed(2)),
    completedWeight: totalCompletedWeight,
  };
}

export async function getNoteById(id: string) {
  return prisma.notePage.findUnique({
    where: { id },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          emoji: true,
          color: true,
        },
      },
    },
  });
}

// ============================================================================
// 4. CALCULADORA "¿CUÁNTO NECESITO PARA PASAR?"
// ============================================================================

export interface SubjectGradeCalculation {
  id: string;
  name: string;
  emoji: string;
  color: string;
  passingGrade: number;
  completedWeight: number;
  remainingWeight: number;
  accumulatedScore: number;
  currentAverageOverGraded: number;
  neededScoreOnRemaining: number | null;
  statusType: "ALREADY_PASSED" | "ON_TRACK" | "ATTENTION" | "CRITICAL" | "IMPOSSIBLE";
  statusBadge: string;
  statusMessage: string;
  grades: Array<{
    id: string;
    name: string;
    weightPercent: number;
    score: number | null;
    maxScore: number;
  }>;
}

export async function getGradesOverview(): Promise<SubjectGradeCalculation[]> {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      grades: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return subjects.map((sub) => {
    const graded = sub.grades.filter((g) => g.score !== null);
    const completedWeight = graded.reduce((acc, g) => acc + g.weightPercent, 0);
    const remainingWeight = Math.max(0, 100 - completedWeight);

    const accumulatedScore = graded.reduce(
      (acc, g) => acc + (g.score! * g.weightPercent) / 100,
      0
    );

    const currentAverageOverGraded =
      completedWeight > 0 ? (accumulatedScore / completedWeight) * 100 : 0;

    let neededScoreOnRemaining: number | null = null;
    let statusType: SubjectGradeCalculation["statusType"] = "ON_TRACK";
    let statusBadge = "En Camino";
    let statusMessage = "";

    const passingGrade = sub.passingGrade;

    if (accumulatedScore >= passingGrade) {
      statusType = "ALREADY_PASSED";
      statusBadge = "¡Materia Asegurada!";
      statusMessage = `🎉 Ya tienes ${accumulatedScore.toFixed(2)} acumulado. ¡Has superado la nota mínima de ${passingGrade.toFixed(1)} sin importar lo que falte!`;
    } else if (remainingWeight <= 0) {
      statusType = "IMPOSSIBLE";
      statusBadge = "Reprobada";
      statusMessage = `Semestre cerrado. Tu nota final acumulada es ${accumulatedScore.toFixed(2)} (Mínima requerida: ${passingGrade.toFixed(1)}).`;
    } else {
      const scoreGap = passingGrade - accumulatedScore;
      neededScoreOnRemaining = (scoreGap / remainingWeight) * 100;

      if (neededScoreOnRemaining <= 3.0) {
        statusType = "ON_TRACK";
        statusBadge = "Vas bien 🟢";
        statusMessage = `Necesitas sacar mínimo ${neededScoreOnRemaining.toFixed(2)} en el ${remainingWeight}% restante para pasar con ${passingGrade.toFixed(1)}.`;
      } else if (neededScoreOnRemaining <= 4.0) {
        statusType = "ATTENTION";
        statusBadge = "Apretar el paso 🟡";
        statusMessage = `Necesitas sacar ${neededScoreOnRemaining.toFixed(2)} en el ${remainingWeight}% restante. ¡Concéntrate en el próximo parcial!`;
      } else if (neededScoreOnRemaining <= 5.0) {
        statusType = "CRITICAL";
        statusBadge = "Zona de Riesgo 🔴";
        statusMessage = `¡Atención! Necesitas un ${neededScoreOnRemaining.toFixed(2)} sobre 5.0 en lo que falta para salvar la materia.`;
      } else {
        statusType = "IMPOSSIBLE";
        statusBadge = "Matemáticamente Imposible ❌";
        statusMessage = `Requerirías sacar ${neededScoreOnRemaining.toFixed(2)} en el ${remainingWeight}% restante (supera el 5.0 máximo).`;
      }
    }

    return {
      id: sub.id,
      name: sub.name,
      emoji: sub.emoji,
      color: sub.color,
      passingGrade,
      completedWeight,
      remainingWeight,
      accumulatedScore: Number(accumulatedScore.toFixed(2)),
      currentAverageOverGraded: Number(currentAverageOverGraded.toFixed(2)),
      neededScoreOnRemaining:
        neededScoreOnRemaining !== null ? Number(neededScoreOnRemaining.toFixed(2)) : null,
      statusType,
      statusBadge,
      statusMessage,
      grades: sub.grades,
    };
  });
}

// ============================================================================
// 5. BÚSQUEDA SPOTLIGHT (CMD + K)
// ============================================================================

export async function searchSpotlight(query: string) {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return { subjects: [], notes: [], tasks: [], books: [], bookPages: [] };
  }

  const [subjects, notes, tasks, books, bookPages] = await Promise.all([
    prisma.subject.findMany({
      where: {
        OR: [
          { name: { contains: clean } },
          { teacherName: { contains: clean } },
          { defaultRoom: { contains: clean } },
        ],
      },
      take: 5,
    }),

    prisma.notePage.findMany({
      where: {
        OR: [
          { title: { contains: clean } },
          { freeContent: { contains: clean } },
          { cornellCues: { contains: clean } },
          { cornellSummary: { contains: clean } },
          { feynmanSimple: { contains: clean } },
        ],
      },
      take: 8,
      include: {
        subject: {
          select: { id: true, name: true, emoji: true, color: true },
        },
      },
    }),

    prisma.taskAssignment.findMany({
      where: {
        title: { contains: clean },
      },
      take: 5,
      include: {
        subject: {
          select: { id: true, name: true, emoji: true, color: true },
        },
      },
    }),

    prisma.courseBook.findMany({
      where: {
        OR: [
          { title: { contains: clean } },
          { subtitle: { contains: clean } },
          { description: { contains: clean } },
          { category: { contains: clean } },
        ],
      },
      take: 4,
    }),

    prisma.courseBookPage.findMany({
      where: {
        OR: [
          { title: { contains: clean } },
          { blocksJson: { contains: clean } },
        ],
      },
      take: 4,
      include: {
        book: {
          select: { id: true, title: true, coverIcon: true, coverColor: true },
        },
      },
    }),
  ]);

  return { subjects, notes, tasks, books, bookPages };
}

// ============================================================================
// 6. CONSULTAS DE GEMINI AI & NOTIFICACIONES
// ============================================================================

export async function getAISettingsQuery() {
  const settings = await prisma.aISettings.findUnique({
    where: { id: "default" },
  });

  return {
    geminiApiKey: settings?.geminiApiKey || "",
    modelName:
      settings?.modelName && !settings.modelName.includes("2.5")
        ? settings.modelName
        : "gemini-3.5-flash",
    enableBrowserNotifications: settings?.enableBrowserNotifications ?? true,
    studentGoal: settings?.studentGoal || "",
    hasEnvKey: Boolean(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY),
  };
}

export async function getAINotificationsQuery() {
  return prisma.aINotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}

// ============================================================================
// 7. MIS CURSOS / BIBLIOTECA DE LIBROS (COURSEBOOKS)
// ============================================================================

export async function getCourseBooksList() {
  const books = await prisma.courseBook.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      subject: {
        select: { id: true, name: true, emoji: true, color: true },
      },
      _count: {
        select: { pages: true },
      },
    },
  });

  return books;
}

export async function getCourseBookById(bookId: string) {
  const book = await prisma.courseBook.findUnique({
    where: { id: bookId },
    include: {
      subject: {
        select: { id: true, name: true, emoji: true, color: true },
      },
      pages: {
        orderBy: { pageNumber: "asc" },
      },
      _count: {
        select: { pages: true },
      },
    },
  });

  return book;
}
