"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Pin,
  Play,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
  BookOpen,
} from "lucide-react";
import {
  createTaskAction,
  organizeLiveClassAction,
  updateNotePageAction,
} from "@/server/actions";
import { TaskTypeKey } from "@/lib/validations";

type LiveTag = "normal" | "exam" | "question" | "definition";

interface LiveEntry {
  id: string;
  timestamp: string;
  tag: LiveTag;
  text: string;
  resolved?: boolean;
}

interface SlideAttachment {
  id: string;
  title: string;
  url: string;
  type: "slide";
}

interface LiveClassViewProps {
  note: {
    id: string;
    subjectId: string;
    title: string;
    freeContent: string;
    attachmentsJson: string;
    subject: {
      id: string;
      name: string;
      emoji: string;
      color: string;
    };
  };
  books: Array<{
    id: string;
    title: string;
    coverIcon: string;
    subjectId: string | null;
  }>;
}

const TAG_META: Record<
  LiveTag,
  { label: string; short: string; prefix: string; badgeClass: string; buttonActive: string }
> = {
  normal: {
    label: "Nota",
    short: "Nota",
    prefix: "",
    badgeClass: "bg-stone-100 text-stone-700",
    buttonActive: "bg-[#1C1C1E] text-white",
  },
  exam: {
    label: "Sale en el parcial",
    short: "🎯 Parcial",
    prefix: "🎯 ",
    badgeClass: "bg-[#FF3B30]/10 text-[#D70015] border border-[#FF3B30]/20",
    buttonActive: "bg-[#FF3B30] text-white",
  },
  question: {
    label: "Duda pendiente",
    short: "❓ Duda",
    prefix: "❓ ",
    badgeClass: "bg-[#FF9500]/12 text-[#B25E00] border border-[#FF9500]/25",
    buttonActive: "bg-[#FF9500] text-white",
  },
  definition: {
    label: "Definición",
    short: "📌 Concepto",
    prefix: "📌 ",
    badgeClass: "bg-[#007AFF]/10 text-[#0066D6] border border-[#007AFF]/20",
    buttonActive: "bg-[#007AFF] text-white",
  },
};

function parseEntriesFromMarkdown(content: string): LiveEntry[] {
  if (!content.trim()) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const tsMatch = line.match(/^\[(\d{2}:\d{2})\]\s*(.*)$/);
      const timestamp = tsMatch ? tsMatch[1] : "00:00";
      let body = tsMatch ? tsMatch[2] : line;

      let tag: LiveTag = "normal";
      if (body.startsWith("🎯")) {
        tag = "exam";
        body = body.replace(/^🎯\s*/, "");
      } else if (body.startsWith("❓")) {
        tag = "question";
        body = body.replace(/^❓\s*/, "");
      } else if (body.startsWith("📌")) {
        tag = "definition";
        body = body.replace(/^📌\s*/, "");
      }

      return {
        id: `entry_${index}_${timestamp}`,
        timestamp,
        tag,
        text: body,
      };
    });
}

function serializeEntriesToMarkdown(entries: LiveEntry[]): string {
  return entries
    .map((e) => {
      const prefix = TAG_META[e.tag].prefix;
      return `[${e.timestamp}] ${prefix}${e.text}`;
    })
    .join("\n");
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveClassView({ note, books }: LiveClassViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(note.title);
  const [entries, setEntries] = useState<LiveEntry[]>(() =>
    parseEntriesFromMarkdown(note.freeContent)
  );
  const [slides, setSlides] = useState<SlideAttachment[]>(() => {
    try {
      const parsed = JSON.parse(note.attachmentsJson || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((item) => item && typeof item.url === "string")
        : [];
    } catch {
      return [];
    }
  });

  const [draftText, setDraftText] = useState("");
  const [selectedTag, setSelectedTag] = useState<LiveTag>("normal");
  const [filterTag, setFilterTag] = useState<"all" | LiveTag>("all");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "local">("saved");

  // Cronómetro de sesión (hidratación segura en useEffect)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Dictado por voz
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // Entrega / parcial rápido en clase
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskTypeKey>("HOMEWORK");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSavedMsg, setTaskSavedMsg] = useState<string | null>(null);

  // Modal finalizar y organizar
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    const linked = books.find((b) => b.subjectId === note.subjectId);
    return linked?.id || "";
  });
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Vista ampliada de diapositiva
  const [previewSlide, setPreviewSlide] = useState<SlideAttachment | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar fecha por defecto de entrega y soporte de voz en cliente
  useEffect(() => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    setTaskDueDate(nextWeek);

    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));

    // Recuperar borrador local si es más reciente
    try {
      const localRaw = localStorage.getItem(`misapuntesu_live_note_${note.id}`);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed?.entries) && parsed.entries.length > entries.length) {
          setEntries(parsed.entries);
        }
      }
    } catch {
      // Ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Cronómetro de clase
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Guardado automático resiliente (localStorage + PostgreSQL)
  const persistNote = (nextTitle: string, nextEntries: LiveEntry[], nextSlides: SlideAttachment[]) => {
    try {
      localStorage.setItem(
        `misapuntesu_live_note_${note.id}`,
        JSON.stringify({ title: nextTitle, entries: nextEntries, updatedAt: Date.now() })
      );
    } catch {
      // Ignore quota errors
    }

    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await updateNotePageAction(note.id, {
          title: nextTitle,
          freeContent: serializeEntriesToMarkdown(nextEntries),
          attachmentsJson: JSON.stringify(nextSlides),
        });
        setSaveStatus(res.success ? "saved" : "local");
      } catch {
        setSaveStatus("local");
      }
    }, 450);
  };

  const handleAddEntry = () => {
    const clean = draftText.trim();
    if (!clean) return;

    const newEntry: LiveEntry = {
      id: `entry_${Date.now()}`,
      timestamp: formatTimer(elapsedSeconds),
      tag: selectedTag,
      text: clean,
    };

    const nextEntries = [...entries, newEntry];
    setEntries(nextEntries);
    setDraftText("");
    persistNote(title, nextEntries, slides);

    setTimeout(() => {
      feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }, 30);
  };

  const handleDeleteEntry = (id: string) => {
    const nextEntries = entries.filter((e) => e.id !== id);
    setEntries(nextEntries);
    persistNote(title, nextEntries, slides);
  };

  const handleToggleTagOnEntry = (id: string, tag: LiveTag) => {
    const nextEntries = entries.map((e) => (e.id === id ? { ...e, tag } : e));
    setEntries(nextEntries);
    persistNote(title, nextEntries, slides);
  };

  const handleToggleResolveQuestion = (id: string) => {
    const nextEntries = entries.map((e) =>
      e.id === id ? { ...e, resolved: !e.resolved } : e
    );
    setEntries(nextEntries);
    persistNote(title, nextEntries, slides);
  };

  // Procesar imagen pegada o subida (captura de diapositiva)
  const attachSlideImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 960;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedUrl = canvas.toDataURL("image/jpeg", 0.72);

        const nextSlides: SlideAttachment[] = [
          ...slides,
          {
            id: `slide_${Date.now()}`,
            title: `Diapositiva ${formatTimer(elapsedSeconds)}`,
            url: compressedUrl,
            type: "slide",
          },
        ];
        setSlides(nextSlides);
        persistNote(title, entries, nextSlides);
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          attachSlideImage(file);
          return;
        }
      }
    }
  };

  // Dictado por voz
  const toggleVoiceDictation = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (event) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex]?.[0]?.transcript?.trim();
      if (transcript) {
        setDraftText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const handleQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    startTransition(async () => {
      const res = await createTaskAction({
        subjectId: note.subjectId,
        title: taskTitle.trim(),
        type: taskType,
        dueDate: taskDueDate,
      });
      if (res.success) {
        setTaskTitle("");
        setShowTaskForm(false);
        setTaskSavedMsg("Entrega agendada en tu materia ✓");
        setTimeout(() => setTaskSavedMsg(null), 3000);
      }
    });
  };

  const handleFinishAndOrganize = async () => {
    setIsOrganizing(true);
    setFinishError(null);

    try {
      // Asegurar que la última versión esté guardada antes de organizar
      await updateNotePageAction(note.id, {
        title,
        freeContent: serializeEntriesToMarkdown(entries),
        attachmentsJson: JSON.stringify(slides),
      });

      const res = await organizeLiveClassAction(note.id, selectedBookId || undefined);
      if (!res.success) {
        setFinishError(res.error);
        setIsOrganizing(false);
        return;
      }

      try {
        localStorage.removeItem(`misapuntesu_live_note_${note.id}`);
      } catch {
        // Ignore
      }

      if (res.data.exportedBookId) {
        router.push(`/books/${res.data.exportedBookId}`);
      } else {
        router.push(`/subjects/${res.data.subjectId}?noteId=${res.data.noteId}`);
      }
      router.refresh();
    } catch {
      setFinishError("No se pudo organizar la clase. Intenta de nuevo.");
      setIsOrganizing(false);
    }
  };

  const visibleEntries = useMemo(() => {
    if (filterTag === "all") return entries;
    return entries.filter((e) => e.tag === filterTag);
  }, [entries, filterTag]);

  const counts = useMemo(() => {
    return {
      exam: entries.filter((e) => e.tag === "exam").length,
      question: entries.filter((e) => e.tag === "question" && !e.resolved).length,
      definition: entries.filter((e) => e.tag === "definition").length,
    };
  }, [entries]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-[#F2F2F7] text-[#1C1C1E] overflow-hidden">
      {/* 1. Cabecera compacta Apple Glass (ideal para pantalla dividida) */}
      <header className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/5 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href={`/subjects/${note.subjectId}`}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors shrink-0"
            title="Volver a la materia"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{ backgroundColor: `${note.subject.color}18` }}
          >
            {note.subject.emoji}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-wider truncate"
                style={{ color: note.subject.color }}
              >
                {note.subject.name} · Clase en vivo
              </span>
              <span className="text-[10px] text-[#8E8E93] font-medium shrink-0">
                {saveStatus === "saving"
                  ? "Guardando..."
                  : saveStatus === "local"
                  ? "Respaldo local ⚡"
                  : "Guardado ✓"}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                persistNote(e.target.value, entries, slides);
              }}
              aria-label="Título de la clase"
              className="w-full bg-transparent text-sm font-bold text-[#1C1C1E] outline-none truncate"
            />
          </div>
        </div>

        {/* Controles de sesión: cronómetro + finalizar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className="min-h-[40px] px-3 rounded-xl bg-[#F2F2F7] hover:bg-black/5 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors"
            title={isRunning ? "Pausar cronómetro" : "Reanudar cronómetro"}
          >
            <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{formatTimer(elapsedSeconds)}</span>
            {isRunning ? (
              <Pause className="w-3 h-3 text-[#8E8E93]" />
            ) : (
              <Play className="w-3 h-3 text-[#34C759]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Finalizar y organizar</span>
          </button>
        </div>
      </header>

      {/* 2. Barra de filtros rápidos */}
      <div className="shrink-0 px-3 sm:px-5 py-2 bg-white/60 border-b border-black/5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {[
            { id: "all" as const, label: `Todas (${entries.length})` },
            { id: "exam" as const, label: `🎯 Parcial (${counts.exam})` },
            { id: "question" as const, label: `❓ Dudas (${counts.question})` },
            { id: "definition" as const, label: `📌 Conceptos (${counts.definition})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTag(tab.id)}
              className={`min-h-[34px] px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterTag === tab.id
                  ? "bg-[#1C1C1E] text-white shadow-2xs"
                  : "bg-white text-[#636366] hover:text-[#1C1C1E] border border-black/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowTaskForm((prev) => !prev)}
          className="min-h-[34px] px-3 rounded-full bg-white border border-black/10 hover:border-[#007AFF]/40 text-xs font-semibold text-[#007AFF] inline-flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Agendar entrega</span>
        </button>
      </div>

      {/* Confirmación de entrega agendada o formulario rápido */}
      {taskSavedMsg && (
        <div className="mx-3 sm:mx-5 mt-2 px-3.5 py-2 rounded-2xl bg-[#34C759]/12 border border-[#34C759]/25 text-xs font-semibold text-[#1E7E34] flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{taskSavedMsg}</span>
        </div>
      )}

      {showTaskForm && (
        <form
          onSubmit={handleQuickTask}
          className="mx-3 sm:mx-5 mt-2 p-3.5 rounded-2xl bg-white border border-black/10 shadow-sm flex flex-wrap items-center gap-2 shrink-0"
        >
          <input
            type="text"
            required
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Ej. Parcial 2 o Taller de redes..."
            className="flex-1 min-w-[180px] min-h-[40px] px-3 rounded-xl bg-[#F2F2F7] text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#007AFF]/30"
          />
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as TaskTypeKey)}
            className="min-h-[40px] px-2.5 rounded-xl bg-[#F2F2F7] text-xs font-medium outline-none"
          >
            <option value="HOMEWORK">Taller / Entrega</option>
            <option value="EXAM">Parcial / Examen</option>
            <option value="QUIZ">Quiz</option>
            <option value="READING">Lectura</option>
          </select>
          <input
            type="date"
            required
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            className="min-h-[40px] px-2.5 rounded-xl bg-[#F2F2F7] text-xs outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-[#0066D6]"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setShowTaskForm(false)}
            className="min-h-[40px] px-2 rounded-xl text-[#8E8E93] hover:text-[#1C1C1E]"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* 3. Feed Cronológico de Notas en Ráfaga + Tira de Diapositivas */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 space-y-2.5">
        {slides.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Diapositivas capturadas ({slides.length})
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {slides.map((slide) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setPreviewSlide(slide)}
                  className="relative group shrink-0 w-28 h-18 rounded-xl overflow-hidden border border-black/10 bg-[#F2F2F7]"
                >
                  <img
                    src={slide.url}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                    {slide.title.replace("Diapositiva ", "")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleEntries.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-white/70 rounded-3xl border border-dashed border-black/10">
            <Sparkles className="w-8 h-8 text-[#007AFF] mb-2" />
            <h2 className="text-sm font-bold text-[#1C1C1E]">
              Listo para capturar tu clase en vivo
            </h2>
            <p className="text-xs text-[#636366] max-w-sm mt-1 leading-relaxed">
              Escribe abajo cada idea rápida y presiona <strong>Enter</strong>. Puedes marcar lo que{" "}
              <strong>🎯 sale en el parcial</strong>, tus <strong>❓ dudas</strong>, dictar por voz
              o pegar capturas de diapositivas con <strong>Ctrl + V</strong>.
            </p>
          </div>
        ) : (
          visibleEntries.map((entry) => {
            const meta = TAG_META[entry.tag];
            return (
              <div
                key={entry.id}
                className={`group bg-white rounded-2xl border border-black/5 shadow-2xs p-3.5 flex items-start gap-3 transition-all ${
                  entry.resolved ? "opacity-60" : ""
                }`}
              >
                <span className="text-[11px] font-mono font-semibold text-[#8E8E93] pt-0.5 shrink-0">
                  {entry.timestamp}
                </span>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.tag !== "normal" && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                      >
                        {meta.short}
                      </span>
                    )}
                    {entry.tag === "question" && (
                      <button
                        type="button"
                        onClick={() => handleToggleResolveQuestion(entry.id)}
                        className="text-[10px] font-semibold text-[#34C759] hover:underline inline-flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" />
                        <span>{entry.resolved ? "Duda resuelta" : "Marcar resuelta"}</span>
                      </button>
                    )}
                  </div>

                  <p
                    className={`text-sm text-[#1C1C1E] leading-relaxed whitespace-pre-wrap break-words ${
                      entry.resolved ? "line-through" : ""
                    }`}
                  >
                    {entry.text}
                  </p>
                </div>

                {/* Acciones rápidas por nota */}
                <div className="flex items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleTagOnEntry(entry.id, entry.tag === "exam" ? "normal" : "exam")
                    }
                    className="p-1.5 rounded-lg hover:bg-[#FF3B30]/10 text-[#8E8E93] hover:text-[#FF3B30]"
                    title="Marcar: Sale en el parcial"
                  >
                    <Target className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleTagOnEntry(
                        entry.id,
                        entry.tag === "question" ? "normal" : "question"
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-[#FF9500]/10 text-[#8E8E93] hover:text-[#FF9500]"
                    title="Marcar como duda"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-[#8E8E93] hover:text-red-600"
                    title="Eliminar nota"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </main>

      {/* 4. Barra inferior de Captura Rápida */}
      <footer className="shrink-0 bg-white/90 backdrop-blur-xl border-t border-black/5 px-3 sm:px-5 py-2.5 space-y-2">
        {/* Selector de etiqueta al vuelo */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {(["normal", "exam", "question", "definition"] as LiveTag[]).map((tagKey, idx) => {
              const meta = TAG_META[tagKey];
              const active = selectedTag === tagKey;
              return (
                <button
                  key={tagKey}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tagKey);
                    inputRef.current?.focus();
                  }}
                  className={`min-h-[34px] px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? meta.buttonActive
                      : "bg-[#F2F2F7] text-[#636366] hover:text-[#1C1C1E]"
                  }`}
                  title={`Atajo Alt+${idx + 1}`}
                >
                  {meta.short}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) attachSlideImage(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[34px] px-2.5 rounded-xl bg-[#F2F2F7] hover:bg-black/5 text-xs font-semibold text-[#1C1C1E] inline-flex items-center gap-1"
              title="Adjuntar captura de diapositiva (o pega con Ctrl+V)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="hidden sm:inline">Diapositiva</span>
            </button>

            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceDictation}
                className={`min-h-[34px] px-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-all ${
                  isListening
                    ? "bg-[#FF3B30] text-white animate-pulse"
                    : "bg-[#F2F2F7] hover:bg-black/5 text-[#1C1C1E]"
                }`}
                title="Dictar por voz"
              >
                {isListening ? (
                  <MicOff className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-[#007AFF]" />
                )}
                <span className="hidden sm:inline">
                  {isListening ? "Escuchando..." : "Dictar"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Caja de texto en ráfaga */}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.altKey && ["1", "2", "3", "4"].includes(e.key)) {
                e.preventDefault();
                const map: LiveTag[] = ["normal", "exam", "question", "definition"];
                setSelectedTag(map[Number(e.key) - 1]);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddEntry();
              }
            }}
            placeholder="Escribe lo que explica el profesor y presiona Enter..."
            className="flex-1 min-h-[44px] max-h-28 px-4 py-2.5 rounded-2xl bg-[#F2F2F7] focus:bg-white border border-transparent focus:border-[#007AFF] outline-none text-sm resize-none transition-all"
          />

          <button
            type="button"
            onClick={handleAddEntry}
            disabled={!draftText.trim()}
            className="min-h-[44px] min-w-[44px] px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-40 text-white font-semibold inline-flex items-center justify-center transition-all active:scale-95 shrink-0"
            aria-label="Guardar nota rápida"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Modal Finalizar y Organizar Clase */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  Finalizar y organizar clase
                </h2>
                <p className="text-xs text-[#636366] mt-1">
                  Convertiremos tus {entries.length} notas en vivo en un apunte estructurado (Cornell
                  + resumen) y tarjetas de repaso para tu próximo parcial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="p-1.5 rounded-xl text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {books.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3A3A3C] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>¿Enviar también como hoja nueva a un Libro? (opcional)</span>
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-2xl bg-[#F2F2F7] text-xs font-medium outline-none"
                >
                  <option value="">Solo guardar en Apuntes de la materia</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.coverIcon} {b.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {finishError && (
              <p className="text-xs font-medium text-[#D70015] bg-[#FF3B30]/10 px-3 py-2 rounded-xl">
                {finishError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="min-h-[44px] px-4 rounded-2xl bg-[#F2F2F7] text-xs font-semibold text-[#1C1C1E]"
              >
                Seguir en clase
              </button>
              <button
                type="button"
                disabled={isOrganizing}
                onClick={handleFinishAndOrganize}
                className="min-h-[44px] px-5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                {isOrganizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Organizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Organizar y guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal vista ampliada de diapositiva */}
      {previewSlide && (
        <div
          onClick={() => setPreviewSlide(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-3xl w-full bg-white rounded-3xl p-3 space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold">{previewSlide.title}</span>
              <button
                type="button"
                onClick={() => setPreviewSlide(null)}
                className="p-1.5 rounded-xl hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewSlide.url}
              alt={previewSlide.title}
              className="w-full max-h-[75vh] object-contain rounded-2xl bg-black/5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
