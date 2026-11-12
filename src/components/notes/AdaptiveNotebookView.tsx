"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Share2,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Paperclip,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import {
  STUDY_METHODS,
  MASTERY_LEVELS,
  StudyMethodKey,
  MasteryLevelKey,
} from "@/lib/validations";
import {
  updateNotePageAction,
  updateNoteMasteryAction,
  generateFlashcardsAction,
  structureCornellAction,
  evaluateFeynmanAction,
} from "@/server/actions";
import { ShareNoteModal } from "./ShareNoteModal";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  learned: boolean;
}

interface Attachment {
  id: string;
  title: string;
  url: string;
  type: string;
}

interface AdaptiveNotebookProps {
  note: {
    id: string;
    subjectId: string;
    title: string;
    studyMethod: string;
    masteryLevel: string;
    isFavorite: boolean;
    freeContent: string;
    cornellCues: string;
    cornellSummary: string;
    feynmanSimple: string;
    feynmanGaps: string;
    feynmanExample: string;
    flashcardsJson: string;
    attachmentsJson: string;
    subject: {
      id: string;
      name: string;
      emoji: string;
      color: string;
    };
  };
  isSplitView?: boolean;
}

export function AdaptiveNotebookView({ note, isSplitView = false }: AdaptiveNotebookProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estado del apunte
  const [title, setTitle] = useState(note.title);
  const [studyMethod, setStudyMethod] = useState<StudyMethodKey>(
    (note.studyMethod as StudyMethodKey) || "FREE"
  );
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevelKey>(
    (note.masteryLevel as MasteryLevelKey) || "YELLOW_MEDIUM"
  );

  // Campos de contenido
  const [freeContent, setFreeContent] = useState(note.freeContent || "");
  const [cornellCues, setCornellCues] = useState(note.cornellCues || "");
  const [cornellSummary, setCornellSummary] = useState(note.cornellSummary || "");
  const [feynmanSimple, setFeynmanSimple] = useState(note.feynmanSimple || "");
  const [feynmanGaps, setFeynmanGaps] = useState(note.feynmanGaps || "");
  const [feynmanExample, setFeynmanExample] = useState(note.feynmanExample || "");

  // Flashcards y Enlaces
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    try {
      return JSON.parse(note.flashcardsJson || "[]");
    } catch {
      return [];
    }
  });

  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    try {
      return JSON.parse(note.attachmentsJson || "[]");
    } catch {
      return [];
    }
  });

  // Estado de autoguardado resiliente
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline_saved">("saved");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper para persistencia inmediata en LocalStorage ante apagón o caída de red
  const persistNoteDraft = (updatedFields: Record<string, unknown>, isSynced: boolean) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`note_draft_${note.id}`);
      const current = raw ? JSON.parse(raw) : {};
      const merged = {
        ...current,
        id: note.id,
        title,
        studyMethod,
        masteryLevel,
        freeContent,
        cornellCues,
        cornellSummary,
        feynmanSimple,
        feynmanGaps,
        feynmanExample,
        flashcards,
        attachments,
        ...updatedFields,
        updatedAt: Date.now(),
        synced: isSynced,
      };
      localStorage.setItem(`note_draft_${note.id}`, JSON.stringify(merged));
    } catch {
      // ignore
    }
  };

  // Restaurar borrador de LocalStorage si existe y tenía cambios pendientes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`note_draft_${note.id}`);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.synced === false) {
          if (draft.title !== undefined) setTitle(draft.title);
          if (draft.freeContent !== undefined) setFreeContent(draft.freeContent);
          if (draft.cornellCues !== undefined) setCornellCues(draft.cornellCues);
          if (draft.cornellSummary !== undefined) setCornellSummary(draft.cornellSummary);
          if (draft.feynmanSimple !== undefined) setFeynmanSimple(draft.feynmanSimple);
          if (draft.feynmanGaps !== undefined) setFeynmanGaps(draft.feynmanGaps);
          if (draft.feynmanExample !== undefined) setFeynmanExample(draft.feynmanExample);
          if (Array.isArray(draft.flashcards)) setFlashcards(draft.flashcards);
          if (Array.isArray(draft.attachments)) setAttachments(draft.attachments);
        }
      }
    } catch {
      // ignore
    }
  }, [note.id]);

  // Sincronización automática al recuperar conexión
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const raw = localStorage.getItem(`note_draft_${note.id}`);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft && draft.synced === false) {
            setSaveStatus("saving");
            const res = await updateNotePageAction(note.id, {
              title: draft.title,
              freeContent: draft.freeContent,
              cornellCues: draft.cornellCues,
              cornellSummary: draft.cornellSummary,
              feynmanSimple: draft.feynmanSimple,
              feynmanGaps: draft.feynmanGaps,
              feynmanExample: draft.feynmanExample,
              flashcardsJson: JSON.stringify(draft.flashcards || []),
              attachmentsJson: JSON.stringify(draft.attachments || []),
            });
            if (res.success) {
              setSaveStatus("saved");
              persistNoteDraft({}, true);
            }
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [note.id]);

  // Estado de Active Recall (revelar respuestas)
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  // Inputs para agregar flashcard rápida
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Input para agregar enlace
  const [newAttachTitle, setNewAttachTitle] = useState("");
  const [newAttachUrl, setNewAttachUrl] = useState("");
  const [isAddingAttach, setIsAddingAttach] = useState(false);

  // Modal Compartir
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Gemini AI States
  const [isAiLoading, setIsAiLoading] = useState<string | null>(null);
  const [aiBannerMsg, setAiBannerMsg] = useState<string | null>(null);
  const [feynmanFeedback, setFeynmanFeedback] = useState<{
    feedbackWell: string;
    feedbackErrors: string;
    analogySuggestion: string;
  } | null>(null);

  const handleGenerateFlashcards = () => {
    setIsAiLoading("flashcards");
    setAiBannerMsg(null);
    startTransition(async () => {
      const res = await generateFlashcardsAction(note.id);
      setIsAiLoading(null);
      if (res.success) {
        setFlashcards(res.data);
        setStudyMethod("ACTIVE_RECALL");
        setAiBannerMsg("✨ ¡5 preguntas clave de examen generadas con Active Recall!");
        router.refresh();
      } else {
        setAiBannerMsg(`⚠️ ${res.error || "No se pudieron generar las preguntas con Gemini"}`);
      }
    });
  };

  const handleStructureCornell = () => {
    setIsAiLoading("cornell");
    setAiBannerMsg(null);
    startTransition(async () => {
      const res = await structureCornellAction(note.id);
      setIsAiLoading(null);
      if (res.success) {
        setCornellCues(res.data.cornellCues);
        setCornellSummary(res.data.cornellSummary);
        setStudyMethod("CORNELL");
        setAiBannerMsg("✨ ¡Apunte estructurado en Preguntas Clave y Resumen Cornell!");
        router.refresh();
      } else {
        setAiBannerMsg(`⚠️ ${res.error || "No se pudo estructurar el método Cornell"}`);
      }
    });
  };

  const handleEvaluateFeynman = () => {
    setIsAiLoading("feynman");
    setAiBannerMsg(null);
    startTransition(async () => {
      const res = await evaluateFeynmanAction(note.id);
      setIsAiLoading(null);
      if (res.success) {
        setFeynmanFeedback(res.data);
        setStudyMethod("FEYNMAN");
      } else {
        setAiBannerMsg(`⚠️ ${res.error || "No se pudo evaluar con la técnica Feynman"}`);
      }
    });
  };

  // Debounced auto-save resiliente con contingencia offline y sincronización
  const triggerAutoSave = (updatedFields: Record<string, unknown>) => {
    setSaveStatus("saving");
    persistNoteDraft(updatedFields, false);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaveStatus("offline_saved");
        persistNoteDraft(updatedFields, false);
        return;
      }

      try {
        const res = await updateNotePageAction(note.id, updatedFields);
        if (res.success) {
          setSaveStatus("saved");
          persistNoteDraft(updatedFields, true);
        } else {
          setSaveStatus("offline_saved");
          persistNoteDraft(updatedFields, false);
        }
      } catch {
        setSaveStatus("offline_saved");
        persistNoteDraft(updatedFields, false);
      }
    }, 800);
  };

  // Manejar cambio de método
  const handleMethodChange = (newMethod: StudyMethodKey) => {
    setStudyMethod(newMethod);
    triggerAutoSave({ studyMethod: newMethod });
  };

  // Manejar cambio de semáforo de dominio
  const handleMasteryChange = (level: MasteryLevelKey) => {
    setMasteryLevel(level);
    startTransition(async () => {
      await updateNoteMasteryAction(note.id, level);
    });
  };

  // Guardado de flashcards
  const updateAndSaveFlashcards = (newCards: Flashcard[]) => {
    setFlashcards(newCards);
    triggerAutoSave({ flashcardsJson: JSON.stringify(newCards) });
  };

  const handleAddFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newCard: Flashcard = {
      id: "fc_" + Date.now(),
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      learned: false,
    };

    const updated = [...flashcards, newCard];
    updateAndSaveFlashcards(updated);
    setNewQuestion("");
    setNewAnswer("");
    setIsAddingCard(false);
  };

  const handleToggleCardLearned = (cardId: string, currentLearned: boolean) => {
    const updated = flashcards.map((c) =>
      c.id === cardId ? { ...c, learned: !currentLearned } : c
    );
    updateAndSaveFlashcards(updated);
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = flashcards.filter((c) => c.id !== cardId);
    updateAndSaveFlashcards(updated);
  };

  // Guardado de adjuntos
  const updateAndSaveAttachments = (newAttaches: Attachment[]) => {
    setAttachments(newAttaches);
    triggerAutoSave({ attachmentsJson: JSON.stringify(newAttaches) });
  };

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachTitle.trim() || !newAttachUrl.trim()) return;

    const newAttach: Attachment = {
      id: "att_" + Date.now(),
      title: newAttachTitle.trim(),
      url: newAttachUrl.trim(),
      type: newAttachUrl.includes("youtube") ? "VIDEO" : "LINK",
    };

    const updated = [...attachments, newAttach];
    updateAndSaveAttachments(updated);
    setNewAttachTitle("");
    setNewAttachUrl("");
    setIsAddingAttach(false);
  };

  const handleDeleteAttachment = (id: string) => {
    const updated = attachments.filter((a) => a.id !== id);
    updateAndSaveAttachments(updated);
  };

  // Progreso de Active Recall
  const learnedCardsCount = flashcards.filter((c) => c.learned).length;
  const activeRecallPercent =
    flashcards.length > 0 ? Math.round((learnedCardsCount / flashcards.length) * 100) : 0;

  const currentMastery = MASTERY_LEVELS[masteryLevel];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      {/* 1. Barra Superior Apple: Navegación, Estado y Compartir */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-black/5">
        <div className="flex items-center gap-2">
          {!isSplitView && (
            <Link
              href={`/subjects/${note.subject.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#007AFF] hover:underline p-1.5 -ml-1 rounded-xl active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{note.subject.name}</span>
            </Link>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === "saving"
                  ? "bg-amber-400 animate-ping"
                  : saveStatus === "offline_saved"
                  ? "bg-emerald-500"
                  : "bg-[#34C759]"
              }`}
            />
            <span className="text-[11px] font-medium">
              {saveStatus === "saving"
                ? "Guardando..."
                : saveStatus === "offline_saved"
                ? "Guardado en dispositivo ⚡"
                : "Guardado"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Semáforo de Dominio (Apple Pill) */}
          <div className="flex items-center bg-[#E5E5EA] p-0.5 rounded-full text-[11px] font-semibold">
            {(["RED_HARD", "YELLOW_MEDIUM", "GREEN_READY"] as MasteryLevelKey[]).map((key) => {
              const cfg = MASTERY_LEVELS[key];
              const isSelected = masteryLevel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleMasteryChange(key)}
                  className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                    isSelected ? "bg-white shadow-xs font-bold text-[#1C1C1E]" : "text-[#8E8E93]"
                  }`}
                  title={cfg.label}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="hidden sm:inline">{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Botón Pasar el Apunte (Compartir) */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-black/5 border border-black/10 text-[#1C1C1E] transition-all shadow-2xs active:scale-95"
            title="Compartir para WhatsApp o Story"
          >
            <Share2 className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>
      </div>

      {/* 2. Título Editable estilo Apple Notes */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            triggerAutoSave({ title: e.target.value });
          }}
          placeholder="Título del apunte de clase..."
          className="w-full text-2xl sm:text-3xl font-bold text-[#1C1C1E] tracking-tight bg-transparent border-none p-0 focus:outline-hidden placeholder:text-[#8E8E93]/60"
        />
      </div>

      {/* 3. Selector de Método de Estudio (Apple Segmented Control Fijo) */}
      <div className="space-y-2">
        <div className="segmented-control flex items-center justify-between p-1 rounded-2xl bg-[#E5E5EA]">
          {(["FREE", "CORNELL", "FEYNMAN", "ACTIVE_RECALL"] as StudyMethodKey[]).map((key) => {
            const m = STUDY_METHODS[key];
            const isSelected = studyMethod === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleMethodChange(key)}
                className={`flex-1 py-2 px-1 sm:px-3 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 ${
                  isSelected
                    ? "bg-white text-[#1C1C1E] shadow-xs font-bold"
                    : "text-[#8E8E93] hover:text-[#1C1C1E]"
                }`}
              >
                <span>{m.emoji}</span>
                <span className="hidden sm:inline">{m.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Píldora explicativa de 1 línea */}
        <p className="text-xs text-[#8E8E93] px-2 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />
          <span>{STUDY_METHODS[studyMethod].tagline}</span>
        </p>
      </div>

      {/* 3.1 Barra de Magia Apple Intelligence (Gemini AI) */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] text-white shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          </span>
          <span className="text-xs font-bold text-[#1C1C1E]">
            Apple Intelligence
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleGenerateFlashcards}
            disabled={isAiLoading !== null}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-black/5 text-[#1C1C1E] border border-black/5 shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            title="Genera automáticamente 5 preguntas de examen con Active Recall"
          >
            <span>{isAiLoading === "flashcards" ? "⏳" : "⚡"}</span>
            <span>{isAiLoading === "flashcards" ? "Generando preguntas..." : "Generar Flashcards"}</span>
          </button>

          <button
            type="button"
            onClick={handleStructureCornell}
            disabled={isAiLoading !== null}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-black/5 text-[#1C1C1E] border border-black/5 shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            title="Estructura las notas en formato Cornell: preguntas clave + resumen"
          >
            <span>{isAiLoading === "cornell" ? "⏳" : "🗂️"}</span>
            <span>{isAiLoading === "cornell" ? "Estructurando Cornell..." : "Estructurar Cornell"}</span>
          </button>

          <button
            type="button"
            onClick={handleEvaluateFeynman}
            disabled={isAiLoading !== null}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-black/5 text-[#1C1C1E] border border-black/5 shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            title="Gemini evalúa si tu explicación se entiende como para un niño de 10 años"
          >
            <span>{isAiLoading === "feynman" ? "⏳" : "🧠"}</span>
            <span>{isAiLoading === "feynman" ? "Evaluando con Feynman..." : "Evaluar Feynman"}</span>
          </button>
        </div>
      </div>

      {aiBannerMsg && (
        <div className="px-4 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900 flex items-center justify-between animate-in fade-in">
          <span>{aiBannerMsg}</span>
          <button
            type="button"
            onClick={() => setAiBannerMsg(null)}
            className="p-1 rounded-full hover:bg-indigo-100 text-indigo-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. LIENZO DEL CUADERNO ADAPTATIVO */}

      {/* =====================================================================
          MÉTODO 1: MODO LIBRE (APUNTE CLÁSICO)
         ===================================================================== */}
      {studyMethod === "FREE" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="apple-card p-5 sm:p-7 rounded-3xl border border-black/5 space-y-3">
            <textarea
              rows={14}
              value={freeContent}
              onChange={(e) => {
                setFreeContent(e.target.value);
                triggerAutoSave({ freeContent: e.target.value });
              }}
              placeholder={`Escribe tus apuntes libres de la clase aquí...\n\nSoporta Markdown, fórmulas y listas:\n- Concepto importante\n- Fórmula o definición\n- Lo que dijo el profe que entra fijo en el examen`}
              className="w-full text-sm leading-relaxed text-[#1C1C1E] bg-transparent resize-y border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 font-sans"
            />
          </div>

          {/* Adjuntos y Enlaces de la clase */}
          <div className="apple-card p-5 rounded-3xl border border-black/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Materiales de esta clase (PDFs, Diapositivas, Videos)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingAttach((prev) => !prev)}
                className="text-xs font-semibold text-[#007AFF] hover:underline"
              >
                {isAddingAttach ? "Cancelar" : "+ Agregar Link"}
              </button>
            </div>

            {isAddingAttach && (
              <form onSubmit={handleAddAttachment} className="p-3 bg-[#F2F2F7] rounded-2xl space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Título (ej. Diapositivas Clase 7)"
                  value={newAttachTitle}
                  onChange={(e) => setNewAttachTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-white"
                />
                <input
                  type="url"
                  required
                  placeholder="URL (https://...)"
                  value={newAttachUrl}
                  onChange={(e) => setNewAttachUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold"
                >
                  Guardar Enlace
                </button>
              </form>
            )}

            {attachments.length === 0 ? (
              <p className="text-xs text-[#8E8E93] italic py-1">
                No has agregado links o diapositivas para este tema.
              </p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7] text-xs group"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#007AFF] font-medium hover:underline truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{att.title}</span>
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="text-[#8E8E93] hover:text-red-500 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MÉTODO 2: MÉTODO CORNELL (IDEAS CLAVE + APUNTES + RESUMEN)
         ===================================================================== */}
      {studyMethod === "CORNELL" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Bloque Superior: En móvil apilado; en desktop 2 columnas (30% ideas, 70% apuntes) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Columna Izquierda: Ideas Clave y Preguntas (30%) */}
            <div className="md:col-span-4 apple-card p-5 rounded-3xl border border-black/5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF9500] flex items-center gap-1.5">
                <span>💡</span>
                <span>Ideas Clave & Preguntas</span>
              </span>
              <p className="text-[11px] text-[#8E8E93] leading-snug">
                Escribe palabras clave, dudas o preguntas que te harían en el parcial.
              </p>
              <textarea
                rows={12}
                value={cornellCues}
                onChange={(e) => {
                  setCornellCues(e.target.value);
                  triggerAutoSave({ cornellCues: e.target.value });
                }}
                placeholder={`¿Qué es...?\n¿Cuál es la fórmula de...?\nDefinición principal:\nCasos especiales:`}
                className="w-full text-xs leading-relaxed text-[#1C1C1E] bg-transparent resize-y border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 pt-2 font-mono"
              />
            </div>

            {/* Columna Derecha: Apuntes de la Clase (70%) */}
            <div className="md:col-span-8 apple-card p-5 sm:p-6 rounded-3xl border border-black/5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#007AFF] flex items-center gap-1.5">
                <span>📖</span>
                <span>Apuntes de la Clase</span>
              </span>
              <p className="text-[11px] text-[#8E8E93] leading-snug">
                Toma tus notas completas durante la clase aquí.
              </p>
              <textarea
                rows={12}
                value={freeContent}
                onChange={(e) => {
                  setFreeContent(e.target.value);
                  triggerAutoSave({ freeContent: e.target.value });
                }}
                placeholder={`Desarrollo completo del tema...\nExplicaciones del profesor, demostraciones y teoremas.`}
                className="w-full text-xs sm:text-sm leading-relaxed text-[#1C1C1E] bg-transparent resize-y border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 pt-2 font-sans"
              />
            </div>
          </div>

          {/* Bloque Inferior: Resumen Final en 3 Líneas (100% ancho) */}
          <div className="apple-card p-5 rounded-3xl border border-black/5 bg-gradient-to-r from-amber-500/5 to-transparent space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#34C759] flex items-center gap-1.5">
              <span>✨</span>
              <span>Resumen Final en 3 Líneas</span>
            </span>
            <p className="text-[11px] text-[#8E8E93]">
              Sintetiza la conclusión más importante de toda la clase en una frase contundente.
            </p>
            <textarea
              rows={3}
              value={cornellSummary}
              onChange={(e) => {
                setCornellSummary(e.target.value);
                triggerAutoSave({ cornellSummary: e.target.value });
              }}
              placeholder="En conclusión: esta regla sirve para... y lo más importante a recordar es..."
              className="w-full text-xs sm:text-sm leading-relaxed text-[#1C1C1E] bg-transparent resize-none border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 pt-1 font-medium"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          MÉTODO 3: TÉCNICA FEYNMAN (EXPLÍCALO A UN NIÑO DE 12 AÑOS)
         ===================================================================== */}
      {studyMethod === "FEYNMAN" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Tarjeta 1: Explícaselo a alguien de 12 años */}
          <div className="apple-card p-5 sm:p-6 rounded-3xl border border-black/5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5856D6] flex items-center gap-1.5">
              <span>🗣️</span>
              <span>1. Explícaselo a alguien de 12 años</span>
            </span>
            <p className="text-[11px] text-[#8E8E93]">
              Escribe el tema con tus propias palabras cotidianas, sin usar términos técnicos rebuscados ni copiar del libro.
            </p>
            <textarea
              rows={5}
              value={feynmanSimple}
              onChange={(e) => {
                setFeynmanSimple(e.target.value);
                triggerAutoSave({ feynmanSimple: e.target.value });
              }}
              placeholder="Imagínate que esto es como cuando vas al supermercado y..."
              className="w-full text-xs sm:text-sm leading-relaxed text-[#1C1C1E] bg-transparent resize-y border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 pt-1"
            />
          </div>

          {/* Tarjeta 2: ¿Dónde me trabé o qué debo repasar? */}
          <div className="apple-card p-5 sm:p-6 rounded-3xl border border-black/5 bg-red-500/3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF2D55] flex items-center gap-1.5">
              <span>🚧</span>
              <span>2. ¿Dónde me trabé o qué me cuesta entender?</span>
            </span>
            <p className="text-[11px] text-[#8E8E93]">
              Identifica exactamente la parte que todavía te genera dudas para preguntarle al profesor o buscar un video.
            </p>
            <textarea
              rows={4}
              value={feynmanGaps}
              onChange={(e) => {
                setFeynmanGaps(e.target.value);
                triggerAutoSave({ feynmanGaps: e.target.value });
              }}
              placeholder="Entiendo la idea general, pero todavía me confundo cuando la función tiene una raíz cuadrada..."
              className="w-full text-xs sm:text-sm leading-relaxed text-[#1C1C1E] bg-transparent resize-y border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 pt-1"
            />
          </div>

          {/* Tarjeta 3: Ejemplo de la vida real o analogía */}
          <div className="apple-card p-5 sm:p-6 rounded-3xl border border-black/5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#34C759] flex items-center gap-1.5">
              <span>🌍</span>
              <span>3. Ejemplo de la vida real o analogía cotidiana</span>
            </span>
            <p className="text-[11px] text-[#8E8E93]">
              Crea una conexión con algo que ya conoces para que tu cerebro nunca lo olvide durante el parcial.
            </p>
            <textarea
              rows={4}
              value={feynmanExample}
              onChange={(e) => {
                setFeynmanExample(e.target.value);
                triggerAutoSave({ feynmanExample: e.target.value });
              }}
              placeholder="Es como una cadena de bicicletas: cada eslabón jala al siguiente con la misma fuerza..."
              className="w-full text-xs sm:text-sm leading-relaxed text-[#1C1C1E] bg-transparent resize-y border-none focus:outline-hidden placeholder:text-[#8E8E93]/60 pt-1"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          MÉTODO 4: ACTIVE RECALL / PREGUNTA-RESPUESTA
         ===================================================================== */}
      {studyMethod === "ACTIVE_RECALL" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Barra de Dominio de Preguntas */}
          <div className="apple-card p-4 rounded-3xl border border-black/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1C1C1E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Dominio de Preguntas de Examen</span>
              </span>
              <span className="font-bold text-[#007AFF]">
                {learnedCardsCount} de {flashcards.length} dominadas ({activeRecallPercent}%)
              </span>
            </div>
            <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#34C759] h-2 rounded-full transition-all duration-300"
                style={{ width: `${activeRecallPercent}%` }}
              />
            </div>
          </div>

          {/* Botón Añadir Pregunta */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
              Tarjetas de Autoevaluación
            </span>
            <button
              onClick={() => setIsAddingCard((prev) => !prev)}
              className="text-xs font-bold text-[#007AFF] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingCard ? "Cancelar" : "Nueva Pregunta"}</span>
            </button>
          </div>

          {/* Formulario Nueva Pregunta */}
          {isAddingCard && (
            <form onSubmit={handleAddFlashcard} className="apple-card p-4 rounded-3xl border border-black/10 space-y-3 bg-white">
              <h4 className="text-xs font-bold text-[#1C1C1E]">Agregar Pregunta para el Parcial</h4>
              <div>
                <label className="text-[11px] font-semibold text-[#8E8E93] block mb-1">
                  Pregunta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. ¿Cuál es la derivada de sen(x)?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-[#F2F2F7]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8E8E93] block mb-1">
                  Respuesta Correcta
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. cos(x)"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-[#F2F2F7]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCard(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-[#8E8E93]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs"
                >
                  Guardar Tarjeta
                </button>
              </div>
            </form>
          )}

          {/* Lista de Flashcards con efecto Vidrio Borroso */}
          {flashcards.length === 0 ? (
            <div className="apple-card p-8 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5 space-y-2">
              <p className="font-bold text-[#1C1C1E]">¡Sin preguntas de autoevaluación aún!</p>
              <p>Agrega preguntas clave para poner a prueba tu memoria antes del examen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flashcards.map((card, idx) => {
                const isRevealed = Boolean(revealedCards[card.id]);

                return (
                  <div
                    key={card.id}
                    className={`apple-card p-4 sm:p-5 rounded-3xl border transition-all duration-200 ${
                      card.learned ? "border-[#34C759]/30 bg-[#34C759]/2" : "border-black/5"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Cabecera Tarjeta */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#8E8E93] uppercase tracking-wider text-[10px]">
                          Pregunta {idx + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedCards((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                            }
                            className="text-xs font-semibold text-[#007AFF] flex items-center gap-1 hover:underline"
                          >
                            {isRevealed ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Ocultar</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Revelar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-[#8E8E93] hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Pregunta */}
                      <p className="text-sm sm:text-base font-bold text-[#1C1C1E]">
                        {card.question}
                      </p>

                      {/* Respuesta con Efecto Vidrio Borroso */}
                      <div
                        onClick={() =>
                          setRevealedCards((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                        }
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative select-none ${
                          isRevealed
                            ? "bg-[#F2F2F7] text-[#1C1C1E]"
                            : "bg-[#E5E5EA]/80 backdrop-blur-md text-transparent hover:bg-[#E5E5EA]"
                        }`}
                      >
                        <p className={`text-xs sm:text-sm font-medium leading-relaxed ${!isRevealed ? "blur-xs" : ""}`}>
                          {card.answer}
                        </p>

                        {!isRevealed && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#007AFF] bg-white/40 rounded-2xl backdrop-blur-2xs">
                            👆 Toca para revelar respuesta
                          </div>
                        )}
                      </div>

                      {/* Botones de Autoevaluación */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleCardLearned(card.id, false)}
                          className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                            !card.learned
                              ? "bg-amber-100 text-amber-800 font-bold"
                              : "text-[#8E8E93] hover:bg-black/5"
                          }`}
                        >
                          😅 Repasar otra vez
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleCardLearned(card.id, true)}
                          className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                            card.learned
                              ? "bg-[#34C759] text-white font-bold shadow-2xs"
                              : "text-[#8E8E93] hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          ✅ ¡Me la sabía!
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Pasar el Apunte */}
      <ShareNoteModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        note={{
          title,
          studyMethod,
          freeContent,
          cornellCues,
          cornellSummary,
          feynmanSimple,
          feynmanExample,
          flashcardsJson: JSON.stringify(flashcards),
          subject: note.subject,
        }}
      />

      {/* Modal: Evaluación Técnica Feynman con Gemini AI */}
      {feynmanFeedback && (
        <div
          onClick={() => setFeynmanFeedback(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-600 text-white text-sm">
                  🧠
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1C1C1E]">
                    Evaluación Pedagógica Feynman
                  </h3>
                  <p className="text-[11px] text-[#8E8E93]">
                    Revisión de Gemini AI para dominar el tema
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeynmanFeedback(null)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E] p-1.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Feedback general */}
              <div className="p-4 rounded-2xl bg-[#F2F2F7] space-y-1">
                <h4 className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider">
                  Lo que se explicó con claridad y simpleza
                </h4>
                <p className="text-xs text-[#1C1C1E] leading-relaxed whitespace-pre-line">
                  {feynmanFeedback.feedbackWell}
                </p>
              </div>

              {/* Puntos ciegos o tecnicismos detectados */}
              {feynmanFeedback.feedbackErrors && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Puntos Ciegos y Tecnicismos Detectados</span>
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">
                    {feynmanFeedback.feedbackErrors}
                  </p>
                </div>
              )}

              {/* Analogía propuesta por Gemini */}
              {feynmanFeedback.analogySuggestion && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/60 space-y-1">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Analogía Sugerida de la Vida Real</span>
                  </h4>
                  <p className="text-xs text-emerald-950 leading-relaxed italic">
                    &quot;{feynmanFeedback.analogySuggestion}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setFeynmanFeedback(null)}
                className="px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs hover:bg-blue-600 active:scale-95 transition-all"
              >
                Entendido, voy a pulir mi apunte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
