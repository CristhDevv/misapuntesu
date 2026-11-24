import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import manifest from "../../src/app/manifest";

test("Unit - PWA: manifest.ts devuelve configuración válida de app instalable", () => {
  const data = manifest();
  assert.equal(data.short_name, "MisApuntesU");
  assert.equal(data.display, "standalone");
  assert.equal(data.start_url, "/");
  assert.ok(Array.isArray(data.icons) && data.icons.length >= 2);
  assert.ok(data.icons.some((i) => i.sizes === "192x192" && i.type === "image/png"));
  assert.ok(data.icons.some((i) => i.sizes === "512x512" && i.type === "image/png"));
});

test("Unit - PWA: existen los iconos PNG reales y el Service Worker public/sw.js", () => {
  const root = process.cwd();
  const requiredFiles = [
    "public/sw.js",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/apple-touch-icon.png",
  ];

  for (const rel of requiredFiles) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `Falta archivo requerido PWA: ${rel}`);
    const stat = fs.statSync(full);
    assert.ok(stat.size > 100, `El archivo ${rel} está vacío`);
  }

  const swContent = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
  assert.ok(swContent.includes("addEventListener(\"fetch\""));
});
