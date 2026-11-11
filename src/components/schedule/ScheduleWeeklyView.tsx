"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  ExternalLink,
  Flame,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  DAYS_OF_WEEK,
  APPLE_COLORS,
  BLOCK_TYPES,
  BlockTypeKey,
  RESOURCE_TYPES,
} from "@/lib/validations";
import {
  createScheduleBlockAction,
  deleteScheduleBlockAction,
  toggleHabitCompletionAction,
} from "@/server/actions";
import { ConfirmModal } from "../ui/ConfirmModal";

interface ScheduleBlockData {
  id: string;
  subjectId: string | null;
  blockType: string;
  customTitle: string | null;
  emoji: string | null;
  color: string | null;
  externalUrl: string | null;
  resourceType: string | null;
  currentStreak: number;
  lastCompletedDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  isCompletedToday?: boolean;
  subject: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    teacherName: string | null;
    defaultRoom: string | null;
  } | null;
}

interface ScheduleWeeklyProps {
  data: {
    schedules: ScheduleBlockData[];
    subjects: Array<{
      id: string;
      name: string;
      emoji: string;
      color: string;
      defaultRoom: string | null;
    }>;
    currentDayOfWeek?: number;
  };
}

export function ScheduleWeeklyView({ data }: ScheduleWeeklyProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mostrar domingo en horario (toggle)
  const [showSunday, setShowSunday] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  // Día seleccionado en vista móvil (1..7, default hoy)
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = data.currentDayOfWeek ?? new Date().getDay();
    return today >= 1 && today <= 7 ? today : 1;
  });

  // Modal para agregar bloque
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [blockType, setBlockType] = useState<BlockTypeKey>("UNIVERSITY_CLASS");

  // Campos para Clase U
  const [classSubjectId, setClassSubjectId] = useState(data.subjects[0]?.id || "");
  const [room, setRoom] = useState("");

  // Campos para Hábito o Estudio Externo
  const [customTitle, setCustomTitle] = useState("");
  const [customEmoji, setCustomEmoji] = useState("🔥");
  const [customColor, setCustomColor] = useState("#FF9500");
  const [externalUrl, setExternalUrl] = useState("");
  const [resourceType, setResourceType] = useState("VIDEO");

  // Días seleccionados para el bloque (permite seleccionar múltiples)
  const [selectedDays, setSelectedDays] = useState<number[]>([selectedDay]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");

  const toggleDaySelection = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? (prev.length > 1 ? prev.filter((d) => d !== dayId) : prev) : [...prev, dayId]
    );
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (blockType === "UNIVERSITY_CLASS" && !classSubjectId) return;
    if (blockType !== "UNIVERSITY_CLASS" && !customTitle.trim()) return;

    startTransition(async () => {
      await createScheduleBlockAction({
        blockType,
        subjectId: blockType === "UNIVERSITY_CLASS" ? classSubjectId : null,
        customTitle: blockType !== "UNIVERSITY_CLASS" ? customTitle.trim() : null,
        emoji: blockType !== "UNIVERSITY_CLASS" ? customEmoji : null,
        color: blockType !== "UNIVERSITY_CLASS" ? customColor : null,
        externalUrl: blockType === "EXTERNAL_STUDY" ? externalUrl.trim() : null,
        resourceType: blockType === "EXTERNAL_STUDY" ? resourceType : null,
        daysOfWeek: selectedDays,
        startTime,
        endTime,
        room: blockType === "UNIVERSITY_CLASS" ? room.trim() || null : null,
      });

      setIsAddingBlock(false);
      setCustomTitle("");
      setExternalUrl("");
      router.refresh();
    });
  };

  const handleDeleteBlock = (id: string) => {
    setBlockToDelete(id);
  };

  const confirmDeleteBlock = () => {
    if (!blockToDelete) return;
    startTransition(async () => {
      await deleteScheduleBlockAction(blockToDelete);
      setBlockToDelete(null);
      router.refresh();
    });
  };

  const handleToggleHabit = (blockId: string) => {
    startTransition(async () => {
      await toggleHabitCompletionAction(blockId);
      router.refresh();
    });
  };

  const activeDays = showSunday ? DAYS_OF_WEEK : DAYS_OF_WEEK.filter((d) => d.id <= 6);

  const getBlocksForDay = (day: number) => {
    return data.schedules.filter((s) => s.dayOfWeek === day);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Apple Large Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
            Horario de Vida Completo (Clases + Hábitos)
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1E]">
            Horario
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Domingo */}
          <button
            onClick={() => setShowSunday((prev) => !prev)}
            className={`px-3 py-2 rounded-2xl text-xs font-semibold transition-all border ${
              showSunday
                ? "bg-white text-[#007AFF] border-[#007AFF]/30 shadow-2xs"
                : "bg-white text-[#8E8E93] border-black/5 hover:text-[#1C1C1E]"
            }`}
          >
            {showSunday ? "Ocultar Domingo" : "+ Ver Domingo"}
          </button>

          <button
            onClick={() => {
              setSelectedDays([selectedDay]);
              setIsAddingBlock(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Bloque</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Días estilo Apple Calendar (Móvil) */}
      <div className="md:hidden">
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-black/5 shadow-2xs">
          {activeDays.map((day) => {
            const isSelected = selectedDay === day.id;
            const blocksCount = getBlocksForDay(day.id).length;

            return (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? "bg-[#007AFF] text-white shadow-xs font-bold"
                    : "text-[#1C1C1E] hover:bg-black/5"
                }`}
              >
                <span className="text-xs font-semibold">{day.short}</span>
                {blocksCount > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-white" : "bg-[#007AFF]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Lista de bloques del día seleccionado (Móvil) */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              {DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.name}
            </span>
            <span className="text-xs text-[#8E8E93]">
              {getBlocksForDay(selectedDay).length} actividades
            </span>
          </div>

          {getBlocksForDay(selectedDay).length === 0 ? (
            <div className="apple-card p-8 rounded-3xl text-center text-xs text-[#8E8E93] border border-black/5">
              🌿 No tienes bloques programados para este día.
            </div>
          ) : (
            getBlocksForDay(selectedDay).map((block) => {
              const isClass = block.blockType === "UNIVERSITY_CLASS";
              const isHabit = block.blockType === "HABIT";
              const title = isClass ? block.subject?.name : block.customTitle;
              const emoji = isClass ? block.subject?.emoji : block.emoji;
              const color = isClass ? block.subject?.color || "#007AFF" : block.color || "#FF9500";
              const isDone = block.isCompletedToday;

              return (
                <div
                  key={block.id}
                  className={`apple-card p-4 rounded-3xl border border-black/5 relative overflow-hidden transition-all ${
                    isDone ? "bg-emerald-50/40 border-emerald-200" : ""
                  }`}
                  style={{
                    background: isDone
                      ? undefined
                      : `linear-gradient(135deg, ${color}0D 0%, #FFFFFF 100%)`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 bottom-0 w-2"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{emoji}</span>
                        <h4 className="text-sm font-bold text-[#1C1C1E] truncate">
                          {title}
                        </h4>

                        {isHabit && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                            <Flame className="w-3 h-3 text-[#FF9500] fill-[#FF9500]" />
                            <span>{block.currentStreak}d</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E8E93]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {block.startTime} - {block.endTime}
                          </span>
                        </span>
                        {block.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{block.room}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Check de Hábito */}
                      {!isClass && (
                        <button
                          onClick={() => handleToggleHabit(block.id)}
                          className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#34C759] transition-transform active:scale-90"
                          title="Marcar como cumplido hoy"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-6 h-6 text-[#34C759] fill-[#34C759]/20" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>
                      )}

                      {block.externalUrl && (
                        <a
                          href={block.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-full text-[#007AFF] hover:bg-black/5"
                          title="Abrir recurso"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-1.5 rounded-full text-[#8E8E93] hover:text-red-500"
                        title="Eliminar bloque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Cuadrícula Multicolumna estilo Calendario (Desktop) */}
      <div
        className={`hidden md:grid gap-3 ${
          showSunday ? "grid-cols-7" : "grid-cols-6"
        }`}
      >
        {activeDays.map((day) => {
          const dayBlocks = getBlocksForDay(day.id);
          const isToday = (data.currentDayOfWeek ?? new Date().getDay()) === day.id;

          return (
            <div
              key={day.id}
              className={`apple-card rounded-2xl border p-3 flex flex-col justify-between min-h-[460px] ${
                isToday ? "border-[#007AFF]/40 bg-[#007AFF]/2 shadow-sm" : "border-black/5 bg-white"
              }`}
            >
              <div className="space-y-3">
                {/* Cabecera del Día */}
                <div className="flex items-center justify-between pb-2 border-b border-black/5">
                  <span
                    className={`text-xs font-bold ${
                      isToday ? "text-[#007AFF]" : "text-[#1C1C1E]"
                    }`}
                  >
                    {day.name}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#007AFF] text-white">
                      Hoy
                    </span>
                  )}
                </div>

                {/* Lista de bloques del día */}
                <div className="space-y-2">
                  {dayBlocks.length === 0 ? (
                    <p className="text-[11px] text-[#8E8E93] text-center py-8 italic">
                      Libre
                    </p>
                  ) : (
                    dayBlocks.map((block) => {
                      const isClass = block.blockType === "UNIVERSITY_CLASS";
                      const isHabit = block.blockType === "HABIT";
                      const title = isClass ? block.subject?.name : block.customTitle;
                      const emoji = isClass ? block.subject?.emoji : block.emoji;
                      const color = isClass ? block.subject?.color || "#007AFF" : block.color || "#FF9500";
                      const isDone = block.isCompletedToday;

                      return (
                        <div
                          key={block.id}
                          className={`p-2.5 rounded-xl border border-black/5 relative overflow-hidden transition-all hover:shadow-xs group ${
                            isDone ? "bg-emerald-50/50 border-emerald-300" : "bg-white"
                          }`}
                        >
                          <div
                            className="absolute top-0 left-0 bottom-0 w-1"
                            style={{ backgroundColor: color }}
                          />

                          <div className="pl-1.5 space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-bold text-[#1C1C1E] leading-tight line-clamp-2">
                                {emoji} {title}
                              </span>

                              <button
                                onClick={() => handleDeleteBlock(block.id)}
                                className="opacity-0 group-hover:opacity-100 text-[#8E8E93] hover:text-red-500 transition-opacity p-0.5"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <p className="text-[10px] font-semibold text-[#8E8E93]">
                              {block.startTime} - {block.endTime}
                            </p>

                            {block.room && (
                              <p className="text-[10px] text-[#8E8E93] truncate">
                                📍 {block.room}
                              </p>
                            )}

                            {/* Insignia y Check de Hábito */}
                            {isHabit && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5 text-[#FF9500] fill-[#FF9500]" />
                                  <span>{block.currentStreak}d</span>
                                </span>

                                {isToday && (
                                  <button
                                    onClick={() => handleToggleHabit(block.id)}
                                    className="text-[#8E8E93] hover:text-[#34C759] transition-transform active:scale-90"
                                    title="Marcar cumplido hoy"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-4 h-4 text-[#34C759] fill-[#34C759]/20" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Botón Abrir Recurso en Estudio Externo */}
                            {block.externalUrl && (
                              <div className="pt-1 flex items-center justify-between">
                                <a
                                  href={block.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
                                >
                                  <span>Abrir recurso</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>

                                {isToday && (
                                  <button
                                    onClick={() => handleToggleHabit(block.id)}
                                    className="text-[#8E8E93] hover:text-[#34C759] transition-transform active:scale-90"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Botón rápido para añadir bloque a este día */}
              <button
                onClick={() => {
                  setSelectedDays([day.id]);
                  setIsAddingBlock(true);
                }}
                className="w-full mt-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] border border-dashed border-black/10 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal / Bottom Sheet: Agregar Bloque Híbrido */}
      {isAddingBlock && (
        <div
          onClick={() => setIsAddingBlock(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Nueva Actividad en el Horario
              </h3>
              <button
                onClick={() => setIsAddingBlock(false)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                Cerrar
              </button>
            </div>

            {/* Apple Segmented Control: Tipo de Bloque */}
            <div className="flex bg-[#E5E5EA] p-1 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBlockType("UNIVERSITY_CLASS")}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  blockType === "UNIVERSITY_CLASS"
                    ? "bg-white text-[#1C1C1E] shadow-xs font-bold"
                    : "text-[#8E8E93]"
                }`}
              >
                <span>🎓 Clase U</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlockType("HABIT");
                  setCustomEmoji("🔥");
                  setCustomColor("#FF9500");
                }}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  blockType === "HABIT"
                    ? "bg-white text-[#1C1C1E] shadow-xs font-bold"
                    : "text-[#8E8E93]"
                }`}
              >
                <span>🔥 Hábito</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlockType("EXTERNAL_STUDY");
                  setCustomEmoji("🚀");
                  setCustomColor("#AF52DE");
                }}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  blockType === "EXTERNAL_STUDY"
                    ? "bg-white text-[#1C1C1E] shadow-xs font-bold"
                    : "text-[#8E8E93]"
                }`}
              >
                <span>🚀 Externo</span>
              </button>
            </div>

            {/* Formulario */}
            {blockType === "UNIVERSITY_CLASS" && data.subjects.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-[#8E8E93]">
                  Para programar clases en tu horario, primero necesitas registrar tus materias.
                </p>
                <Link
                  href="/subjects"
                  onClick={() => setIsAddingBlock(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-semibold"
                >
                  <span>Ir a registrar materias</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreateBlock} className="space-y-4">
                {/* 1. Campos específicos por tipo */}
                {blockType === "UNIVERSITY_CLASS" ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                        Materia
                      </label>
                      <select
                        value={classSubjectId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setClassSubjectId(id);
                          const sub = data.subjects.find((s) => s.id === id);
                          if (sub?.defaultRoom) setRoom(sub.defaultRoom);
                        }}
                        className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                      >
                        {data.subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.emoji} {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                        Salón o Enlace Virtual
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Bloque B - Salón 302, Teams, Zoom..."
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                          Emoji
                        </label>
                        <input
                          type="text"
                          required
                          value={customEmoji}
                          onChange={(e) => setCustomEmoji(e.target.value)}
                          className="w-full text-center text-lg py-2 rounded-xl border border-black/10 bg-[#F2F2F7]"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                          {blockType === "HABIT" ? "Nombre del Hábito" : "Tema o Curso Externo"}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={
                            blockType === "HABIT"
                              ? "Ej. Lectura de 30 min, Gym, Repaso de Inglés..."
                              : "Ej. Curso de Redes y VLANs, Docker, Python..."
                          }
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                        />
                      </div>
                    </div>

                    {blockType === "EXTERNAL_STUDY" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                            Link del Recurso (YouTube, Curso, Repo o Doc)
                          </label>
                          <input
                            type="url"
                            placeholder="https://youtube.com/playlist?list=..."
                            value={externalUrl}
                            onChange={(e) => setExternalUrl(e.target.value)}
                            className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                            Tipo de Recurso
                          </label>
                          <select
                            value={resourceType}
                            onChange={(e) => setResourceType(e.target.value)}
                            className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-black/10 bg-[#F2F2F7]"
                          >
                            {RESOURCE_TYPES.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.emoji} {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Color selector */}
                    <div>
                      <label className="text-xs font-semibold text-[#8E8E93] block mb-1.5">
                        Color de Acento
                      </label>
                      <div className="flex items-center gap-2">
                        {APPLE_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setCustomColor(c.hex)}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              customColor === c.hex ? "scale-125 ring-2 ring-offset-2 ring-black/20" : ""
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Días de la semana (Multi-selector para hábitos) */}
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1.5">
                    Días que se repite
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = selectedDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDaySelection(d.id)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-[#007AFF] text-white shadow-xs"
                              : "bg-[#F2F2F7] text-[#8E8E93] hover:bg-black/5"
                          }`}
                        >
                          {d.short[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Horas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                      Hora Inicio
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                      Hora Fin
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                    />
                  </div>
                </div>

                {/* 4. Botones Guardar */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingBlock(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8E8E93] hover:bg-black/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#007AFF] text-white hover:bg-blue-600 transition-all shadow-xs disabled:opacity-50 active:scale-95"
                  >
                    Guardar Actividad
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación Estilizado */}
      <ConfirmModal
        isOpen={Boolean(blockToDelete)}
        onClose={() => setBlockToDelete(null)}
        onConfirm={confirmDeleteBlock}
        title="¿Eliminar este bloque?"
        message="Esta actividad o clase será removida de tu horario semanal."
        confirmText="Eliminar Bloque"
        isDestructive={true}
        isLoading={isPending}
      />
    </div>
  );
}
