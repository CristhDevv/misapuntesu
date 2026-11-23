import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthView } from "@/components/auth/AuthView";

export const metadata = {
  title: "Crear cuenta | MisApuntesU",
  description: "Crea tu espacio universitario en MisApuntesU.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2F2F7]" />}>
      <AuthView initialMode="register" />
    </Suspense>
  );
}
