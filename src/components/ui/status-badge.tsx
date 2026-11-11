import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "PENDING" | "STUDYING" | "PRACTICING" | "MASTERED" | string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  let label = "Pendiente";
  let colorStyles = "bg-zinc-100 text-zinc-600 border-zinc-200";

  switch (status) {
    case "STUDYING":
      label = "En Estudio";
      colorStyles = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "PRACTICING":
      label = "En Práctica";
      colorStyles = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "MASTERED":
      label = "Dominado";
      colorStyles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "PENDING":
    default:
      label = "Pendiente";
      colorStyles = "bg-zinc-100 text-zinc-600 border-zinc-200";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-md whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        colorStyles,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "STUDYING" && "bg-blue-500 animate-pulse",
          status === "PRACTICING" && "bg-amber-500",
          status === "MASTERED" && "bg-emerald-500",
          status === "PENDING" && "bg-zinc-400"
        )}
      />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toUpperCase();
  if (p === "HIGH") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-600 border border-red-200">
        Alta
      </span>
    );
  }
  if (p === "MEDIUM") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
        Media
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-50 text-zinc-500 border border-zinc-200">
      Baja
    </span>
  );
}
