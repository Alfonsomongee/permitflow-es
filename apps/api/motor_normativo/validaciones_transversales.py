"""Validaciones de base estatal, aplicables a las 17 comunidades.

Origen: auditoría QA 2026-08-11, hallazgo A-05. Solo 4 comunidades tenían
validaciones definidas, así que 60 de las 85 combinaciones no comprobaban nada.
Escribir 60 conjuntos autonómicos exige trabajo normativo comunidad a comunidad;
pero una parte de lo que hay que comprobar no es autonómico en absoluto, sino
estatal, y esa parte se puede cubrir de una vez.

**Criterio de admisión, deliberadamente estricto:** aquí solo entra una
comprobación si su base es normativa estatal y he podido leer el texto literal
que la sustenta. Cada una lleva la cita concreta. Nada de reglas "de sentido
común" ni de prácticas habituales del sector: para eso está el criterio del
técnico, y meterlas aquí las disfrazaría de obligación legal.

Las comprobaciones que dependen de cómo tramita cada comunidad siguen viviendo
en la clave `validaciones` de su JSON, que es donde corresponde.
"""

from typing import Any

# Cada entrada usa el formato 1 del validador (condición json-logic + mensaje).
# La `condicion` describe el PROBLEMA: si evalúa truthy, dispara el hallazgo.
# `campos_requeridos` actúa como guarda: sin esos datos, la validación no aplica.
VALIDACIONES_TRANSVERSALES: list[dict[str, Any]] = [
    {
        "id": "GEN-FV-COMPENSACION-100KW",
        "severidad": "error",
        "campos_requeridos": ["potencia_kw", "modalidad_autoconsumo"],
        "condicion": {"and": [
            {"==": [{"var": "modalidad_autoconsumo"}, "con_excedentes_con_compensacion"]},
            {">": [{"var": "potencia_kw"}, 100]},
        ]},
        "mensaje": (
            "Has elegido autoconsumo con excedentes acogido a compensación, pero la "
            "potencia supera los 100 kW. El RD 244/2019 limita esa modalidad a "
            "instalaciones de producción de hasta 100 kW: por encima, la única opción es "
            "con excedentes NO acogido a compensación, que cambia el plan de trámites y "
            "obliga a inscribirse como productor."
        ),
        "fuente": "RD 244/2019, art. 4.a).ii: «La potencia total de las instalaciones de producción asociadas no sea superior a 100 kW»",
    },
    {
        "id": "GEN-FV-SIN-EXCEDENTES-ANTIVERTIDO",
        "severidad": "aviso",
        "campos_requeridos": ["modalidad_autoconsumo"],
        "condicion": {"==": [{"var": "modalidad_autoconsumo"}, "sin_excedentes"]},
        "mensaje": (
            "En la modalidad sin excedentes es obligatorio instalar un mecanismo antivertido "
            "que impida la inyección de energía a la red en todo momento, y en baja tensión "
            "debe cumplir la ITC-BT-40. Sin él la instalación no puede acogerse a esta "
            "modalidad, aunque el resto de la documentación sea correcta."
        ),
        "fuente": "RD 244/2019, art. 4.1: «se deberá instalar un mecanismo antivertido que impida la inyección de energía excedentaria a la red»; art. 3.k para los requisitos del dispositivo",
    },
    {
        "id": "GEN-FV-ACCESO-CONEXION-EXENTA",
        "severidad": "aviso",
        "campos_requeridos": ["modalidad_autoconsumo", "requiere_acceso_conexion"],
        "condicion": {"and": [
            {"==": [{"var": "modalidad_autoconsumo"}, "sin_excedentes"]},
            {"==": [{"var": "requiere_acceso_conexion"}, True]},
        ]},
        "mensaje": (
            "Has indicado que la instalación requiere permisos de acceso y conexión, pero "
            "las instalaciones acogidas a la modalidad sin excedentes están exentas de "
            "obtenerlos. Revisa si de verdad hacen falta: si no, el plan incluye trámites "
            "con la distribuidora que podrías ahorrarte."
        ),
        "fuente": "RDL 15/2018, disposición adicional segunda, según la recoge el manual de tramitación de autoconsumo de la Junta de Andalucía (ap. 5.2): están exentas «a) Las acogidas a la modalidad sin excedentes»",
    },
    {
        "id": "GEN-FV-COMPENSACION-VS-REGISTRO-PRODUCCION",
        "severidad": "aviso",
        "campos_requeridos": ["modalidad_autoconsumo", "requiere_registro_produccion"],
        "condicion": {"and": [
            {"==": [{"var": "modalidad_autoconsumo"}, "con_excedentes_con_compensacion"]},
            {"==": [{"var": "requiere_registro_produccion"}, True]},
        ]},
        "mensaje": (
            "Has marcado que la instalación requiere inscripción en el registro de "
            "producción de energía eléctrica, pero está acogida al mecanismo de "
            "compensación de excedentes. Las instalaciones que compensan no se inscriben "
            "en ese registro; solo lo hacen las que venden la energía al mercado. Revisa "
            "cuál de las dos cosas es la correcta."
        ),
        "fuente": "Manual de tramitación de autoconsumo de la Junta de Andalucía, ap. 5.1.6: «Las instalaciones con excedentes que se acojan al mecanismo de compensación de excedentes no tendrán que inscribirse en este registro»",
    },
]

# Solo tienen sentido en fotovoltaica de autoconsumo: todas hablan de modalidades
# de autoconsumo, que no existen en las demás verticales.
VERTICALES_APLICABLES = {"fotovoltaica_autoconsumo"}


def transversales_para(tipo_instalacion: str) -> list[dict[str, Any]]:
    """Validaciones estatales que aplican a esta tecnología."""
    if tipo_instalacion not in VERTICALES_APLICABLES:
        return []
    return VALIDACIONES_TRANSVERSALES
