"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { BottomTabBar } from "./BottomTabBar";
import { DesktopSidebar } from "./DesktopSidebar";
import { SpotlightSearchModal } from "./SpotlightSearchModal";
import { PomodoroWidget } from "../pomodoro/PomodoroWidget";
import { CopilotDrawer } from "../ai/CopilotDrawer";
import { AISettingsModal } from "../ai/AISettingsModal";

// Silenciar falsos positivos de extensiones del navegador y boundary de metadata en Turbopack
if (typeof window !== "undefined") {
  const origError = console.error;
  const origWarn = console.warn;
  const shouldFilter = (args: unknown[]) => {
    const text = args
      .map((a) => (typeof a === "string" ? a : (a as { message?: string })?.message || ""))
      .join(" ");
    return (
      text.includes("hydrated") ||
      text.includes("hydration") ||
      text.includes("__next_metadata_boundary__") ||
      text.includes("didn't match the client") ||
      text.includes("hidden=[true]") ||
      text.includes("extra attributes from the server")
    );
  };

  console.error = function (...args: unknown[]) {
    if (shouldFilter(args)) return;
    return origError.apply(console, args);
  };
  console.warn = function (...args: unknown[]) {
    if (shouldFilter(args)) return;
    return origWarn.apply(console, args);
  };
}

interface AppleAppShellProps {
  children: React.ReactNode;
  subjects?: Array<{ id: string; name: string; emoji: string; color: string }>;
}

export function AppleAppShell({ children, subjects = [] }: AppleAppShellProps) {
  const pathname = usePathname();
  const isBookReader = Boolean(pathname && pathname.startsWith("/books/") && pathname !== "/books");

  const [searchOpen, setSearchOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  // Global Shortcuts: Cmd+K (Spotlight) & Cmd+J (Copiloto)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`${
        isBookReader
          ? "h-[100dvh] max-h-[100dvh] overflow-hidden"
          : "min-h-screen"
      } bg-[#F2F2F7] flex flex-row text-[#1C1C1E] antialiased`}
    >
      {/* 1. Desktop Sidebar (iPadOS / macOS style) */}
      {!isBookReader && (
        <DesktopSidebar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCopilot={() => setCopilotOpen(true)}
          onOpenAISettings={() => setAiSettingsOpen(true)}
          subjects={subjects}
        />
      )}

      {/* 2. Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isBookReader ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen"
        }`}
      >
        {/* Mobile Top Header (Glass Frost) - Only on regular pages */}
        {!isBookReader && (
          <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 h-13 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="text-sm font-bold text-[#1C1C1E] tracking-tight">El Cuaderno</span>
            </Link>

            <div className="flex items-center gap-1.5">
              <PomodoroWidget />
              <button
                onClick={() => setCopilotOpen(true)}
                className="p-2 rounded-full text-indigo-600 hover:bg-black/5 transition-transform active:scale-90"
                title="Copiloto Gemini AI (⌘J)"
              >
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full text-[#1C1C1E] hover:bg-black/5 transition-transform active:scale-90"
                title="Buscar (Spotlight ⌘K)"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        {/* Page Content with bottom clearance on mobile for Tab Bar */}
        <main
          className={
            isBookReader
              ? "flex-1 w-full h-[100dvh] max-h-[100dvh] overflow-hidden p-0 max-w-none"
              : "flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-12"
          }
        >
          {children}
        </main>
      </div>

      {/* 3. Mobile Bottom Tab Bar - Hidden during book reading */}
      {!isBookReader && <BottomTabBar />}

      {/* 4. Global Spotlight Search Modal */}
      <SpotlightSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* 5. Co-Piloto Flotante Gemini AI (Cmd+J / Drawer lateral) */}
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onOpenSettings={() => setAiSettingsOpen(true)}
      />

      {/* 6. Modal de Configuración Gemini AI & Notificaciones */}
      <AISettingsModal isOpen={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
    </div>
  );
}
