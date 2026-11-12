"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  CheckSquare,
  Square,
  List,
  ListOrdered,
  AlertCircle,
  Quote,
  Code as CodeIcon,
  Minus,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Copy,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Link as LinkIcon,
  Baseline,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { NotionBlock, NOTION_BLOCK_TYPES } from "@/lib/validations";

interface NotionBlockEditorProps {
  initialBlocks: NotionBlock[];
  pageId: string;
  onSave: (blocks: NotionBlock[]) => Promise<void>;
  onPageOverflow?: () => void;
  onPageUnderflow?: (isEmptyPage: boolean) => void;
  readOnly?: boolean;
  fontFamilyClass?: string;
  fontSizeClass?: string;
  lineHeightClass?: string;
  themeMode?: "light" | "sepia" | "dark";
}

const BLOCK_ICONS: Record<string, React.ElementType> = {
  paragraph: Type,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  todo: CheckSquare,
  bullet: List,
  numbered: ListOrdered,
  callout: AlertCircle,
  quote: Quote,
  code: CodeIcon,
  divider: Minus,
};

const getLocalStorageDraft = (pid: string): NotionBlock[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`book_page_draft_${pid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return parsed.blocks;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

const saveLocalStorageDraft = (pid: string, newBlocks: NotionBlock[], isSynced: boolean) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `book_page_draft_${pid}`,
      JSON.stringify({
        pageId: pid,
        blocks: newBlocks,
        updatedAt: Date.now(),
        synced: isSynced,
      })
    );
  } catch {
    // ignore
  }
};

export function NotionBlockEditor({
  initialBlocks,
  pageId,
  onSave,
  onPageOverflow,
  onPageUnderflow,
  readOnly = false,
  fontFamilyClass = "font-sans",
  fontSizeClass = "text-base",
  lineHeightClass = "leading-relaxed",
  themeMode = "light",
}: NotionBlockEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<NotionBlock[]>(() => {
    const draft = getLocalStorageDraft(pageId);
    if (draft && draft.length > 0) {
      return draft;
    }
    return initialBlocks.length > 0
      ? initialBlocks
      : [
          {
            id: "b_" + Date.now() + "_1",
            type: "paragraph",
            content: "",
          },
        ];
  });

  // Active editing block ID
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const prevPageIdRef = useRef(pageId);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Sync if pageId changes (cambio real de página, no re-render de propiedades)
  useEffect(() => {
    if (prevPageIdRef.current !== pageId) {
      prevPageIdRef.current = pageId;
      const draft = getLocalStorageDraft(pageId);
      const toLoad = draft && draft.length > 0 ? draft : initialBlocks;
      setBlocks(
        toLoad.length > 0
          ? toLoad
          : [
              {
                id: "b_" + Date.now() + "_1",
                type: "paragraph",
                content: "",
              },
            ]
      );
      setEditingBlockId(null);
    }
  }, [pageId, initialBlocks]);

  const [savingStatus, setSavingStatus] = useState<"saved" | "saving" | "unsaved" | "offline_saved">("saved");
  const [slashMenu, setSlashMenu] = useState<{
    blockId: string;
    filter: string;
    selectedIndex: number;
    top: number;
    left: number;
  } | null>(null);

  const slashMenuRef = useRef(slashMenu);
  slashMenuRef.current = slashMenu;

  const [blockMenuId, setBlockMenuId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Barra Flotante de Selección (Estilo Editores Famosos: Notion, Medium, Apple Pages)
  const [floatingToolbar, setFloatingToolbar] = useState<{
    blockId: string;
    selectedText: string;
    selectionStart: number;
    selectionEnd: number;
    top: number;
    left: number;
  } | null>(null);

  const [activeSubmenu, setActiveSubmenu] = useState<
    "type" | "font" | "size" | "highlight" | "color" | "link" | null
  >(null);

  const [linkInputUrl, setLinkInputUrl] = useState("");
  const mouseCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Auto-resize textareas based on content
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  };

  // Debounced auto-save resiliente con contingencia offline y sincronización en reconexión
  const triggerAutoSave = useCallback(
    (newBlocks: NotionBlock[]) => {
      setSavingStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setSavingStatus("offline_saved");
          saveLocalStorageDraft(pageId, newBlocks, false);
          return;
        }

        setSavingStatus("saving");
        try {
          await onSave(newBlocks);
          setSavingStatus("saved");
          saveLocalStorageDraft(pageId, newBlocks, true);
        } catch {
          // En caso de corte de red momentáneo, se marca guardado seguro en dispositivo
          setSavingStatus("offline_saved");
          saveLocalStorageDraft(pageId, newBlocks, false);
        }
      }, 1000);
    },
    [onSave, pageId]
  );

  // Sincronización automática cuando el dispositivo recupera conexión a internet
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const raw = localStorage.getItem(`book_page_draft_${pageId}`);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft && draft.synced === false && Array.isArray(draft.blocks)) {
            setSavingStatus("saving");
            await onSave(draft.blocks);
            setSavingStatus("saved");
            saveLocalStorageDraft(pageId, draft.blocks, true);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [pageId, onSave]);

  // Protección ante cierre repentino de pestaña o navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (blocksRef.current && blocksRef.current.length > 0) {
        saveLocalStorageDraft(pageId, blocksRef.current, false);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pageId]);

  const handleBlur = (blockId: string, e: React.FocusEvent<HTMLTextAreaElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && relatedTarget.closest("[data-notion-editor]")) {
      return;
    }
    setTimeout(() => {
      if (slashMenuRef.current) return;
      const active = document.activeElement;
      if (!active || !active.closest("[data-notion-editor]")) {
        setEditingBlockId((curr) => (curr === blockId ? null : curr));
      }
    }, 150);
  };

  const handleEditorMouseMove = (e: React.MouseEvent) => {
    mouseCoordsRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleTextSelect = (
    blockId: string,
    e: React.SyntheticEvent<HTMLTextAreaElement>
  ) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    if (start !== end && end > start) {
      const selectedText = target.value.substring(start, end);
      if (!selectedText.trim()) {
        setFloatingToolbar(null);
        setActiveSubmenu(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      let clientX = mouseCoordsRef.current.x || (rect.left + rect.width / 2);
      let clientY = mouseCoordsRef.current.y || rect.top;

      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          clientX = r.left + r.width / 2;
          clientY = r.top;
        }
      }

      const toolbarWidth = 440;
      const left = Math.max(
        10,
        Math.min(window.innerWidth - toolbarWidth - 10, clientX - toolbarWidth / 2)
      );
      const top = clientY > 70 ? clientY - 54 : clientY + 36;

      setFloatingToolbar({
        blockId,
        selectedText,
        selectionStart: start,
        selectionEnd: end,
        top,
        left,
      });
      setActiveSubmenu(null);
    } else {
      if (!activeSubmenu) {
        setFloatingToolbar(null);
      }
    }
  };

  const executeInlineFormat = (
    blockId: string,
    prefix: string,
    suffix: string = prefix,
    customStart?: number,
    customEnd?: number
  ) => {
    const el = textareaRefs.current.get(blockId);
    const start = customStart ?? (floatingToolbar?.blockId === blockId ? floatingToolbar.selectionStart : el?.selectionStart ?? 0);
    const end = customEnd ?? (floatingToolbar?.blockId === blockId ? floatingToolbar.selectionEnd : el?.selectionEnd ?? 0);

    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== blockId) return b;
        const content = b.content;
        const before = content.slice(0, start);
        const selectedText = content.slice(start, end);
        const after = content.slice(end);

        const prefixLen = prefix.length;
        const suffixLen = suffix.length;

        const hasPrefixBefore =
          prefix === "*"
            ? before.endsWith("*") && !before.endsWith("**")
            : before.endsWith(prefix);
        const hasSuffixAfter =
          suffix === "*"
            ? after.startsWith("*") && !after.startsWith("**")
            : after.startsWith(suffix);

        const isAlreadyWrapped =
          prefix === "*"
            ? selectedText.startsWith("*") &&
              !selectedText.startsWith("**") &&
              selectedText.endsWith("*") &&
              !selectedText.endsWith("**") &&
              selectedText.length >= 2
            : selectedText.startsWith(prefix) &&
              selectedText.endsWith(suffix) &&
              selectedText.length >= prefixLen + suffixLen;

        let newContent: string;
        let newStart: number;
        let newEnd: number;

        if (hasPrefixBefore && hasSuffixAfter) {
          newContent = before.slice(0, -prefixLen) + selectedText + after.slice(suffixLen);
          newStart = start - prefixLen;
          newEnd = newStart + selectedText.length;
        } else if (isAlreadyWrapped) {
          const unwrapped = selectedText.slice(prefixLen, -suffixLen);
          newContent = before + unwrapped + after;
          newStart = start;
          newEnd = newStart + unwrapped.length;
        } else if (selectedText.length === 0) {
          const formatted = `${prefix}${suffix}`;
          newContent = before + formatted + after;
          newStart = start + prefixLen;
          newEnd = newStart;
        } else {
          const formatted = `${prefix}${selectedText}${suffix}`;
          newContent = before + formatted + after;
          newStart = start;
          newEnd = start + formatted.length;
        }

        setTimeout(() => {
          const targetEl = textareaRefs.current.get(blockId);
          if (targetEl) {
            targetEl.focus();
            targetEl.setSelectionRange(newStart, newEnd);
            autoResize(targetEl);
          }
        }, 30);

        return { ...b, content: newContent };
      });

      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });

    setFloatingToolbar(null);
    setActiveSubmenu(null);
  };

  const executeHtmlWrap = (
    blockId: string,
    openTag: string,
    closeTag: string,
    customStart?: number,
    customEnd?: number
  ) => {
    const el = textareaRefs.current.get(blockId);
    const start = customStart ?? (floatingToolbar?.blockId === blockId ? floatingToolbar.selectionStart : el?.selectionStart ?? 0);
    const end = customEnd ?? (floatingToolbar?.blockId === blockId ? floatingToolbar.selectionEnd : el?.selectionEnd ?? 0);

    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== blockId) return b;
        const content = b.content;
        const before = content.slice(0, start);
        const selectedText = content.slice(start, end);
        const after = content.slice(end);

        let newContent: string;
        let newStart: number;
        let newEnd: number;

        if (before.endsWith(openTag) && after.startsWith(closeTag)) {
          newContent = before.slice(0, -openTag.length) + selectedText + after.slice(closeTag.length);
          newStart = start - openTag.length;
          newEnd = newStart + selectedText.length;
        } else if (
          selectedText.startsWith(openTag) &&
          selectedText.endsWith(closeTag) &&
          selectedText.length >= openTag.length + closeTag.length
        ) {
          const unwrapped = selectedText.slice(openTag.length, -closeTag.length);
          newContent = before + unwrapped + after;
          newStart = start;
          newEnd = newStart + unwrapped.length;
        } else if (selectedText.length === 0) {
          const formatted = `${openTag}${closeTag}`;
          newContent = before + formatted + after;
          newStart = start + openTag.length;
          newEnd = newStart;
        } else {
          const cleanedText = selectedText
            .replace(/<\/?mark[^>]*>/gi, "")
            .replace(/<\/?span[^>]*>/gi, "")
            .replace(/<\/?u>/gi, "");
          const formatted = `${openTag}${cleanedText}${closeTag}`;
          newContent = before + formatted + after;
          newStart = start;
          newEnd = start + formatted.length;
        }

        setTimeout(() => {
          const targetEl = textareaRefs.current.get(blockId);
          if (targetEl) {
            targetEl.focus();
            targetEl.setSelectionRange(newStart, newEnd);
            autoResize(targetEl);
          }
        }, 30);

        return { ...b, content: newContent };
      });

      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });

    setFloatingToolbar(null);
    setActiveSubmenu(null);
  };

  const applyInlineFormat = (prefix: string, suffix: string = prefix) => {
    if (!floatingToolbar) return;
    executeInlineFormat(floatingToolbar.blockId, prefix, suffix);
  };

  const applyHtmlWrap = (openTag: string, closeTag: string) => {
    if (!floatingToolbar) return;
    executeHtmlWrap(floatingToolbar.blockId, openTag, closeTag);
  };

  const removeFormatting = () => {
    if (!floatingToolbar) return;
    const { blockId, selectionStart, selectionEnd, selectedText } = floatingToolbar;

    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== blockId) return b;
        const content = b.content;
        const before = content.slice(0, selectionStart);
        const after = content.slice(selectionEnd);

        const stripped = selectedText
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/~~(.*?)~~/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/<\/?mark[^>]*>/gi, "")
          .replace(/<\/?span[^>]*>/gi, "")
          .replace(/<\/?u>/gi, "");

        const newContent = before + stripped + after;
        const newStart = selectionStart;
        const newEnd = selectionStart + stripped.length;

        setTimeout(() => {
          const el = textareaRefs.current.get(blockId);
          if (el) {
            el.focus();
            el.setSelectionRange(newStart, newEnd);
            autoResize(el);
          }
        }, 30);

        return { ...b, content: newContent };
      });

      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });

    setFloatingToolbar(null);
    setActiveSubmenu(null);
  };

  const applyLink = (url: string) => {
    if (!floatingToolbar || !url.trim()) return;
    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    applyInlineFormat(`[`, `](${cleanUrl})`);
    setLinkInputUrl("");
  };

  const changeBlockTypeFromToolbar = (newType: NotionBlock["type"]) => {
    if (!floatingToolbar) return;
    changeBlockType(floatingToolbar.blockId, newType);
    setFloatingToolbar(null);
    setActiveSubmenu(null);
  };

  const updateBlock = (id: string, updates: Partial<NotionBlock>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });
  };

  const insertBlockAfter = (
    afterId: string,
    type: NotionBlock["type"] = "paragraph",
    initialContent = ""
  ) => {
    const newId = "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newBlock: NotionBlock = {
      id: newId,
      type,
      content: initialContent,
      calloutIcon: type === "callout" ? "💡" : undefined,
      language: type === "code" ? "typescript" : undefined,
    };

    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId);
      const next = [...prev];
      if (idx !== -1) {
        next.splice(idx + 1, 0, newBlock);
      } else {
        next.push(newBlock);
      }
      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });

    setEditingBlockId(newId);
    setTimeout(() => {
      const el = textareaRefs.current.get(newId);
      if (el) {
        el.focus();
        el.setSelectionRange(0, 0);
        autoResize(el);
      }
    }, 50);
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) {
        // Keep at least one empty paragraph
        const emptyBlock: NotionBlock = {
          id: "b_" + Date.now(),
          type: "paragraph",
          content: "",
        };
        saveLocalStorageDraft(pageId, [emptyBlock], false);
        triggerAutoSave([emptyBlock]);
        setEditingBlockId(emptyBlock.id);
        return [emptyBlock];
      }
      const idx = prev.findIndex((b) => b.id === id);
      const next = prev.filter((b) => b.id !== id);
      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);

      // Focus previous or next block
      const focusTargetIdx = Math.max(0, idx - 1);
      const targetId = next[focusTargetIdx]?.id;
      if (targetId) {
        setEditingBlockId(targetId);
        setTimeout(() => {
          const el = textareaRefs.current.get(targetId);
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 50);
      }
      return next;
    });
  };

  const changeBlockType = (id: string, newType: NotionBlock["type"]) => {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          type: newType,
          calloutIcon: newType === "callout" ? b.calloutIcon || "💡" : undefined,
          language: newType === "code" ? b.language || "typescript" : undefined,
        };
      });
      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });
    setSlashMenu(null);
    setBlockMenuId(null);
    setEditingBlockId(id);

    setTimeout(() => {
      const el = textareaRefs.current.get(id);
      if (el) {
        el.focus();
        autoResize(el);
      }
    }, 50);
  };

  // Keyboard navigation & slash commands
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: NotionBlock,
    index: number
  ) => {
    // Slash menu navigation if open
    if (slashMenu && slashMenu.blockId === block.id) {
      const filtered = NOTION_BLOCK_TYPES.filter(
        (t) =>
          t.label.toLowerCase().includes(slashMenu.filter.toLowerCase()) ||
          t.shortcut.toLowerCase().includes(slashMenu.filter.toLowerCase())
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashMenu((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % Math.max(filtered.length, 1),
              }
            : null
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashMenu((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex:
                  (prev.selectedIndex - 1 + filtered.length) % Math.max(filtered.length, 1),
              }
            : null
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filtered[slashMenu.selectedIndex];
        if (selected) {
          const cleanContent = block.content.replace(/^\/[a-zA-Z0-9]*/, "").trim();
          updateBlock(block.id, { content: cleanContent });
          changeBlockType(block.id, selected.type as NotionBlock["type"]);
        }
        setSlashMenu(null);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashMenu(null);
        return;
      }
    }

    // Atajos de formato con teclado rápido (Ctrl+I, Ctrl+B, Ctrl+U, etc.)
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Cursiva: Ctrl + I
      if (key === "i") {
        e.preventDefault();
        executeInlineFormat(block.id, "*", "*", start, end);
        return;
      }

      // Negrita: Ctrl + B
      if (key === "b") {
        e.preventDefault();
        executeInlineFormat(block.id, "**", "**", start, end);
        return;
      }

      // Subrayado: Ctrl + U
      if (key === "u") {
        e.preventDefault();
        executeHtmlWrap(block.id, "<u>", "</u>", start, end);
        return;
      }

      // Tachado: Ctrl + Shift + X o Ctrl + Shift + S
      if (e.shiftKey && (key === "x" || key === "s")) {
        e.preventDefault();
        executeInlineFormat(block.id, "~~", "~~", start, end);
        return;
      }

      // Código en línea: Ctrl + E o Ctrl + Shift + C
      if (key === "e" || (e.shiftKey && key === "c")) {
        e.preventDefault();
        executeInlineFormat(block.id, "`", "`", start, end);
        return;
      }

      // Resaltador (amarillo): Ctrl + Shift + H
      if (e.shiftKey && key === "h") {
        e.preventDefault();
        executeHtmlWrap(
          block.id,
          '<mark class="bg-amber-200/90 text-amber-950 rounded px-1">',
          "</mark>",
          start,
          end
        );
        return;
      }

      // Enlace: Ctrl + K
      if (key === "k") {
        e.preventDefault();
        const selected = block.content.slice(start, end);
        if (selected) {
          executeInlineFormat(block.id, "[", "](https://)", start, end);
        } else {
          executeInlineFormat(block.id, "[enlace](", ")", start, end);
        }
        return;
      }
    }

    // Enter pressed
    if (e.key === "Enter" && !e.shiftKey) {
      if (block.type === "code") {
        return;
      }
      e.preventDefault();

      const target = e.currentTarget;
      const container = editorContainerRef.current?.parentElement;

      // Paginación física de libro: SOLO si estamos en el ÚLTIMO bloque de la hoja Y físicamente al borde inferior
      if (container && onPageOverflow && index === blocks.length - 1) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const isAtBottom = targetRect.bottom >= containerRect.bottom - 16;

        if (isAtBottom) {
          onPageOverflow();
          return;
        }
      }

      // Comportamiento normal estilo Word / editor de texto
      const selStart = target.selectionStart ?? block.content.length;
      const textBefore = block.content.slice(0, selStart);
      const textAfter = block.content.slice(selStart);

      if (textBefore !== block.content) {
        updateBlock(block.id, { content: textBefore });
      }

      const nextType =
        block.type === "todo"
          ? "todo"
          : block.type === "bullet"
          ? "bullet"
          : block.type === "numbered"
          ? "numbered"
          : "paragraph";

      insertBlockAfter(block.id, nextType, textAfter);
      return;
    }

    // Backspace al inicio de página o de bloque
    if (e.key === "Backspace") {
      const target = e.currentTarget;
      const isAtBeginning = target.selectionStart === 0 && target.selectionEnd === 0;

      // 1. Si estamos en el primer bloque de la página y al inicio del texto (index === 0):
      if (index === 0 && isAtBeginning) {
        const isEmptyPage = blocks.every((b) => b.content.trim() === "");
        if (onPageUnderflow) {
          e.preventDefault();
          onPageUnderflow(isEmptyPage);
          return;
        }
      }

      // 2. Si el bloque está vacío y no es el primero de la página:
      if (block.content === "") {
        if (block.type !== "paragraph") {
          e.preventDefault();
          changeBlockType(block.id, "paragraph");
          return;
        }
        if (blocks.length > 1) {
          e.preventDefault();
          deleteBlock(block.id);
          return;
        }
      }

      // 3. Si estamos al inicio de un bloque intermedio (index > 0): unir con el bloque anterior
      if (isAtBeginning && index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        const prevContentLen = prevBlock.content.length;
        const combinedContent = prevBlock.content + block.content;

        setBlocks((prev) => {
          const next = prev
            .filter((b) => b.id !== block.id)
            .map((b) => (b.id === prevBlock.id ? { ...b, content: combinedContent } : b));
          saveLocalStorageDraft(pageId, next, false);
          triggerAutoSave(next);
          return next;
        });

        setEditingBlockId(prevBlock.id);
        setTimeout(() => {
          const prevEl = textareaRefs.current.get(prevBlock.id);
          if (prevEl) {
            prevEl.focus();
            prevEl.setSelectionRange(prevContentLen, prevContentLen);
            autoResize(prevEl);
          }
        }, 50);
        return;
      }
    }

    // Up / Down arrow navigation at boundaries
    const target = e.currentTarget;
    if (e.key === "ArrowUp" && target.selectionStart === 0 && index > 0) {
      const prevBlock = blocks[index - 1];
      const prevEl = textareaRefs.current.get(prevBlock.id);
      if (prevEl) {
        e.preventDefault();
        setEditingBlockId(prevBlock.id);
        prevEl.focus();
        prevEl.setSelectionRange(prevEl.value.length, prevEl.value.length);
      }
    } else if (
      e.key === "ArrowDown" &&
      target.selectionEnd === target.value.length &&
      index < blocks.length - 1
    ) {
      const nextBlock = blocks[index + 1];
      const nextEl = textareaRefs.current.get(nextBlock.id);
      if (nextEl) {
        e.preventDefault();
        setEditingBlockId(nextBlock.id);
        nextEl.focus();
        nextEl.setSelectionRange(0, 0);
      }
    }
  };

  const handleInput = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    block: NotionBlock
  ) => {
    const val = e.target.value;
    autoResize(e.target);
    updateBlock(block.id, { content: val });

    // Detect slash command
    if (val.startsWith("/")) {
      const rect = e.target.getBoundingClientRect();
      const filter = val.slice(1);
      setSlashMenu({
        blockId: block.id,
        filter,
        selectedIndex: 0,
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    } else if (slashMenu && slashMenu.blockId === block.id) {
      setSlashMenu(null);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notion-menu]")) {
        setSlashMenu(null);
        setBlockMenuId(null);
        setActiveSubmenu(null);
        if (!target.closest("textarea")) {
          setFloatingToolbar(null);
        }
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Styling based on theme
  const isDark = themeMode === "dark";
  const isSepia = themeMode === "sepia";

  const textColorClass = isDark
    ? "text-zinc-100 placeholder:text-zinc-500"
    : isSepia
    ? "text-[#2C2416] placeholder:text-[#8C8273]"
    : "text-[#1C1C1E] placeholder:text-stone-400";

  // Helper for rendering rich markdown when not editing
  const renderMarkdownFormatted = (content: string, extraClasses = "") => {
    // Preservar saltos de renglón simples (Shift+Enter estilo Word) para que nunca se junten al salir del modo edición
    const formattedContent = content.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
    return (
      <div className={`prose-sm ${extraClasses} whitespace-pre-wrap break-words leading-relaxed`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            p: ({ children }) => (
              <span className="inline whitespace-pre-wrap break-words leading-relaxed">
                {children}
              </span>
            ),
            span: ({ children, className }) => (
              <span className={className}>{children}</span>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-inherit">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            u: ({ children }) => (
              <u className="underline decoration-[#007AFF] underline-offset-2">{children}</u>
            ),
            del: ({ children }) => <del className="line-through text-stone-400">{children}</del>,
            mark: ({ children, className }) => (
              <mark
                className={`rounded px-1 py-0.5 font-medium ${
                  className || "bg-amber-200/90 text-amber-950"
                }`}
              >
                {children}
              </mark>
            ),
            code: ({ children }) => (
              <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs text-[#007AFF]">
                {children}
              </code>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007AFF] underline underline-offset-2 hover:text-blue-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </a>
            ),
          }}
        >
          {formattedContent}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      ref={editorContainerRef}
      data-notion-editor="true"
      data-page-id={pageId}
      onMouseMove={handleEditorMouseMove}
      className={`relative w-full py-0.5 h-full flex flex-col justify-start transition-colors duration-200 ${fontFamilyClass} ${fontSizeClass} ${lineHeightClass}`}
    >
      {/* Auto-save status indicator flotante para no ocupar altura útil de texto */}
      {!readOnly && (
        <div className="absolute top-0 right-0 z-10 pointer-events-none">
          <span
            className={`text-[10px] font-medium tracking-tight px-1.5 py-0.5 rounded-full transition-all duration-300 ${
              savingStatus === "saving"
                ? "bg-amber-100 text-amber-800"
                : savingStatus === "saved"
                ? "text-stone-400 opacity-50"
                : savingStatus === "offline_saved"
                ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/50"
                : "bg-red-50 text-red-600"
            }`}
          >
            {savingStatus === "saving"
              ? "Guardando..."
              : savingStatus === "saved"
              ? "Guardado ✓"
              : savingStatus === "offline_saved"
              ? "Guardado en dispositivo ⚡"
              : "Guardando..."}
          </span>
        </div>
      )}

      {/* Blocks List */}
      <div
        className="space-y-0.5 flex-1 min-h-0 w-full cursor-text"
        onClick={(e) => {
          if (e.target === e.currentTarget && blocks.length > 0) {
            const lastBlock = blocks[blocks.length - 1];
            setEditingBlockId(lastBlock.id);
            setTimeout(() => {
              const el = textareaRefs.current.get(lastBlock.id);
              if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
              }
            }, 30);
          }
        }}
      >
        {blocks.map((block, index) => {
          const isCallout = block.type === "callout";
          const isQuote = block.type === "quote";
          const isCode = block.type === "code";
          const isDivider = block.type === "divider";
          const isTodo = block.type === "todo";
          const isBullet = block.type === "bullet";
          const isNumbered = block.type === "numbered";

          const isEditing = editingBlockId === block.id || block.content.trim().length === 0;

          const startEditing = () => {
            if (!readOnly) {
              setEditingBlockId(block.id);
              setTimeout(() => {
                const el = textareaRefs.current.get(block.id);
                if (el) {
                  el.focus();
                  autoResize(el);
                }
              }, 40);
            }
          };

          return (
            <div
              key={block.id}
              className="group relative flex items-start gap-1 rounded-lg transition-colors py-0"
            >
              {/* Margin Controls: Floating Add Button & Handle */}
              {!readOnly && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 -ml-7 pr-1 pt-0.5 select-none shrink-0">
                  <button
                    type="button"
                    onClick={() => insertBlockAfter(block.id, "paragraph")}
                    className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-black/5 active:scale-95"
                    title="Insertar bloque debajo (+)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBlockMenuId(blockMenuId === block.id ? null : block.id);
                    }}
                    className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-black/5 active:scale-95"
                    title="Opciones de bloque"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Block Options Dropdown Menu */}
              {blockMenuId === block.id && (
                <div
                  data-notion-menu
                  className="absolute left-0 top-8 z-40 w-52 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-2 py-1">
                    Cambiar tipo
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
                    {NOTION_BLOCK_TYPES.map((bt) => {
                      const Icon = BLOCK_ICONS[bt.type] || Type;
                      return (
                        <button
                          key={bt.type}
                          type="button"
                          onClick={() => changeBlockType(block.id, bt.type as NotionBlock["type"])}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                            block.type === bt.type
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            <span>{bt.label}</span>
                          </div>
                          <span className="text-[10px] text-stone-400">{bt.shortcut}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-black/5 dark:border-white/10 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => deleteBlock(block.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar bloque</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Block Type Rendering */}
              <div className="flex-1 min-w-0">
                {/* 1. Divider */}
                {isDivider ? (
                  <div className="py-2">
                    <hr className="border-t border-black/10 dark:border-white/15" />
                  </div>
                ) : /* 2. Code Block */
                isCode ? (
                  <div className="relative my-1.5 rounded-xl bg-zinc-900 text-zinc-100 p-3 shadow-inner border border-zinc-800 font-mono text-sm">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-xs text-zinc-400 select-none">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-blue-400">
                        {block.language || "typescript"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(block.content, block.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors text-zinc-300"
                        title="Copiar código"
                      >
                        {copiedCodeId === block.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current.set(block.id, el);
                          autoResize(el);
                        }
                      }}
                      readOnly={readOnly}
                      value={block.content}
                      onSelect={(e) => handleTextSelect(block.id, e)}
                      onMouseUp={(e) => handleTextSelect(block.id, e)}
                      onKeyUp={(e) => handleTextSelect(block.id, e)}
                      onChange={(e) => handleInput(e, block)}
                      onKeyDown={(e) => handleKeyDown(e, block, index)}
                      placeholder="// Escribe tu código aquí..."
                      rows={2}
                      className="w-full bg-transparent resize-none border-none outline-none font-mono text-xs sm:text-sm text-zinc-100 leading-relaxed placeholder:text-zinc-600 focus:ring-0"
                    />
                  </div>
                ) : /* 3. Callout Block */
                isCallout ? (
                  <div
                    onClick={startEditing}
                    className="my-1.5 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-2.5 cursor-text"
                  >
                    <span className="text-lg select-none pt-0.5 shrink-0">
                      {block.calloutIcon || "💡"}
                    </span>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <textarea
                          ref={(el) => {
                            if (el) {
                              textareaRefs.current.set(block.id, el);
                              autoResize(el);
                            }
                          }}
                          readOnly={readOnly}
                          value={block.content}
                          onBlur={(e) => handleBlur(block.id, e)}
                          onSelect={(e) => handleTextSelect(block.id, e)}
                          onMouseUp={(e) => handleTextSelect(block.id, e)}
                          onKeyUp={(e) => handleTextSelect(block.id, e)}
                          onChange={(e) => handleInput(e, block)}
                          onKeyDown={(e) => handleKeyDown(e, block, index)}
                          placeholder="Nota importante o punto clave..."
                          rows={1}
                          className={`w-full bg-transparent resize-none border-none outline-none font-normal leading-relaxed ${textColorClass} focus:ring-0`}
                        />
                      ) : (
                        renderMarkdownFormatted(block.content, textColorClass)
                      )}
                    </div>
                  </div>
                ) : /* 4. Quote Block */
                isQuote ? (
                  <div
                    onClick={startEditing}
                    className="my-1.5 pl-3 border-l-3 border-[#007AFF] italic cursor-text"
                  >
                    {isEditing ? (
                      <textarea
                        ref={(el) => {
                          if (el) {
                            textareaRefs.current.set(block.id, el);
                            autoResize(el);
                          }
                        }}
                        readOnly={readOnly}
                        value={block.content}
                        onBlur={(e) => handleBlur(block.id, e)}
                        onSelect={(e) => handleTextSelect(block.id, e)}
                        onMouseUp={(e) => handleTextSelect(block.id, e)}
                        onKeyUp={(e) => handleTextSelect(block.id, e)}
                        onChange={(e) => handleInput(e, block)}
                        onKeyDown={(e) => handleKeyDown(e, block, index)}
                        placeholder="Cita memorable o referencia teórica..."
                        rows={1}
                        className={`w-full bg-transparent resize-none border-none outline-none font-serif leading-relaxed ${textColorClass} focus:ring-0`}
                      />
                    ) : (
                      renderMarkdownFormatted(block.content, `font-serif ${textColorClass}`)
                    )}
                  </div>
                ) : /* 5. Todo Item */
                isTodo ? (
                  <div className="flex items-start gap-2 py-0.5">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateBlock(block.id, { checked: !block.checked })}
                      className="mt-1 text-stone-400 hover:text-[#007AFF] transition-colors focus:outline-hidden shrink-0"
                    >
                      {block.checked ? (
                        <CheckSquare className="w-4 h-4 text-[#007AFF] fill-blue-50" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div onClick={startEditing} className="flex-1 min-w-0 cursor-text">
                      {isEditing ? (
                        <textarea
                          ref={(el) => {
                            if (el) {
                              textareaRefs.current.set(block.id, el);
                              autoResize(el);
                            }
                          }}
                          readOnly={readOnly}
                          value={block.content}
                          onBlur={(e) => handleBlur(block.id, e)}
                          onSelect={(e) => handleTextSelect(block.id, e)}
                          onMouseUp={(e) => handleTextSelect(block.id, e)}
                          onKeyUp={(e) => handleTextSelect(block.id, e)}
                          onChange={(e) => handleInput(e, block)}
                          onKeyDown={(e) => handleKeyDown(e, block, index)}
                          placeholder="Tarea o práctica pendiente..."
                          rows={1}
                          className={`w-full bg-transparent resize-none border-none outline-none leading-relaxed focus:ring-0 ${textColorClass} ${
                            block.checked ? "line-through opacity-50" : ""
                          }`}
                        />
                      ) : (
                        <div className={block.checked ? "line-through opacity-50" : ""}>
                          {renderMarkdownFormatted(block.content, textColorClass)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : /* 6. Bullet List */
                isBullet ? (
                  <div className="flex items-start gap-2 py-0.5">
                    <span className="text-stone-400 font-bold select-none pt-0.5 shrink-0">•</span>
                    <div onClick={startEditing} className="flex-1 min-w-0 cursor-text">
                      {isEditing ? (
                        <textarea
                          ref={(el) => {
                            if (el) {
                              textareaRefs.current.set(block.id, el);
                              autoResize(el);
                            }
                          }}
                          readOnly={readOnly}
                          value={block.content}
                          onBlur={(e) => handleBlur(block.id, e)}
                          onSelect={(e) => handleTextSelect(block.id, e)}
                          onMouseUp={(e) => handleTextSelect(block.id, e)}
                          onKeyUp={(e) => handleTextSelect(block.id, e)}
                          onChange={(e) => handleInput(e, block)}
                          onKeyDown={(e) => handleKeyDown(e, block, index)}
                          placeholder="Punto clave..."
                          rows={1}
                          className={`w-full bg-transparent resize-none border-none outline-none leading-relaxed ${textColorClass} focus:ring-0`}
                        />
                      ) : (
                        renderMarkdownFormatted(block.content, textColorClass)
                      )}
                    </div>
                  </div>
                ) : /* 7. Numbered List */
                isNumbered ? (
                  <div className="flex items-start gap-1.5 py-0.5">
                    <span className="text-xs font-semibold text-stone-400 select-none pt-0.5 min-w-[18px] shrink-0">
                      {index + 1}.
                    </span>
                    <div onClick={startEditing} className="flex-1 min-w-0 cursor-text">
                      {isEditing ? (
                        <textarea
                          ref={(el) => {
                            if (el) {
                              textareaRefs.current.set(block.id, el);
                              autoResize(el);
                            }
                          }}
                          readOnly={readOnly}
                          value={block.content}
                          onBlur={(e) => handleBlur(block.id, e)}
                          onSelect={(e) => handleTextSelect(block.id, e)}
                          onMouseUp={(e) => handleTextSelect(block.id, e)}
                          onKeyUp={(e) => handleTextSelect(block.id, e)}
                          onChange={(e) => handleInput(e, block)}
                          onKeyDown={(e) => handleKeyDown(e, block, index)}
                          placeholder="Paso ordenado..."
                          rows={1}
                          className={`w-full bg-transparent resize-none border-none outline-none leading-relaxed ${textColorClass} focus:ring-0`}
                        />
                      ) : (
                        renderMarkdownFormatted(block.content, textColorClass)
                      )}
                    </div>
                  </div>
                ) : /* 8. Headings (H1, H2, H3) & Paragraph */
                (
                  <div onClick={startEditing} className="cursor-text">
                    {isEditing ? (
                      <textarea
                        ref={(el) => {
                          if (el) {
                            textareaRefs.current.set(block.id, el);
                            autoResize(el);
                          }
                        }}
                        readOnly={readOnly}
                        value={block.content}
                        onBlur={(e) => handleBlur(block.id, e)}
                        onSelect={(e) => handleTextSelect(block.id, e)}
                        onMouseUp={(e) => handleTextSelect(block.id, e)}
                        onKeyUp={(e) => handleTextSelect(block.id, e)}
                        onChange={(e) => handleInput(e, block)}
                        onKeyDown={(e) => handleKeyDown(e, block, index)}
                        placeholder={
                          block.type === "h1"
                            ? "Título Principal (H1)..."
                            : block.type === "h2"
                            ? "Subtítulo (H2)..."
                            : block.type === "h3"
                            ? "Sección (H3)..."
                            : "Escribe libremente o '/' para comandos..."
                        }
                        rows={1}
                        className={`w-full bg-transparent resize-none border-none outline-none focus:ring-0 ${textColorClass} ${
                          block.type === "h1"
                            ? "text-xl sm:text-2xl font-bold tracking-tight mt-1 mb-0.5"
                            : block.type === "h2"
                            ? "text-lg sm:text-xl font-semibold tracking-tight mt-1 mb-0.5"
                            : block.type === "h3"
                            ? "text-base font-medium tracking-tight mt-0.5"
                            : "leading-relaxed"
                        }`}
                      />
                    ) : (
                      <div
                        className={
                          block.type === "h1"
                            ? "text-xl sm:text-2xl font-bold tracking-tight mt-1 mb-0.5"
                            : block.type === "h2"
                            ? "text-lg sm:text-xl font-semibold tracking-tight mt-1 mb-0.5"
                            : block.type === "h3"
                            ? "text-base font-medium tracking-tight mt-0.5"
                            : "leading-relaxed"
                        }
                      >
                        {renderMarkdownFormatted(block.content, textColorClass)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Slash Command Menu */}
      {slashMenu && (
        <div
          data-notion-menu
          className="fixed z-50 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: Math.min(slashMenu.top, window.innerHeight - 300),
            left: Math.min(slashMenu.left, window.innerWidth - 300),
          }}
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>Comandos Básicos</span>
            <span className="text-[10px] lowercase font-normal">teclas ↑↓ + Enter</span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5 mt-1">
            {NOTION_BLOCK_TYPES.filter(
              (t) =>
                t.label.toLowerCase().includes(slashMenu.filter.toLowerCase()) ||
                t.shortcut.toLowerCase().includes(slashMenu.filter.toLowerCase())
            ).map((item, idx) => {
              const Icon = BLOCK_ICONS[item.type] || Type;
              const isSelected = idx === slashMenu.selectedIndex;
              return (
                <button
                  key={item.type}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const cleanContent = (
                      blocks.find((b) => b.id === slashMenu.blockId)?.content || ""
                    )
                      .replace(/^\/[a-zA-Z0-9]*/, "")
                      .trim();
                    updateBlock(slashMenu.blockId, { content: cleanContent });
                    changeBlockType(slashMenu.blockId, item.type as NotionBlock["type"]);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? "bg-[#007AFF] text-white"
                      : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? "bg-white/20 border-white/30 text-white"
                        : "bg-stone-50 dark:bg-zinc-800 border-black/5 dark:border-white/10 text-stone-600 dark:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{item.label}</span>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? "text-blue-100" : "text-stone-400"
                        }`}
                      >
                        {item.shortcut}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        isSelected ? "text-blue-100" : "text-stone-400"
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra Flotante de Selección (Estilo Editores Famosos: Notion, Medium, Apple Pages) */}
      {floatingToolbar && (
        <div
          data-notion-menu
          className="fixed z-50 flex items-center gap-0.5 p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none overflow-visible"
          style={{
            top: floatingToolbar.top,
            left: floatingToolbar.left,
          }}
        >
          {/* 1. Selector de Tipo / Jerarquía / Tamaño principal */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveSubmenu((prev) => (prev === "type" ? null : "type"))}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all ${
                activeSubmenu === "type"
                  ? "bg-blue-50 text-[#007AFF] dark:bg-blue-950/50"
                  : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
              }`}
              title="Cambiar tipo de bloque o jerarquía"
            >
              <span>
                {(() => {
                  const curr = blocks.find((b) => b.id === floatingToolbar.blockId);
                  if (!curr) return "Texto";
                  const match = NOTION_BLOCK_TYPES.find((t) => t.type === curr.type);
                  return match ? match.label : "Texto";
                })()}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {/* Submenú de Tipos de Bloque */}
            {activeSubmenu === "type" && (
              <div
                data-notion-menu
                className="absolute left-0 top-full mt-1.5 z-[70] w-48 bg-white dark:bg-zinc-800 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  Jerarquía y Estilo
                </div>
                {NOTION_BLOCK_TYPES.map((bt) => {
                  const Icon = BLOCK_ICONS[bt.type] || Type;
                  return (
                    <button
                      key={bt.type}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => changeBlockTypeFromToolbar(bt.type as NotionBlock["type"])}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-stone-500" />
                        <span>{bt.label}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">{bt.shortcut}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

          {/* 2. Selector de Tipografía / Fuente */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveSubmenu((prev) => (prev === "font" ? null : "font"))}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all ${
                activeSubmenu === "font"
                  ? "bg-blue-50 text-[#007AFF] dark:bg-blue-950/50"
                  : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
              }`}
              title="Tipo de letra / Fuente"
            >
              <span>Fuente</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {activeSubmenu === "font" && (
              <div
                data-notion-menu
                className="absolute left-0 top-full mt-1.5 z-[70] w-44 bg-white dark:bg-zinc-800 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="font-sans">', "</span>")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-sans text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left"
                >
                  <span>Sans (Moderna)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="font-serif">', "</span>")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-serif text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left"
                >
                  <span>Serif (Académica)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="font-mono">', "</span>")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left"
                >
                  <span>Mono (Código)</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

          {/* 3. Selector de Tamaño de Letra Rápido */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveSubmenu((prev) => (prev === "size" ? null : "size"))}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all ${
                activeSubmenu === "size"
                  ? "bg-blue-50 text-[#007AFF] dark:bg-blue-950/50"
                  : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
              }`}
              title="Tamaño de letra"
            >
              <span>Tamaño</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {activeSubmenu === "size" && (
              <div
                data-notion-menu
                className="absolute left-0 top-full mt-1.5 z-[70] w-40 bg-white dark:bg-zinc-800 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-xs">', "</span>")}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left"
                >
                  Pequeño (12px)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-base">', "</span>")}
                  className="w-full px-2.5 py-1.5 rounded-lg text-sm text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left font-medium"
                >
                  Normal (15px)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-lg font-medium">', "</span>")}
                  className="w-full px-2.5 py-1.5 rounded-lg text-base text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left font-semibold"
                >
                  Mediano (18px)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-xl font-bold">', "</span>")}
                  className="w-full px-2.5 py-1.5 rounded-lg text-lg text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left font-bold"
                >
                  Grande (20px)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-2xl font-extrabold tracking-tight">', "</span>")}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xl text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700/60 text-left font-extrabold"
                >
                  Gigante (24px)
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

          {/* 4. Estilos en Línea (Negrita, Cursiva, Subrayado, Tachado, Código, Link) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormat("**", "**")}
            className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all active:scale-95"
            title="Negrita (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormat("*", "*")}
            className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all active:scale-95"
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyHtmlWrap("<u>", "</u>")}
            className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all active:scale-95"
            title="Subrayado (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormat("~~", "~~")}
            className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all active:scale-95"
            title="Tachado"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInlineFormat("`", "`")}
            className="p-1.5 rounded-lg text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all active:scale-95"
            title="Código en línea"
          >
            <CodeIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveSubmenu((prev) => (prev === "link" ? null : "link"))}
            className={`p-1.5 rounded-lg transition-all active:scale-95 ${
              activeSubmenu === "link"
                ? "bg-blue-50 text-[#007AFF] dark:bg-blue-950/50"
                : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
            }`}
            title="Insertar enlace"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

          {/* 5. Selector de Resaltador */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveSubmenu((prev) => (prev === "highlight" ? null : "highlight"))}
              className={`p-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-0.5 ${
                activeSubmenu === "highlight"
                  ? "bg-amber-100 text-amber-800"
                  : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
              }`}
              title="Resaltador (Marcador)"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>

            {activeSubmenu === "highlight" && (
              <div
                data-notion-menu
                className="absolute left-0 top-full mt-1.5 z-[70] bg-white dark:bg-zinc-800 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5 min-w-[200px]"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    applyHtmlWrap(
                      '<mark class="bg-amber-200/90 text-amber-950 rounded px-1">',
                      "</mark>"
                    )
                  }
                  className="w-6 h-6 rounded-full bg-amber-300 border border-amber-400 hover:scale-110 active:scale-95 transition-transform"
                  title="Amarillo Clásico"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    applyHtmlWrap(
                      '<mark class="bg-blue-100 text-blue-900 rounded px-1">',
                      "</mark>"
                    )
                  }
                  className="w-6 h-6 rounded-full bg-blue-200 border border-blue-400 hover:scale-110 active:scale-95 transition-transform"
                  title="Azul Suave"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    applyHtmlWrap(
                      '<mark class="bg-emerald-100 text-emerald-900 rounded px-1">',
                      "</mark>"
                    )
                  }
                  className="w-6 h-6 rounded-full bg-emerald-200 border border-emerald-400 hover:scale-110 active:scale-95 transition-transform"
                  title="Verde Menta"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    applyHtmlWrap(
                      '<mark class="bg-rose-100 text-rose-900 rounded px-1">',
                      "</mark>"
                    )
                  }
                  className="w-6 h-6 rounded-full bg-rose-200 border border-rose-400 hover:scale-110 active:scale-95 transition-transform"
                  title="Rosa Coral"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    applyHtmlWrap(
                      '<mark class="bg-purple-100 text-purple-900 rounded px-1">',
                      "</mark>"
                    )
                  }
                  className="w-6 h-6 rounded-full bg-purple-200 border border-purple-400 hover:scale-110 active:scale-95 transition-transform"
                  title="Púrpura Lavanda"
                />
                <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={removeFormatting}
                  className="p-1 rounded text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-zinc-700/60"
                  title="Quitar resaltado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 6. Selector de Color de Texto */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveSubmenu((prev) => (prev === "color" ? null : "color"))}
              className={`p-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-0.5 ${
                activeSubmenu === "color"
                  ? "bg-purple-100 text-purple-800"
                  : "text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800"
              }`}
              title="Color de texto"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {activeSubmenu === "color" && (
              <div
                data-notion-menu
                className="absolute left-0 top-full mt-1.5 z-[70] bg-white dark:bg-zinc-800 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5 min-w-[200px]"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-[#007AFF]">', "</span>")}
                  className="w-6 h-6 rounded-full bg-[#007AFF] hover:scale-110 active:scale-95 transition-transform"
                  title="Azul Universitario"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-emerald-600">', "</span>")}
                  className="w-6 h-6 rounded-full bg-emerald-600 hover:scale-110 active:scale-95 transition-transform"
                  title="Verde Esmeralda"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-rose-600">', "</span>")}
                  className="w-6 h-6 rounded-full bg-rose-600 hover:scale-110 active:scale-95 transition-transform"
                  title="Rojo Carmesí"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-amber-600">', "</span>")}
                  className="w-6 h-6 rounded-full bg-amber-500 hover:scale-110 active:scale-95 transition-transform"
                  title="Naranja Cálido"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHtmlWrap('<span class="text-purple-600">', "</span>")}
                  className="w-6 h-6 rounded-full bg-purple-600 hover:scale-110 active:scale-95 transition-transform"
                  title="Púrpura Real"
                />
                <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={removeFormatting}
                  className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-zinc-700/60"
                  title="Quitar color"
                >
                  <Baseline className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

          {/* 7. Limpiar Formato */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={removeFormatting}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
            title="Quitar todo el formato"
          >
            <Baseline className="w-3.5 h-3.5" />
          </button>

          {/* Submenú de Enlace Inline */}
          {activeSubmenu === "link" && (
            <div
              data-notion-menu
              className="absolute left-0 top-full mt-1.5 z-[70] bg-white dark:bg-zinc-800 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 min-w-[280px] animate-in fade-in zoom-in-95 duration-100"
            >
              <input
                type="url"
                autoFocus
                placeholder="https://..."
                value={linkInputUrl}
                onChange={(e) => setLinkInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink(linkInputUrl);
                  }
                }}
                className="flex-1 bg-stone-100 dark:bg-zinc-700/60 text-xs px-2.5 py-1.5 rounded-lg border-none outline-none text-[#1C1C1E] dark:text-zinc-100 placeholder:text-stone-400"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyLink(linkInputUrl)}
                className="px-2.5 py-1.5 rounded-lg bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 shrink-0"
              >
                Guardar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
