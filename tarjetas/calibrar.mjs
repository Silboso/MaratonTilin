// Hoja de prueba para alinear la impresión a doble cara.
// Uso: node tarjetas/calibrar.mjs  →  tarjetas/calibrar.pdf (2 páginas: frente y vuelta)
// El frente trae dos líneas que cruzan la hoja por el centro; la vuelta trae dos reglas
// en milímetros. Contra la luz, el número donde cae cada línea del frente es lo que hay
// que recorrer el reverso: se anota en tarjetas/impresion.json como {"reverso_mm": [x, y]}.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
// Si ya hay ajuste en impresion.json, la vuelta de prueba sale recorrida igual que la de
// las tarjetas: con el ajuste bien puesto, las líneas del frente caen en 0.
let [REV_X, REV_Y] = [0, 0];
try {
  [REV_X, REV_Y] = JSON.parse(readFileSync(join(dir, "impresion.json"), "utf8")).reverso_mm.map(Number);
} catch {}
const ANCHO = 215.9;
const ALTO = 279.4;
const cx = ANCHO / 2;
const cy = ALTO / 2;
const RANGO = 12; // mm hacia cada lado

// Rejilla de tarjetas (igual que generar.mjs) para ver de paso cómo caen los cortes.
const rejilla = [];
for (let f = 0; f < 3; f++)
  for (let c = 0; c < 3; c++)
    rejilla.push(`<rect x="${12.7 + c * 63.5}" y="${6.35 + f * 88.9}" width="63.5" height="88.9" fill="none" stroke="#bbb" stroke-width="0.2" stroke-dasharray="1 1"/>`);

const frente = `
  ${rejilla.join("")}
  <line x1="${cx}" y1="0" x2="${cx}" y2="${ALTO}" stroke="#000" stroke-width="0.35"/>
  <line x1="0" y1="${cy}" x2="${ANCHO}" y2="${cy}" stroke="#000" stroke-width="0.35"/>
  <text x="${cx}" y="24" font-size="5" text-anchor="middle" font-weight="700">FRENTE</text>
  <text x="${cx}" y="32" font-size="3.4" text-anchor="middle">Imprime las 2 páginas a doble cara, volteando por el borde largo,</text>
  <text x="${cx}" y="37" font-size="3.4" text-anchor="middle">con la escala en «Tamaño real» o 100 % (sin «Ajustar a la página»).</text>
  <text x="${cx}" y="42" font-size="3.4" text-anchor="middle">Usa la misma impresora, bandeja y papel que para las tarjetas.</text>`;

// Las reglas van separadas para que no se encimen: la acostada (lee la línea vertical
// del frente, que cruza toda la hoja) va más abajo del centro, y la parada (lee la
// línea horizontal) más a la derecha.
const RY = cy + 45; // altura de la regla acostada
const RX = cx + 50; // posición de la regla parada
const marcas = [];
for (let mm = -RANGO; mm <= RANGO; mm++) {
  const largo = mm % 5 === 0 ? 4 : mm % 2 === 0 ? 3 : 2;
  const etiqueta = `${mm > 0 ? "+" : ""}${mm}`;
  // Regla acostada: positivo a la derecha.
  marcas.push(`<line x1="${cx + mm}" y1="${RY - largo}" x2="${cx + mm}" y2="${RY}" stroke="#000" stroke-width="0.15"/>`);
  // Números cada 2 mm, alternando abajo y arriba de la regla para que quepan.
  if (mm % 4 === 0) marcas.push(`<text x="${cx + mm}" y="${RY - 5}" font-size="2.2" text-anchor="middle">${etiqueta}</text>`);
  else if (mm % 2 === 0) marcas.push(`<text x="${cx + mm}" y="${RY + 3}" font-size="2.2" text-anchor="middle">${etiqueta}</text>`);
  // Regla parada: positivo hacia abajo.
  marcas.push(`<line x1="${RX}" y1="${cy + mm}" x2="${RX + largo}" y2="${cy + mm}" stroke="#000" stroke-width="0.15"/>`);
  if (mm % 2 === 0) marcas.push(`<text x="${RX - 1}" y="${cy + mm + 0.75}" font-size="2.2" text-anchor="end">${etiqueta}</text>`);
}
const vuelta = `
  ${rejilla.join("")}
  <line x1="${cx - RANGO}" y1="${RY}" x2="${cx + RANGO}" y2="${RY}" stroke="#000" stroke-width="0.15"/>
  <line x1="${RX}" y1="${cy - RANGO}" x2="${RX}" y2="${cy + RANGO}" stroke="#000" stroke-width="0.15"/>
  <text x="${cx}" y="${RY + 8}" font-size="3" text-anchor="middle" font-weight="700">X</text>
  <text x="${RX + 7}" y="${cy + 1}" font-size="3" font-weight="700">Y</text>
  ${marcas.join("")}
  <text x="${cx}" y="24" font-size="5" text-anchor="middle" font-weight="700">VUELTA</text>
  <text x="${cx}" y="32" font-size="3.4" text-anchor="middle">Pon la hoja contra la luz, viendo este lado.</text>
  <text x="${cx}" y="37" font-size="3.4" text-anchor="middle">X: número de la regla acostada donde cae la línea vertical del frente.</text>
  <text x="${cx}" y="42" font-size="3.4" text-anchor="middle">Y: número de la regla parada donde cae la línea horizontal del frente.</text>
  <text x="${cx}" y="49" font-size="2.8" text-anchor="middle" fill="#555">Ajuste ya aplicado a esta vuelta: X ${REV_X >= 0 ? "+" : ""}${REV_X} mm, Y ${REV_Y >= 0 ? "+" : ""}${REV_Y} mm (si quedó bien, las líneas caen en 0).</text>`;

const pagina = (svg, mover = "") =>
  `<section${mover}><svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}mm" height="${ALTO}mm" viewBox="0 0 ${ANCHO} ${ALTO}" font-family="Arial, sans-serif">${svg}</svg></section>`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Calibrar doble cara</title>
<style>@page { size: letter; margin: 0; } html, body { margin: 0; } section { width: ${ANCHO}mm; height: ${ALTO}mm; break-after: page; } svg { display: block; }</style>
</head><body>${pagina(frente)}${pagina(vuelta, ` style="transform: translate(${REV_X}mm, ${REV_Y}mm)"`)}</body></html>`;
writeFileSync(join(dir, "calibrar.html"), html);

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const navegador = await chromium.launch();
const p = await navegador.newPage();
await p.goto("file://" + join(dir, "calibrar.html"));
await p.pdf({ path: join(dir, "calibrar.pdf"), format: "Letter", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await navegador.close();
console.log(`PDF: ${join(dir, "calibrar.pdf")}`);
