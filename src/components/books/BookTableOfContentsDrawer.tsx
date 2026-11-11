"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  BookOpen,
  Bookmark,
  Plus,
  Trash2,
  ChevronRight,
  FileText,
} from "lucide-react";

interface PageSummary {
  id: string;
  pageNumber: number;
  title: string | null;
  isBookmarked: boolean;
}

interface BookTableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  pages: PageSummary[];
  currentPageNumber: number;
  onSelectPage: (pageNumber: number) => void;
  onAddNewPage: () => void;
  onDeletePage?: (pageId: string) => void;
}

export function BookTableOfContentsDrawer({
  isOpen,
  onClose,
  bookTitle,
  pages,
  currentPageNumber,
  onSelectPage,
  onAddNewPage,
  onDeletePage,
}: BookTableOfContentsDrawerProps) {
  const [search, setSearch] = useState("");
  const [filterBookmarkedOnly, setFilterBookmarkedOnly] = useState(false);

  if (!isOpen) return null;

  const filteredPages = pages.filter((p) => {
    const matchesSearch =
      (p.title || `Página ${p.pageNumber}`).toLowerCase().includes(search.toLowerCase()) ||
      p.pageNumber.toString() === search.trim();
    const matchesBookmark = filterBookmarkedOnly ? p.isBookmarked : true;
    return matchesSearch && matchesBookmark;
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 border-r border-black/10 dark:border-white/10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-[#007AFF] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-zinc-100 truncate">
                Índice y Páginas
              </h2>
              <p className="text-[11px] text-[#8E8E93] truncate">{bookTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-black/5 dark:border-white/10 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o página..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-stone-100 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-[#007AFF]/30 text-[#1C1C1E] dark:text-zinc-100 placeholder:text-stone-400"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setFilterBookmarkedOnly(!filterBookmarkedOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterBookmarkedOnly
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40"
                  : "text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${filterBookmarkedOnly ? "fill-red-500" : ""}`} />
              <span>Solo Marcadores</span>
            </button>

            <button
              type="button"
              onClick={onAddNewPage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#007AFF] text-white font-medium hover:bg-blue-600 transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Hoja</span>
            </button>
          </div>
        </div>

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPages.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No se encontraron páginas que coincidan con la búsqueda.
            </div>
          ) : (
            filteredPages.map((page) => {
              const isActive = page.pageNumber === currentPageNumber;
              return (
                <div
                  key={page.id}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/40 text-[#007AFF] font-medium"
                      : "hover:bg-stone-100 dark:hover:bg-zinc-800/60 text-[#1C1C1E] dark:text-zinc-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPage(page.pageNumber);
                      onClose();
                    }}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-mono flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-[#007AFF] text-white"
                          : "bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300"
                      }`}
                    >
                      {page.pageNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">
                        {page.title || `Página ${page.pageNumber}`}
                      </p>
                    </div>

                    {page.isBookmarked && (
                      <Bookmark className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
                    )}
                  </button>

                  {onDeletePage && pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeletePage(page.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all ml-1 shrink-0"
                      title="Eliminar esta página"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-black/5 dark:border-white/10 text-center">
          <p className="text-[11px] text-stone-400">
            Total de {pages.length} {pages.length === 1 ? "página" : "páginas"} en este libro
          </p>
        </div>
      </div>
    </div>
  );
}
