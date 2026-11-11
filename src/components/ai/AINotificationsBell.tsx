"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Sparkles, Bell, Check, Trash2, ArrowRight, ExternalLink, X } from "lucide-react";
import {
  checkSmartAlertsAction,
  markNotificationReadAction,
  clearAllNotificationsAction,
} from "@/server/actions";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface AINotificationsBellProps {
  initialCount?: number;
}

export function AINotificationsBell({ initialCount = 0 }: AINotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Floating iOS toast alert
  const [floatingToast, setFloatingToast] = useState<NotificationItem | null>(null);

  // Escanear alertas proactivamente al montar
  useEffect(() => {
    const fetchAlerts = async () => {
      const res = await checkSmartAlertsAction();
      if (res.success && res.data) {
        const list = res.data as NotificationItem[];
        setNotifications(list);
        const unread = list.filter((n) => !n.isRead);
        setUnreadCount(unread.length);

        // Si hay una alerta no leída urgente reciente (< 5 mins), mostrar floating toast y notificación nativa
        if (unread.length > 0) {
          const latest = unread[0];
          setFloatingToast(latest);
          setTimeout(() => setFloatingToast(null), 8000);

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(latest.title, {
                body: latest.message,
                icon: "/favicon.ico",
              });
            } catch {}
          }
        }
      }
    };

    fetchAlerts();
    // Chequear cada 3 minutos
    const interval = setInterval(fetchAlerts, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  };

  const handleClearAll = () => {
    startTransition(async () => {
      await clearAllNotificationsAction();
      setNotifications([]);
      setUnreadCount(0);
    });
  };

  return (
    <div className="relative">
      {/* Botón Campana / Destello Apple */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-full text-[#1C1C1E] hover:bg-black/5 transition-transform active:scale-90"
        title="Alertas Proactivas de Gemini"
      >
        <Sparkles className="w-5 h-5 text-[#AF52DE]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF2D55] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover de Notificaciones */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-2xl rounded-3xl border border-black/10 shadow-2xl p-4 z-50 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/5 pb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#AF52DE]" />
                <span className="text-xs font-bold text-[#1C1C1E]">
                  Alertas Inteligentes
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-medium text-[#8E8E93] hover:text-red-500 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <span className="text-2xl">✨</span>
                  <p className="text-xs font-semibold text-[#1C1C1E]">
                    Todo bajo control
                  </p>
                  <p className="text-[11px] text-[#8E8E93] max-w-[200px] mx-auto">
                    Gemini te avisará cuando falten 15 min para una clase o cuando tengas un hábito por proteger.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-2xl border transition-all text-xs space-y-1.5 ${
                      !notif.isRead
                        ? "bg-purple-50/50 border-purple-200 shadow-2xs"
                        : "bg-[#F2F2F7] border-black/5 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-[#1C1C1E] leading-snug">
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="p-1 rounded-full text-[#8E8E93] hover:text-[#007AFF] hover:bg-white"
                          title="Marcar como leída"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-[#636366] leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.actionUrl && (
                      <Link
                        href={notif.actionUrl}
                        onClick={() => {
                          handleMarkRead(notif.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#007AFF] hover:underline pt-0.5"
                      >
                        <span>Abrir en la app</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating iOS Dynamic Island Banner Toast */}
      {floatingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-top-6 duration-200">
          <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl text-white rounded-3xl p-3.5 shadow-2xl border border-white/10 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] flex items-center justify-center shrink-0 text-xs">
                ✨
              </span>
              <div className="min-w-0">
                <h5 className="text-xs font-bold leading-tight truncate">
                  {floatingToast.title}
                </h5>
                <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5">
                  {floatingToast.message}
                </p>
                {floatingToast.actionUrl && (
                  <Link
                    href={floatingToast.actionUrl}
                    onClick={() => setFloatingToast(null)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5AC8FA] hover:underline mt-1"
                  >
                    <span>Ver ahora →</span>
                  </Link>
                )}
              </div>
            </div>

            <button
              onClick={() => setFloatingToast(null)}
              className="p-1 rounded-full text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
