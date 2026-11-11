import { getCourseBooksList, getSubjectsList } from "@/server/queries";
import { BookshelfView } from "@/components/books/BookshelfView";

export const metadata = {
  title: "Libros | El Cuaderno Adaptativo",
  description:
    "Biblioteca de libros interactivos con bloques dinámicos y experiencia 3D de lectura.",
};

export default async function BooksPage() {
  const [books, subjects] = await Promise.all([
    getCourseBooksList(),
    getSubjectsList(),
  ]);

  return <BookshelfView books={books} subjects={subjects} />;
}
