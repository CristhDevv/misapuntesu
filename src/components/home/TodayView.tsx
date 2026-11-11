"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Clock,
  MapPin,
  User,
  ArrowRight,
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  AlertCircle,
  BookOpen,
  ExternalLink,
  Flame,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { formatDateFull, getCountdownBadge } from "@/lib/utils";
import { MASTERY_LEVELS, TASK_TYPES, TaskTypeKey, MasteryLevelKey } from "@/lib/validations";
import {
  toggleTaskAction,
  createTaskAction,
  toggleHabitCompletionAction,
  generateDailyBriefingAction,
} from "@/server/actions";
import { AINotificationsBell } from "@/components/ai/AINotificationsBell";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TodayViewProps {
  data: {
    dayOfWeek: number;
    todayDateLabel?: string;
    currentTime: string;
    currentOrNextClass?: {
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      room: string | null;
      blockType?: string;
      customTitle?: string | null;
      emoji?: string | null;
      color?: string | null;
      externalUrl?: string | null;
      resourceType?: string | null;
      currentStreak?: number;
      lastCompletedDate?: string | null;
      isCompletedToday?: boolean;
      subject?: {
        id: string;
        name: string;
        emoji: string;
        color: string;
        teacherName: string | null;
        defaultRoom: string | null;
      } | null;
    } | null;
    isHappeningNow: boolean;
    todaySchedules: Array<{
      id: string;
      startTime: string;
      endTime: string;
      room: string | null;
      blockType?: string;
      customTitle?: string | null;
      emoji?: string | null;
      color?: string | null;
      externalUrl?: string | null;
      resourceType?: string | null;
      currentStreak?: number;
      isCompletedToday?: boolean;
      subject?: {
        id: string;
        name: string;
        emoji: string;
        color: string;
        teacherName: string | null;
        defaultRoom: string | null;
      } | null;
    }>;
    upcomingTasks: Array<{
      id: string;
      title: string;
      type: string;
      dueDate: Date;
      isCompleted: boolean;
      subject: {
        id: string;
        name: string;
        emoji: string;
        color: string;
      };
    }>;
    reviewNotes: Array<{
      id: string;
      title: string;
      studyMethod: string;
      masteryLevel: string;
      subject: {
        id: string;
        name: string;
        emoji: string;
        color: string;
      };
    }>;
    allSubjects: Array<{
      id: string;
      name: string;
      emoji: string;
      color: string;
      _count: { notes: number; tasks: number };
    }>;
    unreadNotificationsCount?: number;
  };
}

export function TodayView({ data }: TodayViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // AI Briefing State
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  // Modal para agregar tarea rápida
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState(data.allSubjects[0]?.id || "");
  const [taskType, setTaskType] = useState<TaskTypeKey>("HOMEWORK");
  const [taskDueDate, setTaskDueDate] = useState("2026-11-13");

  const handleGenerateBriefing = () => {
    setIsBriefingLoading(true);
    setBriefingError(null);
    startTransition(async () => {
      const res = await generateDailyBriefingAction();
      setIsBriefingLoading(false);
      if (res.success) {
        setBriefing(res.data);
      } else {
        setBriefingError(res.error || "No se pudo generar el briefing con Gemini.");
      }
    });
  };

  const handleToggleHabit = (blockId: string) => {
    startTransition(async () => {
      await toggleHabitCompletionAction(blockId);
      router.refresh();
    });
  };

  const handleToggleTask = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleTaskAction(id, !currentStatus);
      router.refresh();
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskSubjectId) return;

    startTransition(async () => {
      await createTaskAction({
        subjectId: taskSubjectId,
        title: taskTitle.trim(),
        type: taskType,
        dueDate: new Date(taskDueDate),
      });
      setTaskTitle("");
      setIsAddingTask(false);
      router.refresh();
    });
  };

  const active = data.currentOrNextClass;
  const isHabitOrExternal =
    active && (active.blockType === "HABIT" || active.blockType === "EXTERNAL_STUDY");

  const title = active
    ? isHabitOrExternal
      ? active.customTitle || (active.blockType === "HABIT" ? "Hábito Diario" : "Estudio Externo")
      : active.subject?.name || "Clase Universitaria"
    : null;

  const emoji = active
    ? isHabitOrExternal
      ? active.emoji || (active.blockType === "HABIT" ? "🔥" : "🚀")
    : active.subject?.emoji || "🎓"
    : "🎓";

  const color = active
    ? isHabitOrExternal
      ? active.color || (active.blockType === "HABIT" ? "#FF9500" : "#5856D6")
    : active.subject?.color || "#007AFF"
    : "#007AFF";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Header estilo Apple Large Title con Acciones IA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p
            suppressHydrationWarning
            className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider capitalize"
          >
            {data.todayDateLabel || formatDateFull()}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1E] flex items-center gap-2">
            <span>Hoy</span>
            <span className="text-2xl animate-pulse">👋</span>
          </h1>
        </div>

        {/* Botones de Cabecera: Briefing Gemini + Campana de Alertas */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateBriefing}
            disabled={isBriefingLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
            title="Genera un resumen estratégico de tu día con Gemini AI"
          >
            {isBriefingLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{isBriefingLoading ? "Consultando Gemini..." : "Briefing IA"}</span>
          </button>

          <AINotificationsBell initialCount={data.unreadNotificationsCount || 0} />
        </div>
      </div>

      {/* 2. Tarjeta de Briefing IA Diario (Apple Intelligence Frosted Card) */}
      {(briefing || briefingError) && (
        <section className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-white border border-indigo-100/80 shadow-xs animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1E]">Briefing Inteligente de Hoy</h3>
                <p className="text-[11px] text-[#8E8E93]">Generado por Gemini AI según tu horario y notas</p>
              </div>
            </div>
            <button
              onClick={() => {
                setBriefing(null);
                setBriefingError(null);
              }}
              className="p-1 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {briefing && (
            <div className="text-[#1C1C1E] text-xs sm:text-sm leading-relaxed pl-3 border-l-2 border-indigo-500/50 space-y-2 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>ul]:space-y-1 [&>ol]:space-y-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({ children }) => (
                    <strong className="font-bold text-[#1C1C1E] bg-indigo-50 px-1 py-0.5 rounded">
                      {children}
                    </strong>
                  ),
                  p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                }}
              >
                {briefing}
              </ReactMarkdown>
            </div>
          )}

          {briefingError && (
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
              {briefingError}
            </p>
          )}
        </section>
      )}

      {/* 3. Tarjeta Destacada: En Clase Ahora / Próxima Actividad (Híbrida) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>
              {data.isHappeningNow
                ? "En Curso Ahora"
                : isHabitOrExternal
                ? "Tu Próxima Rutina / Estudio"
                : "Tu Próxima Clase"}
            </span>
          </span>
          {active && (
            <span className="text-xs font-medium text-[#8E8E93]">
              {active.startTime} - {active.endTime}
            </span>
          )}
        </div>

        {active ? (
          <div
            className="apple-card p-5 sm:p-6 rounded-3xl relative overflow-hidden transition-all duration-200 border border-black/5 hover:shadow-md"
            style={{
              background: `linear-gradient(135deg, ${color}0D 0%, #FFFFFF 100%)`,
            }}
          >
            {/* Indicador de color lateral */}
            <div
              className="absolute top-0 left-0 bottom-0 w-2"
              style={{ backgroundColor: color }}
            />

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-3xl sm:text-4xl inline-block mb-1">{emoji}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1C1C1E] tracking-tight truncate">
                    {title}
                  </h2>

                  {/* Metadatos según el tipo de bloque */}
                  {isHabitOrExternal ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E8E93] pt-1">
                      <span className="flex items-center gap-1 font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{active.currentStreak || 0} días de racha</span>
                      </span>
                      {active.blockType === "HABIT" ? (
                        <span className="text-stone-500 font-medium">Hábito Diario</span>
                      ) : (
                        <span className="text-purple-600 font-medium">
                          {active.resourceType ? `Recurso: ${active.resourceType}` : "Estudio Externo"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E8E93] pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {active.room || active.subject?.defaultRoom || "Salón por definir"}
                        </span>
                      </span>
                      {active.subject?.teacherName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{active.subject.teacherName}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                  style={{
                    backgroundColor: `${color}1A`,
                    color: color,
                  }}
                >
                  {data.isHappeningNow ? "En curso" : "Hoy"}
                </div>
              </div>

              {/* Botones de Acción según tipo */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                {isHabitOrExternal ? (
                  <>
                    <button
                      onClick={() => handleToggleHabit(active.id)}
                      disabled={isPending}
                      className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
                        active.isCompletedToday
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-orange-500 text-white hover:bg-orange-600 shadow-xs"
                      }`}
                    >
                      {active.isCompletedToday ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>¡Cumplido Hoy! 🎉</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-4 h-4" />
                          <span>Completar Rutina de Hoy</span>
                        </>
                      )}
                    </button>

                    {active.externalUrl && (
                      <a
                        href={active.externalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-black/5 hover:bg-black/10 text-[#1C1C1E] text-sm font-semibold transition-all active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4 text-purple-600" />
                        <span>Abrir recurso</span>
                      </a>
                    )}
                  </>
                ) : (
                  active.subject && (
                    <Link
                      href={`/subjects/${active.subject.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold text-white transition-all shadow-sm active:scale-[0.98]"
                      style={{ backgroundColor: color }}
                    >
                      <span>Abrir cuaderno de esta clase</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="apple-card p-6 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5">
            🎉 ¡No tienes actividades pendientes en este momento! Aprovecha para repasar tus apuntes.
          </div>
        )}
      </section>

      {/* 4. Próximos Parciales y Entregas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#FF9500]" />
            <span>Próximos Parciales y Entregas</span>
          </span>
          <button
            onClick={() => setIsAddingTask(true)}
            className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar</span>
          </button>
        </div>

        {data.upcomingTasks.length === 0 ? (
          <div className="apple-card p-5 rounded-2xl text-center text-xs text-[#8E8E93] border border-black/5">
            ✨ ¡Todo al día! No tienes entregas ni parciales pendientes.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.upcomingTasks.map((task) => {
              const countdown = getCountdownBadge(task.dueDate);
              const typeConfig = TASK_TYPES[task.type as TaskTypeKey] || TASK_TYPES.HOMEWORK;

              return (
                <div
                  key={task.id}
                  className="apple-card p-3.5 rounded-2xl border border-black/5 flex items-start gap-3 transition-all hover:shadow-xs group"
                >
                  <button
                    onClick={() => handleToggleTask(task.id, task.isCompleted)}
                    disabled={isPending}
                    className="mt-0.5 text-[#8E8E93] hover:text-[#007AFF] transition-colors shrink-0 active:scale-90"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#34C759] fill-[#34C759]/20" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1 truncate">
                        <span>{task.subject.emoji}</span>
                        <span className="truncate">{task.subject.name}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          countdown.isUrgent
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : "bg-[#F2F2F7] text-[#8E8E93]"
                        }`}
                      >
                        {countdown.label}
                      </span>
                    </div>

                    <h4
                      className={`text-xs sm:text-sm font-semibold text-[#1C1C1E] leading-snug truncate ${
                        task.isCompleted ? "line-through text-[#8E8E93]" : ""
                      }`}
                    >
                      {typeConfig.emoji} {task.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Para Repasar Hoy (Semáforo de Estudio) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#FF2D55]" />
            <span>Para Repasar Hoy (Semáforo de Estudio)</span>
          </span>
          <span className="text-xs text-[#8E8E93]">
            {data.reviewNotes.length} temas clave
          </span>
        </div>

        {data.reviewNotes.length === 0 ? (
          <div className="apple-card p-5 rounded-2xl text-center text-xs text-[#8E8E93] border border-black/5">
            🟢 ¡Excelente! No tienes apuntes marcados como &quot;Me cuesta&quot; o &quot;Repasando&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.reviewNotes.map((note) => {
              const mastery =
                MASTERY_LEVELS[note.masteryLevel as MasteryLevelKey] || MASTERY_LEVELS.YELLOW_MEDIUM;

              return (
                <Link
                  key={note.id}
                  href={`/subjects/${note.subject.id}/notes/${note.id}`}
                  className="apple-card p-4 rounded-2xl border border-black/5 hover:shadow-sm transition-all flex flex-col justify-between group active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-[#8E8E93] flex items-center gap-1 truncate max-w-[180px]">
                        <span>{note.subject.emoji}</span>
                        <span className="truncate">{note.subject.name}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${mastery.bg} ${mastery.text} ${mastery.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${mastery.dot}`} />
                        <span>{mastery.label}</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors line-clamp-2">
                      {note.title}
                    </h3>
                  </div>

                  <div className="pt-3 mt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-[#8E8E93]">
                    <span className="uppercase text-[10px] tracking-wider font-semibold">
                      {note.studyMethod === "CORNELL"
                        ? "🗂️ Cornell"
                        : note.studyMethod === "FEYNMAN"
                        ? "🧠 Feynman"
                        : note.studyMethod === "ACTIVE_RECALL"
                        ? "⚡ Active Recall"
                        : "📝 Modo Libre"}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[#007AFF] group-hover:translate-x-0.5 transition-transform">
                      <span>Repasar</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Accesos Directos a Cuadernos */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Tus Cuadernos de Estudio</span>
          </span>
          <Link href="/subjects" className="text-xs font-semibold text-[#007AFF] hover:underline">
            Ver todas ({data.allSubjects.length})
          </Link>
        </div>

        {data.allSubjects.length === 0 ? (
          <div className="apple-card p-8 rounded-3xl border border-black/5 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-[#007AFF] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[#1C1C1E]">
              ¡Bienvenido a tu Cuaderno Universitario!
            </h3>
            <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
              Aún no tienes materias registradas. Agrega tus materias del semestre para comenzar a tomar apuntes adaptativos, organizar tus horarios y calcular tus notas de salvación.
            </p>
            <Link
              href="/subjects"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar mi primera materia</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.allSubjects.map((sub) => (
              <Link
                key={sub.id}
                href={`/subjects/${sub.id}`}
                className="apple-card p-4 rounded-2xl border border-black/5 hover:shadow-xs transition-all flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{sub.emoji}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: sub.color }}
                    />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors truncate">
                    {sub.name}
                  </h4>
                </div>
                <p className="text-[11px] text-[#8E8E93] pt-2 mt-1 border-t border-black/5">
                  {sub._count.notes} {sub._count.notes === 1 ? "apunte" : "apuntes"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Modal / Bottom Sheet: Agregar Entrega Rápida */}
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
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Nueva Entrega o Parcial
              </h3>
              <button
                onClick={() => setIsAddingTask(false)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#8E8E93]">Materia</label>
                <select
                  value={taskSubjectId}
                  onChange={(e) => setTaskSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-sm font-medium text-[#1C1C1E] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  required
                >
                  {data.allSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.emoji} {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#8E8E93]">Título o Tema</label>
                <input
                  type="text"
                  placeholder="Ej. Parcial 1 Capítulos 1 al 4, Taller en grupo..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-sm text-[#1C1C1E] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8E8E93]">Tipo</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskTypeKey)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-sm font-medium text-[#1C1C1E] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  >
                    {Object.entries(TASK_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.emoji} {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8E8E93]">Fecha límite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-sm text-[#1C1C1E] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#8E8E93] hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !taskTitle.trim() || !taskSubjectId}
                  className="px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-xs hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Crear Entrega"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
