import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import {
  startLiveClassAction,
  organizeLiveClassAction,
  updateNotePageAction,
} from "../../src/server/actions";

test("Integration/Unit - LiveClass: iniciar sesión en vivo y organizar en Cornell + Libro", async () => {
  const suffix = Date.now().toString();
  const subject = await prisma.subject.create({
    data: { name: `Sistemas Operativos ${suffix}`, emoji: "💻" },
  });
  const book = await prisma.courseBook.create({
    data: { title: `Guía SO ${suffix}`, subjectId: subject.id },
  });

  try {
    const startRes = await startLiveClassAction(subject.id, `Clase Live ${suffix}`);
    assert.equal(startRes.success, true);
    if (!startRes.success) return;

    const noteId = startRes.data.id;
    const sampleNotes = [
      "[01:10] 📌 Un proceso es un programa en ejecución con su propio espacio de memoria.",
      "[03:45] 🎯 El planificador Round Robin usa un quantum fijo para repartir CPU.",
      "[05:20] ❓ Revisar diferencia entre deadlock y starvation antes del parcial.",
    ].join("\n");

    const upd = await updateNotePageAction(noteId, { freeContent: sampleNotes });
    assert.equal(upd.success, true);

    const orgRes = await organizeLiveClassAction(noteId, book.id);
    assert.equal(orgRes.success, true);
    if (!orgRes.success) return;

    assert.equal(orgRes.data.exportedBookId, book.id);

    const updatedNote = await prisma.notePage.findUnique({ where: { id: noteId } });
    assert.ok(updatedNote);
    assert.equal(updatedNote.studyMethod, "CORNELL");
    assert.ok(updatedNote.cornellCues.length > 0);
    assert.ok(updatedNote.cornellSummary.length > 0);

    const flashcards = JSON.parse(updatedNote.flashcardsJson);
    assert.ok(Array.isArray(flashcards) && flashcards.length >= 1);

    const bookPages = await prisma.courseBookPage.findMany({ where: { bookId: book.id } });
    assert.ok(bookPages.length >= 1);
  } finally {
    await prisma.courseBook.delete({ where: { id: book.id } }).catch(() => {});
    await prisma.subject.delete({ where: { id: subject.id } }).catch(() => {});
  }
});
