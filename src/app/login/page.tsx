import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthView } from "@/components/auth/AuthView";

export const metadata = {
  title: "Iniciar sesión | MisApuntesU",
  description: "Accede a tus materias, apuntes, libros y promedio universitario.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2F2F7]" />}>
      <AuthView initialMode="login" />
    </Suspense>
  );
}
