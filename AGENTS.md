<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# REGLAS MAESTRAS PERMANENTES DEL PROYECTO (MEMORIA OBLIGATORIA)

### 1. REGLA DE EJECUCIÓN ESTRICTA EN EL CHAT
- **NUNCA mostrar bloques de código en el chat ni dar tutoriales o instrucciones paso a paso al usuario.**
- Todo se implementa, edita, compila y prueba de extremo a extremo directamente en el repositorio usando las herramientas de archivos y terminal.
- En el chat, responder únicamente con resúmenes ejecutivos claros y de alto nivel.

### 2. PREVENCIÓN DE ERRORES DE HIDRATACIÓN (TURBOPACK / REACT 19 / EXTENSIONES)
- En Next.js 16 con React 19 y Turbopack, las extensiones del navegador del usuario (gestores de contraseñas, herramientas de traducción, etc.) y la etiqueta interna `<__next_metadata_boundary__>` inyectan o alteran atributos `<div hidden>` provocando discrepancias de hidratación (`hidden=[true]` vs `hidden`).
- **NUNCA eliminar el interceptor de silenciamiento de hidratación** configurado en `<head>` de `src/app/layout.tsx` ni en `src/components/layout/AppleAppShell.tsx`.
- En componentes cliente (`"use client"`), jamás usar `Date.now()`, `Math.random()` o valores dependientes de `window` durante el renderizado inicial sin protegerlos con `useEffect` o `suppressHydrationWarning`.

### 3. MOTOR GOOGLE GEMINI AI
- **NUNCA invocar ni configurar `gemini-2.5-flash`** (modelo dado de baja por Google que genera error 404).
- El modelo base predeterminado es **`gemini-3.5-flash`**, soportado por la función resiliente `generateContentResilient` con contingencia en `gemini-3.8-flash` y `gemini-flash-latest`.
- Al crear o migrar registros en `AISettings`, asegurar siempre que el valor sea `gemini-3.5-flash`.

### 4. DISEÑO APPLE HIG (MODO CLARO UNIVERSITARIO)
- Superficies: Fondo general `#F2F2F7` (`System Grouped Background`), tarjetas blanco puro `#FFFFFF` con esquinas redondeadas (`rounded-2xl` o `rounded-3xl`) y sombras ultra sutiles.
- Barras y cabeceras: Vidrio esmerilado translúcido (`bg-white/80 backdrop-blur-xl border-black/5`).
- Mobile-first: Áreas táctiles de mínimo 44px, navegación inferior de 5 pestañas fijas (`BottomTabBar.tsx`) y barra lateral fija en escritorio (`DesktopSidebar.tsx`).
- Vocabulario 100% universitario: Materias, Apuntes, Horario, Parciales, Promedio y Libros (cero tecnicismos en la UI).

### 5. PROTOCOLO DE VERIFICACIÓN
- Toda nueva funcionalidad debe acompañarse de sus pruebas en `tests/unit/` y pasar limpiamente `npm run test:unit` (100% aprobado).
- Verificar que `npm run build` compile sin errores de tipado o Turbopack antes de dar por finalizada la tarea.

