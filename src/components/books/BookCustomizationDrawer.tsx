"use client";

import React from "react";
import {
  X,
  Sliders,
  Type,
  Layout,
  Maximize2,
  Palette,
  Columns,
  File,
  Check,
} from "lucide-react";
import {
  BOOK_PAPER_TEXTURES,
  BOOK_COVER_STYLES,
  BOOK_COVER_GRADIENTS,
} from "@/lib/validations";

interface BookCustomizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customization: {
    paperTexture: "blank" | "sepia" | "dotted" | "grid" | "lined" | "dark";
    fontFamily: "sans" | "serif" | "mono";
    fontSize: "sm" | "base" | "lg" | "xl";
    lineHeight: "compact" | "relaxed" | "loose";
    pageLayout: "single" | "spread";
    pageMargins: "narrow" | "normal" | "wide";
    coverStyle?: "minimal" | "editorial" | "technical" | "leather";
    coverGradient?: string;
  };
  onChange: (updates: Partial<BookCustomizationDrawerProps["customization"]>) => void;
}

export function BookCustomizationDrawer({
  isOpen,
  onClose,
  customization,
  onChange,
}: BookCustomizationDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-black/10 dark:border-white/10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#007AFF]" />
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-zinc-100">
                Diseño & Experiencia
              </h2>
              <p className="text-[11px] text-[#8E8E93]">Personaliza papel, fuente y maquetación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
          {/* 1. Modo de Vista (Layout: 1 Hoja vs 2 Hojas Abiertas) */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1C1C1E] dark:text-zinc-200 flex items-center gap-1.5">
              <Columns className="w-4 h-4 text-[#007AFF]" />
              <span>Maquetación del Libro</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ pageLayout: "single" })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                  customization.pageLayout === "single"
                    ? "border-[#007AFF] bg-blue-50/70 dark:bg-blue-950/40 text-[#007AFF] font-semibold"
                    : "border-black/10 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300"
                }`}
              >
                <File className="w-5 h-5" />
                <span>Página Individual</span>
                <span className="text-[10px] text-stone-400 font-normal">Foco en móvil</span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ pageLayout: "spread" })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                  customization.pageLayout === "spread"
                    ? "border-[#007AFF] bg-blue-50/70 dark:bg-blue-950/40 text-[#007AFF] font-semibold"
                    : "border-black/10 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300"
                }`}
              >
                <Columns className="w-5 h-5" />
                <span>Libro Abierto (2 Págs)</span>
                <span className="text-[10px] text-stone-400 font-normal">Doble página</span>
              </button>
            </div>
          </div>

          {/* 2. Textura de Papel */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1C1C1E] dark:text-zinc-200 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#007AFF]" />
              <span>Textura del Papel</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BOOK_PAPER_TEXTURES.map((texture) => {
                const isSelected = customization.paperTexture === texture.id;
                return (
                  <button
                    key={texture.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        paperTexture: texture.id as BookCustomizationDrawerProps["customization"]["paperTexture"],
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-[#007AFF] ring-2 ring-[#007AFF]/20"
                        : "border-black/10 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{texture.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#007AFF]" />}
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-zinc-400 line-clamp-1">
                      {texture.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Tipografía */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1C1C1E] dark:text-zinc-200 flex items-center gap-1.5">
              <Type className="w-4 h-4 text-[#007AFF]" />
              <span>Familia Tipográfica</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "sans", label: "Sans (SF Pro)", class: "font-sans" },
                { id: "serif", label: "Serif (Editorial)", class: "font-serif" },
                { id: "mono", label: "Mono (Código)", class: "font-mono" },
              ].map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      fontFamily: font.id as BookCustomizationDrawerProps["customization"]["fontFamily"],
                    })
                  }
                  className={`p-2.5 rounded-xl border text-center transition-all ${font.class} ${
                    customization.fontFamily === font.id
                      ? "border-[#007AFF] bg-blue-50/70 dark:bg-blue-950/40 text-[#007AFF] font-bold"
                      : "border-black/10 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-base block mb-0.5">Aa</span>
                  <span className="text-[11px] block">{font.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Tamaño de Fuente */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1C1C1E] dark:text-zinc-200">
              Tamaño de Letra
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-stone-100 dark:bg-zinc-800 p-1 rounded-xl">
              {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChange({ fontSize: sz })}
                  className={`py-1.5 text-center rounded-lg transition-all capitalize font-medium ${
                    customization.fontSize === sz
                      ? "bg-white dark:bg-zinc-700 text-[#007AFF] shadow-xs"
                      : "text-stone-600 dark:text-zinc-400 hover:text-stone-900"
                  }`}
                >
                  {sz === "sm" ? "Pequeña" : sz === "base" ? "Normal" : sz === "lg" ? "Grande" : "X-Grande"}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Interlineado */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1C1C1E] dark:text-zinc-200">
              Interlineado
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-stone-100 dark:bg-zinc-800 p-1 rounded-xl">
              {[
                { id: "compact", label: "Compacto" },
                { id: "relaxed", label: "Relajado" },
                { id: "loose", label: "Amplio" },
              ].map((lh) => (
                <button
                  key={lh.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      lineHeight: lh.id as BookCustomizationDrawerProps["customization"]["lineHeight"],
                    })
                  }
                  className={`py-1.5 text-center rounded-lg transition-all font-medium ${
                    customization.lineHeight === lh.id
                      ? "bg-white dark:bg-zinc-700 text-[#007AFF] shadow-xs"
                      : "text-stone-600 dark:text-zinc-400 hover:text-stone-900"
                  }`}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Márgenes */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1C1C1E] dark:text-zinc-200">
              Márgenes de Hoja
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-stone-100 dark:bg-zinc-800 p-1 rounded-xl">
              {[
                { id: "narrow", label: "Estrechos" },
                { id: "normal", label: "Normales" },
                { id: "wide", label: "Amplios" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      pageMargins: m.id as BookCustomizationDrawerProps["customization"]["pageMargins"],
                    })
                  }
                  className={`py-1.5 text-center rounded-lg transition-all font-medium ${
                    customization.pageMargins === m.id
                      ? "bg-white dark:bg-zinc-700 text-[#007AFF] shadow-xs"
                      : "text-stone-600 dark:text-zinc-400 hover:text-stone-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/10 text-center">
          <p className="text-[11px] text-stone-400">
            Tus preferencias se guardan automáticamente para este libro.
          </p>
        </div>
      </div>
    </div>
  );
}
