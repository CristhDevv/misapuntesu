"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Plus, Radio } from "lucide-react";
import { createSubjectAction, startLiveClassAction } from "@/server/actions";

interface LiveLauncherProps {
  subjects: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
  }>;
}

export function LiveLauncherView({ subjects }: LiveLauncherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quickSubjectName, setQuickSubjectName] = useState("");

  const handleStart = (subjectId: string) => {
    startTransition(async () => {
      const res = await startLiveClassAction(subjectId);
      if (res.success) {
        router.push(`/live/${res.data.id}`);
      }
    });
  };

  const handleQuickCreateAndStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubjectName.trim()) return;
    startTransition(async () => {
      const subRes = await createSubjectAction({ name: quickSubjectName.trim() });
      if (subRes.success) {
        const liveRes = await startLiveClassAction(subRes.data.id);
        if (liveRes.success) {
          router.push(`/live/${liveRes.data.id}`);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:text-[#007AFF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Hoy</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF3B30]">
          <Radio className="w-4 h-4" />
          <span>Modo Clase en Vivo</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">¿Qué clase va a empezar?</h1>
          <p className="text-sm text-[#636366]">
            Elige una materia para abrir el bloc de notas rápido en tiempo real.
          </p>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                disabled={isPending}
                onClick={() => handleStart(sub.id)}
                className="min-h-[68px] p-4 rounded-2xl bg-white hover:bg-white/90 border border-black/5 shadow-2xs flex items-center gap-3 text-left transition-all active:scale-[0.98]"
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${sub.color}18` }}
                >
                  {sub.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{sub.name}</p>
                  <p className="text-xs text-[#007AFF] font-semibold">Iniciar notas en vivo →</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={handleQuickCreateAndStart}
            className="bg-white rounded-3xl border border-black/5 p-6 space-y-4 shadow-2xs"
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              <BookOpen className="w-4 h-4 text-[#007AFF]" />
              <span>Crea tu primera materia e inicia la clase</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={quickSubjectName}
                onChange={(e) => setQuickSubjectName(e.target.value)}
                placeholder="Ej. Redes e Infraestructura"
                className="flex-1 min-h-[44px] px-4 rounded-2xl bg-[#F2F2F7] text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#007AFF]/30"
              />
              <button
                type="submit"
                disabled={isPending}
                className="min-h-[44px] px-5 rounded-2xl bg-[#007AFF] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Empezar clase</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
