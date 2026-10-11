// Genera las hojas imprimibles (tamaño carta, tarjetas tamaño póker 3 × 3).
// Uso: node tarjetas/generar.mjs
// Escribe tarjetas/tarjetas.html y, si Playwright está disponible, tarjetas/tarjetas.pdf.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const datos = JSON.parse(readFileSync(join(dir, "preguntas.json"), "utf8"));
const categorias = Object.fromEntries(datos.categorias.map((c) => [c.id, c]));

const POR_HOJA = 9;
const COLUMNAS = 3;

// Iconos en SVG para no depender de fuentes con emoji.
const iconos = {
  anime: '<path d="M8 5.5v13l10-6.5z" fill="#fff"/>',
  geek: '<path d="M13.5 3 6 13.5h5L10 21l8-11h-5.2z" fill="#fff"/>',
  gaming:
    '<rect x="3" y="7.5" width="18" height="10" rx="5" fill="#fff"/>' +
    '<path d="M7 11h1.2V9.8h1.6V11H11v1.6H9.8v1.2H8.2v-1.2H7z" fill="currentColor"/>' +
    '<circle cx="15.2" cy="11.2" r="1.1" fill="currentColor"/><circle cx="17.4" cy="13.4" r="1.1" fill="currentColor"/>',
  infancia:
    '<rect x="3.5" y="8" width="17" height="11.5" rx="2" fill="#fff"/>' +
    '<path d="M8.5 3.5 12 7.5l3.5-4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<rect x="6" y="10.3" width="12" height="7" rx="1" fill="currentColor"/>',
  musica:
    '<path d="M10 4.5v10.2a3 3 0 1 0 2 2.8V8.5l6-1.7V4z" fill="#fff"/>',
};

const balon =
  '<svg class="balon" viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#111" stroke-width="1.5"/>' +
  '<path d="m12 7.6 4.2 3-1.6 4.9H9.4l-1.6-4.9z" fill="#111"/>' +
  '<path d="M12 7.6V2M16.2 10.6l5.2-1.8M14.6 15.5l3.3 4.5M9.4 15.5l-3.3 4.5M7.8 10.6 2.6 8.8" stroke="#111" stroke-width="1.3"/>' +
  "</svg>";

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const chip = (cat) =>
  `<span class="chip" style="background:${categorias[cat].color};color:${categorias[cat].color}">` +
  `<svg viewBox="0 0 24 24" aria-hidden="true">${iconos[cat]}</svg></span>`;

const numero = (n) => String(n).padStart(3, "0");

function frente(preguntas, n) {
  const filas = preguntas
    .map(
      (q) => `
      <li class="fila${q.deporte ? " deporte" : ""}">
        ${chip(q.cat)}
        <span class="texto">${esc(q.p)}</span>
        ${q.deporte ? balon : ""}
      </li>`
    )
    .join("");
  return `
    <div class="tarjeta">
      <header><span class="logo">MARATÓN <b>TILÍN</b></span><span class="num">#${numero(n)}</span></header>
      <ol>${filas}</ol>
    </div>`;
}

function reverso(preguntas, n) {
  const filas = preguntas
    .map(
      (q) => `
      <li class="fila${q.deporte ? " deporte" : ""}">
        ${chip(q.cat)}
        <span class="texto"><b>${esc(q.r)}</b></span>
        ${q.deporte ? balon : ""}
      </li>`
    )
    .join("");
  return `
    <div class="tarjeta atras">
      <header><span class="logo">RESPUESTAS</span><span class="num">#${numero(n)}</span></header>
      <ol>${filas}</ol>
    </div>`;
}

// Para impresión a doble cara volteando por el borde largo, cada fila del
// reverso va en espejo: la tarjeta de la columna 1 queda detrás en la columna 3.
function espejo(lista) {
  const salida = [];
  for (let i = 0; i < lista.length; i += COLUMNAS) {
    const fila = lista.slice(i, i + COLUMNAS);
    while (fila.length < COLUMNAS) fila.push('<div class="tarjeta vacia"></div>');
    salida.push(...fila.reverse());
  }
  return salida;
}

const hojas = [];
for (let i = 0; i < datos.tarjetas.length; i += POR_HOJA) {
  const grupo = datos.tarjetas.slice(i, i + POR_HOJA);
  const frentes = grupo.map((t, j) => frente(t, i + j + 1));
  const reversos = espejo(grupo.map((t, j) => reverso(t, i + j + 1)));
  hojas.push(`<section class="hoja">${frentes.join("")}</section>`);
  hojas.push(`<section class="hoja">${reversos.join("")}</section>`);
}

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Maratón Tilín: tarjetas</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Hoja carta: 215.9 × 279.4 mm. Rejilla de 3 × 3 tarjetas póker (63.5 × 88.9 mm). */
  .hoja {
    width: 215.9mm;
    height: 279.4mm;
    padding: 6.35mm 12.7mm;
    display: grid;
    grid-template-columns: repeat(3, 63.5mm);
    grid-template-rows: repeat(3, 88.9mm);
    page-break-after: always;
    break-after: page;
  }
  .tarjeta {
    border: 0.2mm dashed #b5b5b5;
    padding: 2.6mm 2.8mm 2.8mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .tarjeta.vacia { border-color: transparent; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #111;
    color: #fff;
    border-radius: 1.6mm;
    padding: 1.1mm 2.2mm;
    font-size: 7pt;
    letter-spacing: 0.06em;
  }
  header .logo { font-weight: 500; }
  header .logo b { font-weight: 800; color: #ffd43b; }
  header .num { font-variant-numeric: tabular-nums; opacity: 0.8; }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
  }
  .fila {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2mm;
    padding: 1mm 1.2mm;
    border-radius: 1.4mm;
    font-size: 7.6pt;
    line-height: 1.22;
  }
  .chip {
    flex: none;
    width: 5.2mm;
    height: 5.2mm;
    border-radius: 1.2mm;
    display: grid;
    place-items: center;
  }
  .chip svg { width: 3.8mm; height: 3.8mm; }
  /* Pregunta deportiva escondida en otra categoría: borde de cancha y balón. */
  .fila.deporte {
    background: repeating-linear-gradient(90deg, #eef7ee 0 3mm, #e2f0e2 3mm 6mm);
    border: 0.25mm solid #2f7d32;
    padding-right: 4.6mm;
  }
  .balon {
    position: absolute;
    right: -0.6mm;
    top: -1.4mm;
    width: 4.2mm;
    height: 4.2mm;
  }
  .atras .fila { font-size: 8.2pt; }
  .atras header { background: #444; }
</style>
</head>
<body>
${hojas.join("\n")}
</body>
</html>
`;

const salidaHtml = join(dir, "tarjetas.html");
writeFileSync(salidaHtml, html);
console.log(`HTML: ${salidaHtml}`);

let chromium;
try {
  const require = createRequire(import.meta.url);
  ({ chromium } = require(
    process.env.PLAYWRIGHT_MODULE || "playwright"
  ));
} catch {
  console.log("Playwright no está disponible; abre el HTML e imprímelo a PDF desde el navegador.");
  process.exit(0);
}
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.goto("file://" + salidaHtml);
await pagina.pdf({
  path: join(dir, "tarjetas.pdf"),
  format: "Letter",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await navegador.close();
console.log(`PDF: ${join(dir, "tarjetas.pdf")}`);
