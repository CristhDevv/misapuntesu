import { test } from "node:test";
import assert from "node:assert/strict";
import { cn, formatDate, formatDateFull, getCountdownBadge, formatGrade } from "../../src/lib/utils";

test("Unit - Utils: cn (clsx + tailwind-merge)", () => {
  assert.equal(cn("bg-white", "text-black"), "bg-white text-black");
  assert.equal(cn("p-4", "p-2"), "p-2");
  assert.equal(cn("text-red-500", false && "hidden", "font-bold"), "text-red-500 font-bold");
});

test("Unit - Utils: formatDate y formatDateFull", () => {
  const d = new Date("2026-11-10T12:00:00Z");
  assert.ok(formatDate(d).length > 0);
  assert.ok(formatDateFull(d).length > 0);
  assert.equal(formatDate(null), "-");
});

test("Unit - Utils: getCountdownBadge", () => {
  const today = new Date();
  const bToday = getCountdownBadge(today);
  assert.equal(bToday.label, "¡Hoy!");
  assert.equal(bToday.isUrgent, true);

  const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const bFuture = getCountdownBadge(future);
  assert.equal(bFuture.label, "En 5 días");
  assert.equal(bFuture.isUrgent, false);
});

test("Unit - Utils: formatGrade", () => {
  assert.equal(formatGrade(3.8), "3.8");
  assert.equal(formatGrade(4), "4.0");
  assert.equal(formatGrade(null), "-");
});
