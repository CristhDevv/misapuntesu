"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  GraduationCap,
} from "lucide-react";
import { loginUserAction, registerUserAction } from "@/server/actions";

interface AuthViewProps {
  initialMode?: "login" | "register";
}

export function AuthView({ initialMode = "login" }: AuthViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [career, setCareer] = useState("");
  const [semester, setSemester] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result =
        mode === "login"
          ? await loginUserAction({ email, password })
          : await registerUserAction({
              name,
              email,
              password,
              career: career || null,
              semester: semester || null,
            });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      const safeRedirect =
        redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
          ? redirectTarget
          : "/";

      router.push(safeRedirect);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado al conectar con el servidor.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col">
      {/* Barra superior minimalista */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:text-[#007AFF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#007AFF] text-white flex items-center justify-center text-sm">
              🎓
            </span>
            <span className="text-sm font-bold tracking-tight">MisApuntesU</span>
          </Link>
        </div>
      </header>

      {/* Contenido central */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Panel Editorial Izquierdo (Escritorio) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between rounded-3xl bg-white border border-black/5 p-7 shadow-2xs">
            <div className="space-y-4">
              <span className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] inline-flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">
                Tu espacio académico personal
              </h2>
              <p className="text-sm text-[#636366] leading-relaxed">
                Accede a tus Materias, Apuntes adaptativos, Libros interactivos, Horario y cálculo
                de Promedio desde cualquier dispositivo.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-black/5">
              {[
                "Cuadernos con Cornell, Feynman y Flashcards",
                "Libros digitales con paginación automática",
                "Calculadora de notas y metas por corte",
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-2.5 text-xs text-[#3A3A3C]">
                  <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta de Formulario */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-8 flex flex-col justify-center">
            {/* Selector Login / Registro */}
            <div className="p-1 rounded-2xl bg-[#F2F2F7] grid grid-cols-2 gap-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                  mode === "login"
                    ? "bg-white text-[#1C1C1E] shadow-xs"
                    : "text-[#636366] hover:text-[#1C1C1E]"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                  mode === "register"
                    ? "bg-white text-[#1C1C1E] shadow-xs"
                    : "text-[#636366] hover:text-[#1C1C1E]"
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <div className="mb-5">
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta estudiantil"}
              </h1>
              <p className="text-sm text-[#636366] mt-1">
                {mode === "login"
                  ? "Ingresa con tu correo y contraseña para abrir tus cuadernos."
                  : "Configura tu espacio universitario en segundos."}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 px-4 py-3 text-xs sm:text-sm font-medium text-[#D70015]"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-semibold text-[#3A3A3C] mb-1.5"
                  >
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Camila Velasco"
                      autoComplete="name"
                      className="w-full min-h-[44px] pl-10 pr-4 rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-[#3A3A3C] mb-1.5"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudiante@universidad.edu"
                    autoComplete="email"
                    className="w-full min-h-[44px] pl-10 pr-4 rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-[#3A3A3C] mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "register" ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"
                    }
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="w-full min-h-[44px] pl-10 pr-11 rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white outline-none text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#8E8E93] hover:text-[#1C1C1E]"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-career"
                      className="block text-xs font-semibold text-[#3A3A3C] mb-1.5"
                    >
                      Carrera (opcional)
                    </label>
                    <input
                      id="auth-career"
                      type="text"
                      value={career}
                      onChange={(e) => setCareer(e.target.value)}
                      placeholder="Ej. Ing. de Sistemas"
                      className="w-full min-h-[44px] px-4 rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-semester"
                      className="block text-xs font-semibold text-[#3A3A3C] mb-1.5"
                    >
                      Semestre (opcional)
                    </label>
                    <input
                      id="auth-semester"
                      type="text"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="Ej. 5° Semestre"
                      className="w-full min-h-[44px] px-4 rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] mt-2 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {mode === "login" ? "Ingresando..." : "Creando cuenta..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === "login" ? "Entrar a MisApuntesU" : "Crear cuenta y entrar"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
