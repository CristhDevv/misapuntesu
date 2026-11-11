import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🍏 Sembrando 'El Cuaderno Adaptativo' (Universidad Apple HIG)...");

  // 1. Limpieza total de tablas
  await prisma.gradeItem.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.notePage.deleteMany();
  await prisma.scheduleBlock.deleteMany();
  await prisma.subject.deleteMany();

  // Fecha base para entregas relativas
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // =========================================================================
  // MATERIA 1: Cálculo I (Azul iOS #007AFF)
  // =========================================================================
  const calculo = await prisma.subject.create({
    data: {
      name: "Cálculo I",
      emoji: "📐",
      color: "#007AFF",
      teacherName: "Dr. Carlos Restrepo",
      defaultRoom: "Bloque B - Salón 204",
      passingGrade: 3.0,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: "08:00", endTime: "10:00", room: "Bloque B - Salón 204" }, // Lunes
          { dayOfWeek: 3, startTime: "08:00", endTime: "10:00", room: "Bloque B - Salón 204" }, // Miércoles
        ],
      },
      grades: {
        create: [
          { name: "Primer Parcial (30%)", weightPercent: 30, score: 3.8, maxScore: 5.0 },
          { name: "Segundo Parcial (30%)", weightPercent: 30, score: 2.5, maxScore: 5.0 },
          { name: "Examen Final (40%)", weightPercent: 40, score: null, maxScore: 5.0 },
        ],
      },
      tasks: {
        create: [
          {
            title: "Taller de Integrales por Partes",
            type: "HOMEWORK",
            dueDate: inDays(2),
            isCompleted: false,
          },
          {
            title: "Examen Final de Cálculo",
            type: "EXAM",
            dueDate: inDays(6),
            isCompleted: false,
          },
        ],
      },
      notes: {
        create: [
          {
            title: "Clase 7: Derivadas y Regla de la Cadena",
            studyMethod: "CORNELL",
            masteryLevel: "RED_HARD",
            isFavorite: true,
            cornellCues: `¿Qué es la regla de la cadena?
¿Cómo se aplica a funciones compuestas f(g(x))?
¿Cuál es la derivada de sen(x²)?
Fórmula maestra:
(f ∘ g)'(x) = f'(g(x)) · g'(x)`,
            cornellSummary:
              "La regla de la cadena permite derivar funciones compuestas multiplicando la derivada exterior evaluada en la interior por la derivada de la interior. Es vital identificar primero cuál es la función 'de adentro'.",
            freeContent: `## Regla de la Cadena

Si $y = f(u)$ y $u = g(x)$, entonces la derivada de $y$ respecto a $x$ es:

$$\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$$

### Ejemplo paso a paso:
Sea $y = (3x^2 + 1)^4$:
1. Identificamos la función interior: $u = 3x^2 + 1$, por ende $y = u^4$.
2. Derivamos la función exterior: $\\frac{dy}{du} = 4u^3$.
3. Derivamos la función interior: $\\frac{du}{dx} = 6x$.
4. Multiplicamos ambas: $4(3x^2 + 1)^3 \\cdot (6x) = 24x(3x^2 + 1)^3$.

> 💡 **Tip para el parcial:** Nunca te olvides de multiplicar por la derivada interna antes de simplificar.`,
            flashcardsJson: JSON.stringify([
              { id: "c1", question: "¿Cuál es la derivada de sen(3x)?", answer: "3 · cos(3x)", learned: false },
              { id: "c2", question: "¿Qué dice la regla del producto?", answer: "(u·v)' = u'v + uv'", learned: true },
            ]),
            attachmentsJson: JSON.stringify([
              { id: "a1", title: "Diapositivas Profe Carlos - Semana 7.pdf", url: "https://drive.google.com", type: "PDF" },
              { id: "a2", title: "Video explicativo: Khan Academy Regla Cadena", url: "https://youtube.com", type: "VIDEO" },
            ]),
          },
        ],
      },
    },
  });

  // =========================================================================
  // MATERIA 2: Biología Celular (Naranja iOS #FF9500)
  // =========================================================================
  const biologia = await prisma.subject.create({
    data: {
      name: "Biología Celular",
      emoji: "🔬",
      color: "#FF9500",
      teacherName: "Dra. Marcela Mendoza",
      defaultRoom: "Laboratorio 3 - Ciencias",
      passingGrade: 3.0,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: "10:00", endTime: "12:00", room: "Laboratorio 3" }, // Martes
          { dayOfWeek: 4, startTime: "10:00", endTime: "12:00", room: "Laboratorio 3" }, // Jueves
        ],
      },
      grades: {
        create: [
          { name: "Primer Quiz Teórico (20%)", weightPercent: 20, score: 4.2, maxScore: 5.0 },
          { name: "Informes de Laboratorio (30%)", weightPercent: 30, score: 4.5, maxScore: 5.0 },
          { name: "Examen Acumulativo (50%)", weightPercent: 50, score: null, maxScore: 5.0 },
        ],
      },
      tasks: {
        create: [
          {
            title: "Informe de Microscopía y Mitosis",
            type: "HOMEWORK",
            dueDate: inDays(1),
            isCompleted: false,
          },
          {
            title: "Quiz de Respiración Celular",
            type: "QUIZ",
            dueDate: inDays(4),
            isCompleted: false,
          },
        ],
      },
      notes: {
        create: [
          {
            title: "Metabolismo: Glucólisis y Ciclo de Krebs",
            studyMethod: "FEYNMAN",
            masteryLevel: "YELLOW_MEDIUM",
            isFavorite: true,
            feynmanSimple:
              "Imagina que la célula es una fábrica que funciona con monedas de energía llamadas ATP. La glucosa es como un billete grande de 100 dólares que no cabe en las máquinas pequeñas. La glucólisis es el cajero que rompe ese billete en dos monedas medianas (piruvato) para luego meterlas al motor principal (la mitocondria) y sacar decenas de monedas listas para gastar.",
            feynmanGaps:
              "¿Por qué se producen exactamente 2 ATP netos en glucólisis si la reacción gasta 2 al inicio? Recordar la fase de inversión de energía vs la fase de ganancia.",
            feynmanExample:
              "Como cargar una batería recargable: gastas un poco de corriente eléctrica de la pared al inicio para conectarla, pero luego tienes energía para usar tu celular todo el día.",
            freeContent:
              "## Resumen de Fases\n\n1. **Glucólisis:** Ocurre en el citoplasma. No requiere oxígeno.\n2. **Ciclo de Krebs:** En la matriz mitocondrial. Genera NADH y FADH2.\n3. **Fosforilación Oxidativa:** En la cresta mitocondrial. La gran cosecha de ATP.",
            flashcardsJson: JSON.stringify([
              { id: "b1", question: "¿Dónde ocurre la glucólisis?", answer: "En el citoplasma celular", learned: true },
              { id: "b2", question: "¿Cuántos ATP netos genera la glucólisis?", answer: "2 ATP netos (se gastan 2 y se generan 4)", learned: true },
            ]),
          },
        ],
      },
    },
  });

  // =========================================================================
  // MATERIA 3: Inglés B2 (Verde Esmeralda #34C759)
  // =========================================================================
  const ingles = await prisma.subject.create({
    data: {
      name: "Inglés B2",
      emoji: "🗣️",
      color: "#34C759",
      teacherName: "Prof. David Miller",
      defaultRoom: "Lab de Idiomas 101",
      passingGrade: 3.0,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: "14:00", endTime: "16:00", room: "Lab de Idiomas 101" }, // Lunes
          { dayOfWeek: 3, startTime: "14:00", endTime: "16:00", room: "Lab de Idiomas 101" }, // Miércoles
        ],
      },
      grades: {
        create: [
          { name: "Speaking & Presentations (35%)", weightPercent: 35, score: 4.0, maxScore: 5.0 },
          { name: "Grammar & Listening (35%)", weightPercent: 35, score: 3.7, maxScore: 5.0 },
          { name: "Final Interview Project (30%)", weightPercent: 30, score: null, maxScore: 5.0 },
        ],
      },
      tasks: {
        create: [
          {
            title: "Presentación TED Talk (3 minutos)",
            type: "EXAM",
            dueDate: inDays(5),
            isCompleted: false,
          },
          {
            title: "Lectura Capítulo 4 de Short Stories",
            type: "READING",
            dueDate: inDays(3),
            isCompleted: true,
          },
        ],
      },
      notes: {
        create: [
          {
            title: "Phrasal Verbs y Conectores de Discurso",
            studyMethod: "ACTIVE_RECALL",
            masteryLevel: "GREEN_READY",
            isFavorite: false,
            freeContent:
              "## Active Recall de Phrasal Verbs Clave\n\nPractica con las tarjetas de autoevaluación antes del examen oral.",
            flashcardsJson: JSON.stringify([
              {
                id: "i1",
                question: "¿Qué significa 'Bring up' en una conversación formal?",
                answer: "Mencionar o introducir un tema nuevo (ej. 'He brought up a good point').",
                learned: true,
              },
              {
                id: "i2",
                question: "Diferencia entre 'Look into' y 'Run into'",
                answer: "'Look into' es investigar a fondo. 'Run into' es encontrarse con alguien por sorpresa.",
                learned: true,
              },
              {
                id: "i3",
                question: "¿Cuáles son 3 conectores formales para reemplazar 'Also'?",
                answer: "Furthermore, Moreover, y In addition.",
                learned: true,
              },
              {
                id: "i4",
                question: "¿Qué significa 'Figure out'?",
                answer: "Descubrir la solución o entender cómo resolver un problema.",
                learned: false,
              },
            ]),
          },
        ],
      },
    },
  });

  // =========================================================================
  // MATERIA 4: Fundamentos de Diseño (Morado Apple #AF52DE)
  // =========================================================================
  const diseno = await prisma.subject.create({
    data: {
      name: "Fundamentos de Diseño",
      emoji: "🎨",
      color: "#AF52DE",
      teacherName: "Arq. Valentina Suárez",
      defaultRoom: "Taller 402 - Artes",
      passingGrade: 3.0,
      schedules: {
        create: [
          { dayOfWeek: 5, startTime: "08:00", endTime: "12:00", room: "Taller 402" }, // Viernes
        ],
      },
      grades: {
        create: [
          { name: "Bitácora de Bocetos (30%)", weightPercent: 30, score: 4.8, maxScore: 5.0 },
          { name: "Composición Tipográfica (30%)", weightPercent: 30, score: 4.2, maxScore: 5.0 },
          { name: "Manual de Marca Final (40%)", weightPercent: 40, score: null, maxScore: 5.0 },
        ],
      },
      tasks: {
        create: [
          {
            title: "Entrega Final: Manual de Identidad Visual",
            type: "HOMEWORK",
            dueDate: inDays(9),
            isCompleted: false,
          },
        ],
      },
      notes: {
        create: [
          {
            title: "Psicología del Color y Retícula Suiza",
            studyMethod: "FREE",
            masteryLevel: "GREEN_READY",
            isFavorite: true,
            freeContent: `## Principios del Diseño Suizo (Estilo Tipográfico Internacional)

El diseño no se trata de decorar, sino de comunicar con la máxima claridad y orden visual.

### Reglas Clave:
1. **Uso de la Retícula (Grid):** Toda alineación debe tener una razón matemática. Si un elemento no se acopla a las columnas, genera fatiga visual.
2. **Tipografía Neutral Sans-Serif:** Priorizar legibilidad universal (Helvetica, SF Pro, Inter).
3. **Espacio Negativo (Espacio Blanco):** El vacío otorga jerarquía. Nunca sientas la necesidad de saturar la hoja.

### Semiótica del Color en Identidad:
- **Azul iOS:** Confianza, serenidad, tecnología sólida.
- **Verde:** Salud, finanzas, naturaleza y progreso.
- **Morado:** Creatividad, exclusividad y curiosidad.
- **Naranja:** Energía, accesibilidad y dinamismo.`,
          },
        ],
      },
    },
  });

  console.log("¡Semilla universitaria lista!");
  console.log({
    materias: 4,
    nombres: [calculo.name, biologia.name, ingles.name, diseno.name],
  });
}

main()
  .catch((e) => {
    console.error("Error en sembrado:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
