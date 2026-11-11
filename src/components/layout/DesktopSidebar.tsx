"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  CalendarDays,
  Calculator,
  Search,
  Plus,
  Bot,
  Settings,
  Library,
} from "lucide-react";
import { PomodoroWidget } from "../pomodoro/PomodoroWidget";
import { getSidebarSubjectsAction } from "@/server/actions";

interface DesktopSidebarProps {
  onOpenSearch: () => void;
  onOpenCopilot?: () => void;
  onOpenAISettings?: () => void;
  subjects?: Array<{ id: string; name: string; emoji: string; color: string }>;
}

export function DesktopSidebar({
  onOpenSearch,
  onOpenCopilot,
  onOpenAISettings,
  subjects: initialSubjects = [],
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const [subjects, setSubjects] = useState(initialSubjects);

  useEffect(() => {
    getSidebarSubjectsAction().then((data) => {
      if (data) setSubjects(data);
    });
  }, [pathname]);

  const mainLinks = [
    {
      href: "/",
      label: "Hoy",
      icon: Sparkles,
      isActive: pathname === "/",
    },
    {
      href: "/subjects",
      label: "Materias",
      icon: BookOpen,
      isActive: pathname.startsWith("/subjects"),
    },
    {
      href: "/books",
      label: "Libros",
      icon: Library,
      isActive: pathname.startsWith("/books"),
    },
    {
      href: "/schedule",
      label: "Horario",
      icon: CalendarDays,
      isActive: pathname === "/schedule",
    },
    {
      href: "/grades",
      label: "Promedio",
      icon: Calculator,
      isActive: pathname === "/grades",
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#F2F2F7] border-r border-black/5 p-4 justify-between select-none shrink-0">
      {/* Top Section */}
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* Brand / Logo */}
        <div className="flex items-center justify-between pt-1 px-2">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-base border border-black/5 group-hover:scale-105 transition-transform">
              🎓
            </span>
            <div className="leading-tight">
              <span className="text-sm font-bold text-[#1C1C1E] tracking-tight block">El Cuaderno</span>
              <p className="text-[10px] text-[#8E8E93] font-medium uppercase tracking-wider">Adaptativo</p>
            </div>
          </Link>
        </div>

        {/* Pomodoro Focus Pill */}
        <div className="px-1">
          <PomodoroWidget />
        </div>

        {/* Spotlight Quick Search */}
        <div className="px-1">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/80 hover:bg-white text-xs text-[#8E8E93] hover:text-[#1C1C1E] border border-black/5 transition-all shadow-2xs active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#8E8E93]" />
              <span>Buscar apunte o tema...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#8E8E93]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Core Nav Links */}
        <nav className="space-y-1 px-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${
                  link.isActive
                    ? "bg-[#007AFF] text-white shadow-xs font-semibold"
                    : "text-[#1C1C1E] hover:bg-white/70"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${link.isActive ? "text-white" : "text-[#8E8E93]"}`}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Subjects List */}
        <div className="pt-2 px-1 space-y-1.5">
          <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
            <span>Cuadernos</span>
            <Link
              href="/subjects"
              className="text-[#007AFF] hover:underline normal-case text-xs font-medium flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ver todas</span>
            </Link>
          </div>

          <div className="space-y-0.5">
            {subjects.length === 0 ? (
              <p className="text-xs text-[#8E8E93] px-2 py-3 italic">
                Aún no tienes materias agregadas.
              </p>
            ) : (
              subjects.map((sub) => {
                const isSubActive = pathname === `/subjects/${sub.id}`;
                return (
                  <Link
                    key={sub.id}
                    href={`/subjects/${sub.id}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all active:scale-[0.98] ${
                      isSubActive
                        ? "bg-white text-[#1C1C1E] font-semibold shadow-xs"
                        : "text-[#1C1C1E] hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{sub.emoji}</span>
                      <span className="truncate">{sub.name}</span>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Profile / Quick Info & AI Actions */}
      <div className="space-y-2 pt-2 border-t border-black/5">
        {onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 text-[#1C1C1E] border border-purple-500/20 text-xs font-semibold transition-all active:scale-95 shadow-2xs"
            title="Abrir Copiloto Gemini AI"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-indigo-600 text-white">
                <Sparkles className="w-3 h-3 text-amber-200" />
              </span>
              <span>Copiloto Gemini</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#8E8E93]">
              ⌘J
            </kbd>
          </button>
        )}

        <div className="px-2 text-[11px] text-[#8E8E93] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" title="Sistema Activo" />
            <span>Semestre en curso</span>
          </div>

          {onOpenAISettings && (
            <button
              onClick={onOpenAISettings}
              className="p-1 rounded-lg hover:bg-black/5 text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
              title="Configuración de Gemini AI"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
