import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
  createScheduleBlockAction,
  deleteScheduleBlockAction,
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
} from "../../src/server/actions";

test("Integration/Unit - Actions: Subject Lifecycle", async () => {
  // 1. Crear
  const createRes = await createSubjectAction({
    name: "Química Orgánica",
    emoji: "🧪",
    color: "#5856D6",
    teacherName: "Prof. Walter",
    defaultRoom: "Lab Q-102",
  });
  assert.equal(createRes.success, true);
  if (!createRes.success) return;
  const subjectId = createRes.data.id;

  // 2. Editar
  const updateRes = await updateSubjectAction(subjectId, {
    teacherName: "Prof. Walter White",
  });
  assert.equal(updateRes.success, true);

  // 3. Crear bloque de horario
  const blockRes = await createScheduleBlockAction({
    subjectId,
    dayOfWeek: 2,
    startTime: "07:00",
    endTime: "09:00",
    room: "Lab Q-102",
  });
  assert.equal(blockRes.success, true);
  if (blockRes.success) {
    await deleteScheduleBlockAction(blockRes.data.ids[0]);
  }

  // 4. Eliminar
  const delRes = await deleteSubjectAction(subjectId);
  assert.equal(delRes.success, true);
});

test("Integration/Unit - Actions: Note Lifecycle (Adaptativo)", async () => {
  // Crear materia temporal
  const subRes = await createSubjectAction({
    name: "Física Mecánica",
    emoji: "⚡",
    color: "#FF9500",
  });
  if (!subRes.success) return;
  const subjectId = subRes.data.id;

  // 1. Crear apunte
  const noteRes = await createNotePageAction({
    subjectId,
    title: "Leyes de Newton",
    studyMethod: "CORNELL",
    masteryLevel: "RED_HARD",
    cornellCues: "¿Qué es la inercia?",
    cornellSummary: "F = m · a",
  });
  assert.equal(noteRes.success, true);
  if (!noteRes.success) return;
  const noteId = noteRes.data.id;

  // 2. Actualizar apunte
  const updateRes = await updateNotePageAction(noteId, {
    feynmanSimple: "Un objeto quieto se queda quieto a menos que lo empujes.",
  });
  assert.equal(updateRes.success, true);

  // 3. Cambiar semáforo de dominio
  const masteryRes = await updateNoteMasteryAction(noteId, "GREEN_READY");
  assert.equal(masteryRes.success, true);

  // 4. Eliminar apunte
  const delRes = await deleteNotePageAction(noteId);
  assert.equal(delRes.success, true);

  // Limpiar materia
  await deleteSubjectAction(subjectId);
});

test("Integration/Unit - Actions: Tasks and Grades Lifecycle", async () => {
  // Crear materia temporal
  const subRes = await createSubjectAction({
    name: "Estadística I",
    emoji: "📊",
    color: "#34C759",
  });
  if (!subRes.success) return;
  const subjectId = subRes.data.id;

  // 1. Crear Tarea / Parcial
  const taskRes = await createTaskAction({
    subjectId,
    title: "Quiz de Probabilidad",
    type: "QUIZ",
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(taskRes.success, true);
  if (taskRes.success) {
    await toggleTaskAction(taskRes.data.id, true);
    await deleteTaskAction(taskRes.data.id);
  }

  // 2. Crear Corte de Nota
  const gradeRes = await createGradeItemAction({
    subjectId,
    name: "Corte 1",
    weightPercent: 30,
    score: 4.5,
  });
  assert.equal(gradeRes.success, true);
  if (gradeRes.success) {
    await updateGradeItemAction(gradeRes.data.id, { score: 4.8 });
    await deleteGradeItemAction(gradeRes.data.id);
  }

  // Limpiar materia
  await deleteSubjectAction(subjectId);
});
