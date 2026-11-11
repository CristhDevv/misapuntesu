import { test } from "node:test";
import assert from "node:assert/strict";
import {
  subjectSchema,
  scheduleBlockSchema,
  notePageSchema,
  taskAssignmentSchema,
  gradeItemSchema,
  APPLE_COLORS,
  MASTERY_LEVELS,
  STUDY_METHODS,
  TASK_TYPES,
} from "../../src/lib/validations";

test("Unit - Validations: subjectSchema", () => {
  const valid = subjectSchema.parse({
    name: "Cálculo Integral",
    emoji: "📐",
    color: "#007AFF",
    teacherName: "Dr. Gauss",
    passingGrade: 3.0,
  });
  assert.equal(valid.name, "Cálculo Integral");
  assert.equal(valid.color, "#007AFF");

  assert.throws(() => subjectSchema.parse({ name: "" }));
});

test("Unit - Validations: scheduleBlockSchema", () => {
  const valid = scheduleBlockSchema.parse({
    subjectId: "sub_1",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "10:00",
    room: "B-204",
  });
  assert.equal(valid.startTime, "08:00");
  assert.throws(() => scheduleBlockSchema.parse({ subjectId: "s", dayOfWeek: 7, startTime: "invalid" }));
});

test("Unit - Validations: notePageSchema", () => {
  const valid = notePageSchema.parse({
    subjectId: "sub_1",
    title: "Derivadas Parciales",
    studyMethod: "CORNELL",
    masteryLevel: "RED_HARD",
    cornellCues: "¿Qué es?",
    cornellSummary: "Es la derivada manteniendo constantes las demás variables.",
  });
  assert.equal(valid.studyMethod, "CORNELL");
  assert.equal(valid.masteryLevel, "RED_HARD");
  assert.throws(() => notePageSchema.parse({ subjectId: "", title: "" }));
});

test("Unit - Validations: taskAssignmentSchema & gradeItemSchema", () => {
  const task = taskAssignmentSchema.parse({
    subjectId: "sub_1",
    title: "Parcial 1",
    type: "EXAM",
    dueDate: new Date().toISOString(),
  });
  assert.equal(task.type, "EXAM");

  const grade = gradeItemSchema.parse({
    subjectId: "sub_1",
    name: "Primer Corte (30%)",
    weightPercent: 30,
    score: 4.2,
  });
  assert.equal(grade.weightPercent, 30);
  assert.equal(grade.score, 4.2);
});

test("Unit - Validations: Constantes Apple HIG", () => {
  assert.equal(APPLE_COLORS.length, 7);
  assert.ok(MASTERY_LEVELS.RED_HARD);
  assert.ok(MASTERY_LEVELS.GREEN_READY);
  assert.ok(STUDY_METHODS.CORNELL);
  assert.ok(STUDY_METHODS.FEYNMAN);
  assert.ok(TASK_TYPES.EXAM);
});
