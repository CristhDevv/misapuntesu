"use client";

import React from "react";
import { BookOpen, Layers, Sparkles } from "lucide-react";

interface BookCover3DProps {
  title: string;
  subtitle?: string | null;
  category?: string;
  coverGradient?: string;
  coverColor?: string;
  coverIcon?: string;
  coverStyle?: "minimal" | "editorial" | "technical" | "leather" | string;
  pageCount?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
}

export function BookCover3D({
  title,
  subtitle,
  category = "General",
  coverGradient = "from-blue-600 via-indigo-600 to-purple-700",
  coverColor = "#007AFF",
  coverIcon = "📖",
  coverStyle = "editorial",
  pageCount = 1,
  size = "md",
  interactive = true,
  className = "",
}: BookCover3DProps) {
  // Dimensions depending on size
  const sizeClasses = {
    sm: "w-36 h-52 text-xs",
    md: "w-48 h-68 text-sm",
    lg: "w-60 h-84 text-base",
  }[size];

  return (
    <div
      className={`group relative select-none ${className}`}
      style={{ perspective: "1200px" }}
    >
      {/* 3D Book Container */}
      <div
        className={`relative ${sizeClasses} rounded-r-xl rounded-l-xs transition-all duration-500 ease-out ${
          interactive
            ? "transform-gpu group-hover:[transform:rotateY(-18deg)_rotateX(4deg)_scale(1.03)] cursor-pointer"
            : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          boxShadow:
            "0 18px 35px -8px rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Book Spine (Left 3D Edge & Crease) */}
        <div className="absolute top-0 bottom-0 left-0 w-4 sm:w-5 z-20 pointer-events-none rounded-l-xs bg-gradient-to-r from-black/40 via-white/15 to-transparent border-r border-black/15 shadow-inner" />
        <div className="absolute top-0 bottom-0 left-3.5 sm:left-4.5 w-[1px] z-20 pointer-events-none bg-black/25" />

        {/* Paper Pages Stack Edge (Right Side Thickness) */}
        <div
          className="absolute top-1 bottom-1 -right-3.5 w-3.5 rounded-r-xs bg-gradient-to-r from-[#e5e5ea] via-[#f2f2f7] to-[#d1d1d6] shadow-md border-r border-black/10 flex flex-col justify-around py-1 px-[1px] overflow-hidden"
          style={{
            transform: "rotateY(90deg) translateZ(1.75px)",
            transformOrigin: "left",
          }}
        >
          {/* Subtle paper leaf lines */}
          <div className="w-full h-[1px] bg-black/10" />
          <div className="w-full h-[1px] bg-black/10" />
          <div className="w-full h-[1px] bg-black/10" />
          <div className="w-full h-[1px] bg-black/10" />
          <div className="w-full h-[1px] bg-black/10" />
        </div>

        {/* Book Cover Face */}
        <div
          className={`relative w-full h-full rounded-r-xl rounded-l-xs overflow-hidden flex flex-col justify-between p-4 sm:p-5 text-white bg-gradient-to-br ${coverGradient}`}
          style={{
            backgroundColor: coverColor,
          }}
        >
          {/* Style Specific Background Patterns */}
          {coverStyle === "technical" && (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          )}

          {coverStyle === "leather" && (
            <div className="absolute inset-1.5 border border-amber-200/40 rounded-r-lg rounded-l-xs pointer-events-none shadow-inner" />
          )}

          {/* Top Bar: Category Pill & Icon */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase truncate max-w-[70%] backdrop-blur-md ${
                coverStyle === "minimal"
                  ? "bg-white/20 text-white"
                  : coverStyle === "technical"
                  ? "bg-black/30 border border-white/20 font-mono text-cyan-200"
                  : coverStyle === "leather"
                  ? "bg-amber-950/40 border border-amber-300/30 text-amber-200 font-serif"
                  : "bg-black/20 text-white border border-white/10"
              }`}
            >
              {category}
            </span>
            <span className="text-xl sm:text-2xl drop-shadow-md select-none">{coverIcon}</span>
          </div>

          {/* Center: Title & Subtitle */}
          <div className="relative z-10 my-auto py-2">
            {coverStyle === "editorial" && (
              <div className="w-8 h-[2px] bg-white/60 mb-2 rounded-full" />
            )}
            <h3
              className={`font-bold leading-tight drop-shadow-md line-clamp-3 ${
                coverStyle === "leather"
                  ? "font-serif text-amber-100 tracking-wide text-base sm:text-lg"
                  : coverStyle === "technical"
                  ? "font-mono text-white text-sm sm:text-base tracking-tight"
                  : "tracking-tight text-white text-base sm:text-lg"
              }`}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-xs text-white/80 line-clamp-2 leading-snug drop-shadow-xs font-light">
                {subtitle}
              </p>
            )}
          </div>

          {/* Bottom Bar: Page Count & Apple Books Pill */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/15 text-[11px] text-white/85">
            <div className="flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 opacity-80" />
              <span>
                {pageCount} {pageCount === 1 ? "pág" : "págs"}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-75 text-[10px]">
              <BookOpen className="w-3 h-3" />
              <span>Cuaderno</span>
            </div>
          </div>

          {/* Gloss & Light Reflection Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
