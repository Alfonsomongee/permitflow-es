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

    def _completar_si_falta(self, datos: dict, campo: str, valor: object) -> None:
        if datos.get(campo) is None:
            datos[campo] = valor

    def _normalizar_fotovoltaica(self, datos: dict) -> None:
        tension = str(datos.get("tension") or "").lower()
        if tension == "bt":
            self._completar_si_falta(datos, "nivel_tension_consumidor", "bt")
            self._completar_si_falta(datos, "nivel_tension_generacion", "bt")
            self._completar_si_falta(datos, "nivel_tension_conexion", "bt")
            
            niveles_informados = [
                datos.get("nivel_tension_consumidor"),
                datos.get("nivel_tension_generacion"),
                datos.get("nivel_tension_conexion"),
            ]
            if any(nivel == "at" for nivel in niveles_informados):
                datos["_conflicto_tension"] = True
                
        elif tension == "at":
            self._completar_si_falta(datos, "nivel_tension_conexion", "at")
        
        if not tension and not all([datos.get("nivel_tension_consumidor"), datos.get("nivel_tension_generacion"), datos.get("nivel_tension_conexion")]):
            datos["_falta_tension"] = True

    def normalizar_parametros(self, datos: dict) -> dict:
        normalizados = dict(datos)
        if normalizados.get("tipo_instalacion") == "fotovoltaica_autoconsumo":
            self._normalizar_fotovoltaica(normalizados)
        return normalizados

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

        presion_bar_val = params.presion_bar
        if presion_bar_val == "normal":
            presion_bar_val = 0.0
        elif presion_bar_val == "5+":
            presion_bar_val = 6.0
        elif isinstance(presion_bar_val, str):
            try:
                presion_bar_val = float(presion_bar_val)
            except ValueError:
                pass

        eval_locals = params.model_dump()
        eval_locals["presion_bar"] = presion_bar_val
        eval_locals = self.normalizar_parametros(eval_locals)

        tramites_output = []
        tiempo_total = 0
        matched_any = False
        reglas_con_error: list[str] = []
        
        # Check normalization conflicts for PV
        if eval_locals.get("_conflicto_tension"):
            return ClasificadorOutput(
                tramites=[
                    TramiteOutput(
                        orden=1,
                        nombre="Revisión técnica de tensiones eléctricas",
                        organismo="Oficina técnica",
                        base_legal="N/A",
                        tipo_actuacion="revision_manual",
                        notas="Conflicto detectado: Se indica tensión BT genérica pero existen niveles específicos AT.",
                        documentos_requeridos=[],
                        regla_id="REVISION-MANUAL-FV-TENSION-CONFLICTIVA"
                    )
                ],
                tiempo_total_estimado_dias=0,
                advertencias=["Conflicto en los datos de tensión eléctrica."],
                nivel_verificacion="verificada"
            )
            
        if eval_locals.get("_falta_tension"):
            return ClasificadorOutput(
                tramites=[
                    TramiteOutput(
                        orden=1,
                        nombre="Evaluación de tensión de la instalación",
                        organismo="Oficina técnica",
                        base_legal="N/A",
                        tipo_actuacion="revision_manual",
                        notas="No se puede determinar la puesta en servicio ni el tipo de inscripción registral sin conocer el nivel de tensión.",
                        documentos_requeridos=[],
                        regla_id="REVISION-MANUAL-FV-TENSION-AUSENTE"
                    )
                ],
                tiempo_total_estimado_dias=0,
                advertencias=["Falta el parámetro de tensión eléctrica."],
                nivel_verificacion="verificada"
            )
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
                            
                        # Compatibilidad histórica para tipo_actuacion
                        tipo_actuacion = t.get("tipo_actuacion")
                        if tipo_actuacion is None:
                            if regla.get("id") in ["MAD-FV-REGISTRO-OFICIO"]:
                                tipo_actuacion = "oficio_administracion"
                            else:
                                tipo_actuacion = "accion_usuario"
                                
                        tramite = TramiteOutput(
                            orden=t.get("orden"),
                            nombre=t.get("nombre"),
                            tipo_actuacion=tipo_actuacion,
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
                            registro_salida=t.get("registro_salida"),
                            medio_presentacion=t.get("medio_presentacion"),
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
            nivel_verificacion=data.get("nivel_verificacion", "verificada"),
        )
