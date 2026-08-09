"""Parser del fichero CSV de consumo horario de Datadis (datadis.es).

Datadis es la plataforma pública de datos de contadores inteligentes de las
distribuidoras eléctricas españolas. Cualquier titular puede descargar su
propio historial de consumo horario desde el portal (pestaña "Consumo" ->
tipo de fichero "Consumo" -> exportar CSV para el rango de fechas elegido),
sin necesidad de que PermitFlow se registre como tercero autorizado ante
Datadis ni de que el cliente firme ninguna autorización -- el usuario se
descarga su propio fichero y lo sube aquí, igual que hoy sube un PDF.

Frente a una factura en PDF (que suele cubrir un único periodo de
facturación, a veces con el consumo anual estimado por la comercializadora),
el CSV de Datadis da el consumo REAL medido, con el rango de fechas que el
usuario elija y desglose horario -- de ahí que se use tanto el total anual
como el perfil mensual (ver calculo_financiero.py, matching mes a mes con
producción PVGIS).

No existe un estándar único de columnas entre distribuidoras (confirmado:
cada una nombra los campos a su manera -- "Consumo_kWh", "AE_kWh", etc.).
Este parser reconoce los patrones documentados y públicamente conocidos;
si no encuentra columnas reconocibles, falla con un mensaje explicando qué
fichero descargar, en vez de adivinar.
"""

from __future__ import annotations

import csv
import io
import logging
from collections import defaultdict
from datetime import datetime

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

MAX_CSV_BYTES = 5 * 1024 * 1024  # 5 MB — de sobra para varios años de datos horarios
MAX_FILAS = 200_000  # ~22 años de datos horarios; límite de cordura, no de uso real
DIAS_MINIMOS_COBERTURA = 25  # menos de esto no es un CSV de Datadis útil

# Columnas de fecha/hora, en orden de preferencia
COLUMNAS_FECHA = ["fecha", "data"]
COLUMNAS_HORA = ["hora"]
COLUMNAS_CUPS = ["cups"]

# Columnas de consumo, en orden de preferencia. Se excluyen explícitamente
# columnas de excedentes/autoconsumo vertido (AS_kWh, AE_AUTOCONS_kWh): eso
# es energía exportada a red por una instalación YA existente, no consumo.
COLUMNAS_CONSUMO_PREFERENTES = ["consumo_kwh", "ae_kwh"]
FRAGMENTOS_EXCLUIDOS_CONSUMO = ["excedente", "autocons", "surplus", "vertid", "as_kwh", "ae_autocons"]

FORMATOS_FECHA = ["%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d"]


def _normalizar_cabecera(campo: str) -> str:
    return campo.strip().lower().replace(" ", "_")


def _parsear_float_es(valor: str) -> float | None:
    valor = valor.strip()
    if not valor:
        return None
    if "," in valor:
        valor = valor.replace(".", "").replace(",", ".")
    try:
        return float(valor)
    except ValueError:
        return None


def _parsear_fecha(valor: str) -> datetime | None:
    valor = valor.strip()
    for fmt in FORMATOS_FECHA:
        try:
            return datetime.strptime(valor, fmt)
        except ValueError:
            continue
    return None


def _detectar_columna_consumo(cabeceras_normalizadas: list[str]) -> str | None:
    # 1. Coincidencia exacta con alguno de los nombres conocidos, en orden de preferencia
    for candidata in COLUMNAS_CONSUMO_PREFERENTES:
        if candidata in cabeceras_normalizadas:
            return candidata
    # 2. Fallback: cualquier columna con "kwh" que no sea de excedentes/autoconsumo
    for cabecera in cabeceras_normalizadas:
        if "kwh" not in cabecera:
            continue
        if any(frag in cabecera for frag in FRAGMENTOS_EXCLUIDOS_CONSUMO):
            continue
        return cabecera
    return None


async def leer_y_validar_csv(file: UploadFile) -> bytes:
    contenido = await file.read(MAX_CSV_BYTES + 1)
    if len(contenido) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 5 MB.")
    if not contenido.strip():
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    return contenido


def parsear_csv_datadis(contenido: bytes) -> dict:
    """Parsea un CSV de consumo de Datadis.

    Devuelve un dict con la misma forma que parsear_factura() de
    facturas_parser.py (estado/consumo_anual_kwh/cups/fuente_dato/error),
    más `consumo_mensual_kwh`: lista de 12 floats (enero..diciembre) con el
    consumo medio de cada mes calendario a partir de los datos disponibles,
    o None si la cobertura no llega a un año completo.
    """
    # Datadis exporta en UTF-8 o Latin-1 según distribuidora; probamos ambos.
    try:
        texto = contenido.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            texto = contenido.decode("latin-1")
        except UnicodeDecodeError:
            return {"estado": "no_extraido", "error": "No se pudo leer la codificación del archivo."}

    try:
        muestra = texto[:4096]
        delimitador = ";" if muestra.count(";") >= muestra.count(",") else ","
        lector = csv.reader(io.StringIO(texto), delimiter=delimitador)
        filas = list(lector)
    except csv.Error:
        return {"estado": "no_extraido", "error": "No se pudo interpretar el archivo como CSV."}

    if len(filas) < 2:
        return {"estado": "no_extraido", "error": "El archivo no tiene datos suficientes."}
    if len(filas) > MAX_FILAS:
        raise HTTPException(status_code=413, detail="El archivo tiene demasiadas filas.")

    cabecera_original = filas[0]
    cabecera_normalizada = [_normalizar_cabecera(c) for c in cabecera_original]

    idx_fecha = next((i for i, c in enumerate(cabecera_normalizada) if c in COLUMNAS_FECHA), None)
    col_consumo = _detectar_columna_consumo(cabecera_normalizada)
    idx_consumo = cabecera_normalizada.index(col_consumo) if col_consumo else None
    idx_cups = next((i for i, c in enumerate(cabecera_normalizada) if c in COLUMNAS_CUPS), None)

    if idx_fecha is None or idx_consumo is None:
        return {
            "estado": "no_extraido",
            "error": (
                "No se reconocen las columnas de este archivo como un export de "
                "consumo de Datadis. En el portal de Datadis, dentro de tu "
                "suministro, asegúrate de descargar el fichero de tipo "
                "'Consumo' (no 'Potencias máximas', 'Contrato' ni 'Energía')."
            ),
        }

    # Acumular por (año, mes) para poder promediar meses calendario cubiertos
    # varias veces (p.ej. 2 años de histórico), y por día para medir cobertura
    # real sin depender de que las fechas vengan ordenadas o sin huecos.
    suma_por_periodo: dict[tuple[int, int], float] = defaultdict(float)
    dias_vistos: set[tuple[int, int, int]] = set()
    cups: str | None = None
    filas_validas = 0
    filas_totales = 0

    for fila in filas[1:]:
        if len(fila) <= max(idx_fecha, idx_consumo):
            continue
        filas_totales += 1

        fecha = _parsear_fecha(fila[idx_fecha])
        valor = _parsear_float_es(fila[idx_consumo])
        if fecha is None or valor is None:
            continue

        suma_por_periodo[(fecha.year, fecha.month)] += valor
        dias_vistos.add((fecha.year, fecha.month, fecha.day))
        filas_validas += 1

        if cups is None and idx_cups is not None and idx_cups < len(fila) and fila[idx_cups].strip():
            cups = fila[idx_cups].strip().upper()

    if filas_totales == 0 or filas_validas / filas_totales < 0.5:
        return {
            "estado": "no_extraido",
            "error": "No se pudieron interpretar suficientes filas del archivo (fechas o consumos con formato inesperado).",
        }

    num_dias = len(dias_vistos)
    if num_dias < DIAS_MINIMOS_COBERTURA:
        return {
            "estado": "no_extraido",
            "error": (
                f"El periodo cubierto por el archivo es demasiado corto ({num_dias} días). "
                "Descarga al menos un mes de consumo desde Datadis."
            ),
        }

    consumo_total = sum(suma_por_periodo.values())
    consumo_anual_kwh = round(consumo_total / num_dias * 365, 1)

    # Perfil mensual: promedio de cada mes calendario a través de los años
    # cubiertos. Solo se ofrece si los 12 meses tienen al menos un dato --
    # con menos, no inventamos la forma de los meses que faltan.
    meses_presentes: dict[int, list[float]] = defaultdict(list)
    for (anio, mes), total in suma_por_periodo.items():
        meses_presentes[mes].append(total)

    consumo_mensual_kwh: list[float] | None = None
    if len(meses_presentes) == 12:
        consumo_mensual_kwh = [
            round(sum(meses_presentes[mes]) / len(meses_presentes[mes]), 1) for mes in range(1, 13)
        ]

    fuente_dato = "leido" if num_dias >= 300 else "estimado"

    return {
        "estado": "exitoso",
        "cups": cups,
        "consumo_anual_kwh": consumo_anual_kwh,
        "consumo_mensual_kwh": consumo_mensual_kwh,
        "dias_cubiertos": num_dias,
        "fuente_dato": fuente_dato,
        "extraccion_fuente": {"consumo": "datadis_csv", "cups": "datadis_csv" if cups else None},
    }
