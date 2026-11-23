import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseBooksList, getSubjectsList } from "@/server/queries";
import { BookshelfView } from "@/components/books/BookshelfView";

export const metadata = {
  title: "Libros | El Cuaderno Adaptativo",
  description:
    "Biblioteca de libros interactivos con bloques dinámicos y experiencia 3D de lectura.",
};

export default async function BooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [books, subjects] = await Promise.all([
    getCourseBooksList(user.id),
    getSubjectsList(user.id),
  ]);

  return <BookshelfView books={books} subjects={subjects} />;
}
