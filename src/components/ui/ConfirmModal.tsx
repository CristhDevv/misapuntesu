"use client";

import { useEffect } from "react";
import { AlertCircle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  isDestructive = true,
  isLoading = false,
}: ConfirmModalProps) {
  // Manejo de tecla ESC para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Telón de fondo con desenfoque suave (Frosted Glass) */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Tarjeta de Confirmación */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-black/5 z-10 animate-in zoom-in-95 duration-200 text-center">
        {/* Botón de cierre en esquina superior */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5 transition-colors disabled:opacity-50"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ícono de Alerta en círculo suave */}
        <div
          className={`w-13 h-13 rounded-2xl mx-auto mb-3.5 flex items-center justify-center ${
            isDestructive ? "bg-red-50 text-red-500" : "bg-blue-50 text-[#007AFF]"
          }`}
        >
          {isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>

        {/* Título de la Alerta */}
        <h3 className="text-base sm:text-lg font-bold text-[#1C1C1E] tracking-tight">
          {title}
        </h3>

        {/* Mensaje Descriptivo */}
        <p className="text-xs text-[#8E8E93] mt-1.5 leading-relaxed px-2">
          {message}
        </p>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2.5 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#F2F2F7] hover:bg-black/5 text-[#1C1C1E] font-medium text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-2xl text-white font-semibold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 ${
              isDestructive
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                : "bg-[#007AFF] hover:bg-blue-600 shadow-blue-500/20"
            }`}
          >
            {isLoading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
