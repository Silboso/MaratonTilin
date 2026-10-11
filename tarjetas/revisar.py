"""Revisa el banco de preguntas antes de generar las hojas.

Uso: python3 tarjetas/revisar.py [hojas]

Cuenta preguntas y de deportes por categoría y nivel contra lo que piden las hojas,
y avisa de preguntas repetidas, opciones repetidas o textos demasiado largos.
"""
import collections
import json
import pathlib
import re
import sys
import unicodedata

HOJAS = int(sys.argv[1]) if len(sys.argv) > 1 else 20
POR_NIVEL = HOJAS * 3 * 2  # 3 tarjetas por nivel en cada hoja, 2 caras por tarjeta
DEPORTES = HOJAS * 3 * 2 // 6  # una de deportes por cara, repartidas entre 6 categorías
MAX_PREGUNTA = 110
MAX_OPCION = 42

banco = pathlib.Path(__file__).parent / "banco"
categorias = ["anime", "geek", "gaming", "series", "musica", "grupal"]


def normal(texto):
    texto = unicodedata.normalize("NFD", texto.lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", texto).strip()


preguntas = []
for archivo in sorted(banco.glob("*.json")):
    cat, nivel = archivo.stem.split("-")[:2]
    for q in json.loads(archivo.read_text()):
        preguntas.append((archivo.name, cat, int(nivel), q))

problemas = 0
vistas = {}
respuestas = collections.defaultdict(list)
for archivo, cat, nivel, q in preguntas:
    p, o = q["p"], q["o"]
    donde = f"{archivo}: {p[:60]}"
    if len(o) != 3 or len({normal(x) for x in o}) != 3:
        print(f"OPCIONES  {donde}")
        problemas += 1
    if len(p) > MAX_PREGUNTA:
        print(f"LARGA     ({len(p)}) {donde}")
        problemas += 1
    for x in o:
        if len(x) > MAX_OPCION:
            print(f"OPC LARGA ({len(x)}) {donde} -> {x}")
            problemas += 1
    clave = normal(p)
    if clave in vistas:
        print(f"REPETIDA  {donde}  (también en {vistas[clave]})")
        problemas += 1
    vistas[clave] = archivo
    respuestas[(cat, normal(o[0]))].append(donde)

for (cat, resp), lugares in respuestas.items():
    if len(lugares) > 1 and not resp.isdigit():
        print(f"MISMA RESPUESTA en {cat} «{resp}»:")
        for lugar in lugares:
            print(f"    {lugar}")

conteo = collections.Counter((c, n) for _, c, n, _ in preguntas)
deporte = collections.Counter((c, n) for _, c, n, q in preguntas if q.get("deporte"))
print(f"\nMeta para {HOJAS} hojas: {POR_NIVEL} por categoría y nivel, {DEPORTES} de deportes")
print(f"{'categoría':10} {'★':>9} {'★★':>9} {'★★★':>9}")
for cat in categorias:
    celdas = [f"{conteo[(cat, n)]:>4}/{deporte[(cat, n)]:<3}" for n in (1, 2, 3)]
    print(f"{cat:10} " + " ".join(f"{c:>9}" for c in celdas))
print(f"Total: {len(preguntas)} preguntas, {sum(deporte.values())} de deportes. Problemas: {problemas}")
