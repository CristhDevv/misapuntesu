"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { SubjectGradeCalculation } from "@/server/queries";
import {
  createGradeItemAction,
  updateGradeItemAction,
  deleteGradeItemAction,
} from "@/server/actions";
import { formatGrade } from "@/lib/utils";
import { ConfirmModal } from "../ui/ConfirmModal";

interface GradesCalculatorProps {
  subjects: SubjectGradeCalculation[];
}

export function GradesCalculatorView({ subjects }: GradesCalculatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal para agregar corte
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<string | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [gradeWeight, setGradeWeight] = useState("30");
  const [gradeScore, setGradeScore] = useState("");

  // Edición rápida de nota
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !gradeName.trim()) return;

    startTransition(async () => {
      await createGradeItemAction({
        subjectId: selectedSubjectId,
        name: gradeName.trim(),
        weightPercent: Number(gradeWeight),
        score: gradeScore ? Number(gradeScore) : null,
      });
      setGradeName("");
      setGradeScore("");
      setSelectedSubjectId(null);
      router.refresh();
    });
  };

  const handleUpdateScore = async (gradeId: string) => {
    startTransition(async () => {
      await updateGradeItemAction(gradeId, {
        score: editScore.trim() ? Number(editScore) : null,
      });
      setEditingGradeId(null);
      setEditScore("");
      router.refresh();
    });
  };

  const handleDeleteGrade = (gradeId: string) => {
    setGradeToDelete(gradeId);
  };

  const confirmDeleteGrade = () => {
    if (!gradeToDelete) return;
    startTransition(async () => {
      await deleteGradeItemAction(gradeToDelete);
      setGradeToDelete(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Apple Large Title */}
      <div>
        <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
          Calculadora de Salvación y Cortes
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1E] flex items-center gap-2">
          <span>¿Cuánto necesito para pasar?</span>
          <span className="text-2xl">🧮</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#8E8E93] mt-1 max-w-xl">
          Ingresa tus notas y porcentajes del semestre. La aplicación calcula automáticamente la nota mínima que necesitas sacar en lo que falta para aprobar.
        </p>
      </div>

      {/* 2. Tarjetas de Materias y Salvación */}
      {subjects.length === 0 ? (
        <div className="apple-card p-12 rounded-3xl text-center border border-black/5 space-y-3">
          <Calculator className="w-10 h-10 text-[#8E8E93] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#1C1C1E]">No tienes materias registradas</h3>
          <p className="text-xs text-[#8E8E93]">
            Crea materias en la pestaña &quot;Materias&quot; para calcular tus promedios semestrales.
          </p>
          <Link
            href="/subjects"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold"
          >
            <span>Ir a Materias</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((sub) => {
            const isPassed = sub.statusType === "ALREADY_PASSED";
            const isCritical = sub.statusType === "CRITICAL" || sub.statusType === "IMPOSSIBLE";
            const isAttention = sub.statusType === "ATTENTION";

            return (
              <div
                key={sub.id}
                className="apple-card p-5 sm:p-6 rounded-3xl border border-black/5 space-y-5 transition-all hover:shadow-md relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${sub.color}0A 0%, #FFFFFF 100%)`,
                }}
              >
                {/* Acento lateral */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-2.5"
                  style={{ backgroundColor: sub.color }}
                />

                {/* Cabecera de la Materia */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-2xl bg-white shadow-2xs border border-black/5">
                      {sub.emoji}
                    </span>
                    <div>
                      <Link
                        href={`/subjects/${sub.id}`}
                        className="text-base sm:text-lg font-bold text-[#1C1C1E] hover:text-[#007AFF] transition-colors truncate block"
                      >
                        {sub.name}
                      </Link>
                      <p className="text-xs text-[#8E8E93]">
                        Nota para aprobar:{" "}
                        <span className="font-semibold text-[#1C1C1E]">
                          {formatGrade(sub.passingGrade)}
                        </span>
                        {" • "}
                        Evaluado:{" "}
                        <span className="font-semibold text-[#1C1C1E]">{sub.completedWeight}%</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-[#1C1C1E]">
                      {sub.accumulatedScore > 0 ? formatGrade(sub.accumulatedScore) : "0.0"}
                      <span className="text-xs font-normal text-[#8E8E93] ml-1">acumulado</span>
                    </div>
                    {sub.completedWeight > 0 && (
                      <span className="text-[11px] text-[#8E8E93] block">
                        Promedio parcial: {formatGrade(sub.currentAverageOverGraded)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. El Mensaje de Salvación Automático (Highlight Card) */}
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                    isPassed
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : isCritical
                      ? "bg-red-50/80 border-red-200 text-red-900"
                      : isAttention
                      ? "bg-amber-50/80 border-amber-200 text-amber-900"
                      : "bg-blue-50/80 border-blue-200 text-blue-900"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCritical ? (
                      <Flame className="w-5 h-5 text-red-600 animate-pulse" />
                    ) : isAttention ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {isPassed
                        ? "Estado: ¡Materia Ganada!"
                        : isCritical
                        ? "Estado: Peligro Crítico"
                        : isAttention
                        ? "Estado: A ponerse las pilas"
                        : "Estado: Vas por buen camino"}
                    </h4>
                    <p className="text-xs sm:text-sm font-semibold leading-snug">
                      {sub.statusMessage}
                    </p>
                  </div>
                </div>

                {/* 4. Lista de Cortes y Evaluaciones */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#8E8E93] px-1 font-semibold uppercase tracking-wider">
                    <span>Cortes del Semestre</span>
                    <button
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        setGradeName("");
                        setGradeScore("");
                        setGradeWeight(String(sub.remainingWeight > 0 ? sub.remainingWeight : 30));
                      }}
                      className="text-[#007AFF] hover:underline normal-case font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Corte</span>
                    </button>
                  </div>

                  {sub.grades.length === 0 ? (
                    <div className="p-3 bg-white/60 rounded-xl text-center text-xs text-[#8E8E93] border border-black/5">
                      Sin cortes. Haz clic en &quot;+ Agregar Corte&quot; para registrar tus exámenes.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {sub.grades.map((grade) => (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white border border-black/5 text-xs group"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#1C1C1E] block">
                              {grade.name}
                            </span>
                            <span className="text-[11px] text-[#8E8E93]">
                              Ponderación: {grade.weightPercent}%
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {editingGradeId === grade.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="5.0"
                                  autoFocus
                                  placeholder="4.0"
                                  value={editScore}
                                  onChange={(e) => setEditScore(e.target.value)}
                                  className="w-16 px-2 py-1 text-xs font-bold rounded-lg border border-black/20 text-center"
                                />
                                <button
                                  onClick={() => handleUpdateScore(grade.id)}
                                  className="px-2 py-1 bg-[#007AFF] text-white font-bold rounded-lg"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setEditingGradeId(null)}
                                  className="px-1.5 py-1 text-[#8E8E93]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingGradeId(grade.id);
                                  setEditScore(grade.score !== null ? String(grade.score) : "");
                                }}
                                className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-black/5 transition-colors"
                                title="Toca para editar nota"
                              >
                                <span
                                  className={`text-sm font-bold ${
                                    grade.score !== null ? "text-[#1C1C1E]" : "text-[#8E8E93] italic"
                                  }`}
                                >
                                  {grade.score !== null ? formatGrade(grade.score) : "Pendiente"}
                                </span>
                                <Edit2 className="w-3 h-3 text-[#8E8E93] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}

                            <button
                              onClick={() => handleDeleteGrade(grade.id)}
                              className="text-[#8E8E93] hover:text-red-500 p-1 opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Eliminar corte"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Bottom Sheet: Agregar Corte */}
      {selectedSubjectId && (
        <div
          onClick={() => setSelectedSubjectId(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Nuevo Corte de Evaluación
              </h3>
              <button
                onClick={() => setSelectedSubjectId(null)}
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
                  autoFocus
                  placeholder="Ej. Parcial 2, Talleres, Examen Final..."
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
                    Nota Obtenida (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5.0"
                    placeholder="Ej. 3.5"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-black/10 bg-[#F2F2F7]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8E8E93]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !gradeName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] text-white shadow-xs disabled:opacity-50"
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
        isOpen={Boolean(gradeToDelete)}
        onClose={() => setGradeToDelete(null)}
        onConfirm={confirmDeleteGrade}
        title="¿Eliminar este corte?"
        message="Se eliminará esta calificación y se recalculará automáticamente tu promedio y proyección de semestre."
        confirmText="Eliminar Corte"
        isDestructive={true}
        isLoading={isPending}
      />
    </div>
  );
}
