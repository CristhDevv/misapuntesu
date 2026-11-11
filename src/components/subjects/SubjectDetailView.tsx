"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Award,
  ArrowRight,
  Sparkles,
  MapPin,
  User,
} from "lucide-react";
import {
  MASTERY_LEVELS,
  TASK_TYPES,
  APPLE_COLORS,
  MasteryLevelKey,
  TaskTypeKey,
} from "@/lib/validations";
import {
  createNotePageAction,
  updateSubjectAction,
  deleteSubjectAction,
  createTaskAction,
  toggleTaskAction,
  createGradeItemAction,
} from "@/server/actions";
import { AdaptiveNotebookView } from "../notes/AdaptiveNotebookView";
import { formatGrade, getCountdownBadge } from "@/lib/utils";
import { ConfirmModal } from "../ui/ConfirmModal";

interface SubjectDetailProps {
  subject: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    teacherName: string | null;
    defaultRoom: string | null;
    passingGrade: number;
    schedules: Array<{
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      room: string | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      type: string;
      dueDate: Date;
      isCompleted: boolean;
    }>;
    grades: Array<{
      id: string;
      name: string;
      weightPercent: number;
      score: number | null;
      maxScore: number;
    }>;
    notes: Array<{
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
      updatedAt: Date;
    }>;
  };
  initialNoteId?: string;
}

export function SubjectDetailView({ subject, initialNoteId }: SubjectDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Tab interna: "notes" | "tasks" | "grades"
  const [activeTab, setActiveTab] = useState<"notes" | "tasks" | "grades">("notes");

  // Filtro de semáforo de dominio para apuntes
  const [masteryFilter, setMasteryFilter] = useState<"ALL" | MasteryLevelKey>("ALL");

  // Apunte seleccionado en Split View (Desktop)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    initialNoteId || searchParams.get("noteId") || subject.notes[0]?.id || null
  );

  // Modal Crear Apunte Rápido
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isConfirmDeleteSubjectOpen, setIsConfirmDeleteSubjectOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteMethod, setNewNoteMethod] = useState<"FREE" | "CORNELL" | "FEYNMAN" | "ACTIVE_RECALL">("CORNELL");

  // Modal Editar Materia
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editName, setEditName] = useState(subject.name);
  const [editEmoji, setEditEmoji] = useState(subject.emoji);
  const [editColor, setEditColor] = useState(subject.color);
  const [editTeacher, setEditTeacher] = useState(subject.teacherName || "");
  const [editRoom, setEditRoom] = useState(subject.defaultRoom || "");

  // Modal Crear Tarea
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskTypeKey>("EXAM");
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // Modal Crear Corte
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [gradeName, setGradeName] = useState("");
  const [gradeWeight, setGradeWeight] = useState("30");
  const [gradeScore, setGradeScore] = useState("");

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    startTransition(async () => {
      const res = await createNotePageAction({
        subjectId: subject.id,
        title: newNoteTitle.trim(),
        studyMethod: newNoteMethod,
        masteryLevel: "YELLOW_MEDIUM",
      });

      if (res.success && res.data) {
        setNewNoteTitle("");
        setIsCreatingNote(false);
        setSelectedNoteId(res.data.id);
        router.refresh();
      }
    });
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    startTransition(async () => {
      await updateSubjectAction(subject.id, {
        name: editName.trim(),
        emoji: editEmoji,
        color: editColor,
        teacherName: editTeacher.trim() || null,
        defaultRoom: editRoom.trim() || null,
      });
      setIsEditingSubject(false);
      router.refresh();
    });
  };

  const handleDeleteSubject = () => {
    setIsConfirmDeleteSubjectOpen(true);
  };

  const confirmDeleteSubject = () => {
    startTransition(async () => {
      await deleteSubjectAction(subject.id);
      setIsConfirmDeleteSubjectOpen(false);
      router.push("/subjects");
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    startTransition(async () => {
      await createTaskAction({
        subjectId: subject.id,
        title: taskTitle.trim(),
        type: taskType,
        dueDate: new Date(taskDueDate),
      });
      setTaskTitle("");
      setIsAddingTask(false);
      router.refresh();
    });
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeName.trim()) return;

    startTransition(async () => {
      await createGradeItemAction({
        subjectId: subject.id,
        name: gradeName.trim(),
        weightPercent: Number(gradeWeight),
        score: gradeScore ? Number(gradeScore) : null,
      });
      setGradeName("");
      setGradeScore("");
      setIsAddingGrade(false);
      router.refresh();
    });
  };

  // Filtrado de notas
  const filteredNotes = subject.notes.filter((n) => {
    if (masteryFilter === "ALL") return true;
    return n.masteryLevel === masteryFilter;
  });

  const activeNote = subject.notes.find((n) => n.id === selectedNoteId);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header de la Materia con Banner y Color Apple */}
      <div
        className="apple-card p-5 sm:p-6 rounded-3xl border border-black/5 relative overflow-hidden space-y-4"
        style={{
          background: `linear-gradient(135deg, ${subject.color}15 0%, #FFFFFF 100%)`,
        }}
      >
        <div
          className="absolute top-0 left-0 bottom-0 w-2.5"
          style={{ backgroundColor: subject.color }}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/subjects"
              className="p-1.5 -ml-1 rounded-xl text-[#007AFF] hover:bg-black/5 transition-transform active:scale-95"
              title="Volver a materias"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-white shadow-xs border border-black/5">
              {subject.emoji}
            </span>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E]">
                {subject.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E8E93] pt-0.5">
                {subject.teacherName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{subject.teacherName}</span>
                  </span>
                )}
                {subject.defaultRoom && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{subject.defaultRoom}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingNote(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold text-white transition-all shadow-xs active:scale-95"
              style={{ backgroundColor: subject.color }}
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Apunte</span>
            </button>

            <button
              onClick={() => setIsEditingSubject(true)}
              className="p-2 rounded-xl text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-white/80 transition-colors"
              title="Editar materia"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleDeleteSubject}
              className="p-2 rounded-xl text-[#8E8E93] hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar materia"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Apple Segmented Control para Sub-pestañas */}
        <div className="segmented-control flex items-center bg-[#E5E5EA] p-1 rounded-xl text-xs font-semibold max-w-sm">
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "notes" ? "bg-white text-[#1C1C1E] shadow-xs" : "text-[#8E8E93]"
            }`}
          >
            📝 Apuntes ({subject.notes.length})
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "tasks" ? "bg-white text-[#1C1C1E] shadow-xs" : "text-[#8E8E93]"
            }`}
          >
            🎯 Parciales ({subject.tasks.length})
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "grades" ? "bg-white text-[#1C1C1E] shadow-xs" : "text-[#8E8E93]"
            }`}
          >
            🧮 Notas ({subject.grades.length})
          </button>
        </div>
      </div>

      {/* =====================================================================
          PESTAÑA 1: APUNTES (SPLIT VIEW EN DESKTOP / LISTA EN MÓVIL)
         ===================================================================== */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {/* Filtro por Semáforo de Dominio */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setMasteryFilter("ALL")}
              className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 ${
                masteryFilter === "ALL"
                  ? "bg-[#1C1C1E] text-white shadow-xs"
                  : "bg-white text-[#8E8E93] border border-black/5 hover:bg-black/5"
              }`}
            >
              Todos ({subject.notes.length})
            </button>
            {(["RED_HARD", "YELLOW_MEDIUM", "GREEN_READY"] as MasteryLevelKey[]).map((key) => {
              const cfg = MASTERY_LEVELS[key];
              const count = subject.notes.filter((n) => n.masteryLevel === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setMasteryFilter(key)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1 shrink-0 ${
                    masteryFilter === key
                      ? "bg-white text-[#1C1C1E] shadow-xs border border-black/15 font-bold"
                      : "bg-white text-[#8E8E93] border border-black/5 hover:bg-black/5"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span>{cfg.label}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* DESKTOP SPLIT VIEW / MÓVIL LISTA */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Columna Izquierda: Lista de Apuntes (w-80 aprox / col-span-4) */}
            <div className="md:col-span-4 space-y-2.5">
              {filteredNotes.length === 0 ? (
                <div className="apple-card p-8 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5">
                  <FileText className="w-8 h-8 text-[#8E8E93] mx-auto opacity-40 mb-2" />
                  <p className="font-semibold text-[#1C1C1E]">Sin apuntes en esta categoría</p>
                  <button
                    onClick={() => setIsCreatingNote(true)}
                    className="mt-3 text-xs font-semibold text-[#007AFF] hover:underline"
                  >
                    + Crear primer apunte
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const mastery =
                    MASTERY_LEVELS[note.masteryLevel as MasteryLevelKey] || MASTERY_LEVELS.YELLOW_MEDIUM;

                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`apple-card p-4 rounded-2xl border transition-all cursor-pointer group active:scale-[0.99] ${
                        isSelected
                          ? "border-[#007AFF] bg-white shadow-sm ring-1 ring-[#007AFF]/20"
                          : "border-black/5 bg-white hover:border-black/15"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${mastery.bg} ${mastery.text} ${mastery.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${mastery.dot}`} />
                            <span>{mastery.shortLabel}</span>
                          </span>

                          <span className="text-[10px] text-[#8E8E93] uppercase font-semibold">
                            {note.studyMethod === "CORNELL"
                              ? "🗂️ Cornell"
                              : note.studyMethod === "FEYNMAN"
                              ? "🧠 Feynman"
                              : note.studyMethod === "ACTIVE_RECALL"
                              ? "⚡ Active Recall"
                              : "📝 Libre"}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors leading-snug line-clamp-2">
                          {note.title}
                        </h4>

                        {/* Botón: Abrir a página completa */}
                        <div className="pt-2 border-t border-black/5 flex items-center justify-end">
                          <Link
                            href={`/subjects/${subject.id}/notes/${note.id}`}
                            className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
                          >
                            <span>Abrir apunte</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Columna Derecha (Desktop): El Lienzo del Cuaderno Adaptativo */}
            <div className="hidden md:block md:col-span-8">
              {activeNote ? (
                <div className="apple-card p-6 rounded-3xl border border-black/5 bg-white shadow-xs">
                  <AdaptiveNotebookView
                    key={activeNote.id}
                    note={{ ...activeNote, subject }}
                    isSplitView={true}
                  />
                </div>
              ) : (
                <div className="apple-card p-12 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5 flex flex-col items-center justify-center min-h-[400px]">
                  <Sparkles className="w-10 h-10 text-[#007AFF] mb-3 opacity-60" />
                  <p className="font-bold text-base text-[#1C1C1E]">Selecciona un apunte</p>
                  <p className="max-w-xs mt-1">
                    Haz clic en cualquier apunte de la izquierda para abrir el Cuaderno Adaptativo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: HORARIO Y PARCIALES DE ESTA MATERIA
         ===================================================================== */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
              Entregas y Parciales de {subject.name}
            </span>
            <button
              onClick={() => setIsAddingTask(true)}
              className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Entrega</span>
            </button>
          </div>

          {subject.tasks.length === 0 ? (
            <div className="apple-card p-8 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5">
              🎉 ¡Sin entregas pendientes en esta materia!
            </div>
          ) : (
            <div className="space-y-2">
              {subject.tasks.map((task) => {
                const countdown = getCountdownBadge(task.dueDate);
                const typeConfig = TASK_TYPES[task.type as TaskTypeKey] || TASK_TYPES.HOMEWORK;

                return (
                  <div
                    key={task.id}
                    className="apple-card p-4 rounded-2xl border border-black/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          await toggleTaskAction(task.id, !task.isCompleted);
                          router.refresh();
                        }}
                        className="text-[#8E8E93] hover:text-[#007AFF]"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-[#34C759] fill-[#34C759]/20" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <h4
                          className={`text-sm font-bold text-[#1C1C1E] ${
                            task.isCompleted ? "line-through text-[#8E8E93]" : ""
                          }`}
                        >
                          {typeConfig.emoji} {task.title}
                        </h4>
                        <span className="text-xs text-[#8E8E93]">{typeConfig.label}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        countdown.isUrgent
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-[#F2F2F7] text-[#8E8E93]"
                      }`}
                    >
                      {countdown.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: CORTES Y NOTAS (CALCULADORA DE ESTA MATERIA)
         ===================================================================== */}
      {activeTab === "grades" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
              Evaluaciones y Cortes
            </span>
            <button
              onClick={() => setIsAddingGrade(true)}
              className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Corte</span>
            </button>
          </div>

          {subject.grades.length === 0 ? (
            <div className="apple-card p-8 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5">
              Sin cortes registrados. Agrega tus porcentajes de examen para calcular tu nota.
            </div>
          ) : (
            <div className="space-y-2">
              {subject.grades.map((grade) => (
                <div
                  key={grade.id}
                  className="apple-card p-4 rounded-2xl border border-black/5 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-[#1C1C1E]">{grade.name}</h4>
                    <span className="text-xs text-[#8E8E93]">Peso: {grade.weightPercent}%</span>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold text-[#1C1C1E]">
                      {grade.score !== null ? formatGrade(grade.score) : "Pendiente"}
                    </span>
                    <span className="text-xs text-[#8E8E93] block">/ {grade.maxScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal / Bottom Sheet: Crear Apunte */}
      {isCreatingNote && (
        <div
          onClick={() => setIsCreatingNote(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Nuevo Apunte en {subject.name}
              </h3>
              <button
                onClick={() => setIsCreatingNote(false)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Título del Tema o Clase
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Clase 5: Teorema Fundamental del Cálculo..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Método de Estudio Inicial
                </label>
                <select
                  value={newNoteMethod}
                  onChange={(e) =>
                    setNewNoteMethod(e.target.value as "FREE" | "CORNELL" | "FEYNMAN" | "ACTIVE_RECALL")
                  }
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                >
                  <option value="CORNELL">🗂️ Método Cornell (Ideas + Apuntes + Resumen)</option>
                  <option value="FEYNMAN">🧠 Método Feynman (Explicación para niño de 12 años)</option>
                  <option value="ACTIVE_RECALL">⚡ Pregunta-Respuesta (Active Recall oculto)</option>
                  <option value="FREE">📝 Modo Libre (Apunte fluido)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNote(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8E8E93] hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newNoteTitle.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#007AFF] text-white hover:bg-blue-600 transition-all shadow-xs disabled:opacity-50 active:scale-95"
                >
                  Comenzar Apunte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet: Editar Materia */}
      {isEditingSubject && (
        <div
          onClick={() => setIsEditingSubject(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">Editar Materia</h3>
              <button
                onClick={() => setIsEditingSubject(false)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Nombre de la Materia
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Profesor
                  </label>
                  <input
                    type="text"
                    value={editTeacher}
                    onChange={(e) => setEditTeacher(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Salón habitual
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSubject(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8E8E93]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] text-white shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet: Crear Tarea */}
      {isAddingTask && (
        <div
          onClick={() => setIsAddingTask(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">Nueva Entrega o Parcial</h3>
              <button
                onClick={() => setIsAddingTask(false)}
                className="text-xs font-semibold text-[#8E8E93]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Título
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Parcial 2 de Derivadas"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Tipo
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskTypeKey)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  >
                    <option value="EXAM">🎯 Parcial</option>
                    <option value="HOMEWORK">💼 Taller</option>
                    <option value="QUIZ">⚡ Quiz</option>
                    <option value="READING">📖 Lectura</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8E8E93]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] text-white shadow-xs"
                >
                  Guardar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet: Crear Corte */}
      {isAddingGrade && (
        <div
          onClick={() => setIsAddingGrade(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">Nuevo Corte de Nota</h3>
              <button
                onClick={() => setIsAddingGrade(false)}
                className="text-xs font-semibold text-[#8E8E93]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateGrade} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Nombre de la Evaluación
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Parcial 1, Talleres prácticos..."
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Porcentaje (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    placeholder="30"
                    value={gradeWeight}
                    onChange={(e) => setGradeWeight(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Nota obtenida (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5.0"
                    placeholder="Ej. 4.2"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingGrade(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8E8E93]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] text-white shadow-xs"
                >
                  Guardar Corte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Estilizado */}
      <ConfirmModal
        isOpen={isConfirmDeleteSubjectOpen}
        onClose={() => setIsConfirmDeleteSubjectOpen(false)}
        onConfirm={confirmDeleteSubject}
        title={`¿Eliminar ${subject.name}?`}
        message="Se eliminará la materia junto con todos sus apuntes, tareas y cortes de notas de forma irreversible."
        confirmText="Eliminar Materia"
        isDestructive={true}
        isLoading={isPending}
      />
    </div>
  );
}
