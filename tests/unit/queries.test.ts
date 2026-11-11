import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import {
  getTodayOverview,
  getScheduleWeekly,
  getSubjectsList,
  getSubjectDetail,
  getNoteById,
  getGradesOverview,
  searchSpotlight,
} from "../../src/server/queries";

test("Integration/Unit - Queries: getTodayOverview", async () => {
  const data = await getTodayOverview();
  assert.ok(data);
  assert.ok(typeof data.dayOfWeek === "number");
  assert.ok(Array.isArray(data.todaySchedules));
  assert.ok(Array.isArray(data.upcomingTasks));
  assert.ok(Array.isArray(data.reviewNotes));
  assert.ok(Array.isArray(data.allSubjects));
});

test("Integration/Unit - Queries: getScheduleWeekly", async () => {
  const data = await getScheduleWeekly();
  assert.ok(data);
  assert.ok(Array.isArray(data.schedules));
  assert.ok(Array.isArray(data.subjects));
});

test("Integration/Unit - Queries: getSubjectsList", async () => {
  const subjects = await getSubjectsList();
  assert.ok(Array.isArray(subjects));
  if (subjects.length > 0) {
    const first = subjects[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(typeof first.currentAverage === "number");
  }
});

test("Integration/Unit - Queries: getSubjectDetail & getNoteById", async () => {
  let subjects = await getSubjectsList();
  let createdTemp = false;
  let tempSubjectId = "";

  if (subjects.length === 0) {
    const temp = await prisma.subject.create({
      data: {
        name: "Test Subject Temp",
        emoji: "🧪",
        color: "#007AFF",
      },
    });
    tempSubjectId = temp.id;
    createdTemp = true;
  } else {
    tempSubjectId = subjects[0].id;
  }

  const sub = await getSubjectDetail(tempSubjectId);
  assert.ok(sub);
  assert.equal(sub?.id, tempSubjectId);
  assert.ok(Array.isArray(sub?.notes));

  if (sub?.notes.length) {
    const note = await getNoteById(sub.notes[0].id);
    assert.ok(note);
    assert.equal(note?.id, sub.notes[0].id);
    assert.ok(note?.subject);
  }

  if (createdTemp) {
    await prisma.subject.delete({ where: { id: tempSubjectId } });
  }
});

test("Integration/Unit - Queries: getGradesOverview", async () => {
  const grades = await getGradesOverview();
  assert.ok(Array.isArray(grades));
  if (grades.length > 0) {
    const item = grades[0];
    assert.ok(item.name);
    assert.ok(typeof item.accumulatedScore === "number");
    assert.ok(item.statusMessage.length > 0);
  }
});

test("Integration/Unit - Queries: searchSpotlight", async () => {
  const res = await searchSpotlight("Cálculo");
  assert.ok(res);
  assert.ok(Array.isArray(res.subjects));
  assert.ok(Array.isArray(res.notes));
  assert.ok(Array.isArray(res.tasks));
});
