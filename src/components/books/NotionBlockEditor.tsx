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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NotionBlock, NOTION_BLOCK_TYPES } from "@/lib/validations";

interface NotionBlockEditorProps {
  initialBlocks: NotionBlock[];
  pageId: string;
  onSave: (blocks: NotionBlock[]) => Promise<void>;
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
  readOnly = false,
  fontFamilyClass = "font-sans",
  fontSizeClass = "text-base",
  lineHeightClass = "leading-relaxed",
  themeMode = "light",
}: NotionBlockEditorProps) {
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

  const updateBlock = (id: string, updates: Partial<NotionBlock>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      saveLocalStorageDraft(pageId, next, false);
      triggerAutoSave(next);
      return next;
    });
  };

  const insertBlockAfter = (afterId: string, type: NotionBlock["type"] = "paragraph") => {
    const newId = "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newBlock: NotionBlock = {
      id: newId,
      type,
      content: "",
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

    // Enter pressed
    if (e.key === "Enter" && !e.shiftKey) {
      if (block.type === "code") {
        return;
      }
      e.preventDefault();
      const nextType = block.type === "todo" ? "todo" : block.type === "bullet" ? "bullet" : block.type === "numbered" ? "numbered" : "paragraph";
      insertBlockAfter(block.id, nextType);
      return;
    }

    // Backspace on empty block
    if (e.key === "Backspace" && block.content === "") {
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
    return (
      <div className={`prose-sm ${extraClasses}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <span className="inline">{children}</span>,
            strong: ({ children }) => (
              <strong className="font-bold text-inherit">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => (
              <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs text-[#007AFF]">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      data-notion-editor="true"
      className={`relative w-full max-w-3xl mx-auto py-1 transition-colors duration-200 ${fontFamilyClass} ${fontSizeClass} ${lineHeightClass}`}
    >
      {/* Auto-save status indicator */}
      {!readOnly && (
        <div className="flex items-center justify-end mb-1 pr-1">
          <span
            className={`text-[10px] font-medium tracking-tight px-1.5 py-0.5 rounded-full transition-all duration-300 ${
              savingStatus === "saving"
                ? "bg-amber-100 text-amber-800"
                : savingStatus === "saved"
                ? "text-stone-400 opacity-60"
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
      <div className="space-y-1">
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
              className="group relative flex items-start gap-1 rounded-lg transition-colors py-0.5"
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
    </div>
  );
}
