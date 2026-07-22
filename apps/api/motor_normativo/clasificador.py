import json
import logging
from pathlib import Path
from json_logic import jsonLogic

from schemas.clasificador import (
    ClasificadorInput,
    ClasificadorOutput,
    TramiteOutput,
    DocumentoRequerido,
)
from motor_normativo.excepciones import NormativaNoEncontradaError

logger = logging.getLogger(__name__)


def _parse_documentos(raw: list) -> list[DocumentoRequerido]:
    """
    Deserializa documentos en formato legado (lista de strings)
    o en el nuevo formato enriquecido (lista de objetos con id/label/descripcion).
    Garantiza retrocompatibilidad con los JSONs de otras CCAA aún sin enriquecer.
    """
    result = []
    for item in raw:
        if isinstance(item, str):
            # Formato legado: convertir string a objeto mínimo
            result.append(DocumentoRequerido(
                id=item,
                label=item.replace("_", " ").title(),
                descripcion="Sin descripción disponible. Consulta con tu gestor.",
                obligatorio=True,
            ))
        elif isinstance(item, dict):
            # Nuevo formato enriquecido
            result.append(DocumentoRequerido(
                id=item.get("id", ""),
                label=item.get("label", item.get("id", "")),
                descripcion=item.get("descripcion", ""),
                obligatorio=item.get("obligatorio", True),
            ))
    return result


class Clasificador:
    def __init__(self):
        self.reglas_dir = Path(__file__).parent / "reglas"

    def clasificar(self, params: ClasificadorInput) -> ClasificadorOutput:
        file_path = (self.reglas_dir / params.comunidad / f"{params.tipo_instalacion}.json").resolve()

        # Defensa en profundidad: aunque el schema ya restringe los valores a un
        # enum cerrado, verificamos que la ruta resuelta sigue dentro de reglas_dir
        # para evitar path traversal si en el futuro se relaja la validación.
        if not file_path.is_relative_to(self.reglas_dir.resolve()):
            raise NormativaNoEncontradaError(
                f"Ruta de normativa inválida para {params.tipo_instalacion} en {params.comunidad}"
            )

        if not file_path.exists():
            raise NormativaNoEncontradaError(
                f"No se encontró normativa para {params.tipo_instalacion} en {params.comunidad}"
            )

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        eval_locals = {
            "potencia_kw": params.potencia_kw,
            "superficie_m2": params.superficie_m2,
            "uso": params.uso,
            "municipio": params.municipio,
            "comunidad": params.comunidad,
            "tipo_instalacion": params.tipo_instalacion,
            "combustible": params.combustible,
            "presion_bar": params.presion_bar,
            "numero_puntos": params.numero_puntos,
            "potencia_por_punto_kw": params.potencia_por_punto_kw,
            "modo_recarga": params.modo_recarga,
            "acceso_publico": params.acceso_publico,
            "ubicacion_irve": params.ubicacion_irve,
            "requiere_nuevo_suministro": params.requiere_nuevo_suministro,
            "modalidad": params.modalidad,
            "implantacion": params.implantacion,
            "solicita_ayuda": params.solicita_ayuda,
        }

        tramites_output = []
        tiempo_total = 0
        matched_any = False
        reglas_con_error: list[str] = []

        # (regla_id, orden_original, paralelo_con_original) por cada trámite emitido,
        # para remapear paralelo_con tras el reordenado aditivo.
        origenes: list[tuple[str, int | None, int | None]] = []

        for regla in data.get("reglas", []):
            condicion_json = regla.get("condicion", True)
            try:
                result = jsonLogic(condicion_json, eval_locals)
                if result:
                    matched_any = True
                    for t in regla.get("tramites", []):
                        if t.get("obsoleta"):
                            logger.info(
                                f"Trámite '{t.get('nombre')}' omitido por estar marcado obsoleto "
                                f"desde {t.get('obsoleta_desde', 'fecha desconocida')}"
                            )
                            continue
                        tramite = TramiteOutput(
                            orden=t.get("orden"),
                            nombre=t.get("nombre"),
                            organismo=t.get("organismo"),
                            base_legal=t.get("base_legal"),
                            plazo_estimado_dias=t.get("plazo_estimado_dias"),
                            plazo_legal_dias=t.get("plazo_legal_dias"),
                            documentos_requeridos=_parse_documentos(
                                t.get("documentos_requeridos", [])
                            ),
                            notas=t.get("notas"),
                            plataforma=t.get("plataforma"),
                            plataforma_url=t.get("plataforma_url"),
                            coste_estimado=t.get("coste_estimado"),
                            formulario_ref=t.get("formulario_ref"),
                            regla_id=regla.get("id"),
                        )
                        tramites_output.append(tramite)
                        origenes.append((
                            regla.get("id", "unknown"),
                            t.get("orden"),
                            t.get("paralelo_con"),
                        ))
                        if t.get("plazo_estimado_dias"):
                            tiempo_total += t["plazo_estimado_dias"]
            except Exception as e:
                regla_id = regla.get("id", "unknown")
                logger.error(
                    f"Error evaluando condición de regla {regla_id} "
                    f"en {params.comunidad}/{params.tipo_instalacion}: {e}"
                )
                reglas_con_error.append(regla_id)
                continue

        if not matched_any:
            raise NormativaNoEncontradaError(
                f"No se encontraron reglas aplicables para los parámetros dados en {params.comunidad}"
            )

        # Reasignar orden secuencial (trámites aditivos de múltiples reglas) y
        # remapear paralelo_con: en el JSON referencia el `orden` original dentro
        # de SU regla; tras la fusión, ese número corresponde a otro trámite.
        mapa_orden: dict[tuple[str, int | None], int] = {}
        for idx, origen in enumerate(origenes, start=1):
            regla_id, orden_orig, _ = origen
            mapa_orden[(regla_id, orden_orig)] = idx

        for idx, (origen, t) in enumerate(zip(origenes, tramites_output), start=1):
            t.orden = idx
            regla_id, _, paralelo_orig = origen
            if paralelo_orig is not None:
                # Solo referencias dentro de la misma regla; si no resuelve → None
                t.paralelo_con = mapa_orden.get((regla_id, paralelo_orig))

        advertencias = ["El tiempo total es orientativo y asume trámites en serie."]
        if reglas_con_error:
            advertencias.append(
                f"{len(reglas_con_error)} regla(s) del motor normativo no se pudieron evaluar "
                f"({', '.join(reglas_con_error)}). Revisa el JSON de normativa."
            )

        return ClasificadorOutput(
            tramites=tramites_output,
            tiempo_total_estimado_dias=tiempo_total,
            advertencias=advertencias,
        )
