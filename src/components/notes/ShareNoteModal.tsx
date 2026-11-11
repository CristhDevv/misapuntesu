"use client";

import { useState } from "react";
import { Copy, Check, Share2, Sparkles, X, Smartphone } from "lucide-react";

interface ShareNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: {
    title: string;
    studyMethod: string;
    freeContent: string;
    cornellCues: string;
    cornellSummary: string;
    feynmanSimple: string;
    feynmanExample: string;
    flashcardsJson: string;
    subject: {
      name: string;
      emoji: string;
      color: string;
    };
  };
}

export function ShareNoteModal({ isOpen, onClose, note }: ShareNoteModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "story">("whatsapp");

  if (!isOpen) return null;

  // Generar texto super limpio y formateado para pegar en WhatsApp
  const generateWhatsAppText = () => {
    let text = `📚 *${note.subject.emoji} ${note.subject.name.toUpperCase()}*\n`;
    text += `📝 *Tema:* ${note.title}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (note.studyMethod === "CORNELL") {
      if (note.cornellCues) {
        text += `💡 *IDEAS CLAVE Y PREGUNTAS:*\n${note.cornellCues
          .split("\n")
          .filter(Boolean)
          .map((line) => `• ${line}`)
          .join("\n")}\n\n`;
      }
      if (note.cornellSummary) {
        text += `✨ *RESUMEN DE 3 LÍNEAS:*\n${note.cornellSummary}\n\n`;
      }
    } else if (note.studyMethod === "FEYNMAN") {
      if (note.feynmanSimple) {
        text += `🧠 *EN PALABRAS SIMPLES:*\n"${note.feynmanSimple}"\n\n`;
      }
      if (note.feynmanExample) {
        text += `🌍 *EJEMPLO DE LA VIDA REAL:*\n${note.feynmanExample}\n\n`;
      }
    } else if (note.studyMethod === "ACTIVE_RECALL") {
      try {
        const cards = JSON.parse(note.flashcardsJson || "[]");
        if (cards.length > 0) {
          text += `⚡ *PREGUNTAS DE PARCIAL:*\n`;
          cards.forEach((c: { question: string; answer: string }, idx: number) => {
            text += `*P${idx + 1}:* ${c.question}\n*R:* ${c.answer}\n\n`;
          });
        }
      } catch {}
    } else {
      if (note.freeContent) {
        text += `📖 *APUNTES:*\n${note.freeContent.slice(0, 500)}...\n\n`;
      }
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Apunte compartido desde El Cuaderno Adaptativo 🎓_`;
    return text;
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h3 className="text-base font-bold text-[#1C1C1E]">
              Pasar el Apunte al Salón
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
          >
            Cerrar
          </button>
        </div>

        {/* Selector de Modo */}
        <div className="flex bg-[#E5E5EA] p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "whatsapp" ? "bg-white text-[#1C1C1E] shadow-xs" : "text-[#8E8E93]"
            }`}
          >
            💬 Copiar para WhatsApp
          </button>
          <button
            onClick={() => setActiveTab("story")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "story" ? "bg-white text-[#1C1C1E] shadow-xs" : "text-[#8E8E93]"
            }`}
          >
            📸 Tarjeta de Estudio (Story)
          </button>
        </div>

        {activeTab === "whatsapp" ? (
          <div className="space-y-3">
            <p className="text-xs text-[#8E8E93]">
              Texto limpio y estructurado con emojis listo para pegar en el grupo de WhatsApp de tu curso.
            </p>

            <div className="bg-[#F2F2F7] p-3.5 rounded-2xl max-h-56 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-[#1C1C1E] border border-black/5">
              {generateWhatsAppText()}
            </div>

            <button
              onClick={handleCopyWhatsApp}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] ${
                copied
                  ? "bg-[#34C759] text-white"
                  : "bg-[#007AFF] text-white hover:bg-blue-600"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Copiado al Portapapeles! Listo para pegar</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Resumen para WhatsApp</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#8E8E93]">
              Tarjeta estética lista para tomar screenshot y compartir en historias o estados.
            </p>

            {/* Vista previa Tarjeta Story */}
            <div
              className="p-5 rounded-3xl text-white shadow-xl space-y-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${note.subject.color} 0%, #1C1C1E 100%)`,
              }}
            >
              <div className="flex items-center justify-between text-xs font-semibold opacity-90">
                <span className="flex items-center gap-1.5">
                  <span>{note.subject.emoji}</span>
                  <span>{note.subject.name}</span>
                </span>
                <span>🎓 El Cuaderno</span>
              </div>

              <h4 className="text-lg font-bold tracking-tight text-white leading-snug">
                {note.title}
              </h4>

              {note.cornellSummary && (
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl text-xs leading-relaxed border border-white/20">
                  <span className="font-bold block mb-1">✨ Resumen Clave:</span>
                  <p>{note.cornellSummary}</p>
                </div>
              )}

              {note.feynmanSimple && (
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl text-xs leading-relaxed border border-white/20">
                  <span className="font-bold block mb-1">🧠 En simple:</span>
                  <p>&quot;{note.feynmanSimple}&quot;</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[10px] opacity-75">
                <span>Modo {note.studyMethod}</span>
                <span>Toma captura y repasa 📲</span>
              </div>
            </div>

            <p className="text-center text-[11px] text-[#8E8E93] italic">
              📸 Presiona Captura de Pantalla en tu celular para guardarla
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
