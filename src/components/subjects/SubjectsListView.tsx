"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, MapPin, User, ArrowRight, Award } from "lucide-react";
import { APPLE_COLORS } from "@/lib/validations";
import { createSubjectAction } from "@/server/actions";
import { formatGrade } from "@/lib/utils";

interface SubjectsListProps {
  subjects: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    teacherName: string | null;
    defaultRoom: string | null;
    passingGrade: number;
    currentAverage: number;
    hardCount: number;
    readyCount: number;
    _count: {
      notes: number;
      tasks: number;
      schedules: number;
    };
  }>;
}

export function SubjectsListView({ subjects }: SubjectsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [color, setColor] = useState("#007AFF");
  const [teacherName, setTeacherName] = useState("");
  const [defaultRoom, setDefaultRoom] = useState("");
  const [passingGrade, setPassingGrade] = useState("3.0");

  const emojiList = ["📐", "🔬", "🗣️", "🎨", "🧠", "💻", "⚖️", "🏥", "📊", "🚀", "🎸", "📚"];

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const res = await createSubjectAction({
        name: name.trim(),
        emoji,
        color,
        teacherName: teacherName.trim() || null,
        defaultRoom: defaultRoom.trim() || null,
        passingGrade: Number(passingGrade) || 3.0,
      });

      if (res.success && res.data) {
        setIsCreating(false);
        setName("");
        setTeacherName("");
        setDefaultRoom("");
        router.push(`/subjects/${res.data.id}`);
      }
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Apple Large Title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
            Tus Cuadernos de Estudio
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1E]">
            Mis Materias
          </h1>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Materia</span>
        </button>
      </div>

      {/* 2. Cuadrícula de Cuadernos */}
      {subjects.length === 0 ? (
        <div className="apple-card p-12 rounded-3xl text-center border border-black/5 space-y-3">
          <BookOpen className="w-10 h-10 text-[#8E8E93] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#1C1C1E]">Aún no tienes materias registradas</h3>
          <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
            Crea tu primer cuaderno universitario para organizar tus apuntes con métodos Cornell, Feynman y Active Recall.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Materia</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => (
            <Link
              key={sub.id}
              href={`/subjects/${sub.id}`}
              className="apple-card p-5 rounded-3xl border border-black/5 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${sub.color}0D 0%, #FFFFFF 100%)`,
              }}
            >
              {/* Barra superior de acento Apple */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: sub.color }}
              />

              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2 pt-1">
                  <span className="text-3xl p-2 rounded-2xl bg-white shadow-2xs border border-black/5">
                    {sub.emoji}
                  </span>

                  {sub.currentAverage > 0 && (
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: `${sub.color}15`,
                        color: sub.color,
                      }}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{formatGrade(sub.currentAverage)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors tracking-tight truncate">
                    {sub.name}
                  </h3>

                  <div className="flex flex-col gap-1 text-xs text-[#8E8E93] pt-1">
                    {sub.teacherName && (
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sub.teacherName}</span>
                      </span>
                    )}
                    {sub.defaultRoom && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sub.defaultRoom}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Métricas del Cuaderno */}
              <div className="pt-3 mt-4 border-t border-black/5 flex items-center justify-between text-xs text-[#8E8E93]">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-[#1C1C1E]">
                    {sub._count.notes} {sub._count.notes === 1 ? "apunte" : "apuntes"}
                  </span>
                  {sub.hardCount > 0 && (
                    <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                      🔴 {sub.hardCount}
                    </span>
                  )}
                  {sub.readyCount > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      🟢 {sub.readyCount}
                    </span>
                  )}
                </div>

                <span className="text-[#007AFF] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Abrir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal / Bottom Sheet: Crear Materia */}
      {isCreating && (
        <div
          onClick={() => setIsCreating(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Nuevo Cuaderno de Materia
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1.5">
                  Emoji de la Materia
                </label>
                <div className="flex flex-wrap gap-2">
                  {emojiList.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setEmoji(item)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        emoji === item
                          ? "border-[#007AFF] bg-[#007AFF]/10 scale-105"
                          : "border-black/5 hover:bg-black/5"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1.5">
                  Color de Acento
                </label>
                <div className="flex items-center gap-2">
                  {APPLE_COLORS.map((item) => (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => setColor(item.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        color === item.hex ? "border-black scale-110 shadow-xs" : "border-transparent"
                      }`}
                      style={{ backgroundColor: item.hex }}
                      title={item.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Nombre de la Materia
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Cálculo Diferencial, Derecho Romano, Finanzas..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Profesor (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Dr. Restrepo"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                    Salón habitual
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Bloque B - 204"
                    value={defaultRoom}
                    onChange={(e) => setDefaultRoom(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Nota mínima para pasar (Por defecto 3.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={passingGrade}
                  onChange={(e) => setPassingGrade(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8E8E93] hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#007AFF] text-white hover:bg-blue-600 transition-all shadow-xs disabled:opacity-50 active:scale-95"
                >
                  Crear Cuaderno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
