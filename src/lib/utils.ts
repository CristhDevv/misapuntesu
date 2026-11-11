import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatDateFull(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function getCountdownBadge(dueDate: Date | string): {
  label: string;
  isUrgent: boolean;
  isOverdue: boolean;
} {
  const target = new Date(dueDate);
  const now = new Date();
  
  // Set both to midnight for day comparison
  const d1 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Venció hace ${Math.abs(diffDays)}d`,
      isUrgent: true,
      isOverdue: true,
    };
  }
  if (diffDays === 0) {
    return { label: "¡Hoy!", isUrgent: true, isOverdue: false };
  }
  if (diffDays === 1) {
    return { label: "Mañana", isUrgent: true, isOverdue: false };
  }
  if (diffDays <= 3) {
    return { label: `En ${diffDays} días`, isUrgent: true, isOverdue: false };
  }
  return { label: `En ${diffDays} días`, isUrgent: false, isOverdue: false };
}

export function formatGrade(grade: number | null | undefined): string {
  if (grade === null || grade === undefined || isNaN(grade)) return "-";
  return grade % 1 === 0 ? `${grade}.0` : grade.toFixed(1);
}
