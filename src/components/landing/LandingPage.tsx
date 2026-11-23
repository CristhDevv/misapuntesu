"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Calculator,
  Sparkles,
  Library,
  CheckCircle2,
  ArrowRight,
  Clock,
  Layers,
  Brain,
  Flame,
  GraduationCap,
} from "lucide-react";

const HERO_TABS = [
  {
    id: "books",
    label: "Libros",
    icon: Library,
    title: "Infraestructura TI — Pág. 3",
    badge: "Flujo tipo documento",
    previewLines: [
      { type: "h", text: "Protocolos de Red y Enrutamiento" },
      {
        type: "p",
        text: "El protocolo DHCP asigna direcciones IP dinámicas dentro de la subred local para evitar conflictos entre equipos.",
      },
      {
        type: "callout",
        text: "💡 Tip de parcial: Diferencia siempre entre IP pública (ISP) e IP privada (LAN: 192.168.x.x).",
      },
    ],
  },
  {
    id: "notes",
    label: "Apuntes",
    icon: BookOpen,
    title: "Cálculo Integral — Método Cornell",
    badge: "4 métodos de estudio",
    previewLines: [
      { type: "h", text: "Teorema Fundamental del Cálculo" },
      {
        type: "p",
        text: "Conecta la derivación con la integración definida: evaluar la antiderivada en los límites superior e inferior.",
      },
      {
        type: "callout",
        text: "🟢 Estado de dominio: Listo para el parcial · 12 tarjetas de repaso activas.",
      },
    ],
  },
  {
    id: "grades",
    label: "Promedio",
    icon: Calculator,
    title: "Simulador de Parciales — Semestre",
    badge: "Cálculo en tiempo real",
    previewLines: [
      { type: "h", text: "Estructuras de Datos · Meta: 3.0" },
      {
        type: "p",
        text: "Primer Corte (30%): 4.2 · Segundo Corte (30%): 3.8 · Examen Final (40%): Pendiente.",
      },
      {
        type: "callout",
        text: "✅ Vas excelente: Necesitas mínimo 1.50 en el 40% final para asegurar la materia.",
      },
    ],
  },
] as const;

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<(typeof HERO_TABS)[number]["id"]>("books");
  const currentTab = HERO_TABS.find((t) => t.id === activeTab) || HERO_TABS[0];

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] selection:bg-[#007AFF]/20 selection:text-[#007AFF]">
      {/* 1. Barra Superior Translúcida Apple Glass */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-2xl bg-[#007AFF] text-white shadow-xs flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
              🎓
            </span>
            <div className="leading-tight">
              <span className="text-base font-bold tracking-tight text-[#1C1C1E] block">
                MisApuntesU
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                El Cuaderno Universitario
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#3A3A3C]">
            <a href="#pilares" className="hover:text-[#007AFF] transition-colors">
              Herramientas
            </a>
            <a href="#metodos" className="hover:text-[#007AFF] transition-colors">
              Métodos de Estudio
            </a>
            <a href="#ia" className="hover:text-[#007AFF] transition-colors">
              Copiloto IA
            </a>
            <a href="#pasos" className="hover:text-[#007AFF] transition-colors">
              Cómo funciona
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="min-h-[44px] px-4 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-[#1C1C1E] hover:bg-black/5 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="min-h-[44px] px-5 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
            >
              <span>Empezar gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Principal con Vista Previa Interactiva */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-black/5 shadow-2xs text-xs font-semibold text-[#007AFF]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diseñado para el semestre universitario</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1C1C1E] leading-[1.08]">
              Tus materias, apuntes, libros y promedio en un solo lugar.
            </h1>

            <p className="text-base sm:text-lg text-[#636366] leading-relaxed max-w-xl">
              Organiza tu horario semanal, estudia con métodos probados como Cornell y Feynman,
              escribe tus propios libros sin distracciones y calcula cuánto necesitas en cada parcial.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                href="/register"
                className="min-h-[48px] px-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-base font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <span>Crear mi cuaderno universitario</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="min-h-[48px] px-6 inline-flex items-center justify-center rounded-2xl bg-white hover:bg-white/90 text-[#1C1C1E] border border-black/10 text-base font-semibold shadow-2xs transition-all active:scale-[0.98]"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-medium text-[#636366]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                Sin anuncios ni distracciones
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                Guardado automático en la nube y local
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                Listo para móvil y computador
              </span>
            </div>
          </div>

          {/* Tarjeta Interactiva de Demostración */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-black/5 shadow-xl p-5 sm:p-6 space-y-5">
              {/* Conmutador de módulos */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="inline-flex p-1 rounded-2xl bg-[#F2F2F7] border border-black/5">
                  {HERO_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                          active
                            ? "bg-white text-[#007AFF] shadow-xs"
                            : "text-[#636366] hover:text-[#1C1C1E]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                  {currentTab.badge}
                </span>
              </div>

              {/* Contenido de la vista previa */}
              <div className="rounded-2xl bg-[#F9F9FB] border border-black/5 p-5 space-y-3.5 min-h-[240px]">
                <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                    {currentTab.title}
                  </span>
                  <span className="text-[11px] text-[#34C759] font-semibold">Guardado ✓</span>
                </div>

                {currentTab.previewLines.map((item, idx) =>
                  item.type === "h" ? (
                    <h3 key={idx} className="text-lg font-bold text-[#1C1C1E] tracking-tight">
                      {item.text}
                    </h3>
                  ) : item.type === "callout" ? (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#007AFF]/8 border border-[#007AFF]/15 text-xs sm:text-sm font-medium text-[#1C1C1E]"
                    >
                      {item.text}
                    </div>
                  ) : (
                    <p key={idx} className="text-sm text-[#3A3A3C] leading-relaxed">
                      {item.text}
                    </p>
                  )
                )}
              </div>

              {/* Barra inferior mini de estado diario */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="rounded-2xl bg-[#F2F2F7] px-3 py-2.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#007AFF] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8E8E93] font-medium">Pomodoro</p>
                    <p className="text-xs font-bold truncate">25:00 Enfoque</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F2F2F7] px-3 py-2.5 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF9500] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8E8E93] font-medium">Hábitos</p>
                    <p className="text-xs font-bold truncate">Racha 7 días</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F2F2F7] px-3 py-2.5 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#34C759] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8E8E93] font-medium">Meta</p>
                    <p className="text-xs font-bold truncate">Promedio 4.4</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cuadrícula Bento de Pilares Académicos */}
      <section id="pilares" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-2xl mb-8 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#007AFF]">
            Todo tu semestre conectado
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1C1E]">
            Cinco herramientas pensadas para estudiar mejor en menos tiempo
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <Library className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Libros Interactivos</h3>
            <p className="text-sm text-[#636366] leading-relaxed">
              Redacta tus guías y apuntes largos en hojas paginadas automáticamente sin scroll
              vertical, con atajos rápidos, lectura a doble página y respaldo inmediato.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Apuntes Adaptativos</h3>
            <p className="text-sm text-[#636366] leading-relaxed">
              Cambia cualquier clase entre Modo Libre, Método Cornell, Técnica Feynman o tarjetas
              de Pregunta-Respuesta sin perder una sola palabra.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#34C759]/10 text-[#34C759] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Calculadora de Promedio</h3>
            <p className="text-sm text-[#636366] leading-relaxed">
              Registra tus cortes y parciales por porcentaje y descubre al instante qué nota mínima
              necesitas en el examen final para aprobar cada materia.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-3 md:col-span-2 lg:col-span-2">
            <div className="w-11 h-11 rounded-2xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Horario Semanal, Entregas y Hábitos</h3>
            <p className="text-sm text-[#636366] leading-relaxed max-w-2xl">
              Combina tus clases presenciales o virtuales con rutinas diarias de estudio, cursos
              externos y alertas tempranas de parciales y talleres próximos en tu vista Hoy.
            </p>
          </div>

          <div id="metodos" className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF2D55]/10 text-[#FF2D55] flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Semáforo de Dominio</h3>
            <p className="text-sm text-[#636366] leading-relaxed">
              Marca cada tema como Me cuesta, Repasando o Listo para el parcial y prioriza lo que
              realmente importa antes del examen.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Sección Copiloto IA */}
      <section id="ia" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Copiloto Gemini Integrado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Prepara tus parciales con apoyo inteligente sobre tus propios apuntes
            </h2>
            <p className="text-sm sm:text-base text-[#636366] leading-relaxed">
              Genera tarjetas de repaso automáticamente desde tus clases, organiza tus notas en
              estructura Cornell, valida si explicaste bien un concepto con Feynman o pide la
              estructura de capítulos para un nuevo libro.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#F2F2F7] p-4 space-y-1">
              <p className="text-xs font-bold text-[#007AFF]">Flashcards</p>
              <p className="text-xs text-[#3A3A3C]">Preguntas clave creadas desde tu apunte</p>
            </div>
            <div className="rounded-2xl bg-[#F2F2F7] p-4 space-y-1">
              <p className="text-xs font-bold text-[#5856D6]">Cornell IA</p>
              <p className="text-xs text-[#3A3A3C]">Ideas guía y resumen automático</p>
            </div>
            <div className="rounded-2xl bg-[#F2F2F7] p-4 space-y-1">
              <p className="text-xs font-bold text-[#34C759]">Feynman</p>
              <p className="text-xs text-[#3A3A3C]">Detecta vacíos antes del examen</p>
            </div>
            <div className="rounded-2xl bg-[#F2F2F7] p-4 space-y-1">
              <p className="text-xs font-bold text-[#FF9500]">Resumen Hoy</p>
              <p className="text-xs text-[#3A3A3C]">Enfoque diario según tus entregas</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Flujo en 3 Pasos */}
      <section id="pasos" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Empieza en menos de un minuto
          </h2>
          <p className="text-sm text-[#636366]">
            Cada estudiante cuenta con su espacio privado, seguro y sincronizado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              step: "1",
              title: "Crea tu cuenta estudiantil",
              desc: "Regístrate con tu correo y organiza tus materias y horario del semestre.",
            },
            {
              step: "2",
              title: "Toma apuntes y arma tus libros",
              desc: "Usa métodos de estudio activo o redacta guías completas con formato rápido.",
            },
            {
              step: "3",
              title: "Controla tus parciales y promedio",
              desc: "Visualiza tu meta de aprobación y repasa los temas que más te cuestan.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-3"
            >
              <span className="w-8 h-8 rounded-full bg-[#007AFF] text-white text-sm font-bold inline-flex items-center justify-center">
                {item.step}
              </span>
              <h3 className="text-base font-bold">{item.title}</h3>
              <p className="text-sm text-[#636366] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Cierre Editorial y Footer */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-4">
        <div className="bg-[#1C1C1E] text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tu próximo parcial empieza con mejores apuntes.
            </h2>
            <p className="text-sm sm:text-base text-white/75">
              Ingresa a tu espacio universitario y mantén tus materias, libros y notas siempre a mano.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="min-h-[48px] px-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#007AFF] hover:bg-[#0A84FF] text-white text-sm font-semibold transition-all active:scale-95"
            >
              <span>Crear cuenta ahora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="min-h-[48px] px-5 inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8E8E93]">
          <div className="flex items-center gap-2">
            <span>🎓</span>
            <span className="font-semibold text-[#1C1C1E]">MisApuntesU</span>
            <span>· Espacio Universitario</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-[#1C1C1E] transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register" className="hover:text-[#1C1C1E] transition-colors">
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
