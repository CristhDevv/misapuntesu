"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, BookOpen, CalendarDays, Calculator, Library } from "lucide-react";

export function BottomTabBar() {
  const pathname = usePathname();

  const tabs = [
    {
      id: "today",
      href: "/",
      label: "Hoy",
      icon: Sparkles,
      isActive: pathname === "/",
    },
    {
      id: "subjects",
      href: "/subjects",
      label: "Materias",
      icon: BookOpen,
      isActive: pathname.startsWith("/subjects"),
    },
    {
      id: "books",
      href: "/books",
      label: "Libros",
      icon: Library,
      isActive: pathname.startsWith("/books"),
    },
    {
      id: "schedule",
      href: "/schedule",
      label: "Horario",
      icon: CalendarDays,
      isActive: pathname === "/schedule",
    },
    {
      id: "grades",
      href: "/grades",
      label: "Promedio",
      icon: Calculator,
      isActive: pathname === "/grades",
    },
  ];

  return (
    <nav
      aria-label="Barra de navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-black/5 pb-[env(safe-area-inset-bottom,8px)] pt-1 px-4 select-none"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                tab.isActive ? "text-[#007AFF]" : "text-[#8E8E93] hover:text-[#1C1C1E]"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform ${
                    tab.isActive ? "scale-105 stroke-[2.2]" : "stroke-[1.7]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  tab.isActive ? "font-semibold" : "font-normal"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
