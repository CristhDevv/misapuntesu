import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "misapuntesu_session";
const SESSION_TTL_DAYS = 30;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  career: string | null;
  semester: string | null;
}

/**
 * Cifra una contraseña con scrypt y salt aleatorio de 16 bytes.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/**
 * Verifica una contraseña contra su hash guardado usando comparación en tiempo constante.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;

  const originalBuf = Buffer.from(originalHex, "hex");
  const candidateBuf = crypto.scryptSync(password, salt, 64);
  if (originalBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(originalBuf, candidateBuf);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Crea una sesión persistente en base de datos y establece la cookie HttpOnly.
 */
export async function createUserSession(userId: string): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Obtiene el usuario autenticado actual a partir de la cookie de sesión.
 * Retorna null si no hay sesión o si se invoca fuera de un request HTTP (ej. tests unitarios).
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawToken) return null;

    const tokenHash = hashSessionToken(rawToken);
    const session = await prisma.userSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            career: true,
            semester: true,
          },
        },
      },
    });

    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión actual eliminando el registro de DB y borrando la cookie.
 */
export async function destroyCurrentSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      await prisma.userSession.deleteMany({ where: { tokenHash } });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Safe outside request context
  }
}

/**
 * Asigna automáticamente los registros académicos existentes sin dueño (userId = null)
 * a la primera cuenta creada, preservando los libros y materias actuales del usuario.
 */
export async function claimOrphanAcademicDataForFirstUser(userId: string): Promise<void> {
  const totalUsers = await prisma.user.count();
  if (totalUsers > 1) return;

  await prisma.$transaction([
    prisma.subject.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.scheduleBlock.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.courseBook.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.aINotification.updateMany({ where: { userId: null }, data: { userId } }),
  ]);

  // Vincular configuración de IA existente si aún no tiene dueño
  const defaultSettings = await prisma.aISettings.findFirst({ where: { userId: null } });
  if (defaultSettings) {
    await prisma.aISettings.update({
      where: { id: defaultSettings.id },
      data: { userId },
    });
  }
}
