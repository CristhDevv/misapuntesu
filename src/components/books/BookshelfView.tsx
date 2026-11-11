"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Layers,
  ChevronRight,
  X,
  Palette,
  Loader2,
  BookMarked,
} from "lucide-react";
import { BookCover3D } from "./BookCover3D";
import { ConfirmModal } from "../ui/ConfirmModal";
import {
  BOOK_CATEGORIES,
  BOOK_COVER_STYLES,
  BOOK_PAPER_TEXTURES,
  BOOK_COVER_GRADIENTS,
} from "@/lib/validations";
import {
  createCourseBookAction,
  deleteCourseBookAction,
  generateCourseBookStructureAIAction,
} from "@/server/actions";

interface BookListItem {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  coverGradient: string;
  coverColor: string;
  coverIcon: string;
  coverStyle: string;
  paperTexture: string;
  pageLayout: string;
  updatedAt: Date | string;
  subject?: { id: string; name: string; emoji: string; color: string } | null;
  _count: { pages: number };
}

interface BookshelfViewProps {
  books: BookListItem[];
  subjects?: Array<{ id: string; name: string; emoji: string; color: string }>;
}

const EMOJI_OPTIONS = ["📖", "💻", "🌐", "⚡", "🚀", "🎨", "🧠", "📐", "🧪", "📚", "💼", "✍️"];

export function BookshelfView({ books, subjects = [] }: BookshelfViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Category Filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  // Create Book Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("General");
  const [newSubjectId, setNewSubjectId] = useState<string>("");
  const [newIcon, setNewIcon] = useState("📖");
  const [newStyle, setNewStyle] = useState<"minimal" | "editorial" | "technical" | "leather">("editorial");
  const [newGradient, setNewGradient] = useState<string>(BOOK_COVER_GRADIENTS[0].id);
  const [newPaper, setNewPaper] = useState<"blank" | "sepia" | "dotted" | "grid" | "lined" | "dark">("blank");
  const [useAIOutline, setUseAIOutline] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesCategory =
      selectedCategory === "Todos" || b.category === selectedCategory;
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(search.toLowerCase())) ||
      b.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Create Book
  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError("Por favor ingresa un título para el libro.");
      return;
    }

    setFormError(null);
    startTransition(async () => {
      if (useAIOutline) {
        // AI Structured Book: create book first, then generate outline
        const createRes = await createCourseBookAction({
          title: newTitle.trim(),
          subtitle: newSubtitle.trim() || null,
          category: newCategory,
          subjectId: newSubjectId || null,
          coverIcon: newIcon,
          coverStyle: newStyle,
          coverGradient: newGradient,
          paperTexture: newPaper,
        });

        if (createRes.success) {
          await generateCourseBookStructureAIAction(createRes.data.id, newTitle.trim());
          setIsCreateModalOpen(false);
          resetForm();
          router.push(`/books/${createRes.data.id}`);
          router.refresh();
        } else {
          setFormError(createRes.error || "No se pudo crear el libro.");
        }
      } else {
        // Manual Book
        const res = await createCourseBookAction({
          title: newTitle.trim(),
          subtitle: newSubtitle.trim() || null,
          category: newCategory,
          subjectId: newSubjectId || null,
          coverIcon: newIcon,
          coverStyle: newStyle,
          coverGradient: newGradient,
          paperTexture: newPaper,
        });

        if (res.success) {
          setIsCreateModalOpen(false);
          resetForm();
          router.push(`/books/${res.data.id}`);
          router.refresh();
        } else {
          setFormError(res.error || "Error al crear el libro.");
        }
      }
    });
  };

  // Handle Delete Book
  const handleDeleteBook = (e: React.MouseEvent, bookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBookToDelete(bookId);
  };

  const confirmDeleteBook = () => {
    if (!bookToDelete) return;
    startTransition(async () => {
      await deleteCourseBookAction(bookToDelete);
      setBookToDelete(null);
      router.refresh();
    });
  };

  const resetForm = () => {
    setNewTitle("");
    setNewSubtitle("");
    setNewCategory("General");
    setNewSubjectId("");
    setNewIcon("📖");
    setNewStyle("editorial");
    setNewGradient(BOOK_COVER_GRADIENTS[0].id);
    setNewPaper("blank");
    setUseAIOutline(false);
    setFormError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header estilo Apple Large Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
            Workspace de Creación
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1E] flex items-center gap-2">
            <span>Libros</span>
            <span className="text-2xl">📚</span>
          </h1>
          <p className="text-sm text-[#8E8E93] mt-1">
            Cuadernos interactivos con edición por bloques y experiencia física 3D de lectura.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#007AFF] text-white text-sm font-semibold shadow-xs hover:bg-blue-600 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Libro</span>
        </button>
      </div>

      {/* 2. Barra de Búsqueda y Categorías */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, subtítulo o categoría..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl bg-white border border-black/5 shadow-xs outline-none focus:ring-2 focus:ring-[#007AFF]/30 text-[#1C1C1E] placeholder:text-stone-400"
          />
        </div>

        {/* Categorías deslizantes */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["Todos", ...BOOK_CATEGORIES].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-[#1C1C1E] text-white shadow-xs"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-black/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Estantería de Libros 3D (Bookshelf Stage) */}
      {filteredBooks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-black/5 shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-[#007AFF] flex items-center justify-center text-3xl">
            📖
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1C1C1E]">
              {books.length === 0 ? "Aún no tienes libros creados" : "No hay libros que coincidan"}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              Crea tu primer curso o cuaderno temático para empezar a organizar tu conocimiento con bloques modulares y hojear con animación 3D.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs hover:bg-blue-600 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi primer libro</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 pt-4">
          {filteredBooks.map((book) => (
            <div key={book.id} className="relative flex flex-col items-center">
              <Link href={`/books/${book.id}`} className="group block focus:outline-hidden">
                <BookCover3D
                  title={book.title}
                  subtitle={book.subtitle}
                  category={book.category}
                  coverGradient={book.coverGradient}
                  coverColor={book.coverColor}
                  coverIcon={book.coverIcon}
                  coverStyle={book.coverStyle}
                  pageCount={book._count.pages}
                  size="sm"
                  interactive={true}
                />
              </Link>

              {/* Botón de acción rápida: Eliminar */}
              <button
                type="button"
                onClick={(e) => handleDeleteBook(e, book.id)}
                className="mt-3 p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 hover:opacity-100"
                title="Eliminar este libro"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4. Modal de Creación de Nuevo Libro con Live 3D Preview */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsCreateModalOpen(false)}
          />

          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">
            {/* Lado Izquierdo: Live 3D Preview */}
            <div className="w-full md:w-5/12 bg-[#F2F2F7] p-6 sm:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-black/5 select-none">
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-4">
                Vista Previa 3D en Vivo
              </p>
              <BookCover3D
                title={newTitle || "Título de tu Libro"}
                subtitle={newSubtitle || "Subtítulo descriptivo"}
                category={newCategory}
                coverGradient={newGradient}
                coverIcon={newIcon}
                coverStyle={newStyle}
                pageCount={useAIOutline ? 5 : 1}
                size="md"
                interactive={false}
              />
              <p className="text-[10px] text-stone-400 mt-4 text-center">
                Pasa el cursor sobre el libro cuando esté creado para ver el giro 3D interactivo.
              </p>
            </div>

            {/* Lado Derecho: Formulario */}
            <div className="w-full md:w-7/12 p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-[#007AFF]" />
                    <h2 className="text-base font-bold text-[#1C1C1E]">Nuevo Libro / Curso</h2>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-1 rounded-full hover:bg-black/5 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {formError && (
                  <div className="my-3 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateBook} className="space-y-4 my-4 text-xs">
                  {/* Título */}
                  <div className="space-y-1">
                    <label className="font-semibold text-[#1C1C1E]">
                      Título del Libro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ej. Redes y Telecomunicaciones I"
                      className="w-full px-3 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#007AFF]/30 outline-none text-sm font-medium"
                    />
                  </div>

                  {/* Subtítulo */}
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-600">Subtítulo (opcional)</label>
                    <input
                      type="text"
                      value={newSubtitle}
                      onChange={(e) => setNewSubtitle(e.target.value)}
                      placeholder="Ej. Guía completa con apuntes de clase y laboratorios"
                      className="w-full px-3 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#007AFF]/30 outline-none"
                    />
                  </div>

                  {/* Categoría & Emoji */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-stone-600">Categoría</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white focus:ring-2 focus:ring-[#007AFF]/30 outline-none"
                      >
                        {BOOK_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-stone-600">Emoji de Portada</label>
                      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-stone-50 rounded-xl border border-black/5">
                        {EMOJI_OPTIONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setNewIcon(em)}
                            className={`p-1 rounded text-base transition-transform active:scale-90 ${
                              newIcon === em ? "bg-white shadow-xs scale-110" : "hover:bg-black/5"
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Estilo de Portada */}
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-600">Estilo de Portada</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BOOK_COVER_STYLES.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setNewStyle(st.id as typeof newStyle)}
                          className={`py-1.5 px-2 rounded-xl border text-center transition-all ${
                            newStyle === st.id
                              ? "border-[#007AFF] bg-blue-50 text-[#007AFF] font-bold"
                              : "border-black/10 hover:bg-stone-50 text-stone-600"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gradiente de Portada */}
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-600">Color y Gradiente</label>
                    <div className="grid grid-cols-6 gap-2">
                      {BOOK_COVER_GRADIENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setNewGradient(g.id)}
                          title={g.name}
                          className={`h-7 rounded-lg bg-gradient-to-br ${g.preview} transition-transform active:scale-95 ${
                            newGradient === g.id ? "ring-2 ring-black ring-offset-2 scale-105" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Generar Estructura con Gemini AI */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="aiOutline"
                      checked={useAIOutline}
                      onChange={(e) => setUseAIOutline(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#007AFF] rounded cursor-pointer"
                    />
                    <label htmlFor="aiOutline" className="cursor-pointer select-none">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>Generar índice y contenido inicial con Gemini AI</span>
                      </div>
                      <p className="text-[11px] text-blue-700/80 mt-0.5">
                        Gemini creará automáticamente de 4 a 6 capítulos completos con teoría, bloques interactivos, llamadas y notas según el tema.
                      </p>
                    </label>
                  </div>
                </form>
              </div>

              {/* Botones del Modal */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateBook}
                  disabled={isPending || !newTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{useAIOutline ? "Gemini escribiendo..." : "Creando libro..."}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{useAIOutline ? "Crear con Gemini AI" : "Crear Libro"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Estilizado */}
      <ConfirmModal
        isOpen={Boolean(bookToDelete)}
        onClose={() => setBookToDelete(null)}
        onConfirm={confirmDeleteBook}
        title="¿Eliminar este libro?"
        message="Se eliminará este libro junto con todas sus páginas y bloques de contenido de forma permanente."
        confirmText="Eliminar Libro"
        isDestructive={true}
        isLoading={isPending}
      />
    </div>
  );
}
