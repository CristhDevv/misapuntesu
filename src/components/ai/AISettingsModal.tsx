"use client";

import { useState, useTransition, useEffect } from "react";
import { Sparkles, Key, Bell, Target, ExternalLink, Check, AlertCircle, X, Cpu } from "lucide-react";
import { updateAISettingsAction } from "@/server/actions";

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: {
    geminiApiKey?: string;
    modelName?: string;
    enableBrowserNotifications?: boolean;
    studentGoal?: string;
    hasEnvKey?: boolean;
  };
}

export function AISettingsModal({
  isOpen,
  onClose,
  initialSettings,
}: AISettingsModalProps) {
  const [isPending, startTransition] = useTransition();

  const [apiKey, setApiKey] = useState(initialSettings?.geminiApiKey || "");
  const [modelName, setModelName] = useState(() => {
    const raw = initialSettings?.modelName || "gemini-3.5-flash";
    return raw.includes("2.5") ? "gemini-3.5-flash" : raw;
  });
  const [enableNotifications, setEnableNotifications] = useState(
    initialSettings?.enableBrowserNotifications ?? true
  );
  const [studentGoal, setStudentGoal] = useState(
    initialSettings?.studentGoal ||
      "Pasar el semestre sobre 4.2 y sostener mis hábitos de programación y ejercicio."
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        new Notification("🎓 El Cuaderno Adaptativo", {
          body: "¡Notificaciones inteligentes de Gemini activadas con éxito!",
          icon: "/favicon.ico",
        });
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateAISettingsAction({
        geminiApiKey: apiKey.trim(),
        modelName,
        enableBrowserNotifications: enableNotifications,
        studentGoal: studentGoal.trim(),
      });

      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1200);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
      >
        {/* Cabecera estilo Apple Intelligence */}
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#007AFF] via-[#AF52DE] to-[#FF2D55] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Motor Gemini AI
              </h3>
              <p className="text-[11px] text-[#8E8E93]">
                Inteligencia proactiva y asistente de estudio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Google AI Studio API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[#007AFF] hover:underline flex items-center gap-0.5"
              >
                <span>Obtener clave gratis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="password"
              placeholder={
                initialSettings?.hasEnvKey
                  ? "Configurada en variables de entorno (.env)"
                  : "AIzaSy..."
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF] font-mono"
            />
            <p className="text-[11px] text-[#8E8E93]">
              Tu clave se almacena de forma segura en tu base de datos local SQLite.
            </p>
          </div>

          {/* Selector de Modelo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#AF52DE]" />
              <span>Modelo de Google Gemini</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setModelName("gemini-3.5-flash")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  modelName === "gemini-3.5-flash"
                    ? "border-[#007AFF] bg-blue-50/50 shadow-xs ring-1 ring-[#007AFF]"
                    : "border-black/5 bg-[#F2F2F7] hover:bg-black/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1E]">3.5 Flash</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#007AFF] text-white font-semibold">
                    Recomendado
                  </span>
                </div>
                <p className="text-[10px] text-[#8E8E93] mt-1 leading-snug">
                  Ultrarrápido, inteligente y con disponibilidad garantizada.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModelName("gemini-3.8-flash")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  modelName === "gemini-3.8-flash"
                    ? "border-[#AF52DE] bg-purple-50/50 shadow-xs ring-1 ring-[#AF52DE]"
                    : "border-black/5 bg-[#F2F2F7] hover:bg-black/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1E]">3.8 Flash</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#AF52DE] text-white font-semibold">
                    Avanzado
                  </span>
                </div>
                <p className="text-[10px] text-[#8E8E93] mt-1 leading-snug">
                  Última generación para planes de estudio y método Feynman.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModelName("gemini-flash-latest")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  modelName === "gemini-flash-latest"
                    ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500"
                    : "border-black/5 bg-[#F2F2F7] hover:bg-black/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1E]">Flash Latest</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-semibold">
                    Auto
                  </span>
                </div>
                <p className="text-[10px] text-[#8E8E93] mt-1 leading-snug">
                  Siempre apunta a la versión Flash más reciente.
                </p>
              </button>
            </div>
          </div>

          {/* Meta del Estudiante */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#34C759]" />
              <span>Tu Meta Personal del Semestre</span>
            </label>
            <textarea
              rows={2}
              value={studentGoal}
              onChange={(e) => setStudentGoal(e.target.value)}
              placeholder="Ej. Pasar el semestre sobre 4.2 y sostener mis hábitos de programación y ejercicio."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border border-black/10 bg-[#F2F2F7] text-[#1C1C1E] focus:outline-hidden focus:border-[#007AFF] resize-none"
            />
            <p className="text-[10px] text-[#8E8E93]">
              Gemini usa esta meta para redactar tus briefings diarios y recordatorios.
            </p>
          </div>

          {/* Permiso de Notificaciones del Navegador */}
          <div className="p-3.5 rounded-2xl bg-[#F2F2F7] border border-black/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="w-4 h-4 text-[#FF9500] shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#1C1C1E] block">
                  Alertas Nativas del Navegador
                </span>
                <span className="text-[11px] text-[#8E8E93] block truncate">
                  {notificationPermission === "granted"
                    ? "Permiso concedido en este dispositivo ✓"
                    : "Avisos 15 min antes de tus clases y hábitos"}
                </span>
              </div>
            </div>

            {notificationPermission !== "granted" ? (
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                className="px-3 py-1.5 rounded-xl bg-white border border-black/10 text-xs font-semibold text-[#007AFF] hover:bg-black/5 shrink-0"
              >
                Activar
              </button>
            ) : (
              <span className="text-xs font-bold text-[#34C759] shrink-0 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Activo</span>
              </span>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#8E8E93] hover:bg-black/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <span>Guardar Configuración</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
