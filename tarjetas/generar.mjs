// Genera las hojas imprimibles (tamaño carta, tarjetas tamaño póker 3 × 3).
// Cada tarjeta tiene preguntas por los dos lados (cara A al frente, cara B atrás),
// una de cada categoría por cara, y todas del mismo nivel de dificultad.
// Uso: node tarjetas/generar.mjs
// Escribe dos versiones, a color y en blanco y negro (<nombre>-color.* y <nombre>-bn.*):
// el HTML siempre y el PDF si Playwright está disponible.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
// Por defecto usa preguntas.json; se puede pasar otro archivo (p. ej. muestra.json).
const entrada = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(dir, "preguntas.json");
const nombre = basename(entrada, ".json") === "preguntas" ? "tarjetas" : basename(entrada, ".json");
const datos = JSON.parse(readFileSync(entrada, "utf8"));
// Un archivo de muestra puede traer solo preguntas sin categorías; se usan las de preguntas.json.
if (!datos.categorias) datos.categorias = JSON.parse(readFileSync(join(dir, "preguntas.json"), "utf8")).categorias;
// «soloFrente»: una sola cara por tarjeta (1 pregunta por categoría en vez de 2).
const CARAS = datos.soloFrente ? 1 : 2;
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
  series:
    '<rect x="3.5" y="8" width="17" height="11.5" rx="2" fill="#fff"/>' +
    '<path d="M8.5 3.5 12 7.5l3.5-4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<rect x="6" y="10.3" width="12" height="7" rx="1" fill="currentColor"/>',
  musica:
    '<path d="M10 4.5v10.2a3 3 0 1 0 2 2.8V8.5l6-1.7V4z" fill="#fff"/>',
  grupal:
    '<path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9l-5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z" fill="#fff"/>' +
    '<circle cx="8" cy="11" r="1.3" fill="currentColor"/><circle cx="12" cy="11" r="1.3" fill="currentColor"/><circle cx="16" cy="11" r="1.3" fill="currentColor"/>',
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
const LETRAS = ["A", "B", "C"];

// Revuelve las opciones de forma fija (misma tarjeta, mismo orden en cada impresión).
function azar(semilla) {
  let t = semilla >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function revolver(opciones, rnd) {
  const orden = opciones.map((texto, i) => ({ texto, correcta: i === 0 }));
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden;
}

function cara(preguntas, n, lado, nivel) {
  const rnd = azar(n * 7919 + (lado === "A" ? 1 : 2));
  const filas = preguntas
    .map((q) => {
      const opciones = revolver(q.o, rnd);
      const ops = opciones
        .map((o, k) => `<span class="op${o.correcta ? " ok" : ""}"><i>${LETRAS[k]}</i>${esc(o.texto)}</span>`)
        .join("");
      return `
      <li class="fila${q.deporte ? " deporte" : ""}">
        ${chip(q.cat)}
        <div class="cuerpo">
          <span class="texto">${esc(q.p)}</span>
          <span class="ops">${ops}</span>
        </div>
        ${q.deporte ? balon : ""}
      </li>`;
    })
    .join("");
  return `
    <div class="tarjeta">
      <header><span class="logo">MARATÓN <b>TILÍN</b></span><span class="nivel" title="Dificultad">${"★".repeat(nivel)}<s>${"★".repeat(3 - nivel)}</s></span><span class="num">#${numero(n)} · ${lado}</span></header>
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

// Arma las tarjetas desde el banco: por cada nivel, cada tarjeta toma 2 preguntas de
// cada categoría (una por cara). Las preguntas de deporte se reparten entre las caras
// que llevan menos, para que no se junten.
function armarTarjetas() {
  const tarjetas = [];
  for (const nivel of [1, 2, 3]) {
    const porCat = datos.categorias.map((c) =>
      datos.preguntas.filter((q) => q.cat === c.id && q.nivel === nivel)
    );
    const total = Math.min(...porCat.map((qs) => Math.floor(qs.length / CARAS)));
    const caras = Array.from({ length: total * CARAS }, () => []);
    const deportes = caras.map(() => 0);
    porCat.forEach((qs, c) => {
      const usadas = qs.slice(0, total * CARAS);
      const conDeporte = usadas.filter((q) => q.deporte);
      const sinDeporte = usadas.filter((q) => !q.deporte);
      const orden = caras
        .map((_, i) => i)
        .sort((a, b) => deportes[a] - deportes[b] || a - b);
      orden.forEach((i, k) => {
        const q = k < conDeporte.length ? conDeporte[k] : sinDeporte[k - conDeporte.length];
        caras[i][c] = q;
        if (q.deporte) deportes[i]++;
      });
      const sobran = qs.length - usadas.length;
      if (sobran) console.log(`Aviso: ${sobran} pregunta(s) de ${datos.categorias[c].id} nivel ${nivel} no caben en una tarjeta completa.`);
    });
    for (let t = 0; t < total; t++) {
      tarjetas.push({ nivel, a: caras[t * CARAS], b: CARAS === 2 ? caras[t * 2 + 1] : null });
    }
  }
  return tarjetas;
}

const tarjetas = armarTarjetas();
const hojas = [];
for (let i = 0; i < tarjetas.length; i += POR_HOJA) {
  const grupo = tarjetas.slice(i, i + POR_HOJA);
  const frentes = grupo.map((t, j) => cara(t.a, i + j + 1, "A", t.nivel));
  const reversos = CARAS === 2 ? espejo(grupo.map((t, j) => cara(t.b, i + j + 1, "B", t.nivel))) : [];
  hojas.push(`<section class="hoja">${frentes.join("")}</section>`);
  if (CARAS === 2) hojas.push(`<section class="hoja">${reversos.join("")}</section>`);
}

const html = (version) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Maratón Tilín: tarjetas (${version})</title>
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
    padding: 2.2mm 2.4mm 2.2mm;
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
    padding: 0.7mm 2mm;
    margin-bottom: 0.6mm;
    font-size: 6.4pt;
    letter-spacing: 0.06em;
  }
  header .logo { font-weight: 500; }
  header .logo b { font-weight: 800; color: #ffd43b; }
  header .num { font-variant-numeric: tabular-nums; opacity: 0.8; }
  header .nivel { font-size: 7pt; letter-spacing: 0.08em; color: #ffd43b; }
  header .nivel s { text-decoration: none; opacity: 0.3; }
  .bn header .nivel { color: #111; }
  .bn header .nivel s { opacity: 0.25; }
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
    align-items: flex-start;
    gap: 1.4mm;
    padding: 0.6mm 0.8mm;
    border-radius: 1.4mm;
  }
  .chip {
    flex: none;
    width: 4.4mm;
    height: 4.4mm;
    margin-top: 0.3mm;
    border-radius: 1mm;
    display: grid;
    place-items: center;
  }
  .chip svg { width: 3.2mm; height: 3.2mm; }
  .cuerpo { display: flex; flex-direction: column; gap: 0.5mm; min-width: 0; }
  .texto { font-size: 6.8pt; line-height: 1.15; font-weight: 600; }
  .ops { display: flex; flex-wrap: wrap; column-gap: 1.6mm; row-gap: 0; font-size: 6.3pt; line-height: 1.2; color: #333; }
  .op i {
    display: inline-block;
    width: 2.5mm;
    height: 2.5mm;
    line-height: 2.5mm;
    text-align: center;
    font-style: normal;
    font-size: 5.4pt;
    font-weight: 800;
    margin-right: 0.5mm;
    color: #111;
    border-radius: 50%;
  }
  /* Marca de la respuesta correcta: la letra en círculo relleno. */
  .op.ok i { background: #111; color: #fff; }
  /* Pregunta deportiva escondida en otra categoría: borde de cancha y balón. */
  .fila.deporte {
    background: repeating-linear-gradient(90deg, #eef7ee 0 3mm, #e2f0e2 3mm 6mm);
    border: 0.25mm solid #2f7d32;
    padding-right: 3.6mm;
  }
  .balon {
    position: absolute;
    right: -0.6mm;
    top: -1.4mm;
    width: 3.8mm;
    height: 3.8mm;
  }

  /* Blanco y negro: sin colores ni fondos grandes para ahorrar tinta. */
  .bn .chip { background: #111 !important; color: #111 !important; }
  .bn header { background: #fff; color: #111; border: 0.3mm solid #111; }
  .bn header .logo b { color: #111; }
  .bn .fila.deporte {
    background: repeating-linear-gradient(90deg, #fff 0 3mm, #f2f2f2 3mm 6mm);
    border: 0.3mm dashed #111;
  }
</style>
</head>
<body class="${version}">
${hojas.join("\n")}
</body>
</html>
`;

const versiones = ["color", "bn"];
for (const v of versiones) {
  writeFileSync(join(dir, `${nombre}-${v}.html`), html(v));
  console.log(`HTML: ${join(dir, `${nombre}-${v}.html`)}`);
}

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
for (const v of versiones) {
  await pagina.goto("file://" + join(dir, `${nombre}-${v}.html`));
  await pagina.pdf({
    path: join(dir, `${nombre}-${v}.pdf`),
    format: "Letter",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log(`PDF: ${join(dir, `${nombre}-${v}.pdf`)}`);
}
await navegador.close();
