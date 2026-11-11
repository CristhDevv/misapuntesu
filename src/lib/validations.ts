import { z } from "zod";

// ============================================================================
// CONSTANTES DE DISEÑO APPLE HIG
// ============================================================================

export const APPLE_COLORS = [
  { name: "Azul iOS", hex: "#007AFF" },
  { name: "Índigo", hex: "#5856D6" },
  { name: "Esmeralda", hex: "#34C759" },
  { name: "Naranja", hex: "#FF9500" },
  { name: "Rosa / Rojo", hex: "#FF2D55" },
  { name: "Morado", hex: "#AF52DE" },
  { name: "Turquesa", hex: "#5AC8FA" },
] as const;

export const MASTERY_LEVELS = {
  RED_HARD: {
    key: "RED_HARD",
    label: "Me cuesta",
    shortLabel: "Cuesta",
    emoji: "🔴",
    bg: "bg-[#FF3B30]/10",
    text: "text-[#FF3B30]",
    border: "border-[#FF3B30]/20",
    dot: "bg-[#FF3B30]",
  },
  YELLOW_MEDIUM: {
    key: "YELLOW_MEDIUM",
    label: "Repasando",
    shortLabel: "Repasando",
    emoji: "🟡",
    bg: "bg-[#FF9500]/10",
    text: "text-[#FF9500]",
    border: "border-[#FF9500]/20",
    dot: "bg-[#FF9500]",
  },
  GREEN_READY: {
    key: "GREEN_READY",
    label: "Listo para el parcial",
    shortLabel: "Listo",
    emoji: "🟢",
    bg: "bg-[#34C759]/10",
    text: "text-[#34C759]",
    border: "border-[#34C759]/20",
    dot: "bg-[#34C759]",
  },
} as const;

export type MasteryLevelKey = keyof typeof MASTERY_LEVELS;

export const STUDY_METHODS = {
  FREE: {
    id: "FREE",
    name: "Modo Libre",
    shortName: "Libre",
    emoji: "📝",
    tagline: "Apunte clásico y flexible con listas, tareas y enlaces.",
  },
  CORNELL: {
    id: "CORNELL",
    name: "Método Cornell",
    shortName: "Cornell",
    emoji: "🗂️",
    tagline: "Divide tu estudio en Ideas Clave, Apuntes de clase y un Resumen final.",
  },
  FEYNMAN: {
    id: "FEYNMAN",
    name: "Método Feynman",
    shortName: "Feynman",
    emoji: "🧠",
    tagline: "La mejor forma de entender algo es explicarlo con tus palabras sin enredos.",
  },
  ACTIVE_RECALL: {
    id: "ACTIVE_RECALL",
    name: "Pregunta-Respuesta",
    shortName: "Flashcards",
    emoji: "⚡",
    tagline: "Pon a prueba tu memoria antes del parcial con respuestas ocultas.",
  },
} as const;

export type StudyMethodKey = keyof typeof STUDY_METHODS;

export const TASK_TYPES = {
  EXAM: { label: "Parcial / Examen", shortLabel: "Parcial", emoji: "🎯", color: "bg-red-50 text-red-700" },
  HOMEWORK: { label: "Taller / Entrega", shortLabel: "Taller", emoji: "💼", color: "bg-blue-50 text-blue-700" },
  QUIZ: { label: "Quiz", shortLabel: "Quiz", emoji: "⚡", color: "bg-amber-50 text-amber-700" },
  READING: { label: "Lectura", shortLabel: "Lectura", emoji: "📖", color: "bg-purple-50 text-purple-700" },
} as const;

export type TaskTypeKey = keyof typeof TASK_TYPES;

export const BLOCK_TYPES = {
  UNIVERSITY_CLASS: {
    id: "UNIVERSITY_CLASS",
    label: "Clase U",
    emoji: "🎓",
    description: "Materia de tu carrera universitaria",
  },
  HABIT: {
    id: "HABIT",
    label: "Hábito Diario",
    emoji: "🔥",
    description: "Rutina personal con racha de días",
  },
  EXTERNAL_STUDY: {
    id: "EXTERNAL_STUDY",
    label: "Estudio Externo",
    emoji: "🚀",
    description: "Cursos, proyectos y roadmaps autónomos",
  },
} as const;

export type BlockTypeKey = keyof typeof BLOCK_TYPES;

export const RESOURCE_TYPES = [
  { id: "VIDEO", label: "Video / Playlist", emoji: "📺" },
  { id: "COURSE", label: "Curso Online", emoji: "💻" },
  { id: "BOOK", label: "Libro / Documento", emoji: "📖" },
  { id: "PROJECT", label: "Proyecto / Práctica", emoji: "🛠️" },
  { id: "HABIT_ROUTINE", label: "Rutina de Hábito", emoji: "⚡" },
] as const;

export const DAYS_OF_WEEK = [
  { id: 1, name: "Lunes", short: "Lun" },
  { id: 2, name: "Martes", short: "Mar" },
  { id: 3, name: "Miércoles", short: "Mié" },
  { id: 4, name: "Jueves", short: "Jue" },
  { id: 5, name: "Viernes", short: "Vie" },
  { id: 6, name: "Sábado", short: "Sáb" },
  { id: 7, name: "Domingo", short: "Dom" },
] as const;

// ============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================================================

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la materia es obligatorio"),
  emoji: z.string().default("📚"),
  color: z.string().default("#007AFF"),
  teacherName: z.string().optional().nullable(),
  defaultRoom: z.string().optional().nullable(),
  passingGrade: z.coerce.number().min(0).max(10).default(3.0),
});

export const updateSubjectSchema = subjectSchema.partial();

export const scheduleBlockSchema = z.object({
  subjectId: z.string().optional().nullable(),
  blockType: z.enum(["UNIVERSITY_CLASS", "HABIT", "EXTERNAL_STUDY"]).default("UNIVERSITY_CLASS"),
  customTitle: z.string().optional().nullable(),
  emoji: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  resourceType: z.string().optional().nullable(),
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
  daysOfWeek: z.array(z.coerce.number().int().min(1).max(7)).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM inválido"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM inválido"),
  room: z.string().optional().nullable(),
});

export const notePageSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1, "El título del apunte es obligatorio"),
  studyMethod: z.enum(["FREE", "CORNELL", "FEYNMAN", "ACTIVE_RECALL"]).default("FREE"),
  masteryLevel: z.enum(["RED_HARD", "YELLOW_MEDIUM", "GREEN_READY"]).default("YELLOW_MEDIUM"),
  isFavorite: z.boolean().default(false),
  freeContent: z.string().default(""),
  cornellCues: z.string().default(""),
  cornellSummary: z.string().default(""),
  feynmanSimple: z.string().default(""),
  feynmanGaps: z.string().default(""),
  feynmanExample: z.string().default(""),
  flashcardsJson: z.string().default("[]"),
  attachmentsJson: z.string().default("[]"),
});

export const updateNotePageSchema = notePageSchema.partial();

export const taskAssignmentSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1, "El título de la entrega es obligatorio"),
  type: z.enum(["EXAM", "HOMEWORK", "QUIZ", "READING"]).default("HOMEWORK"),
  dueDate: z.coerce.date(),
  isCompleted: z.boolean().default(false),
});

export const updateTaskAssignmentSchema = taskAssignmentSchema.partial();

export const gradeItemSchema = z.object({
  subjectId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre del corte es obligatorio"),
  weightPercent: z.coerce.number().min(1).max(100),
  score: z.coerce.number().min(0).max(10).optional().nullable(),
  maxScore: z.coerce.number().default(5.0),
});

export const updateGradeItemSchema = gradeItemSchema.partial();

export const GEMINI_AVAILABLE_MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", tagline: "Recomendado: Ultrarrápido, inteligente y estable" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", tagline: "Última generación: Máxima capacidad de razonamiento" },
  { id: "gemini-flash-latest", name: "Gemini Flash (Latest)", tagline: "Siempre la versión Flash más reciente" },
] as const;

export const aiSettingsSchema = z.object({
  geminiApiKey: z.string().trim().optional(),
  modelName: z.string().default("gemini-3.5-flash"),
  enableBrowserNotifications: z.boolean().default(true),
  studentGoal: z.string().optional().nullable(),
});

// ============================================================================
// CONSTANTES Y ESQUEMAS: MIS CURSOS / BIBLIOTECA DE LIBROS (COURSEBOOKS)
// ============================================================================

export const BOOK_CATEGORIES = [
  "General",
  "Desarrollo de Software",
  "Redes e Infraestructura",
  "Diseño & UI/UX",
  "Negocios & Startups",
  "Ciencias & Matemáticas",
  "Universidad & Carrera",
  "Idiomas & Humanidades",
] as const;

export const BOOK_COVER_STYLES = [
  { id: "editorial", label: "Editorial", desc: "Elegante con banda de título tipográfico" },
  { id: "minimal", label: "Minimalista", desc: "Superficie limpia y tipografía elegante" },
  { id: "technical", label: "Técnico", desc: "Cuadrícula técnica y metadatos modernos" },
  { id: "leather", label: "Clásico", desc: "Textura con relieve y lomo tradicional" },
] as const;

export const BOOK_PAPER_TEXTURES = [
  { id: "blank", label: "Blanco Puro", desc: "Lienzo limpio moderno", bg: "bg-white text-[#1C1C1E]" },
  { id: "sepia", label: "Crema Editorial", desc: "Tono cálido descansador para la vista", bg: "bg-[#FBF0D9] text-[#2C2416]" },
  { id: "dotted", label: "Punteado (Bullet)", desc: "Guías sutiles para apuntes y diagramas", bg: "bg-white text-[#1C1C1E] bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px]" },
  { id: "grid", label: "Cuadriculado", desc: "Hoja técnica matemática", bg: "bg-white text-[#1C1C1E] bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] [background-size:20px_20px]" },
  { id: "lined", label: "Rayado Clásico", desc: "Líneas de cuaderno escolar", bg: "bg-white text-[#1C1C1E] bg-[linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] [background-size:100%_28px]" },
  { id: "dark", label: "Oscuro OLED", desc: "Modo nocturno de alta inmersión", bg: "bg-[#18181B] text-[#F4F4F5]" },
] as const;

export const BOOK_COVER_GRADIENTS = [
  { id: "from-blue-600 via-indigo-600 to-purple-700", name: "Azul Real", preview: "from-blue-600 via-indigo-600 to-purple-700" },
  { id: "from-emerald-600 via-teal-600 to-cyan-700", name: "Esmeralda", preview: "from-emerald-600 via-teal-600 to-cyan-700" },
  { id: "from-amber-500 via-orange-600 to-red-600", name: "Puesta de Sol", preview: "from-amber-500 via-orange-600 to-red-600" },
  { id: "from-pink-500 via-rose-600 to-purple-700", name: "Frambuesa", preview: "from-pink-500 via-rose-600 to-purple-700" },
  { id: "from-zinc-800 via-neutral-900 to-black", name: "Negro Obsidiana", preview: "from-zinc-800 via-neutral-900 to-black" },
  { id: "from-indigo-800 via-violet-900 to-slate-950", name: "Medianoche", preview: "from-indigo-800 via-violet-900 to-slate-950" },
] as const;

export const NOTION_BLOCK_TYPES = [
  { type: "paragraph", label: "Texto", icon: "Type", shortcut: "/p", desc: "Empieza a escribir texto enriquecido con formato" },
  { type: "h1", label: "Título Grande (H1)", icon: "Heading1", shortcut: "/h1", desc: "Encabezado principal de sección" },
  { type: "h2", label: "Título Mediano (H2)", icon: "Heading2", shortcut: "/h2", desc: "Subtítulo de sección" },
  { type: "h3", label: "Título Pequeño (H3)", icon: "Heading3", shortcut: "/h3", desc: "Apartado o punto específico" },
  { type: "todo", label: "Lista de Tareas", icon: "CheckSquare", shortcut: "/todo", desc: "Checklist interactivo con casillas animadas" },
  { type: "bullet", label: "Lista con Viñetas", icon: "List", shortcut: "/bullet", desc: "Lista simple de puntos clave" },
  { type: "numbered", label: "Lista Numerada", icon: "ListOrdered", shortcut: "/num", desc: "Paso a paso ordenado secuencial" },
  { type: "callout", label: "Destacado (Callout)", icon: "AlertCircle", shortcut: "/callout", desc: "Cuadro de énfasis con emoji y fondo suave" },
  { type: "quote", label: "Cita Editorial", icon: "Quote", shortcut: "/quote", desc: "Frase memorable o referencia teórica" },
  { type: "code", label: "Bloque de Código", icon: "Code", shortcut: "/code", desc: "Snippet técnico con selector de lenguaje" },
  { type: "divider", label: "Separador Divisor", icon: "Minus", shortcut: "/div", desc: "Línea visual para separar temas" },
] as const;

export const notionBlockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "h1",
    "h2",
    "h3",
    "paragraph",
    "todo",
    "bullet",
    "numbered",
    "callout",
    "quote",
    "code",
    "divider",
  ]),
  content: z.string().default(""),
  checked: z.boolean().optional(),
  language: z.string().optional(),
  calloutIcon: z.string().optional(),
  calloutColor: z.string().optional(),
  textColor: z.string().optional(),
  bgColor: z.string().optional(),
});

export type NotionBlock = z.infer<typeof notionBlockSchema>;

export const courseBookSchema = z.object({
  title: z.string().trim().min(1, "El título del libro/curso es obligatorio").max(140),
  subtitle: z.string().trim().max(180).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().default("General"),
  subjectId: z.string().optional().nullable(),
  coverColor: z.string().default("#007AFF"),
  coverGradient: z.string().default("from-blue-600 via-indigo-600 to-purple-700"),
  coverIcon: z.string().default("📖"),
  coverStyle: z.enum(["minimal", "editorial", "technical", "leather"]).default("editorial"),
  paperTexture: z.enum(["blank", "sepia", "dotted", "grid", "lined", "dark"]).default("blank"),
  fontFamily: z.enum(["sans", "serif", "mono"]).default("sans"),
  fontSize: z.enum(["sm", "base", "lg", "xl"]).default("base"),
  lineHeight: z.enum(["compact", "relaxed", "loose"]).default("relaxed"),
  pageLayout: z.enum(["single", "spread"]).default("spread"),
  pageMargins: z.enum(["narrow", "normal", "wide"]).default("normal"),
});

export const updateCourseBookCustomizationSchema = courseBookSchema.partial();

export const updateBookPageSchema = z.object({
  title: z.string().optional().nullable(),
  blocks: z.array(notionBlockSchema).optional(),
  blocksJson: z.string().optional(),
  isBookmarked: z.boolean().optional(),
});
