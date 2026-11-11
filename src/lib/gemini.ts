import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";

// ============================================================================
// 1. CONFIGURACIÓN Y CLIENTE GEMINI
// ============================================================================

export async function getGeminiConfig() {
  const settings = await prisma.aISettings.findUnique({
    where: { id: "default" },
  });

  const apiKey =
    settings?.geminiApiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    "";

  let modelName = settings?.modelName || "gemini-3.5-flash";
  if (modelName.includes("2.5")) {
    modelName = "gemini-3.5-flash";
  }

  const studentGoal = settings?.studentGoal || "Aprobar todas mis materias con promedio alto y sostener mis hábitos diarios.";
  const enableBrowserNotifications = settings?.enableBrowserNotifications ?? true;

  return {
    apiKey,
    modelName,
    studentGoal,
    enableBrowserNotifications,
    hasKey: Boolean(apiKey),
  };
}

export async function getGeminiModel(customModel?: string) {
  const config = await getGeminiConfig();
  if (!config.apiKey) {
    throw new Error(
      "No se ha configurado la API Key de Google Gemini. Por favor agrégala en 'Configurar Gemini AI' o en tu archivo .env como GEMINI_API_KEY."
    );
  }
  const genAI = new GoogleGenerativeAI(config.apiKey);
  return genAI.getGenerativeModel({ model: customModel || config.modelName });
}

export async function generateContentResilient(
  prompt: string,
  customModel?: string
): Promise<string> {
  const config = await getGeminiConfig();
  if (!config.apiKey) {
    throw new Error(
      "No se ha configurado la API Key de Google Gemini. Por favor agrégala en 'Configurar Gemini AI' o en tu archivo .env como GEMINI_API_KEY."
    );
  }

  const genAI = new GoogleGenerativeAI(config.apiKey);
  const preferred = (customModel || config.modelName || "").trim();
  const validPreferred =
    preferred && !preferred.includes("2.5") ? preferred : "gemini-3.5-flash";

  const candidateModels = Array.from(
    new Set([
      validPreferred,
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3-flash-preview",
    ])
  );

  let lastError: unknown = null;

  for (const m of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      lastError = err;
      // Continuar al siguiente modelo disponible ante cualquier error (404, deprecado, quota, etc.)
      continue;
    }
  }

  throw (
    lastError ||
    new Error("No se pudo obtener respuesta de ningún modelo de Gemini disponible.")
  );
}

// ============================================================================
// 2. CONTEXT BUILDER (EL CEREBRO DEL ESTUDIANTE)
// ============================================================================

export async function buildStudentContext() {
  const now = new Date();
  // 1 = Lunes .. 7 = Domingo
  let dayOfWeek = now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;

  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const [settings, todayBlocks, upcomingTasks, reviewNotes, subjects] = await Promise.all([
    prisma.aISettings.findUnique({ where: { id: "default" } }),

    prisma.scheduleBlock.findMany({
      where: { dayOfWeek },
      orderBy: { startTime: "asc" },
      include: {
        subject: { select: { name: true, emoji: true, color: true } },
        habitLogs: {
          where: { dateString: todayStr },
          take: 1,
        },
      },
    }),

    prisma.taskAssignment.findMany({
      where: { isCompleted: false },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: {
        subject: { select: { name: true, emoji: true } },
      },
    }),

    prisma.notePage.findMany({
      where: { masteryLevel: { in: ["RED_HARD", "YELLOW_MEDIUM"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        subject: { select: { name: true, emoji: true } },
      },
    }),

    prisma.subject.findMany({
      include: {
        grades: true,
        _count: { select: { notes: true, tasks: true } },
      },
    }),
  ]);

  const scheduleSummary = todayBlocks.map((b) => {
    const isCompletedToday = b.lastCompletedDate === todayStr || (b.habitLogs && b.habitLogs.length > 0);
    return {
      id: b.id,
      tipo: b.blockType,
      titulo: b.blockType === "UNIVERSITY_CLASS" ? b.subject?.name : b.customTitle,
      horario: `${b.startTime} - ${b.endTime}`,
      salon: b.room,
      rachaDias: b.currentStreak,
      completadoHoy: isCompletedToday,
      enlaceExterno: b.externalUrl,
    };
  });

  const tasksSummary = upcomingTasks.map((t) => ({
    titulo: t.title,
    materia: t.subject.name,
    tipo: t.type,
    fechaLimite: t.dueDate.toISOString().slice(0, 10),
  }));

  const reviewSummary = reviewNotes.map((n) => ({
    titulo: n.title,
    materia: n.subject.name,
    metodo: n.studyMethod,
    estado: n.masteryLevel === "RED_HARD" ? "Me cuesta mucho (Rojo)" : "Repasando (Amarillo)",
  }));

  const gradesSummary = subjects.map((s) => {
    const graded = s.grades.filter((g) => g.score !== null);
    const completedWeight = graded.reduce((acc, g) => acc + g.weightPercent, 0);
    const accumulated = graded.reduce((acc, g) => acc + (g.score! * g.weightPercent) / 100, 0);
    return {
      materia: s.name,
      acumulado: Number(accumulated.toFixed(2)),
      pesoEvaluado: completedWeight,
      paraAprobar: s.passingGrade,
    };
  });

  return {
    fechaHoraActual: {
      fecha: todayStr,
      diaSemanaNumero: dayOfWeek,
      hora: currentTime,
    },
    metaEstudiante: settings?.studentGoal || "Pasar el semestre con excelencia y mantener hábitos.",
    horarioDeHoy: scheduleSummary,
    proximosParcialesYEntregas: tasksSummary,
    temasPendientesDeRepaso: reviewSummary,
    rendimientoMaterias: gradesSummary,
  };
}

// ============================================================================
// 3. GENERACIÓN DE BRIEFING DIARIO
// ============================================================================

export async function generateDailyBriefingAI(): Promise<string> {
  const context = await buildStudentContext();

  const prompt = `
Actúa como un mentor universitario y coach de alto rendimiento, empático, directo, conciso, claro y motivador.
El estudiante tiene el siguiente contexto real de hoy:
${JSON.stringify(context, null, 2)}

Genera un 'Daily Briefing' de 3 puntos breves y estratégicos con viñetas:
1. 🎯 **Foco Principal del Día:** (Clase clave, parcial cercano o entrega prioritaria hoy/mañana).
2. 🔥 **Hábito o Estudio Autónomo:** (Qué hábito no debe saltarse hoy para proteger su racha, o sugerencia de hora libre).
3. 💡 **Repaso Rápido Sugerido:** (Qué apunte que le cuesta repasar antes de que se acumule).

Formato: Markdown con emojis expresivos, sin introducciones largas ni rodeos. Máximo 130 palabras en total.
`;

  return generateContentResilient(prompt);
}

// ============================================================================
// 4. MAGIA EN APUNTES: GENERAR ACTIVE RECALL (FLASHCARDS)
// ============================================================================

export async function generateFlashcardsAI(
  noteTitle: string,
  content: string
): Promise<Array<{ id: string; question: string; answer: string; learned: boolean }>> {
  const prompt = `
Eres un profesor universitario experto en evaluación de aprendizaje y Active Recall.
A partir de este apunte universitario titulado "${noteTitle}":

"""
${content.slice(0, 4000)}
"""

Genera exactamente 5 tarjetas de Pregunta-Respuesta (Active Recall) de nivel universitario:
- Preguntas conceptuales, aplicadas o de razonamiento que suelen salir en exámenes parciales.
- Respuestas directas, precisas y memorables (máximo 2 a 3 líneas por respuesta).

Responde ÚNICAMENTE con un JSON válido en este formato exacto, sin bloques de código markdown ni texto adicional:
[
  { "question": "¿...?", "answer": "..." }
]
`;

  const text = (await generateContentResilient(prompt)).trim();
  const cleaned = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.map((item: { question: string; answer: string }, idx: number) => ({
      id: "fc_gen_" + Date.now() + "_" + idx,
      question: item.question,
      answer: item.answer,
      learned: false,
    }));
  } catch {
    throw new Error("No se pudo interpretar el formato JSON de las flashcards generado por Gemini.");
  }
}

// ============================================================================
// 5. MAGIA EN APUNTES: ESTRUCTURAR EN MÉTODO CORNELL
// ============================================================================

export async function structureCornellAI(
  noteTitle: string,
  rawContent: string
): Promise<{ cornellCues: string; cornellSummary: string }> {
  const prompt = `
A partir de los siguientes apuntes de clase sobre "${noteTitle}":
"""
${rawContent.slice(0, 4000)}
"""

Aplica la técnica de toma de apuntes Cornell:
1. Ideas Clave y Preguntas (Cues): Preguntas de examen, términos fundamentales o conceptos detonantes separados por saltos de línea (una por línea).
2. Resumen (Summary): Un resumen síntesis de exactamente 3 líneas de alta densidad cognitiva.

Responde ÚNICAMENTE en formato JSON plano:
{
  "cornellCues": "• Idea 1\\n• Idea 2\\n• Pregunta clave",
  "cornellSummary": "Línea 1...\\nLínea 2...\\nLínea 3..."
}
`;

  const text = (await generateContentResilient(prompt)).trim();
  const cleaned = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

  return JSON.parse(cleaned);
}

// ============================================================================
// 6. MAGIA EN APUNTES: EVALUAR EXPLICACIÓN FEYNMAN
// ============================================================================

export async function evaluateFeynmanAI(
  noteTitle: string,
  simple: string,
  gaps: string,
  example: string
): Promise<{
  feedbackWell: string;
  feedbackErrors: string;
  analogySuggestion: string;
}> {
  const prompt = `
Evalúa la aplicación del Método Feynman para el tema "${noteTitle}".
El estudiante escribió:
- Explicación sencilla (para un niño de 12 años): "${simple}"
- Dudas o partes donde se trabó: "${gaps}"
- Ejemplo de la vida real o analogía: "${example}"

Da tu evaluación pedagógica en JSON con 3 campos:
1. "feedbackWell": Qué entendió con maestría y qué lenguaje simple usó bien.
2. "feedbackErrors": Qué concepto quedó inexacto, vago o le falta rigor para el parcial.
3. "analogySuggestion": Una analogía brillante de la vida real para recordar la idea sin olvidar la base técnica.

Responde ÚNICAMENTE con JSON plano:
{
  "feedbackWell": "...",
  "feedbackErrors": "...",
  "analogySuggestion": "..."
}
`;

  const text = (await generateContentResilient(prompt)).trim();
  const cleaned = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

  return JSON.parse(cleaned);
}

// ============================================================================
// 7. CO-PILOT CON EJECUCIÓN DE ACCIONES (FUNCTION CALLING / CHAT INTELIGENTE)
// ============================================================================

export async function chatWithCopilotAI(
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }> = []
): Promise<{ reply: string; actionExecuted?: string }> {
  const context = await buildStudentContext();

  const systemInstructions = `
Eres el Copiloto Inteligente de "El Cuaderno Adaptativo", un asistente universitario y de vida proactivo, inteligente y empático.
Tienes acceso al estado completo del estudiante:
${JSON.stringify(context, null, 2)}

Instrucciones:
1. Responde de forma concisa, elegante y útil.
2. Si el usuario te pide una acción concreta en la base de datos (por ejemplo: agregar un hábito, crear una clase, agregar una entrega/parcial, o crear un apunte), incluye al FINAL de tu respuesta un bloque especial en JSON delimitado por <<<ACTION>>> y <<</ACTION>>>.

Formatos de acciones admitidas:
- Crear Hábito / Clase / Bloque de Horario:
<<<ACTION>>>
{
  "type": "CREATE_SCHEDULE_BLOCK",
  "data": {
    "blockType": "HABIT" | "EXTERNAL_STUDY" | "UNIVERSITY_CLASS",
    "customTitle": "Nombre del hábito o estudio",
    "emoji": "🔥",
    "color": "#FF9500",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "19:00",
    "endTime": "20:00",
    "externalUrl": "https://..." (opcional)
  }
}
<<</ACTION>>>

- Crear Tarea o Parcial:
<<<ACTION>>>
{
  "type": "CREATE_TASK",
  "data": {
    "subjectName": "Nombre de la materia",
    "title": "Nombre de la entrega",
    "type": "EXAM" | "HOMEWORK" | "QUIZ" | "READING",
    "daysFromNow": 3
  }
}
<<</ACTION>>>

Si no hay acción que ejecutar, solo responde con tu mensaje.
`;

  const prompt = `${systemInstructions}\n\nHistorial reciente:\n${history
    .map((h) => `${h.role === "user" ? "Estudiante" : "Copiloto"}: ${h.content}`)
    .join("\n")}\n\nEstudiante: ${userMessage}\nCopiloto:`;

  let replyText = await generateContentResilient(prompt);

  // Detectar y procesar acción
  let actionExecutedDescription: string | undefined = undefined;
  const actionRegex = /<<<ACTION>>>([\s\S]*?)<<<\/ACTION>>>/;
  const match = replyText.match(actionRegex);

  if (match && match[1]) {
    try {
      const actionPayload = JSON.parse(match[1].trim());

      if (actionPayload.type === "CREATE_SCHEDULE_BLOCK") {
        const d = actionPayload.data;
        const days = Array.isArray(d.daysOfWeek) && d.daysOfWeek.length > 0 ? d.daysOfWeek : [1];

        // Crear bloques para cada día especificado
        for (const day of days) {
          await prisma.scheduleBlock.create({
            data: {
              blockType: d.blockType || "HABIT",
              customTitle: d.customTitle || "Nuevo Hábito",
              emoji: d.emoji || (d.blockType === "HABIT" ? "🔥" : "🚀"),
              color: d.color || "#FF9500",
              dayOfWeek: Number(day),
              startTime: d.startTime || "08:00",
              endTime: d.endTime || "09:00",
              externalUrl: d.externalUrl || null,
            },
          });
        }
        actionExecutedDescription = `Bloque '${d.customTitle}' creado para ${days.length} día(s).`;
      } else if (actionPayload.type === "CREATE_TASK") {
        const d = actionPayload.data;
        const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
        const targetSub =
          subjects.find((s) => s.name.toLowerCase().includes((d.subjectName || "").toLowerCase())) ||
          subjects[0];

        if (targetSub) {
          const due = new Date();
          due.setDate(due.getDate() + (Number(d.daysFromNow) || 3));
          await prisma.taskAssignment.create({
            data: {
              subjectId: targetSub.id,
              title: d.title || "Nueva Entrega",
              type: d.type || "HOMEWORK",
              dueDate: due,
            },
          });
          actionExecutedDescription = `Entrega '${d.title}' registrada en ${targetSub.name}.`;
        }
      }
    } catch (err) {
      console.error("Error ejecutando acción de copiloto:", err);
    }

    // Limpiar el JSON de acción para que el estudiante no vea el bloque técnico
    replyText = replyText.replace(actionRegex, "").trim();
  }

  return { reply: replyText, actionExecuted: actionExecutedDescription };
}

// ============================================================================
// 8. ESCANEO PROACTIVO DE ALERTAS Y NOTIFICACIONES
// ============================================================================

export async function checkAndGenerateSmartAlerts(): Promise<
  Array<{ id: string; title: string; message: string; type: string; actionUrl?: string | null }>
> {
  const now = new Date();
  let dayOfWeek = now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;
  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  // Verificar bloques próximos en los siguientes 25 minutos
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayBlocks = await prisma.scheduleBlock.findMany({
    where: { dayOfWeek },
    include: { subject: { select: { name: true, emoji: true } } },
  });

  const alertsCreated: Array<{ id: string; title: string; message: string; type: string; actionUrl?: string | null }> = [];

  for (const block of todayBlocks) {
    const [h, m] = block.startTime.split(":").map(Number);
    const blockMinutes = h * 60 + m;
    const diff = blockMinutes - currentMinutes;

    // Si empieza en los próximos 20 minutos (y no ha pasado)
    if (diff >= 0 && diff <= 20) {
      const blockTitle = block.blockType === "UNIVERSITY_CLASS" ? block.subject?.name : block.customTitle;
      const emoji = block.emoji || (block.blockType === "HABIT" ? "🔥" : "🎓");

      // Verificar que no hayamos creado ya esta alerta hoy
      const existing = await prisma.aINotification.findFirst({
        where: {
          title: { contains: blockTitle || "" },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });

      if (!existing) {
        const notif = await prisma.aINotification.create({
          data: {
            title: `${emoji} En ${diff} min: ${blockTitle}`,
            message:
              block.blockType === "HABIT"
                ? `¡Momento de tu hábito! Tienes una racha de ${block.currentStreak} días por proteger.`
                : block.blockType === "EXTERNAL_STUDY"
                ? `Tiempo de estudio autónomo programado. ¡Prepara tus apuntes!`
                : `Clase de ${block.subject?.name} en ${block.room || "tu salón"}.`,
            type: block.blockType === "HABIT" ? "HABIT_NUDGE" : "REMINDER",
            priority: "HIGH",
            actionUrl: block.subjectId ? `/subjects/${block.subjectId}` : "/schedule",
          },
        });
        alertsCreated.push(notif);
      }
    }
  }

  // Devolver las 5 alertas más recientes
  const allRecent = await prisma.aINotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return allRecent;
}
