"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, BookOpen, FileText, Calendar, ArrowRight, Loader2, Book } from "lucide-react";
import { searchSpotlightAction } from "@/server/actions";

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpotlightSearchModal({ isOpen, onClose }: SpotlightSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<{
    subjects: Array<{ id: string; name: string; emoji: string; color: string; defaultRoom: string | null }>;
    notes: Array<{
      id: string;
      title: string;
      studyMethod: string;
      masteryLevel: string;
      subject: { id: string; name: string; emoji: string; color: string };
    }>;
    tasks: Array<{
      id: string;
      title: string;
      type: string;
      subject: { id: string; name: string; emoji: string; color: string };
    }>;
    books?: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      category: string;
      coverIcon: string;
      coverColor: string;
    }>;
    bookPages?: Array<{
      id: string;
      bookId: string;
      pageNumber: number;
      title?: string | null;
      book: { id: string; title: string; coverIcon: string; coverColor: string };
    }>;
  }>({
    subjects: [],
    notes: [],
    tasks: [],
    books: [],
    bookPages: [],
  });

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ subjects: [], notes: [], tasks: [] });
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchSpotlightAction(query);
        if (res.success && res.data) {
          setResults(res.data as typeof results);
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.subjects.length +
    results.notes.length +
    results.tasks.length +
    (results.books?.length || 0) +
    (results.bookPages?.length || 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl border border-black/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Input Barra Spotlight */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5">
          <Search className="w-5 h-5 text-[#8E8E93] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar materias, apuntes, temas o parciales..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-hidden"
          />
          {isPending ? (
            <Loader2 className="w-4 h-4 text-[#8E8E93] animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#8E8E93]">
              ESC
            </kbd>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {query.trim() && totalResults === 0 && !isPending && (
            <div className="py-8 text-center text-xs text-[#8E8E93]">
              No se encontraron resultados para &quot;{query}&quot;.
            </div>
          )}

          {/* 1. Materias */}
          {results.subjects.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
                Materias
              </span>
              {results.subjects.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/subjects/${sub.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{sub.emoji}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#1C1C1E] truncate group-hover:text-[#007AFF] transition-colors">
                        {sub.name}
                      </h4>
                      {sub.defaultRoom && (
                        <p className="text-xs text-[#8E8E93] truncate">{sub.defaultRoom}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#007AFF] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* 2. Apuntes */}
          {results.notes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
                Apuntes y Temas
              </span>
              {results.notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/subjects/${note.subject.id}/notes/${note.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#F2F2F7] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#1C1C1E] truncate group-hover:text-[#007AFF] transition-colors">
                        {note.title}
                      </h4>
                      <p className="text-xs text-[#8E8E93] flex items-center gap-1.5 truncate">
                        <span>{note.subject.emoji}</span>
                        <span>{note.subject.name}</span>
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#007AFF] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* 3. Parciales y Tareas */}
          {results.tasks.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
                Entregas y Parciales
              </span>
              {results.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/subjects/${task.subject.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#1C1C1E] truncate group-hover:text-[#007AFF] transition-colors">
                        {task.title}
                      </h4>
                      <p className="text-xs text-[#8E8E93] flex items-center gap-1.5 truncate">
                        <span>{task.subject.emoji}</span>
                        <span>{task.subject.name}</span>
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#007AFF] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* 4. Cursos y Libros */}
          {results.books && results.books.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
                Libros y Cursos
              </span>
              {results.books.map((b) => (
                <Link
                  key={b.id}
                  href={`/books/${b.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base shadow-2xs"
                      style={{ backgroundColor: `${b.coverColor}15` }}
                    >
                      {b.coverIcon || "📖"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#1C1C1E] truncate group-hover:text-[#007AFF] transition-colors">
                        {b.title}
                      </h4>
                      <p className="text-xs text-[#8E8E93] truncate">
                        {b.category} {b.subtitle ? `· ${b.subtitle}` : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#007AFF] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* 5. Páginas de Libros */}
          {results.bookPages && results.bookPages.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
                Hojas de Cursos
              </span>
              {results.bookPages.map((p) => (
                <Link
                  key={p.id}
                  href={`/books/${p.book.id}?page=${p.pageNumber}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <Book className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#1C1C1E] truncate group-hover:text-[#007AFF] transition-colors">
                        Página {p.pageNumber}: {p.title || "Sin título"}
                      </h4>
                      <p className="text-xs text-[#8E8E93] truncate">
                        {p.book.coverIcon} {p.book.title}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#007AFF] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {!query.trim() && (
            <div className="py-6 text-center text-xs text-[#8E8E93] space-y-1">
              <p className="font-medium text-[#1C1C1E]">Búsqueda Spotlight</p>
              <p>Escribe el nombre de un tema, parcial o materia para ir directo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
