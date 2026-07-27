#!/usr/bin/env python3
"""
Mide la tasa de acierto de la pre-extraccion por regex sobre facturas electricas
espanolas reales, CAMPO A CAMPO y EXTRACTOR A EXTRACTOR.

Responde a tres preguntas que el plan de refactorizacion asume sin datos:

  1. Que porcentaje de facturas resuelve regex sin llamar al LLM?
     (condicion actual del plan: los TRES campos)
  2. Cambia esa cifra si se extrae el texto con pdfplumber en vez de pypdf?
     (produccion usa pypdf; pdfplumber preserva layout tabular)
  3. Cuantos tokens se enviarian a DeepSeek en el caso de fallback?

NO hace ninguna llamada a red ni a ningun LLM. Todo es local.

PRIVACIDAD: el CUPS nunca se escribe completo en la salida ni en los ficheros
de resultados. Solo se guarda una version enmascarada.

Uso:
    python medir_extraccion.py ./facturas
    python medir_extraccion.py ./facturas --json informe.json --csv detalle.csv
    python medir_extraccion.py ./facturas --paginas 6 --verbose

Requisitos:
    pip install pypdf pdfplumber
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import statistics
import sys
import logging
import unicodedata
from dataclasses import dataclass, asdict, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

MAX_PAGINAS_DEFECTO = 6  # mismo limite que se aplicara en produccion
CHARS_POR_TOKEN = 4      # estimacion grosera para el coste de DeepSeek

logging.getLogger("pypdf").setLevel(logging.CRITICAL)
logging.getLogger("pdfminer").setLevel(logging.CRITICAL)

COMERCIALIZADORAS = {
    "Iberdrola": ["iberdrola", "curenergia"],
    "Endesa": ["endesa", "energia xxi"],
    "Naturgy": ["naturgy", "gas natural fenosa"],
    "EDP": ["edp "],
    "Repsol": ["repsol"],
    "TotalEnergies": ["totalenergies", "total energies"],
    "Holaluz": ["holaluz"],
    "Octopus": ["octopus energy"],
    "Somenergia": ["som energia", "somenergia"],
}

# ---------------------------------------------------------------------------
# Utilidades de texto
# ---------------------------------------------------------------------------


def normalizar(texto: str) -> str:
    """Minusculas y sin acentos, para buscar etiquetas de forma robusta."""
    sin_acentos = unicodedata.normalize("NFKD", texto)
    sin_acentos = "".join(c for c in sin_acentos if not unicodedata.combining(c))
    return sin_acentos.lower()


def compactar(texto: str) -> str:
    """Elimina espacios y guiones. Las facturas imprimen el CUPS agrupado:
    'ES 0031 4000 1234 5678 AB' -> 'ES0031400012345678AB'."""
    return re.sub(r"[\s\-\u00a0]", "", texto)


def parsear_numero_es(bruto: str) -> float | None:
    """Convierte '1.234,56' / '4,6' / '1234.56' a float."""
    s = bruto.strip().replace("\u00a0", "")
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif s.count(".") == 1:
        entero, resto = s.split(".")
        if len(resto) == 3 and len(entero) <= 3:
            s = entero + resto  # 1.234 -> 1234
    elif s.count(".") > 1:
        s = s.replace(".", "")
    try:
        return float(s)
    except ValueError:
        return None


def enmascarar_cups(cups: str) -> str:
    """ES0031...78AB — suficiente para depurar, insuficiente para identificar."""
    if len(cups) < 10:
        return "***"
    return f"{cups[:6]}...{cups[-4:]}"


# ---------------------------------------------------------------------------
# Extractores por campo
# ---------------------------------------------------------------------------

RE_CUPS = re.compile(r"ES\d{16}[A-Za-z]{2}(?:\d[A-Za-z])?", re.IGNORECASE)

RE_POTENCIA = [
    re.compile(
        r"potencia\s*(?:contratada|a\s*facturar)?[^\n\d]{0,40}?"
        r"(\d{1,3}(?:[.,]\d{1,3})?)\s*k\s*w",
        re.IGNORECASE,
    ),
    re.compile(
        r"potencia[^\n]{0,30}p\s*[12][^\n\d]{0,20}(\d{1,3}(?:[.,]\d{1,3})?)",
        re.IGNORECASE,
    ),
    re.compile(
        r"potencia[^\n\d]{0,30}k\s*w[^\n\d]{0,15}(\d{1,3}(?:[.,]\d{1,3})?)",
        re.IGNORECASE,
    ),
]

RE_CONSUMO_ANUAL = [
    re.compile(
        r"consumo[^\n]{0,40}(?:anual|ultimos?\s*12\s*meses|ultimo\s*ano)"
        r"[^\n\d]{0,30}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*k\s*w\s*h",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:ultimos?\s*12\s*meses|consumo\s*anual)[^\n\d]{0,40}"
        r"(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*k\s*w\s*h",
        re.IGNORECASE,
    ),
]

RE_CONSUMO_PERIODO = [
    re.compile(
        r"consumo[^\n]{0,40}(?:periodo|facturado|total)[^\n\d]{0,30}"
        r"(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*k\s*w\s*h",
        re.IGNORECASE,
    ),
    re.compile(
        r"(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*k\s*w\s*h\s*(?:consumidos|facturados)",
        re.IGNORECASE,
    ),
]

RE_PERIODO_FECHAS = re.compile(
    r"(?:de[sl]?|periodo)[^\n\d]{0,20}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"
    r"[^\n\d]{0,20}(?:a[l]?|hasta)[^\n\d]{0,10}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
    re.IGNORECASE,
)


def buscar_cups(texto: str) -> str | None:
    for candidato in (texto, compactar(texto)):
        m = RE_CUPS.search(candidato)
        if m:
            return m.group(0).upper()
    return None


def buscar_potencia(texto: str) -> float | None:
    valores: list[float] = []
    for patron in RE_POTENCIA:
        for m in patron.finditer(texto):
            v = parsear_numero_es(m.group(1))
            if v is not None and 0.5 <= v <= 100:
                valores.append(v)
    return max(valores) if valores else None


def _buscar_kwh(texto: str, patrones: list[re.Pattern]) -> float | None:
    for patron in patrones:
        for m in patron.finditer(texto):
            v = parsear_numero_es(m.group(1))
            if v is not None and 10 <= v <= 200_000:
                return v
    return None


def buscar_consumo_anual(texto: str) -> float | None:
    return _buscar_kwh(texto, RE_CONSUMO_ANUAL)


def buscar_consumo_periodo(texto: str) -> float | None:
    return _buscar_kwh(texto, RE_CONSUMO_PERIODO)


def buscar_dias_periodo(texto: str) -> int | None:
    from datetime import datetime

    m = RE_PERIODO_FECHAS.search(texto)
    if not m:
        return None
    fechas = []
    for bruto in m.groups():
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
            try:
                fechas.append(datetime.strptime(bruto, fmt))
                break
            except ValueError:
                continue
    if len(fechas) != 2:
        return None
    dias = (fechas[1] - fechas[0]).days
    return dias if 15 <= dias <= 400 else None


def detectar_comercializadora(texto: str) -> str:
    plano = normalizar(texto)
    for nombre, claves in COMERCIALIZADORAS.items():
        if any(clave in plano for clave in claves):
            return nombre
    return "desconocida"


# ---------------------------------------------------------------------------
# Extraccion de texto (dos motores)
# ---------------------------------------------------------------------------


def texto_pypdf(datos: bytes, max_paginas: int) -> str:
    import pypdf

    lector = pypdf.PdfReader(io.BytesIO(datos))
    partes = []
    for pagina in lector.pages[:max_paginas]:
        try:
            t = pagina.extract_text()
        except Exception:
            t = None
        if t:
            partes.append(t)
    return "\n".join(partes)


def texto_pdfplumber(datos: bytes, max_paginas: int) -> str:
    import pdfplumber

    partes = []
    with pdfplumber.open(io.BytesIO(datos)) as pdf:
        for pagina in pdf.pages[:max_paginas]:
            try:
                t = pagina.extract_text(layout=True)
            except Exception:
                t = None
            if t:
                partes.append(t)
    return "\n".join(partes)


def contar_paginas(datos: bytes) -> int | None:
    import pypdf

    try:
        return len(pypdf.PdfReader(io.BytesIO(datos)).pages)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Analisis de un fichero
# ---------------------------------------------------------------------------


@dataclass
class ResultadoMotor:
    motor: str
    caracteres: int = 0
    tokens_estimados: int = 0
    cups: bool = False
    cups_masked: str | None = None
    potencia: bool = False
    potencia_valor: float | None = None
    consumo_anual_explicito: bool = False
    consumo_anual_valor: float | None = None
    consumo_periodo: bool = False
    consumo_periodo_valor: float | None = None
    dias_periodo: int | None = None
    consumo_anual_extrapolable: bool = False
    consumo_anual_extrapolado: float | None = None
    error: str | None = None

    @property
    def los_tres_estrictos(self) -> bool:
        return self.cups and self.potencia and self.consumo_anual_explicito

    @property
    def los_tres_con_extrapolacion(self) -> bool:
        return (
            self.cups
            and self.potencia
            and (self.consumo_anual_explicito or self.consumo_anual_extrapolable)
        )

    @property
    def campos_ok(self) -> int:
        return sum(
            [
                self.cups,
                self.potencia,
                self.consumo_anual_explicito or self.consumo_anual_extrapolable,
            ]
        )


@dataclass
class ResultadoFichero:
    fichero: str
    tamano_kb: float
    paginas: int | None
    comercializadora: str = "desconocida"
    sin_capa_texto: bool = False
    motores: dict = field(default_factory=dict)


def analizar(ruta: Path, max_paginas: int) -> ResultadoFichero:
    datos = ruta.read_bytes()
    res = ResultadoFichero(
        fichero=ruta.name,
        tamano_kb=round(len(datos) / 1024, 1),
        paginas=contar_paginas(datos),
    )

    if datos[:5] != b"%PDF-":
        res.motores["_error"] = "no es un PDF (magic bytes)"
        return res

    for nombre, fn in (("pypdf", texto_pypdf), ("pdfplumber", texto_pdfplumber)):
        r = ResultadoMotor(motor=nombre)
        try:
            texto = fn(datos, max_paginas)
        except Exception as e:
            r.error = f"{type(e).__name__}: {e}"[:120]
            res.motores[nombre] = r
            continue

        r.caracteres = len(texto)
        r.tokens_estimados = len(re.sub(r"[ \t]+", " ", texto)) // CHARS_POR_TOKEN

        cups = buscar_cups(texto)
        r.cups = cups is not None
        r.cups_masked = enmascarar_cups(cups) if cups else None

        pot = buscar_potencia(texto)
        r.potencia = pot is not None
        r.potencia_valor = pot

        anual = buscar_consumo_anual(texto)
        r.consumo_anual_explicito = anual is not None
        r.consumo_anual_valor = anual

        periodo = buscar_consumo_periodo(texto)
        r.consumo_periodo = periodo is not None
        r.consumo_periodo_valor = periodo

        dias = buscar_dias_periodo(texto)
        r.dias_periodo = dias
        if periodo is not None and dias:
            r.consumo_anual_extrapolable = True
            r.consumo_anual_extrapolado = round(periodo * 365 / dias, 1)

        res.motores[nombre] = r

        if nombre == "pypdf":
            res.comercializadora = detectar_comercializadora(texto)
            res.sin_capa_texto = r.caracteres < 200 and not (r.cups or r.potencia)
        if res.comercializadora == "desconocida" and nombre == "pdfplumber":
            res.comercializadora = detectar_comercializadora(texto)

    return res


# ---------------------------------------------------------------------------
# Agregacion e informe
# ---------------------------------------------------------------------------


def pct(n: int, total: int) -> str:
    return f"{100 * n / total:5.1f}%" if total else "  n/a"


def informe_consola(resultados: list[ResultadoFichero], max_paginas: int) -> dict:
    total = len(resultados)
    validos = [r for r in resultados if "_error" not in r.motores]
    escaneados = [r for r in validos if r.sin_capa_texto]

    print("=" * 74)
    print(f"  MEDICION DE PRE-EXTRACCION POR REGEX  ({total} ficheros)")
    print(f"  Limite de paginas analizadas: {max_paginas}")
    print("=" * 74)

    if total != len(validos):
        print(f"\n  !! {total - len(validos)} fichero(s) descartado(s): no son PDF\n")
    if escaneados:
        print(
            f"\n  !! {len(escaneados)} fichero(s) sin capa de texto (escaneados).\n"
            f"     Estos SIEMPRE requeriran OCR o LLM multimodal, nunca regex:"
        )
        for r in escaneados:
            print(f"       - {r.fichero}")

    salida: dict = {"total": total, "sin_capa_texto": len(escaneados), "motores": {}}

    for motor in ("pypdf", "pdfplumber"):
        rs = [r.motores[motor] for r in validos if motor in r.motores]
        rs = [r for r in rs if r.error is None]
        n = len(rs)
        if not n:
            continue

        m = {
            "n": n,
            "cups": sum(r.cups for r in rs),
            "potencia": sum(r.potencia for r in rs),
            "consumo_anual_explicito": sum(r.consumo_anual_explicito for r in rs),
            "consumo_periodo": sum(r.consumo_periodo for r in rs),
            "consumo_anual_extrapolable": sum(r.consumo_anual_extrapolable for r in rs),
            "consumo_anual_resuelto": sum(
                r.consumo_anual_explicito or r.consumo_anual_extrapolable for r in rs
            ),
            "los_tres_estrictos": sum(r.los_tres_estrictos for r in rs),
            "los_tres_con_extrapolacion": sum(r.los_tres_con_extrapolacion for r in rs),
            "cups_y_potencia": sum(r.cups and r.potencia for r in rs),
            "tokens_p50": int(statistics.median(r.tokens_estimados for r in rs)),
            "tokens_max": max(r.tokens_estimados for r in rs),
        }
        salida["motores"][motor] = m

        print(f"\n{'-' * 74}\n  MOTOR: {motor}  (n={n})\n{'-' * 74}")
        print(f"  CUPS                                {pct(m['cups'], n)}  ({m['cups']}/{n})")
        print(f"  Potencia contratada                 {pct(m['potencia'], n)}  ({m['potencia']}/{n})")
        print(f"  Consumo anual EXPLICITO             {pct(m['consumo_anual_explicito'], n)}  ({m['consumo_anual_explicito']}/{n})")
        print(f"  Consumo del periodo                 {pct(m['consumo_periodo'], n)}  ({m['consumo_periodo']}/{n})")
        print(f"  Consumo anual EXTRAPOLABLE          {pct(m['consumo_anual_extrapolable'], n)}  ({m['consumo_anual_extrapolable']}/{n})")
        print()
        print(f"  >> SIN LLM, regla actual (3 estrictos)   {pct(m['los_tres_estrictos'], n)}")
        print(f"  >> SIN LLM, admitiendo extrapolacion     {pct(m['los_tres_con_extrapolacion'], n)}")
        print(f"  >> Fallback SOLO consumo (CUPS+pot ok)   {pct(m['cups_y_potencia'], n)}")
        print()
        print(f"  Tokens al LLM si se envia todo:  p50={m['tokens_p50']}  max={m['tokens_max']}")

    # Desglose por comercializadora
    print(f"\n{'-' * 74}\n  DESGLOSE POR COMERCIALIZADORA (motor pdfplumber)\n{'-' * 74}")
    por_com: dict[str, list] = {}
    for r in validos:
        mr = r.motores.get("pdfplumber")
        if mr and isinstance(mr, ResultadoMotor) and mr.error is None:
            por_com.setdefault(r.comercializadora, []).append(mr)
    salida["por_comercializadora"] = {}
    print(f"  {'comercializadora':<20} {'n':>3}  {'CUPS':>6} {'POT':>6} {'ANUAL':>6}  {'3/3':>6}")
    for nombre, rs in sorted(por_com.items(), key=lambda kv: -len(kv[1])):
        n = len(rs)
        fila = {
            "n": n,
            "cups": sum(r.cups for r in rs),
            "potencia": sum(r.potencia for r in rs),
            "anual": sum(r.consumo_anual_explicito or r.consumo_anual_extrapolable for r in rs),
            "tres": sum(r.los_tres_con_extrapolacion for r in rs),
        }
        salida["por_comercializadora"][nombre] = fila
        print(
            f"  {nombre:<20} {n:>3}  {pct(fila['cups'], n)} {pct(fila['potencia'], n)} "
            f"{pct(fila['anual'], n)}  {pct(fila['tres'], n)}"
        )

    print(f"\n{'=' * 74}")
    mejor = salida["motores"].get("pdfplumber") or salida["motores"].get("pypdf")
    if mejor and mejor["n"]:
        r_estricto = 100 * mejor["los_tres_estrictos"] / mejor["n"]
        r_flexible = 100 * mejor["los_tres_con_extrapolacion"] / mejor["n"]
        print("  LECTURA DEL RESULTADO")
        print(f"  - Con la regla del plan, el LLM se llama en el {100 - r_estricto:.0f}% de los casos.")
        print(f"  - Admitiendo extrapolacion, en el {100 - r_flexible:.0f}%.")
        if r_estricto < 50:
            print("  - AVISO: la ruta LLM es la ruta POR DEFECTO.")
            print("    El argumento de coste y el argumento RGPD del ADR-005")
            print("    no se sostienen tal como estan escritos.")
    print("=" * 74)

    return salida


def escribir_csv(resultados: list[ResultadoFichero], ruta: Path) -> None:
    filas = []
    for r in resultados:
        for motor, mr in r.motores.items():
            if not isinstance(mr, ResultadoMotor):
                continue
            d = asdict(mr)
            d.update(
                fichero=r.fichero,
                comercializadora=r.comercializadora,
                paginas=r.paginas,
                tamano_kb=r.tamano_kb,
                sin_capa_texto=r.sin_capa_texto,
            )
            filas.append(d)
    if not filas:
        return
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=sorted(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("directorio", type=Path, help="Carpeta con las facturas en PDF")
    p.add_argument("--paginas", type=int, default=MAX_PAGINAS_DEFECTO)
    p.add_argument("--json", type=Path, help="Volcar el agregado a JSON")
    p.add_argument("--csv", type=Path, help="Volcar el detalle por fichero a CSV")
    p.add_argument("--verbose", action="store_true", help="Mostrar cada fichero")
    args = p.parse_args()

    if not args.directorio.is_dir():
        print(f"No es un directorio: {args.directorio}", file=sys.stderr)
        return 1

    pdfs = sorted(args.directorio.glob("*.pdf")) + sorted(args.directorio.glob("*.PDF"))
    if not pdfs:
        print(f"No hay PDFs en {args.directorio}", file=sys.stderr)
        return 1

    resultados = []
    for ruta in pdfs:
        r = analizar(ruta, args.paginas)
        resultados.append(r)
        if args.verbose:
            mr = r.motores.get("pdfplumber")
            if isinstance(mr, ResultadoMotor):
                print(
                    f"  {ruta.name:<40} {r.comercializadora:<14} "
                    f"campos={mr.campos_ok}/3 cups={mr.cups_masked or '-'}"
                )

    agregado = informe_consola(resultados, args.paginas)

    if args.json:
        args.json.write_text(json.dumps(agregado, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n  JSON -> {args.json}")
    if args.csv:
        escribir_csv(resultados, args.csv)
        print(f"  CSV  -> {args.csv}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
