import { notFound } from "next/navigation";
import { getCourseBookById } from "@/server/queries";
import { BookPageFlipView } from "@/components/books/BookPageFlipView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getCourseBookById(id);
  if (!book) return { title: "Libro no encontrado" };
  return {
    title: `${book.title} | El Cuaderno Adaptativo`,
    description: book.subtitle || book.description || "Cuaderno interactivo",
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getCourseBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <BookPageFlipView
      book={{
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        category: book.category,
        coverGradient: book.coverGradient,
        coverColor: book.coverColor,
        coverIcon: book.coverIcon,
        coverStyle: book.coverStyle as any,
        paperTexture: book.paperTexture as any,
        fontFamily: book.fontFamily as any,
        fontSize: book.fontSize as any,
        lineHeight: book.lineHeight as any,
        pageLayout: book.pageLayout as any,
        pageMargins: book.pageMargins as any,
        pages: book.pages,
      }}
    />
  );
}
