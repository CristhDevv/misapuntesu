import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clean() {
  console.log("Limpiando todas las tablas universitarias, hábitos/IA y libros/cursos...");
  await prisma.courseBookPage.deleteMany();
  await prisma.courseBook.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.aINotification.deleteMany();
  await prisma.aISettings.deleteMany();
  await prisma.gradeItem.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.notePage.deleteMany();
  await prisma.scheduleBlock.deleteMany();
  await prisma.subject.deleteMany();
  console.log("Base de datos limpia.");
}

clean()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
