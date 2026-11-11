# Integración y Migración a Supabase (PostgreSQL)

La plataforma está configurada de forma predeterminada con **SQLite local (`dev.db`)** para funcionar 100% offline sin configuraciones externas de red.

El modelo relacional en `prisma/schema.prisma` ha sido diseñado de manera compatible con **PostgreSQL / Supabase**.

---

## Token de Acceso Supabase Proporcionado
- **Access Token:** `[CONFIGURED_IN_SUPABASE]`

---

## Pasos para Migrar de SQLite a Supabase PostgreSQL

1. **Obtener la Connection String de tu proyecto Supabase:**
   En tu panel de Supabase:
   * Ve a **Project Settings** > **Database** > **Connection string** (URI).
   * Formato típico:
     \`\`\`env
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:65432/postgres?pgbouncer=true"
     DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
     \`\`\`

2. **Actualizar el datasource en `prisma/schema.prisma`:**
   Cambia el provider de `sqlite` a `postgresql`:
   \`\`\`prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   \`\`\`

3. **Ejecutar la migración y la carga de datos semilla:**
   \`\`\`powershell
   # Sincronizar el esquema con Supabase
   npx prisma db push

   # Cargar el Roadmap semilla de Redes e Infraestructura TI (Paso 1 al Paso 6)
   npx prisma db seed
   \`\`\`
