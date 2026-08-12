"""Caché en memoria de proceso de los JSON de reglas del motor normativo.

Antes Clasificador.clasificar() y Validador.validar() abrían y parseaban su
JSON de reglas en cada petición -- el mismo fichero, sin cambios, leído del
disco y reconstruido a dict en cada llamada al asistente, al simulador o al
endpoint de plan de trámites. Con 85 combinaciones comunidad×vertical y
ficheros de hasta varias decenas de KB, es I/O y parseo repetido que no
aporta nada: los ficheros solo cambian mediante un deploy (el pipeline BOE
abre PR para revisión humana antes de tocar ninguno, ver
.github/workflows/boe_pipeline.yml), nunca en caliente durante la vida del
proceso.

`lru_cache` cachea por proceso -- se invalida solo al reiniciar el worker,
que es exactamente cuándo cambia el contenido en disco tras un deploy.

El dict devuelto se reutiliza entre llamadas: ni Clasificador ni Validador lo
mutan (ambos solo leen con .get()), así que compartir la misma instancia es
seguro. Si en el futuro algún consumidor necesitara mutarlo, debe copiarlo
primero -- este módulo no lo hace por él.

(Plan de acción consolidado 2026-08-12, P-13.)
"""

import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=256)
def cargar_json_reglas(file_path: Path) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
