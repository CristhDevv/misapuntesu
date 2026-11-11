"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Timer, ChevronDown } from "lucide-react";

export function PomodoroWidget() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const resetTimer = (newDurationSeconds?: number) => {
    setIsRunning(false);
    const duration = newDurationSeconds !== undefined ? newDurationSeconds : totalSeconds;
    setSecondsLeft(duration);
    if (newDurationSeconds !== undefined) {
      setTotalSeconds(newDurationSeconds);
    }
    setIsMenuOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block select-none">
      {/* Pill compacta estilo Dynamic Island de Apple */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200 border shadow-xs ${
          isRunning
            ? "bg-[#007AFF] text-white border-[#007AFF] shadow-blue-500/20"
            : "bg-white text-[#1C1C1E] border-black/10 hover:bg-white"
        }`}
      >
        {/* Click to open presets menu */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-semibold focus:outline-hidden"
          title="Opciones de Enfoque Pomodoro"
        >
          <Timer className="w-3.5 h-3.5" />
          <span className="font-mono tracking-tight">{formattedTime}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {/* Botón Play / Pause */}
        <button
          type="button"
          onClick={() => setIsRunning((prev) => !prev)}
          className={`p-1 rounded-full transition-transform active:scale-90 ${
            isRunning ? "hover:bg-white/20 text-white" : "hover:bg-black/5 text-[#007AFF]"
          }`}
          title={isRunning ? "Pausar" : "Iniciar"}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Botón Reiniciar Contenedor - SIEMPRE VISIBLE */}
        <button
          type="button"
          onClick={() => resetTimer()}
          className={`p-1 rounded-full transition-transform active:scale-90 ${
            isRunning ? "hover:bg-white/20 text-white/90" : "hover:bg-black/5 text-[#8E8E93] hover:text-[#1C1C1E]"
          }`}
          title="Reiniciar contador"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Menú Desplegable de Modos Pomodoro (Alto Contraste Apple Light Mode) */}
      {isMenuOpen && (
        <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-white border border-black/10 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider px-2.5 py-1 mb-1">
            Modo de Enfoque
          </p>

          <button
            type="button"
            onClick={() => resetTimer(25 * 60)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between mb-1 ${
              totalSeconds === 25 * 60
                ? "bg-[#007AFF] text-white font-semibold shadow-xs"
                : "text-[#1C1C1E] hover:bg-[#F2F2F7] font-medium"
            }`}
          >
            <span>Sesión Pomodoro</span>
            <span
              className={`font-mono text-[11px] ${
                totalSeconds === 25 * 60 ? "text-white/90 font-bold" : "text-[#8E8E93]"
              }`}
            >
              25:00
            </span>
          </button>

          <button
            type="button"
            onClick={() => resetTimer(5 * 60)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between mb-1 ${
              totalSeconds === 5 * 60
                ? "bg-[#007AFF] text-white font-semibold shadow-xs"
                : "text-[#1C1C1E] hover:bg-[#F2F2F7] font-medium"
            }`}
          >
            <span>Descanso Corto</span>
            <span
              className={`font-mono text-[11px] ${
                totalSeconds === 5 * 60 ? "text-white/90 font-bold" : "text-[#8E8E93]"
              }`}
            >
              05:00
            </span>
          </button>

          <button
            type="button"
            onClick={() => resetTimer(15 * 60)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between mb-1 ${
              totalSeconds === 15 * 60
                ? "bg-[#007AFF] text-white font-semibold shadow-xs"
                : "text-[#1C1C1E] hover:bg-[#F2F2F7] font-medium"
            }`}
          >
            <span>Descanso Largo</span>
            <span
              className={`font-mono text-[11px] ${
                totalSeconds === 15 * 60 ? "text-white/90 font-bold" : "text-[#8E8E93]"
              }`}
            >
              15:00
            </span>
          </button>

          <div className="border-t border-black/5 mt-1.5 pt-1.5">
            <button
              type="button"
              onClick={() => resetTimer()}
              className="w-full text-left px-3 py-2 rounded-xl text-[#007AFF] hover:bg-blue-50 font-semibold flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar a {Math.floor(totalSeconds / 60)}:00</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
