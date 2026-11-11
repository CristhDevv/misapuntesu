import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  courseBookSchema,
  notionBlockSchema,
  updateBookPageSchema,
  BOOK_CATEGORIES,
  BOOK_COVER_STYLES,
  BOOK_PAPER_TEXTURES,
  BOOK_COVER_GRADIENTS,
} from "../../src/lib/validations";
import {
  createCourseBookAction,
  createBookPageAction,
  updateBookPageBlocksAction,
  togglePageBookmarkAction,
  deleteCourseBookAction,
} from "../../src/server/actions";
import { getCourseBooksList, getCourseBookById } from "../../src/server/queries";

describe("CourseBooks Module - Validations & Schemas", () => {
  it("valida creación de libro con datos mínimos requeridos", () => {
    const valid = courseBookSchema.parse({
      title: "Redes y Telecomunicaciones",
    });
    assert.equal(valid.title, "Redes y Telecomunicaciones");
    assert.equal(valid.category, "General");
    assert.equal(valid.coverStyle, "editorial");
    assert.equal(valid.paperTexture, "blank");
    assert.equal(valid.pageLayout, "spread");
  });

  it("rechaza libro sin título", () => {
    assert.throws(() => {
      courseBookSchema.parse({ title: "" });
    });
  });

  it("valida bloque Notion de cada tipo admitido", () => {
    const types = [
      "h1",
      "h2",
      "h3",
      "paragraph",
      "todo",
      "bullet",
      "numbered",
      "callout",
      "quote",
      "code",
      "divider",
    ] as const;

    for (const type of types) {
      const block = notionBlockSchema.parse({
        id: "b_" + type,
        type,
        content: `Contenido de ${type}`,
      });
      assert.equal(block.type, type);
    }
  });

  it("valida bloque de código y callout con metadatos", () => {
    const codeBlock = notionBlockSchema.parse({
      id: "b_code",
      type: "code",
      content: "console.log('hola mundo');",
      language: "typescript",
    });
    assert.equal(codeBlock.language, "typescript");

    const calloutBlock = notionBlockSchema.parse({
      id: "b_callout",
      type: "callout",
      content: "Regla de examen",
      calloutIcon: "⚠️",
      calloutColor: "amber",
    });
    assert.equal(calloutBlock.calloutIcon, "⚠️");
  });
});

describe("CourseBooks Module - End-to-End Server Actions", () => {
  let createdBookId = "";
  let pageId = "";

  it("crea un libro nuevo con su primera página y bloques iniciales", async () => {
    const res = await createCourseBookAction({
      title: "Arquitectura de Software Limpia",
      subtitle: "Patrones y DDD",
      category: "Desarrollo de Software",
      coverStyle: "technical",
      coverGradient: "from-blue-600 via-indigo-600 to-purple-700",
      paperTexture: "dotted",
    });

    assert.equal(res.success, true);
    if (!res.success) return;

    createdBookId = res.data.id;
    assert.ok(createdBookId);

    // Verificar en queries
    const book = await getCourseBookById(createdBookId);
    assert.ok(book);
    assert.equal(book.title, "Arquitectura de Software Limpia");
    assert.equal(book.pages.length, 1);
    assert.equal(book.pages[0].pageNumber, 1);
    pageId = book.pages[0].id;
  });

  it("actualiza bloques Notion de la página del libro", async () => {
    assert.ok(pageId);
    const updatedBlocks = [
      {
        id: "b_test_1",
        type: "h1" as const,
        content: "Capítulo 1: Fundamentos",
      },
      {
        id: "b_test_2",
        type: "paragraph" as const,
        content: "El objetivo es desacoplar el dominio del framework.",
      },
      {
        id: "b_test_3",
        type: "todo" as const,
        content: "Implementar capa de repositorio",
        checked: true,
      },
    ];

    const res = await updateBookPageBlocksAction(pageId, {
      title: "Capítulo 1: Fundamentos",
      blocks: updatedBlocks,
    });

    assert.equal(res.success, true);

    const book = await getCourseBookById(createdBookId);
    assert.ok(book);
    const parsed = JSON.parse(book.pages[0].blocksJson);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[2].checked, true);
  });

  it("conmuta marcador de página (bookmark)", async () => {
    assert.ok(pageId);
    const res = await togglePageBookmarkAction(pageId);
    assert.equal(res.success, true);
    if (!res.success) return;
    assert.equal(res.data.isBookmarked, true);
  });

  it("crea una segunda hoja consecutiva en el libro", async () => {
    assert.ok(createdBookId);
    const res = await createBookPageAction(createdBookId, 1);
    assert.equal(res.success, true);
    if (!res.success) return;
    assert.equal(res.data.pageNumber, 2);

    const book = await getCourseBookById(createdBookId);
    assert.ok(book);
    assert.equal(book.pages.length, 2);
  });

  it("elimina el libro y sus páginas asociadas en cascada", async () => {
    assert.ok(createdBookId);
    const delRes = await deleteCourseBookAction(createdBookId);
    assert.equal(delRes.success, true);

    const check = await getCourseBookById(createdBookId);
    assert.equal(check, null);
  });
});
