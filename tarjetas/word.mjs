// Genera las versiones en Word (.docx) de las hojas: tarjetas-bn.docx y tarjetas-color.docx.
// Uso: node tarjetas/generar.mjs   (primero, para crear tarjetas-datos.json y los HTML)
//      node tarjetas/word.mjs
// Cada página es una tabla de 3 × 3 tarjetas tamaño póker en hoja carta, con el reverso
// en espejo igual que el PDF. Los íconos se toman del HTML para que se vean idénticos.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, HeightRule, BorderStyle, ShadingType, TabStopType, PageBreak, AlignmentType,
  VerticalAlign, TableLayoutType,
} = require("docx");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const dir = dirname(fileURLToPath(import.meta.url));
const { categorias, paginas } = JSON.parse(readFileSync(join(dir, "tarjetas-datos.json"), "utf8"));
const LETRAS = ["A", "B", "C"];
const numero = (n) => String(n).padStart(3, "0");

// Medidas en DXA (1440 = 1 pulgada). Tarjeta póker: 2.5 × 3.5 pulgadas.
const ANCHO = 3600;
const ALTO = 5040;
const FUENTE = "Arial";

async function iconos(version) {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ deviceScaleFactor: 8 });
  await pagina.goto("file://" + join(dir, `tarjetas-${version}.html`));
  await pagina.emulateMedia({ media: "print" });
  const salida = {};
  for (const c of categorias) {
    const chip = await pagina.$(`.chip[style*="${c.color}"]`);
    salida[c.id] = await chip.screenshot({ omitBackground: true });
  }
  salida.balon = await (await pagina.$(".balon")).screenshot({ omitBackground: true });
  await navegador.close();
  return salida;
}

function documento(version, img) {
  const bn = version === "bn";
  const borde = (color, estilo = BorderStyle.DASHED, size = 4) => ({ style: estilo, size, color });
  const sinBorde = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

  const encabezado = (d) =>
    new Paragraph({
      spacing: { after: 50 },
      shading: bn ? undefined : { type: ShadingType.CLEAR, fill: "111111", color: "auto" },
      border: bn
        ? { top: borde("111111", BorderStyle.SINGLE, 6), bottom: borde("111111", BorderStyle.SINGLE, 6), left: borde("111111", BorderStyle.SINGLE, 6), right: borde("111111", BorderStyle.SINGLE, 6) }
        : undefined,
      tabStops: [
        { type: TabStopType.CENTER, position: 1660 },
        { type: TabStopType.RIGHT, position: 3300 },
      ],
      children: [
        new TextRun({ text: " MARATÓN ", font: FUENTE, size: 13, color: bn ? "111111" : "FFFFFF" }),
        new TextRun({ text: "TILÍN", font: FUENTE, size: 13, bold: true, color: bn ? "111111" : "FFD43B" }),
        new TextRun({ text: "\t" + "★".repeat(d.nivel), font: FUENTE, size: 13, color: bn ? "111111" : "FFD43B" }),
        new TextRun({ text: "★".repeat(3 - d.nivel), font: FUENTE, size: 13, color: bn ? "BBBBBB" : "666666" }),
        new TextRun({ text: `\t#${numero(d.n)} · ${d.lado} `, font: FUENTE, size: 13, color: bn ? "111111" : "DDDDDD" }),
      ],
    });

  const pregunta = (q) => {
    const caja = q.deporte
      ? {
          shading: { type: ShadingType.CLEAR, fill: bn ? "F2F2F2" : "EAF5EA", color: "auto" },
          border: {
            top: borde(bn ? "111111" : "2F7D32"), bottom: borde(bn ? "111111" : "2F7D32"),
            left: borde(bn ? "111111" : "2F7D32"), right: borde(bn ? "111111" : "2F7D32"),
          },
        }
      : {};
    const texto = new Paragraph({
      ...caja,
      indent: { left: 330, hanging: 330 },
      spacing: { before: q.deporte ? 20 : 65, after: 0, line: 200, lineRule: "exact" },
      keepNext: true,
      children: [
        new ImageRun({ type: "png", data: img[q.cat], transformation: { width: 14, height: 14 } }),
        new TextRun({ text: "\t" + q.p, font: FUENTE, size: 14, bold: true, color: "111111" }),
        ...(q.deporte ? [new TextRun({ text: " ", size: 15 }), new ImageRun({ type: "png", data: img.balon, transformation: { width: 12, height: 12 } })] : []),
      ],
      tabStops: [{ type: TabStopType.LEFT, position: 330 }],
    });
    const opciones = new Paragraph({
      ...caja,
      indent: { left: 330 },
      spacing: { before: 10, after: q.deporte ? 25 : 0, line: 180, lineRule: "exact" },
      children: q.opciones.flatMap((o, k) => [
        new TextRun({
          text: `\u00A0${LETRAS[k]}\u00A0`,
          font: FUENTE, size: 12, bold: true,
          color: o.correcta ? "FFFFFF" : "111111",
          shading: o.correcta ? { type: ShadingType.CLEAR, fill: "111111", color: "auto" } : undefined,
        }),
        new TextRun({ text: "\u00A0" + o.texto + (k < 2 ? "   " : ""), font: FUENTE, size: 12, color: "333333" }),
      ]),
    });
    return [texto, opciones];
  };

  const celda = (d) =>
    new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      margins: { top: 110, bottom: 60, left: 130, right: 130 },
      verticalAlign: VerticalAlign.TOP,
      borders: d
        ? { top: borde("B5B5B5"), bottom: borde("B5B5B5"), left: borde("B5B5B5"), right: borde("B5B5B5") }
        : { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
      children: d ? [encabezado(d), ...d.preguntas.flatMap(pregunta)] : [new Paragraph({})],
    });

  const hojas = paginas.flatMap((tarjetas, i) => {
    const filas = [0, 1, 2].map(
      (f) =>
        new TableRow({
          height: { value: ALTO, rule: HeightRule.EXACT },
          cantSplit: true,
          children: tarjetas.slice(f * 3, f * 3 + 3).map(celda),
        })
    );
    const tabla = new Table({
      width: { size: ANCHO * 3, type: WidthType.DXA },
      columnWidths: [ANCHO, ANCHO, ANCHO],
      layout: TableLayoutType.FIXED,
      alignment: AlignmentType.CENTER,
      rows: filas,
    });
    // Párrafo mínimo después de cada tabla: Word lo exige y así no se crean páginas en blanco.
    const cierre = new Paragraph({
      spacing: { before: 0, after: 0, line: 20, lineRule: "exact" },
      children: i < paginas.length - 1 ? [new TextRun({ text: "", size: 2 }), new PageBreak()] : [new TextRun({ text: "", size: 2 })],
    });
    return [tabla, cierre];
  });

  return new Document({
    creator: "Maratón Tilín",
    title: `Maratón Tilín: tarjetas (${bn ? "blanco y negro" : "color"})`,
    styles: { default: { document: { run: { font: FUENTE, size: 13 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 288, bottom: 288, left: 720, right: 720, header: 0, footer: 0 },
          },
        },
        children: hojas,
      },
    ],
  });
}

for (const version of ["bn", "color"]) {
  const img = await iconos(version);
  const buffer = await Packer.toBuffer(documento(version, img));
  writeFileSync(join(dir, `tarjetas-${version}.docx`), buffer);
  console.log(`Word: ${join(dir, `tarjetas-${version}.docx`)}`);
}
