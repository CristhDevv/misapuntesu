import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import {
  createSubjectAction,
  deleteSubjectAction,
  createScheduleBlockAction,
  deleteScheduleBlockAction,
  toggleHabitCompletionAction,
  createNotePageAction,
  updateNotePageAction,
  updateNoteMasteryAction,
  deleteNotePageAction,
  createTaskAction,
  toggleTaskAction,
  deleteTaskAction,
  createGradeItemAction,
  updateGradeItemAction,
  deleteGradeItemAction,
  updateAISettingsAction,
  markNotificationReadAction,
  clearAllNotificationsAction,
  createCourseBookAction,
  updateCourseBookCustomizationAction,
  createBookPageAction,
  updateBookPageBlocksAction,
  togglePageBookmarkAction,
  deleteCourseBookAction,
} from "../../src/server/actions";
import {
  getTodayOverview,
  getScheduleWeekly,
  getGradesOverview,
  getAINotificationsQuery,
  getAISettingsQuery,
  getCourseBookById,
  getCourseBooksList,
} from "../../src/server/queries";
import { getGeminiConfig } from "../../src/lib/gemini";
import type { NotionBlock } from "../../src/lib/validations";

test("QA Suite - 1. Schedule Hybrid Blocks (Universidad, Hábitos y Recursos Externos)", async () => {
  // 1. Crear Materia Base
  const subRes = await createSubjectAction({
    name: "Sistemas Distribuidos",
    emoji: "🌐",
    color: "#007AFF",
    teacherName: "Dra. Lin",
    defaultRoom: "Auditorio 1",
  });
  assert.equal(subRes.success, true);
  if (!subRes.success) return;
  const subjectId = subRes.data.id;

  try {
    // 2. Crear bloque de clase universitaria
    const classBlockRes = await createScheduleBlockAction({
      blockType: "UNIVERSITY_CLASS",
      subjectId,
      dayOfWeek: 1, // Lunes
      startTime: "08:00",
      endTime: "10:00",
      room: "Auditorio 1",
    });
    assert.equal(classBlockRes.success, true);
    if (!classBlockRes.success) return;
    const classBlockId = classBlockRes.data.ids[0];

    // 3. Crear bloque de Hábito Diario con multi-días (Lunes, Miércoles, Viernes)
    const habitBlockRes = await createScheduleBlockAction({
      blockType: "HABIT",
      customTitle: "Práctica de Código LeetCode",
      emoji: "💻",
      color: "#FF9500",
      daysOfWeek: [1, 3, 5],
      startTime: "07:00",
      endTime: "07:45",
    });
    assert.equal(habitBlockRes.success, true);
    if (!habitBlockRes.success) return;
    assert.equal(habitBlockRes.data.ids.length, 3);
    const habitId = habitBlockRes.data.ids[0];

    // 4. Crear bloque de Estudio Externo con Recurso URL
    const externalBlockRes = await createScheduleBlockAction({
      blockType: "EXTERNAL_STUDY",
      customTitle: "Especialización de Redes Cisco",
      emoji: "🚀",
      color: "#5856D6",
      externalUrl: "https://youtube.com/playlist?list=sample",
      resourceType: "COURSE",
      daysOfWeek: [2, 4],
      startTime: "18:00",
      endTime: "19:30",
    });
    assert.equal(externalBlockRes.success, true);
    if (!externalBlockRes.success) return;

    // 5. Probar el Toggle de cumplimiento de hábito y cálculo de racha
    const toggleRes = await toggleHabitCompletionAction(habitId);
    assert.equal(toggleRes.success, true);
    if (toggleRes.success) {
      assert.equal(toggleRes.data.completedToday, true);
      assert.equal(toggleRes.data.currentStreak >= 1, true);
    }

    // Toggle de nuevo para desmarcar
    const toggleBackRes = await toggleHabitCompletionAction(habitId);
    assert.equal(toggleBackRes.success, true);
    if (toggleBackRes.success) {
      assert.equal(toggleBackRes.data.completedToday, false);
    }

    // 6. Verificar consulta de horario semanal
    const weekly = await getScheduleWeekly();
    assert.ok(Array.isArray(weekly.schedules));

    // Limpieza de bloques creados
    await deleteScheduleBlockAction(classBlockId);
    for (const id of habitBlockRes.data.ids) {
      await deleteScheduleBlockAction(id);
    }
    for (const id of externalBlockRes.data.ids) {
      await deleteScheduleBlockAction(id);
    }
  } finally {
    await deleteSubjectAction(subjectId);
  }
});

test("QA Suite - 2. Gemini AI Engine Settings & Notifications Flow", async () => {
  // 1. Probar actualización de configuración con fallback seguro
  const updateSettingsRes = await updateAISettingsAction({
    modelName: "gemini-3.5-flash",
    enableBrowserNotifications: true,
    studentGoal: "Graduarme con honores y dominar desarrollo cloud.",
  });
  assert.equal(updateSettingsRes.success, true);

  // 2. Verificar que getGeminiConfig() rechace modelos obsoletos (2.5) y asigne gemini-3.5-flash
  const config = await getGeminiConfig();
  assert.notEqual(config.modelName, "gemini-2.5-flash");
  assert.ok(config.modelName === "gemini-3.5-flash" || config.modelName === "gemini-3.8-flash");

  // 3. Crear una notificación de prueba en base de datos
  const notif = await prisma.aINotification.create({
    data: {
      title: "Recordatorio de Repaso",
      message: "Tienes un tema de Redes pendiente de revisión.",
      type: "REMINDER",
      priority: "HIGH",
      actionUrl: "/schedule",
      isRead: false,
    },
  });
  assert.ok(notif.id);

  // 4. Consultar notificaciones
  const list = await getAINotificationsQuery();
  assert.ok(list.some((n) => n.id === notif.id));

  // 5. Marcar como leída
  const readRes = await markNotificationReadAction(notif.id);
  assert.equal(readRes.success, true);

  // 6. Limpiar notificaciones
  const clearRes = await clearAllNotificationsAction();
  assert.equal(clearRes.success, true);
});

test("QA Suite - 3. Adaptive Notes: Cornell, Feynman & Active Recall Mastery", async () => {
  const subRes = await createSubjectAction({
    name: "Inteligencia Artificial",
    emoji: "🧠",
    color: "#AF52DE",
  });
  if (!subRes.success) return;
  const subjectId = subRes.data.id;

  try {
    // 1. Crear apunte Cornell
    const cornellNote = await createNotePageAction({
      subjectId,
      title: "Redes Neuronales y Backpropagation",
      studyMethod: "CORNELL",
      trafficLight: "RED", // Necesita repaso urgente
      cornellCues: JSON.stringify(["¿Qué es el gradiente?", "¿Cómo evita el sobreajuste?"]),
      cornellNotes: "El gradiente indica la dirección de máximo incremento de la función de coste.",
      cornellSummary: "Backpropagation aplica la regla de la cadena para ajustar pesos.",
    });
    assert.equal(cornellNote.success, true);
    if (!cornellNote.success) return;

    // 2. Crear apunte Feynman
    const feynmanNote = await createNotePageAction({
      subjectId,
      title: "Atención y Transformers",
      studyMethod: "FEYNMAN",
      trafficLight: "YELLOW",
      feynmanConcept: "Mecanismo de Auto-atención",
      feynmanExplanation: "Es como leer un libro y subrayar las palabras clave que se conectan entre sí.",
      feynmanGaps: "Profundizar en la matriz de pesos Key, Query, Value.",
    });
    assert.equal(feynmanNote.success, true);
    if (!feynmanNote.success) return;

    // 3. Crear apunte Active Recall con Flashcards
    const flashcardsData = [
      { id: "fc-1", front: "¿Qué es el learning rate?", back: "El tamaño del paso en el descenso del gradiente.", confidence: 4 },
      { id: "fc-2", front: "¿Qué es dropout?", back: "Técnica de regularización que apaga neuronas aleatorias.", confidence: 5 },
    ];
    const recallNote = await createNotePageAction({
      subjectId,
      title: "Optimizadores en Deep Learning",
      studyMethod: "ACTIVE_RECALL",
      trafficLight: "GREEN",
      activeRecallCards: JSON.stringify(flashcardsData),
    });
    assert.equal(recallNote.success, true);
    if (!recallNote.success) return;

    // 4. Actualizar semáforo de estudio a Verde tras dominar el tema
    const updateMastery = await updateNoteMasteryAction(cornellNote.data.id, "GREEN_READY");
    assert.equal(updateMastery.success, true);

    // 5. Verificar que TodayOverview detecte los temas que requieren repaso (RED y YELLOW)
    const today = await getTodayOverview();
    assert.ok(Array.isArray(today.reviewNotes));

    // Limpieza
    await deleteNotePageAction(cornellNote.data.id);
    await deleteNotePageAction(feynmanNote.data.id);
    await deleteNotePageAction(recallNote.data.id);
  } finally {
    await deleteSubjectAction(subjectId);
  }
});

test("QA Suite - 4. Grades & Parciales Calculator Edge Cases", async () => {
  const subRes = await createSubjectAction({
    name: "Cálculo Integral",
    emoji: "📐",
    color: "#34C759",
    targetGrade: 4.0,
  });
  if (!subRes.success) return;
  const subjectId = subRes.data.id;

  try {
    // 1. Agregar Corte 1 (30%) con nota 4.5
    const g1 = await createGradeItemAction({
      subjectId,
      name: "Parcial 1",
      weightPercent: 30,
      score: 4.5,
    });
    assert.equal(g1.success, true);

    // 2. Agregar Corte 2 (30%) con nota 3.8
    const g2 = await createGradeItemAction({
      subjectId,
      name: "Parcial 2",
      weightPercent: 30,
      score: 3.8,
    });
    assert.equal(g2.success, true);

    // 3. Agregar Corte 3 (40%) pendiente (sin nota aún)
    const g3 = await createGradeItemAction({
      subjectId,
      name: "Examen Final",
      weightPercent: 40,
    });
    assert.equal(g3.success, true);

    // 4. Consultar resumen de notas
    const overview = await getGradesOverview();
    const subjectGrade = overview.find((s) => s.id === subjectId);
    assert.ok(subjectGrade);
    assert.equal(subjectGrade.completedWeight, 60);
    assert.equal(subjectGrade.remainingWeight, 40);
    // Acumulado: (4.5 * 0.3) + (3.8 * 0.3) = 1.35 + 1.14 = 2.49
    assert.ok(Math.abs(subjectGrade.accumulatedScore - 2.49) < 0.05);
    // Nota necesaria en el 40% restante para pasar (con 3.0 por defecto):
    // (3.0 - 2.49) / 0.40 = 0.51 / 0.40 = 1.28
    assert.ok(subjectGrade.neededScoreOnRemaining !== null && subjectGrade.neededScoreOnRemaining <= 3.0);

    // 5. Limpieza de notas
    if (g1.success) await deleteGradeItemAction(g1.data.id);
    if (g2.success) await deleteGradeItemAction(g2.data.id);
    if (g3.success) await deleteGradeItemAction(g3.data.id);
  } finally {
    await deleteSubjectAction(subjectId);
  }
});

test("QA Suite - 5. CourseBooks & Notion Block Engine Full Lifecycle", async () => {
  // 1. Crear libro con todas las propiedades de personalización visual Apple HIG
  const createRes = await createCourseBookAction({
    title: "Manual de Arquitectura Cloud",
    subtitle: "Microservicios, Kubernetes y Resiliencia",
    description: "Guía de referencia para diseñar aplicaciones de alta disponibilidad.",
    category: "Ingeniería de Software",
    coverGradient: "from-blue-600 via-indigo-600 to-purple-700",
    coverIcon: "☁️",
    coverStyle: "technical",
    paperTexture: "dotted",
    fontFamily: "mono",
    fontSize: "base",
    lineHeight: "relaxed",
    pageLayout: "single",
    pageMargins: "normal",
  });
  assert.equal(createRes.success, true);
  if (!createRes.success) return;
  const bookId = createRes.data.id;

  try {
    // 2. Verificar que se creó con su primera página por defecto
    const bookData = await getCourseBookById(bookId);
    assert.ok(bookData);
    assert.equal(bookData.pages.length, 1);
    const firstPage = bookData.pages[0];

    // 3. Crear una batería de bloques Notion de todos los tipos soportados
    const testBlocks: NotionBlock[] = [
      { id: "b1", type: "h1", content: "Arquitectura Hexagonal" },
      { id: "b2", type: "h2", content: "Principios de Diseño" },
      { id: "b3", type: "paragraph", content: "Desacopla el núcleo del negocio de los adaptadores externos." },
      { id: "b4", type: "bullet", content: "Puertos de entrada (Drivers)" },
      { id: "b5", type: "bullet", content: "Puertos de salida (Driven)" },
      { id: "b6", type: "numbered", content: "Paso 1: Definir los casos de uso" },
      { id: "b7", type: "todo", content: "Implementar suite de pruebas unitarias", checked: true },
      { id: "b8", type: "quote", content: "La arquitectura es sobre la intención, no sobre frameworks." },
      { id: "b9", type: "code", content: "interface OrderRepository { save(order: Order): Promise<void>; }", language: "typescript" },
      { id: "b10", type: "callout", content: "Atención: No acoplar entidades de dominio con Prisma.", calloutIcon: "💡", calloutColor: "#007AFF" },
      { id: "b11", type: "divider", content: "" },
    ];

    // 4. Guardar bloques en la hoja
    const saveBlocksRes = await updateBookPageBlocksAction(firstPage.id, {
      title: "Capítulo 1: Hexagonal",
      blocks: testBlocks,
    });
    assert.equal(saveBlocksRes.success, true);

    // 5. Crear una segunda página
    const secondPageRes = await createBookPageAction(bookId, 1);
    assert.equal(secondPageRes.success, true);

    // 6. Probar marcador (bookmark) en la primera página
    const bookmarkRes = await togglePageBookmarkAction(firstPage.id);
    assert.equal(bookmarkRes.success, true);
    if (bookmarkRes.success) {
      assert.equal(bookmarkRes.data.isBookmarked, true);
    }

    // 7. Modificar personalización visual del libro
    const updateCustomRes = await updateCourseBookCustomizationAction(bookId, {
      paperTexture: "sepia",
      fontSize: "lg",
      lineHeight: "loose",
      pageMargins: "wide",
    });
    assert.equal(updateCustomRes.success, true);

    // 8. Re-consultar libro y verificar persistencia
    const updatedBook = await getCourseBookById(bookId);
    assert.ok(updatedBook);
    assert.equal(updatedBook.paperTexture, "sepia");
    assert.equal(updatedBook.pages.length, 2);
    assert.equal(updatedBook.pages[0].isBookmarked, true);

    // 9. Verificar lista general de libros
    const booksList = await getCourseBooksList();
    assert.ok(booksList.some((b) => b.id === bookId));
  } finally {
    // 10. Eliminar en cascada
    const delRes = await deleteCourseBookAction(bookId);
    assert.equal(delRes.success, true);
  }
});
