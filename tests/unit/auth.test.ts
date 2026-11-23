import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { loginSchema, registerSchema } from "../../src/lib/validations";
import { hashPassword, verifyPassword } from "../../src/lib/auth";
import { getSubjectsList, getCourseBooksList } from "../../src/server/queries";

test("Unit - Auth: hashPassword y verifyPassword (scrypt)", () => {
  const hash = hashPassword("MiClaveSegura123");
  assert.ok(hash.includes(":"));
  assert.equal(verifyPassword("MiClaveSegura123", hash), true);
  assert.equal(verifyPassword("ClaveIncorrecta", hash), false);
});

test("Unit - Auth: loginSchema & registerSchema", () => {
  const validLogin = loginSchema.safeParse({
    email: "  Estudiante@Uni.edu  ",
    password: "password123",
  });
  assert.equal(validLogin.success, true);
  if (validLogin.success) {
    assert.equal(validLogin.data.email, "estudiante@uni.edu");
  }

  const invalidReg = registerSchema.safeParse({
    name: "A",
    email: "no-es-email",
    password: "123",
  });
  assert.equal(invalidReg.success, false);
});

test("Integration/Unit - Auth: aislamiento de materias y libros por usuario", async () => {
  const suffix = Date.now().toString();
  const userA = await prisma.user.create({
    data: {
      name: "Estudiante A",
      email: `test_a_${suffix}@misapuntesu.test`,
      passwordHash: hashPassword("claveSeguraA1"),
    },
  });
  const userB = await prisma.user.create({
    data: {
      name: "Estudiante B",
      email: `test_b_${suffix}@misapuntesu.test`,
      passwordHash: hashPassword("claveSeguraB1"),
    },
  });

  try {
    const subA = await prisma.subject.create({
      data: { userId: userA.id, name: `Materia A ${suffix}` },
    });
    const bookB = await prisma.courseBook.create({
      data: { userId: userB.id, title: `Libro B ${suffix}` },
    });

    const subjectsOfA = await getSubjectsList(userA.id);
    const subjectsOfB = await getSubjectsList(userB.id);
    const booksOfA = await getCourseBooksList(userA.id);
    const booksOfB = await getCourseBooksList(userB.id);

    assert.ok(subjectsOfA.some((s) => s.id === subA.id));
    assert.equal(subjectsOfB.some((s) => s.id === subA.id), false);

    assert.equal(booksOfA.some((b) => b.id === bookB.id), false);
    assert.ok(booksOfB.some((b) => b.id === bookB.id));
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  }
});
