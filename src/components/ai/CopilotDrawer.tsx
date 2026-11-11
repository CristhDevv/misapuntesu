"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Zap,
  CheckCircle2,
  Calendar,
  Flame,
  HelpCircle,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatCopilotAction } from "@/server/actions";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  actionExecuted?: string;
}

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function CopilotDrawer({ isOpen, onClose, onOpenSettings }: CopilotDrawerProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content:
        "¡Hola! 👋 Soy tu copiloto de estudio con Gemini. Conozco tus materias, tus horarios, tus notas y tus hábitos. ¿En qué te puedo ayudar hoy? Puedo agendar hábitos, planear tus repasos para parciales o responder dudas de tus temas.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  // Cerrar con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isPending) return;

    const userMsg: Message = {
      id: "u_" + Date.now(),
      role: "user",
      content: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await chatCopilotAction(promptText, history);

      if (res.success) {
        const botMsg: Message = {
          id: "m_" + Date.now(),
          role: "model",
          content: res.data.reply,
          actionExecuted: res.data.actionExecuted,
        };
        setMessages((prev) => [...prev, botMsg]);

        // Si se ejecutó una acción en la base de datos, refrescar las vistas de la app
        if (res.data.actionExecuted) {
          router.refresh();
        }
      } else {
        const errorMsg: Message = {
          id: "err_" + Date.now(),
          role: "model",
          content: `⚠️ Error: ${res.error || "No se pudo conectar con Gemini. Verifica tu API Key en configuración."}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    });
  };

  if (!isOpen) return null;

  const quickPrompts = [
    "¿Qué entregas y temas tengo pendientes para hoy?",
    "Agrega el hábito de 'Estudiar Inglés' de lunes a viernes a las 7:00 PM",
    "Hazme un plan de estudio en mis huecos libres para el próximo examen",
    "¿Cuánto necesito sacar para pasar mis materias?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-white/95 backdrop-blur-2xl border-l border-black/10 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
      >
        {/* Cabecera estilo Apple Intelligence */}
        <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#007AFF] via-[#AF52DE] to-[#FF2D55] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#1C1C1E]">Copiloto Gemini</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-purple-700 font-semibold border border-purple-200">
                  En vivo
                </span>
              </div>
              <p className="text-[10px] text-[#8E8E93]">
                Conoce tus materias, horario y hábitos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-[#007AFF] hover:bg-black/5"
              title="Configurar API Key o modelo"
            >
              Configurar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                    ✨
                  </span>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                    isUser
                      ? "bg-[#007AFF] text-white font-medium rounded-tr-xs"
                      : "bg-[#F2F2F7] text-[#1C1C1E] rounded-tl-xs border border-black/5"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <div className="space-y-1.5 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>ul]:space-y-1 [&>ol]:space-y-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({ children }) => (
                            <strong className="font-bold text-[#1C1C1E] bg-black/[0.04] px-1 py-0.5 rounded">
                              {children}
                            </strong>
                          ),
                          code: ({ children }) => (
                            <code className="bg-black/5 px-1 py-0.5 rounded font-mono text-[11px] text-[#007AFF]">
                              {children}
                            </code>
                          ),
                          p: ({ children }) => <p className="leading-relaxed mb-1.5 last:mb-0">{children}</p>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Insignia de Acción ejecutada en DB */}
                  {m.actionExecuted && (
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center gap-1.5 text-[11px] font-bold text-[#34C759]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{m.actionExecuted}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isPending && (
            <div className="flex gap-2.5 items-center">
              <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] text-white flex items-center justify-center text-xs shrink-0 shadow-2xs animate-pulse">
                ✨
              </span>
              <div className="bg-[#F2F2F7] px-4 py-2.5 rounded-2xl text-xs text-[#8E8E93] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#AF52DE]" />
                <span>Gemini está pensando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias Rápidas */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="text-[11px] text-[#636366] bg-[#F2F2F7] hover:bg-black/5 px-2.5 py-1.5 rounded-xl border border-black/5 text-left transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 border-t border-black/5 bg-white/80 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-[#F2F2F7] rounded-2xl px-3 py-1.5 border border-black/10 focus-within:border-[#007AFF] focus-within:ring-1 focus-within:ring-[#007AFF]/20 transition-all"
          >
            <input
              type="text"
              placeholder="Pregúntale a Gemini o pídele que agende algo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent text-xs sm:text-sm text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-hidden py-1.5"
            />
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              className="p-1.5 rounded-xl bg-[#007AFF] text-white hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-[#8E8E93] pt-1.5 px-1">
            <span>Presiona Enter para enviar</span>
            <span>Atajo: ⌘J / Ctrl+J</span>
          </div>
        </div>
      </div>
    </div>
  );
}
