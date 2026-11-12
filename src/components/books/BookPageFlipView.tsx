"use client";

import React, { useState, useEffect, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sliders,
  List,
  Plus,
  Maximize2,
  Minimize2,
  Sparkles,
  Loader2,
  Share2,
} from "lucide-react";
import { NotionBlock, BOOK_PAPER_TEXTURES } from "@/lib/validations";
import { NotionBlockEditor } from "./NotionBlockEditor";
import { BookTableOfContentsDrawer } from "./BookTableOfContentsDrawer";
import { BookCustomizationDrawer } from "./BookCustomizationDrawer";
import { ConfirmModal } from "../ui/ConfirmModal";
import {
  createBookPageAction,
  updateBookPageBlocksAction,
  togglePageBookmarkAction,
  deleteBookPageAction,
  updateCourseBookCustomizationAction,
} from "@/server/actions";

interface BookPageData {
  id: string;
  pageNumber: number;
  title: string | null;
  isBookmarked: boolean;
  blocksJson: string;
}

interface BookPageFlipViewProps {
  book: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    category: string;
    coverGradient: string;
    coverColor: string;
    coverIcon: string;
    coverStyle: "minimal" | "editorial" | "technical" | "leather";
    paperTexture: "blank" | "sepia" | "dotted" | "grid" | "lined" | "dark";
    fontFamily: "sans" | "serif" | "mono";
    fontSize: "sm" | "base" | "lg" | "xl";
    lineHeight: "compact" | "relaxed" | "loose";
    pageLayout: "single" | "spread";
    pageMargins: "narrow" | "normal" | "wide";
    pages: BookPageData[];
  };
}

export function BookPageFlipView({ book }: BookPageFlipViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Current page state
  const [pages, setPages] = useState<BookPageData[]>(book.pages);
  useEffect(() => {
    setPages(book.pages);
  }, [book.pages]);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const isReflowingRef = useRef(false);

  // UI Drawers & Zen Mode
  const [tocOpen, setTocOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  // Live Customization State
  const [customization, setCustomization] = useState({
    paperTexture: book.paperTexture,
    fontFamily: book.fontFamily,
    fontSize: book.fontSize,
    lineHeight: book.lineHeight,
    pageLayout: book.pageLayout,
    pageMargins: book.pageMargins,
    coverStyle: book.coverStyle,
    coverGradient: book.coverGradient,
  });

  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const totalPages = sortedPages.length;

  const activePage = sortedPages[currentPageIndex] || sortedPages[0];
  // In spread mode: activePage on left (if even) or pair
  const isSpread = customization.pageLayout === "spread";
  const spreadLeftIndex = isSpread
    ? currentPageIndex % 2 === 0
      ? currentPageIndex
      : currentPageIndex - 1
    : currentPageIndex;
  const spreadRightIndex = isSpread ? spreadLeftIndex + 1 : -1;

  const leftPage = sortedPages[spreadLeftIndex];
  const rightPage = spreadRightIndex >= 0 && spreadRightIndex < totalPages ? sortedPages[spreadRightIndex] : null;

  // Turn to Next Page
  const handleNextPage = useCallback(() => {
    if (isFlipping) return;
    const step = isSpread ? 2 : 1;
    if (currentPageIndex + step < totalPages) {
      setFlipDirection("next");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPageIndex((prev) => Math.min(prev + step, totalPages - 1));
        setIsFlipping(false);
      }, 350);
    }
  }, [currentPageIndex, totalPages, isSpread, isFlipping]);

  // Turn to Prev Page
  const handlePrevPage = useCallback(() => {
    if (isFlipping) return;
    const step = isSpread ? 2 : 1;
    if (currentPageIndex - step >= 0) {
      setFlipDirection("prev");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPageIndex((prev) => Math.max(prev - step, 0));
        setIsFlipping(false);
      }, 350);
    }
  }, [currentPageIndex, isSpread, isFlipping]);

  // Keyboard navigation: Alt+Left / Alt+Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNextPage();
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextPage, handlePrevPage]);

  // Add new page action - Siempre añade una nueva hoja al final del libro
  const handleAddNewPage = useCallback(() => {
    startTransition(async () => {
      const res = await createBookPageAction(book.id);
      if (res.success) {
        router.refresh();
        setCurrentPageIndex(totalPages);
      }
    });
  }, [book.id, totalPages, router]);

  // Paginación física automática (un libro no tiene scroll vertical)
  const handlePageOverflow = useCallback(
    (fromPageId: string) => {
      if (isSpread) {
        // En modo libro abierto (2 páginas):
        if (leftPage && fromPageId === leftPage.id && rightPage) {
          // Si se llena la hoja izquierda, enfocar el primer bloque de la hoja derecha abierta
          const rightEditorEl = document.querySelector(
            `[data-page-id="${rightPage.id}"] textarea`
          ) as HTMLTextAreaElement | null;
          if (rightEditorEl) {
            rightEditorEl.focus();
            return;
          }
        }

        // Si se llena la hoja derecha (o no hay hoja derecha en el pliego actual)
        if (spreadLeftIndex + 2 < totalPages) {
          handleNextPage();
          setTimeout(() => {
            const nextEl = document.querySelector(
              `[data-notion-editor="true"] textarea`
            ) as HTMLTextAreaElement | null;
            if (nextEl) nextEl.focus();
          }, 380);
        } else {
          // Última página del libro: crear hoja nueva automáticamente al final
          handleAddNewPage();
        }
      } else {
        // Modo página simple (móvil o vertical)
        if (currentPageIndex < totalPages - 1) {
          handleNextPage();
          setTimeout(() => {
            const nextEl = document.querySelector(
              `[data-notion-editor="true"] textarea`
            ) as HTMLTextAreaElement | null;
            if (nextEl) nextEl.focus();
          }, 380);
        } else {
          // Última página del libro: crear hoja nueva automáticamente al final
          handleAddNewPage();
        }
      }
    },
    [
      isSpread,
      leftPage,
      rightPage,
      spreadLeftIndex,
      totalPages,
      currentPageIndex,
      handleNextPage,
      handleAddNewPage,
    ]
  );

  // Retroceso físico a la página anterior cuando el usuario presiona Borrar (Backspace) al inicio
  const handlePageUnderflow = useCallback(
    (fromPageId: string, isEmptyPage: boolean) => {
      if (isSpread) {
        if (rightPage && fromPageId === rightPage.id) {
          // Si estamos en la hoja derecha:
          if (isEmptyPage && totalPages > 1) {
            startTransition(async () => {
              await deleteBookPageAction(fromPageId);
              router.refresh();
              setTimeout(() => {
                const textareas = document.querySelectorAll(
                  `[data-page-id="${leftPage?.id}"] textarea`
                );
                const lastEl = textareas[textareas.length - 1] as HTMLTextAreaElement | null;
                if (lastEl) {
                  lastEl.focus();
                  lastEl.setSelectionRange(lastEl.value.length, lastEl.value.length);
                }
              }, 300);
            });
            return;
          }

          // Si no está vacía, solo devolver el foco al final de la hoja izquierda
          if (leftPage) {
            const leftTextareas = document.querySelectorAll(
              `[data-page-id="${leftPage.id}"] textarea`
            );
            const lastEl = leftTextareas[leftTextareas.length - 1] as HTMLTextAreaElement | null;
            if (lastEl) {
              lastEl.focus();
              lastEl.setSelectionRange(lastEl.value.length, lastEl.value.length);
            }
          }
          return;
        }

        // Si estamos en la hoja izquierda:
        if (spreadLeftIndex > 0) {
          if (isEmptyPage && totalPages > 1) {
            startTransition(async () => {
              await deleteBookPageAction(fromPageId);
              router.refresh();
              setCurrentPageIndex((prev) => Math.max(0, prev - 2));
              setTimeout(() => {
                const textareas = document.querySelectorAll(
                  `[data-notion-editor="true"] textarea`
                );
                const lastEl = textareas[textareas.length - 1] as HTMLTextAreaElement | null;
                if (lastEl) {
                  lastEl.focus();
                  lastEl.setSelectionRange(lastEl.value.length, lastEl.value.length);
                }
              }, 380);
            });
            return;
          }

          handlePrevPage();
          setTimeout(() => {
            const textareas = document.querySelectorAll(
              `[data-notion-editor="true"] textarea`
            );
            const lastEl = textareas[textareas.length - 1] as HTMLTextAreaElement | null;
            if (lastEl) {
              lastEl.focus();
              lastEl.setSelectionRange(lastEl.value.length, lastEl.value.length);
            }
          }, 380);
        }
      } else {
        // Modo página simple (móvil o vertical)
        if (currentPageIndex > 0) {
          if (isEmptyPage && totalPages > 1) {
            startTransition(async () => {
              await deleteBookPageAction(fromPageId);
              router.refresh();
              setCurrentPageIndex((prev) => Math.max(0, prev - 1));
              setTimeout(() => {
                const textareas = document.querySelectorAll(
                  `[data-notion-editor="true"] textarea`
                );
                const lastEl = textareas[textareas.length - 1] as HTMLTextAreaElement | null;
                if (lastEl) {
                  lastEl.focus();
                  lastEl.setSelectionRange(lastEl.value.length, lastEl.value.length);
                }
              }, 380);
            });
            return;
          }

          handlePrevPage();
          setTimeout(() => {
            const textareas = document.querySelectorAll(
              `[data-notion-editor="true"] textarea`
            );
            const lastEl = textareas[textareas.length - 1] as HTMLTextAreaElement | null;
            if (lastEl) {
              lastEl.focus();
              lastEl.setSelectionRange(lastEl.value.length, lastEl.value.length);
            }
          }, 380);
        }
      }
    },
    [
      isSpread,
      leftPage,
      rightPage,
      totalPages,
      spreadLeftIndex,
      currentPageIndex,
      handlePrevPage,
      router,
    ]
  );

  // Helper: leer los bloques más recientes de una página (draft en localStorage o JSON de BD)
  const getLatestPageBlocks = useCallback((page: BookPageData): NotionBlock[] => {
    try {
      const rawDraft = localStorage.getItem(`misapuntesu_book_page_draft_${page.id}`);
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft);
        if (Array.isArray(parsedDraft?.blocks) && parsedDraft.blocks.length > 0) {
          return parsedDraft.blocks;
        }
      }
    } catch {
      // Ignorar error de lectura localStorage
    }
    try {
      const parsed = JSON.parse(page.blocksJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  // Motor de Auto-Reflow Paginado Automático de todo el libro (estilo Microsoft Word)
  const handleReflowBook = useCallback(
    (
      fromPageId: string,
      updatedFromBlocks: NotionBlock[],
      focusInfo?: { blockId: string; cursorPos: number }
    ): boolean => {
      if (isReflowingRef.current) return false;
      const fromIndex = sortedPages.findIndex((p) => p.id === fromPageId);
      if (fromIndex === -1) return false;

      const listEl = document.querySelector(
        `[data-page-id="${fromPageId}"] [data-notion-blocks-list="true"]`
      ) as HTMLElement | null;
      const frameEl = listEl?.parentElement?.parentElement;
      if (!listEl || !frameEl) return false;

      const availableWidth = listEl.clientWidth || 560;
      const availableHeight = Math.max(240, (frameEl.clientHeight || 580) - 14);

      const tailPages = sortedPages.slice(fromIndex);
      const currentPagesBlocks: NotionBlock[][] = tailPages.map((p, idx) =>
        idx === 0 ? updatedFromBlocks : getLatestPageBlocks(p)
      );

      // Juntar todos los bloques desde esta página hasta el final del libro
      const allBlocks: NotionBlock[] = [];
      currentPagesBlocks.forEach((pb) => {
        pb.forEach((b) => allBlocks.push(b));
      });

      // Si todo quedó vacío excepto 1 bloque vacío, dejar 1 página
      if (allBlocks.length === 0) {
        allBlocks.push({ id: `b_${Date.now()}_1`, type: "paragraph", content: "" });
      }

      // Medidor DOM invisible con exactamente las mismas clases tipográficas del libro
      const fontFamilyCls = { sans: "font-sans", serif: "font-serif", mono: "font-mono" }[
        customization.fontFamily
      ];
      const fontSizeCls = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" }[
        customization.fontSize
      ];
      const lineHeightCls = {
        compact: "leading-normal",
        relaxed: "leading-relaxed",
        loose: "leading-loose",
      }[customization.lineHeight];

      const measurer = document.createElement("div");
      measurer.className = `${fontFamilyCls} ${fontSizeCls} ${lineHeightCls} space-y-0.5`;
      measurer.style.position = "fixed";
      measurer.style.left = "-99999px";
      measurer.style.top = "0";
      measurer.style.width = `${availableWidth}px`;
      measurer.style.visibility = "hidden";
      measurer.style.pointerEvents = "none";
      document.body.appendChild(measurer);

      const chunkedPages: NotionBlock[][] = [];
      let currentChunk: NotionBlock[] = [];
      let currentHeight = 0;

      try {
        for (const b of allBlocks) {
          const item = document.createElement("div");
          item.style.whiteSpace = "pre-wrap";
          item.style.wordBreak = "break-word";
          if (b.type === "h1") {
            item.className = "text-xl sm:text-2xl font-bold tracking-tight mt-1 mb-0.5";
          } else if (b.type === "h2") {
            item.className = "text-lg sm:text-xl font-semibold tracking-tight mt-1 mb-0.5";
          } else if (b.type === "h3") {
            item.className = "text-base font-medium tracking-tight mt-0.5";
          } else if (b.type === "callout") {
            item.className = "my-1.5 p-3 rounded-2xl border";
          } else if (b.type === "quote") {
            item.className = "my-1.5 pl-3 border-l-3 italic font-serif";
          } else if (b.type === "code") {
            item.className = "my-1.5 p-3 rounded-xl font-mono text-xs sm:text-sm";
          } else {
            item.className = "leading-relaxed";
          }
          item.textContent = b.content.trim().length > 0 ? b.content : " ";
          measurer.appendChild(item);
          const blockH = item.getBoundingClientRect().height + 4;
          measurer.removeChild(item);

          if (currentHeight + blockH > availableHeight && currentChunk.length > 0) {
            chunkedPages.push(currentChunk);
            currentChunk = [b];
            currentHeight = blockH;
          } else {
            currentChunk.push(b);
            currentHeight += blockH;
          }
        }
        if (currentChunk.length > 0) {
          chunkedPages.push(currentChunk);
        }
      } finally {
        document.body.removeChild(measurer);
      }

      // Verificar si hubo algún cambio real en la distribución de páginas
      const isSameDistribution =
        chunkedPages.length === currentPagesBlocks.length &&
        chunkedPages.every((chunk, idx) => {
          const orig = currentPagesBlocks[idx];
          if (chunk.length !== orig.length) return false;
          return chunk.every((b, bi) => b.id === orig[bi].id && b.content === orig[bi].content);
        });

      if (isSameDistribution) return false;

      isReflowingRef.current = true;
      setTimeout(() => {
        isReflowingRef.current = false;
      }, 220);

      // Identificar en qué página cayó el bloque enfocado
      let focusPageOffset = 0;
      if (focusInfo?.blockId) {
        const foundIdx = chunkedPages.findIndex((chunk) =>
          chunk.some((b) => b.id === focusInfo.blockId)
        );
        if (foundIdx !== -1) focusPageOffset = foundIdx;
      }

      const overlappingCount = Math.min(tailPages.length, chunkedPages.length);
      const updatedIdsToPersist: { id: string; blocks: NotionBlock[] }[] = [];

      // 1. Actualizar páginas existentes que permanecen
      setPages((prev) => {
        const nextList = [...prev];
        for (let i = 0; i < overlappingCount; i++) {
          const targetPage = tailPages[i];
          const newBlocks = chunkedPages[i];
          const globalIdx = nextList.findIndex((p) => p.id === targetPage.id);
          if (globalIdx !== -1) {
            nextList[globalIdx] = {
              ...nextList[globalIdx],
              blocksJson: JSON.stringify(newBlocks),
            };
          }
        }
        // Quitar páginas sobrantes al final si el documento se compactó
        if (chunkedPages.length < tailPages.length) {
          const toRemoveIds = new Set(tailPages.slice(chunkedPages.length).map((p) => p.id));
          return nextList.filter((p) => !toRemoveIds.has(p.id));
        }
        return nextList;
      });

      for (let i = 0; i < overlappingCount; i++) {
        const targetPage = tailPages[i];
        const newBlocks = chunkedPages[i];
        updatedIdsToPersist.push({ id: targetPage.id, blocks: newBlocks });

        const shouldFocusThis = focusInfo && i === focusPageOffset;
        window.dispatchEvent(
          new CustomEvent("book-page-blocks-updated", {
            detail: {
              pageId: targetPage.id,
              blocks: newBlocks,
              ...(shouldFocusThis
                ? { focusBlockId: focusInfo.blockId, cursorPos: focusInfo.cursorPos }
                : {}),
            },
          })
        );
      }

      // Mover visor si el cursor pasó a una página fuera del pliego actual
      const targetAbsoluteIndex = fromIndex + focusPageOffset;
      if (isSpread) {
        const targetSpreadLeft =
          targetAbsoluteIndex % 2 === 0 ? targetAbsoluteIndex : targetAbsoluteIndex - 1;
        if (targetSpreadLeft !== spreadLeftIndex && targetAbsoluteIndex < tailPages.length + fromIndex) {
          setCurrentPageIndex(Math.max(0, targetSpreadLeft));
        }
      } else if (targetAbsoluteIndex !== currentPageIndex) {
        setCurrentPageIndex(Math.max(0, targetAbsoluteIndex));
      }

      // 2. Persistir en DB (actualizar, borrar sobrantes o crear nuevas si se desbordó)
      const extraPagesToDelete =
        chunkedPages.length < tailPages.length ? tailPages.slice(chunkedPages.length) : [];
      const extraChunksToCreate =
        chunkedPages.length > tailPages.length ? chunkedPages.slice(tailPages.length) : [];

      for (const delPage of extraPagesToDelete) {
        try {
          localStorage.removeItem(`misapuntesu_book_page_draft_${delPage.id}`);
        } catch {}
      }

      startTransition(async () => {
        for (const item of updatedIdsToPersist) {
          await updateBookPageBlocksAction(item.id, { blocks: item.blocks });
        }
        for (const delPage of extraPagesToDelete) {
          await deleteBookPageAction(delPage.id);
        }
        for (const extraBlocks of extraChunksToCreate) {
          const created = await createBookPageAction(book.id);
          if (created.success && created.data) {
            await updateBookPageBlocksAction(created.data.id, { blocks: extraBlocks });
          }
        }
        if (extraPagesToDelete.length > 0 || extraChunksToCreate.length > 0) {
          router.refresh();
          if (extraChunksToCreate.length > 0 && focusPageOffset >= tailPages.length) {
            setCurrentPageIndex(fromIndex + focusPageOffset);
          }
        }
      });

      return true;
    },
    [
      sortedPages,
      getLatestPageBlocks,
      customization.fontFamily,
      customization.fontSize,
      customization.lineHeight,
      isSpread,
      spreadLeftIndex,
      currentPageIndex,
      book.id,
      router,
    ]
  );

  // Jalar contenido de la página siguiente al presionar Supr (Delete) al final de una hoja (estilo Word)
  const handlePullFromNextPage = useCallback(
    (fromPageId: string, currentBlocks: NotionBlock[], currentBlockId: string) => {
      const fromIndex = sortedPages.findIndex((p) => p.id === fromPageId);
      if (fromIndex === -1 || fromIndex >= sortedPages.length - 1) return;

      const lastCurrentBlock = currentBlocks[currentBlocks.length - 1];
      const cursorPos = lastCurrentBlock ? lastCurrentBlock.content.length : 0;

      // 1. Intentar primero reacomodar automáticamente todo el libro (reflow en cascada estilo Word)
      const didReflow = handleReflowBook(fromPageId, currentBlocks, {
        blockId: currentBlockId,
        cursorPos,
      });
      if (didReflow) return;

      // 2. Si no subió ningún bloque completo por falta de espacio de párrafo entero, traer el primer bloque de la siguiente página
      const nextPage = sortedPages[fromIndex + 1];
      const nextBlocks = getLatestPageBlocks(nextPage);

      const isNextEmpty =
        nextBlocks.length === 0 ||
        (nextBlocks.length === 1 && nextBlocks[0].content.trim() === "");

      if (isNextEmpty) {
        // Eliminar hoja siguiente vacía
        try {
          localStorage.removeItem(`misapuntesu_book_page_draft_${nextPage.id}`);
        } catch {}
        setPages((prev) => prev.filter((p) => p.id !== nextPage.id));
        startTransition(async () => {
          await deleteBookPageAction(nextPage.id);
          router.refresh();
        });
        return;
      }

      const pulledBlock = nextBlocks[0];
      const remainingNextBlocks = nextBlocks.slice(1);

      let newFromBlocks: NotionBlock[];
      let focusBlockId = currentBlockId;
      let nextCursorPos = cursorPos;

      if (lastCurrentBlock && lastCurrentBlock.content === "") {
        newFromBlocks = [...currentBlocks.slice(0, -1), pulledBlock];
        focusBlockId = pulledBlock.id;
        nextCursorPos = 0;
      } else {
        newFromBlocks = [...currentBlocks, pulledBlock];
      }

      // Actualizar estado inmediato de la hoja actual
      setPages((prev) =>
        prev
          .map((p) => {
            if (p.id === fromPageId) {
              return { ...p, blocksJson: JSON.stringify(newFromBlocks) };
            }
            if (p.id === nextPage.id && remainingNextBlocks.length > 0) {
              return { ...p, blocksJson: JSON.stringify(remainingNextBlocks) };
            }
            return p;
          })
          .filter((p) => !(p.id === nextPage.id && remainingNextBlocks.length === 0))
      );

      window.dispatchEvent(
        new CustomEvent("book-page-blocks-updated", {
          detail: {
            pageId: fromPageId,
            blocks: newFromBlocks,
            focusBlockId,
            cursorPos: nextCursorPos,
          },
        })
      );

      if (remainingNextBlocks.length === 0) {
        try {
          localStorage.removeItem(`misapuntesu_book_page_draft_${nextPage.id}`);
        } catch {}
        startTransition(async () => {
          await updateBookPageBlocksAction(fromPageId, { blocks: newFromBlocks });
          await deleteBookPageAction(nextPage.id);
          router.refresh();
        });
      } else {
        window.dispatchEvent(
          new CustomEvent("book-page-blocks-updated", {
            detail: {
              pageId: nextPage.id,
              blocks: remainingNextBlocks,
            },
          })
        );
        startTransition(async () => {
          await updateBookPageBlocksAction(fromPageId, { blocks: newFromBlocks });
          await updateBookPageBlocksAction(nextPage.id, { blocks: remainingNextBlocks });
        });
      }
    },
    [sortedPages, router, handleReflowBook, getLatestPageBlocks]
  );

  // Toggle bookmark action
  const handleToggleBookmark = (pageId: string) => {
    startTransition(async () => {
      await togglePageBookmarkAction(pageId);
      router.refresh();
    });
  };

  // Delete page action
  const handleDeletePage = (pageId: string) => {
    if (totalPages <= 1) return;
    setPageToDelete(pageId);
  };

  const confirmDeletePage = () => {
    if (!pageToDelete) return;
    startTransition(async () => {
      await deleteBookPageAction(pageToDelete);
      setPageToDelete(null);
      router.refresh();
      setCurrentPageIndex((prev) => Math.max(0, prev - 1));
    });
  };

  // Save page blocks
  const handleSaveBlocks = async (pageId: string, blocks: NotionBlock[]) => {
    await updateBookPageBlocksAction(pageId, { blocks });
  };

  // Update customization
  const handleUpdateCustomization = (
    updates: Partial<typeof customization>
  ) => {
    setCustomization((prev) => ({ ...prev, ...updates }));
    startTransition(async () => {
      await updateCourseBookCustomizationAction(book.id, updates);
    });
  };

  // Parse page blocks
  const parseBlocks = (jsonStr: string): NotionBlock[] => {
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Get paper texture styling
  const currentTexture =
    BOOK_PAPER_TEXTURES.find((t) => t.id === customization.paperTexture) ||
    BOOK_PAPER_TEXTURES[0];

  const fontFamilyClasses = {
    sans: "font-sans",
    serif: "font-serif",
    mono: "font-mono",
  }[customization.fontFamily];

  const fontSizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  }[customization.fontSize];

  const lineHeightClasses = {
    compact: "leading-normal",
    relaxed: "leading-relaxed",
    loose: "leading-loose",
  }[customization.lineHeight];

  const marginClasses = {
    narrow: "px-2 sm:px-4 py-1.5 sm:py-2.5",
    normal: "px-3 sm:px-6 py-2 sm:py-3.5",
    wide: "px-4 sm:px-9 py-2.5 sm:py-5",
  }[customization.pageMargins];

  const themeMode = customization.paperTexture === "dark" ? "dark" : customization.paperTexture === "sepia" ? "sepia" : "light";

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden transition-all duration-300 ${
        zenMode
          ? "fixed inset-0 z-50 bg-[#1C1C1E]"
          : "bg-[#F2F2F7]"
      }`}
    >
      {/* 1. Header estilo Apple Glass */}
      <header
        className={`h-11 sm:h-13 shrink-0 transition-all duration-200 border-b ${
          zenMode
            ? "bg-zinc-900/90 text-zinc-100 border-zinc-800 backdrop-blur-xl"
            : "bg-white/80 text-[#1C1C1E] border-black/5 backdrop-blur-xl"
        } px-2.5 sm:px-6 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/books"
            className="p-1.5 -ml-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
            title="Volver a la Biblioteca"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm select-none shrink-0">{book.coverIcon}</span>
              <h1 className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-[120px] sm:max-w-xs">
                {book.title}
              </h1>
            </div>
            <p className="text-[10px] text-[#8E8E93] truncate">
              Página {currentPageIndex + 1} de {totalPages}
            </p>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Índice / TOC Drawer Button */}
          <button
            onClick={() => setTocOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-transform active:scale-95"
            title="Índice de contenido"
          >
            <List className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="hidden sm:inline">Índice</span>
          </button>

          {/* Personalización Studio (Aa) */}
          <button
            onClick={() => setCustomizationOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-transform active:scale-95"
            title="Diseño de lectura & tipografía"
          >
            <span className="font-serif text-sm font-bold text-[#007AFF]">Aa</span>
          </button>

          {/* Marcador de Página Activa */}
          {activePage && (
            <button
              onClick={() => handleToggleBookmark(activePage.id)}
              className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                activePage.isBookmarked
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  : "text-stone-400 hover:text-stone-700 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              title={activePage.isBookmarked ? "Página marcada" : "Marcar página"}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${activePage.isBookmarked ? "fill-red-500" : ""}`}
              />
            </button>
          )}

          {/* Nueva Hoja Rápida */}
          <button
            onClick={handleAddNewPage}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
            title="Añadir nueva hoja (+)"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            <span className="hidden md:inline">Nueva Hoja</span>
          </button>

          {/* Modo Zen Pantalla Completa */}
          <button
            onClick={() => setZenMode(!zenMode)}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 transition-colors"
            title={zenMode ? "Salir de Modo Zen" : "Modo Zen"}
          >
            {zenMode ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* 2. Área Central del Libro 3D (Apple Books Stage) */}
      <main className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-1 sm:p-3 overflow-hidden relative">
        {/* Container con Perspectiva 3D */}
        <div
          className="relative w-full max-w-7xl h-full max-h-full flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden transition-all duration-500"
          style={{ perspective: "2200px" }}
        >
          {/* Libro Abierto / Hoja */}
          <div
            className={`relative w-full h-full max-h-full rounded-2xl shadow-xl transition-all duration-300 border border-black/10 dark:border-white/10 overflow-hidden flex-1 min-h-0 flex ${
              isSpread ? "grid grid-cols-1 md:grid-cols-2" : "max-w-4xl mx-auto flex-col"
            }`}
            style={{
              transformStyle: "preserve-3d",
              boxShadow:
                "0 15px 35px -10px rgba(0, 0, 0, 0.2), 0 5px 15px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Ribbon Bookmark Rojo en la esquina superior */}
            {activePage?.isBookmarked && (
              <div
                onClick={() => handleToggleBookmark(activePage.id)}
                className="absolute top-0 right-6 z-30 w-6 h-10 bg-gradient-to-b from-red-600 to-rose-700 shadow-md cursor-pointer transition-transform hover:translate-y-0.5"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
                }}
                title="Página marcada (clic para quitar)"
              />
            )}

            {/* Pliegue Central de Sombra (Spine Gutter Shadow en modo Spread) */}
            {isSpread && (
              <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 z-20 pointer-events-none bg-gradient-to-r from-transparent via-black/15 to-transparent" />
            )}

            {/* HOJA IZQUIERDA (O Única Hoja en Modo Single) */}
            {leftPage && (
              <div
                className={`relative flex flex-col justify-between h-full max-h-full flex-1 min-h-0 overflow-hidden ${currentTexture.bg} ${marginClasses} ${
                  isSpread ? "border-r border-black/5 dark:border-white/5" : ""
                }`}
              >
                {/* Header de Hoja */}
                <div className="shrink-0 flex items-center justify-between text-xs text-stone-400 select-none pb-1.5 border-b border-black/5 dark:border-white/5">
                  <span className="font-semibold uppercase tracking-wider text-[10px] truncate max-w-[70%]">
                    {book.title}
                  </span>
                  <span className="font-mono text-[11px]">Pág {leftPage.pageNumber}</span>
                </div>

                {/* Notion Block Editor - Hoja física de libro sin scroll vertical */}
                <div className="flex-1 min-h-0 overflow-hidden relative py-1">
                  <NotionBlockEditor
                    key={leftPage.id}
                    pageId={leftPage.id}
                    initialBlocks={parseBlocks(leftPage.blocksJson)}
                    onSave={(blocks) => handleSaveBlocks(leftPage.id, blocks)}
                    onPageOverflow={() => handlePageOverflow(leftPage.id)}
                    onPageUnderflow={(isEmpty) => handlePageUnderflow(leftPage.id, isEmpty)}
                    onPullNextPage={(blocks, blockId) => handlePullFromNextPage(leftPage.id, blocks, blockId)}
                    onReflowBook={(blocks, focusInfo) => handleReflowBook(leftPage.id, blocks, focusInfo)}
                    fontFamilyClass={fontFamilyClasses}
                    fontSizeClass={fontSizeClasses}
                    lineHeightClass={lineHeightClasses}
                    themeMode={themeMode}
                  />
                </div>

                {/* Footer de Hoja */}
                <div className="shrink-0 flex items-center justify-between text-[10px] text-stone-400 select-none pt-1.5 border-t border-black/5 dark:border-white/5">
                  <span className="truncate max-w-[70%]">{leftPage.title || `Página ${leftPage.pageNumber}`}</span>
                  <span className="opacity-70 font-mono">#{leftPage.pageNumber}</span>
                </div>
              </div>
            )}

            {/* HOJA DERECHA (Solo en modo Spread 2 Páginas) */}
            {isSpread && (
              <div
                className={`hidden md:flex flex-col justify-between h-full max-h-full flex-1 min-h-0 overflow-hidden ${currentTexture.bg} ${marginClasses}`}
              >
                {rightPage ? (
                  <>
                    {/* Header de Hoja Derecha */}
                    <div className="shrink-0 flex items-center justify-between text-xs text-stone-400 select-none pb-1.5 border-b border-black/5 dark:border-white/5">
                      <span className="font-semibold uppercase tracking-wider text-[10px] truncate max-w-[70%]">
                        {rightPage.title || `Página ${rightPage.pageNumber}`}
                      </span>
                      <span className="font-mono text-[11px]">Pág {rightPage.pageNumber}</span>
                    </div>

                    {/* Notion Block Editor - Hoja física de libro sin scroll vertical */}
                    <div className="flex-1 min-h-0 overflow-hidden relative py-1">
                      <NotionBlockEditor
                        key={rightPage.id}
                        pageId={rightPage.id}
                        initialBlocks={parseBlocks(rightPage.blocksJson)}
                        onSave={(blocks) => handleSaveBlocks(rightPage.id, blocks)}
                        onPageOverflow={() => handlePageOverflow(rightPage.id)}
                        onPageUnderflow={(isEmpty) => handlePageUnderflow(rightPage.id, isEmpty)}
                        onPullNextPage={(blocks, blockId) => handlePullFromNextPage(rightPage.id, blocks, blockId)}
                        onReflowBook={(blocks, focusInfo) => handleReflowBook(rightPage.id, blocks, focusInfo)}
                        fontFamilyClass={fontFamilyClasses}
                        fontSizeClass={fontSizeClasses}
                        lineHeightClass={lineHeightClasses}
                        themeMode={themeMode}
                      />
                    </div>

                    {/* Footer de Hoja Derecha */}
                    <div className="shrink-0 flex items-center justify-between text-[10px] text-stone-400 select-none pt-1.5 border-t border-black/5 dark:border-white/5">
                      <span className="truncate max-w-[70%]">{book.title}</span>
                      <span className="opacity-70 font-mono">#{rightPage.pageNumber}</span>
                    </div>
                  </>
                ) : (
                  /* Hoja en blanco con invitación a añadir contenido */
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                    <BookOpen className="w-10 h-10 text-stone-300 dark:text-zinc-600 mb-2" />
                    <h3 className="text-xs font-semibold text-stone-600 dark:text-zinc-300">
                      Fin del libro por ahora
                    </h3>
                    <p className="text-[11px] text-stone-400 max-w-xs mt-1 mb-3">
                      Has llegado a la última página. Añade una nueva hoja para continuar escribiendo.
                    </p>
                    <button
                      onClick={handleAddNewPage}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs hover:bg-blue-600 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Pasar a una hoja nueva</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flecha Flotante Anterior (Página Izquierda) */}
          {currentPageIndex > 0 && (
            <button
              onClick={handlePrevPage}
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md shadow-md border border-black/10 flex items-center justify-center text-[#1C1C1E] dark:text-zinc-100 hover:scale-105 active:scale-95 transition-all z-30"
              title="Página anterior (Alt + ←)"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Flecha Flotante Siguiente (Página Derecha) */}
          {(isSpread ? currentPageIndex + 2 < totalPages : currentPageIndex + 1 < totalPages) && (
            <button
              onClick={handleNextPage}
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md shadow-md border border-black/10 flex items-center justify-center text-[#1C1C1E] dark:text-zinc-100 hover:scale-105 active:scale-95 transition-all z-30"
              title="Página siguiente (Alt + →)"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* 3. Scrubber Bar Inferior (Barra Deslizante estilo Apple Books) */}
        <div className="shrink-0 w-full max-w-md mx-auto my-1 px-3 py-1 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xs flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex === 0}
            className="p-1 rounded text-stone-500 hover:text-stone-900 disabled:opacity-30"
            title="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min={0}
            max={Math.max(totalPages - 1, 0)}
            value={currentPageIndex}
            onChange={(e) => setCurrentPageIndex(Number(e.target.value))}
            className="flex-1 accent-[#007AFF] h-1 bg-stone-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
          />

          <button
            onClick={handleNextPage}
            disabled={isSpread ? currentPageIndex + 2 >= totalPages : currentPageIndex + 1 >= totalPages}
            className="p-1 rounded text-stone-500 hover:text-stone-900 disabled:opacity-30"
            title="Página siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono font-medium text-stone-600 dark:text-zinc-300 min-w-[55px] text-right">
            {currentPageIndex + 1} / {totalPages}
          </span>
        </div>
      </main>

      {/* 4. Drawers Auxiliares */}
      <BookTableOfContentsDrawer
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
        bookTitle={book.title}
        pages={sortedPages}
        currentPageNumber={activePage?.pageNumber || 1}
        onSelectPage={(pageNum) => {
          const idx = sortedPages.findIndex((p) => p.pageNumber === pageNum);
          if (idx !== -1) setCurrentPageIndex(idx);
        }}
        onAddNewPage={handleAddNewPage}
        onDeletePage={handleDeletePage}
      />

      <BookCustomizationDrawer
        isOpen={customizationOpen}
        onClose={() => setCustomizationOpen(false)}
        customization={customization}
        onChange={handleUpdateCustomization}
      />

      {/* Modal de Confirmación Estilizado */}
      <ConfirmModal
        isOpen={Boolean(pageToDelete)}
        onClose={() => setPageToDelete(null)}
        onConfirm={confirmDeletePage}
        title="¿Eliminar esta página?"
        message="Se eliminará esta página y todos sus bloques de contenido. Las páginas siguientes se reordenarán automáticamente."
        confirmText="Eliminar Página"
        isDestructive={true}
        isLoading={isPending}
      />
    </div>
  );
}
