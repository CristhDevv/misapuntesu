"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaSupport() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosInstallable, setIsIosInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Registrar Service Worker de forma segura
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Silencioso si el entorno bloquea SW
      });
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    try {
      if (sessionStorage.getItem("misapuntesu_pwa_dismissed") === "1") {
        setIsDismissed(true);
        return;
      }
    } catch {
      // Ignore storage errors
    }

    // 2. Detectar evento nativo de instalación en Chrome / Edge / Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 3. Detectar iOS Safari para guía discreta de instalación
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setIsIosInstallable(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("misapuntesu_pwa_dismissed", "1");
    } catch {
      // Ignore
    }
  };

  if (isDismissed || (!deferredPrompt && !isIosInstallable)) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 z-50 max-w-xs sm:max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-white/90 backdrop-blur-xl border border-black/10 rounded-2xl shadow-lg p-3.5 flex items-center gap-3">
        <img
          src="/icons/icon-192.png"
          alt="MisApuntesU"
          className="w-10 h-10 rounded-xl shrink-0 shadow-2xs"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#1C1C1E] truncate">Instalar MisApuntesU</p>
          {deferredPrompt ? (
            <p className="text-[11px] text-[#636366] leading-tight mt-0.5">
              Úsala como aplicación directa en tu dispositivo.
            </p>
          ) : (
            <p className="text-[11px] text-[#636366] leading-tight mt-0.5 flex items-center gap-1 flex-wrap">
              <span>Toca</span>
              <Share className="w-3 h-3 text-[#007AFF] inline" />
              <span>y luego «Añadir a inicio».</span>
            </p>
          )}
        </div>

        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="min-h-[36px] px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5 shrink-0 transition-colors"
          aria-label="Cerrar aviso de instalación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
