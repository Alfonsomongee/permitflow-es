import logging
from pathlib import Path
from json_logic import jsonLogic

from schemas.clasificador import (
    ClasificadorInput,
    ClasificadorOutput,
    TramiteOutput,
    DocumentoRequerido,
    RiesgoNormativoOutput,
    RiesgoTramiteOutput,
)
from motor_normativo.excepciones import NormativaNoEncontradaError
from motor_normativo.coherencia import comprobar_coherencia
from motor_normativo.reglas_cache import cargar_json_reglas
from servicios.riesgo_normativo import calcular_riesgo_plan
from servicios.ayudas import simular_ayudas

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


def _condicion_referencia_var(condicion: object, nombre_var: str) -> bool:
    """
    Recorre recursivamente un árbol de condición json-logic buscando si
    referencia una variable dada (ej. {"var": "solicita_ayuda"}).

    Se usa para distinguir, tras evaluar las reglas de una CCAA, si esa
    comunidad ya tiene contenido específico sobre ayudas/subvenciones
    (una regla cuya condición mira solicita_ayuda) frente a las que aún
    no lo tienen -- ver el trámite genérico añadido en Clasificador.clasificar().
    """
    if isinstance(condicion, dict):
        for key, value in condicion.items():
            if key == "var":
                var_name = value[0] if isinstance(value, list) and value else value
                if var_name == nombre_var:
                    return True
            if _condicion_referencia_var(value, nombre_var):
                return True
    elif isinstance(condicion, list):
        return any(_condicion_referencia_var(item, nombre_var) for item in condicion)
    return False


class Clasificador:
    def __init__(self):
        self.reglas_dir = Path(__file__).parent / "reglas"

    def _completar_si_falta(self, datos: dict, campo: str, valor: object) -> None:
        if datos.get(campo) is None:
            datos[campo] = valor

    def _normalizar_fotovoltaica(self, datos: dict) -> None:
        """Reconcilia `tension` (campo grueso, heredado) con los tres niveles finos.

        La comprobación de conflicto debe ser simétrica: antes solo se hacía en
        la rama "bt", así que declarar tension="AT" con consumidor y generación
        en BT se aceptaba en silencio y devolvía el plan de alta tensión
        (autorización administrativa) para una instalación que no lo era
        — auditoría QA 2026-08-11, M-01.
        """
        tension = str(datos.get("tension") or "").lower()

        if tension in ("bt", "at"):
            # `tension` describe el nivel de conexión; los otros dos solo se
            # rellenan por defecto en BT, donde consumidor y generación
            # coinciden necesariamente con la conexión.
            self._completar_si_falta(datos, "nivel_tension_conexion", tension)
            if tension == "bt":
                self._completar_si_falta(datos, "nivel_tension_consumidor", "bt")
                self._completar_si_falta(datos, "nivel_tension_generacion", "bt")

            # Conflicto: el campo grueso dice una cosa y algún nivel fino la
            # contradice. Se comprueba en ambos sentidos.
            contrario = "at" if tension == "bt" else "bt"
            niveles = [
                datos.get("nivel_tension_consumidor"),
                datos.get("nivel_tension_generacion"),
                datos.get("nivel_tension_conexion"),
            ]
            if any(nivel == contrario for nivel in niveles):
                datos["_conflicto_tension"] = True

        if not tension and not all([
            datos.get("nivel_tension_consumidor"),
            datos.get("nivel_tension_generacion"),
            datos.get("nivel_tension_conexion"),
        ]):
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

        data = cargar_json_reglas(file_path)

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
                        notas=(
                            "Conflicto detectado: el nivel de tensión general declarado "
                            f"({str(eval_locals.get('tension') or '').upper()}) no concuerda con "
                            "alguno de los niveles específicos indicados para consumidor, "
                            "generación o conexión. De ese dato dependen la puesta en servicio y "
                            "el tipo de inscripción registral, así que el plan no se puede "
                            "construir hasta aclararlo."
                        ),
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
        # Reglas que disparan y declaran un nivel de verificación propio peor
        # que "verificada" (clave `nivel_verificacion_regla`).
        reglas_sin_verificar: list[tuple[str, str]] = []

        # (regla_id, orden_original, paralelo_con_original) por cada trámite emitido,
        # para remapear paralelo_con tras el reordenado aditivo.
        origenes: list[tuple[str, int | None, int | None]] = []

        # True si alguna regla de ESTA CCAA que referencia solicita_ayuda ha
        # disparado -- indica que la comunidad ya tiene contenido específico
        # de ayudas/subvenciones investigado, y por tanto no debe añadirse el
        # trámite genérico transversal (ver más abajo).
        ayuda_cubierta_por_ccaa = False

        for regla in data.get("reglas", []):
            condicion_json = regla.get("condicion", True)
            try:
                result = jsonLogic(condicion_json, eval_locals)
                if result:
                    matched_any = True
                    if _condicion_referencia_var(condicion_json, "solicita_ayuda"):
                        ayuda_cubierta_por_ccaa = True
                    # Algunas reglas declaran su propio nivel de verificación,
                    # más granular que el del fichero. Era un dato que nadie
                    # leía (auditoría QA 2026-08-11, B-01): si una regla en
                    # concreto está sin verificar, el usuario debe saberlo
                    # aunque el resto del fichero esté bien.
                    nivel_regla = regla.get("nivel_verificacion_regla")
                    if nivel_regla and nivel_regla != "verificada":
                        reglas_sin_verificar.append((regla.get("id", "?"), nivel_regla))
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
                            silencio_administrativo=t.get("silencio_administrativo"),
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
            # Puede significar dos cosas distintas y las distinguimos en el mensaje:
            # (a) combinación fuera del alcance documentado en huecos_verificacion
            #     (p.ej. Canarias gas industrial: solo se verificó residencial/comercial
            #     a presión normal; ver huecos_verificacion del fichero), o
            # (b) un vacío real de cobertura pendiente de investigar.
            # No inventamos una regla para "tapar" el hueco: es preferible un 404 claro
            # a una respuesta con datos normativos no verificados.
            raise NormativaNoEncontradaError(
                f"No hay normativa verificada para esta combinación de parámetros en "
                f"{params.comunidad} / {params.tipo_instalacion}. Puede tratarse de un "
                f"caso fuera del alcance documentado (revisa huecos_verificacion en el "
                f"fichero de reglas) más que de un error del clasificador."
            )

        # Regla transversal de ayudas/subvenciones: si el usuario marca
        # solicita_ayuda y la CCAA no tiene todavía una regla propia en el
        # JSON de normativa que lo cubra (ayuda_cubierta_por_ccaa), añadimos
        # un trámite informativo construido con el catálogo YA investigado en
        # servicios/catalogo_ayudas.py (mismo dato que expone /api/v1/ayudas/simular
        # y el paso 3 del asistente de nueva instalación) en vez de duplicar esa
        # investigación aquí o mostrar un aviso vacío. Si el catálogo tampoco
        # tiene nada para esa combinación, se usa su aviso honesto de
        # "no localizado" -- nunca se inventa organismo, convocatoria o estado.
        # Hoy solo Andalucía (AND-FV-003) tiene una regla propia en el motor;
        # el día que se añada la de otra CCAA, este trámite deja de aparecer
        # ahí automáticamente -- no requiere tocar este código.
        if eval_locals.get("solicita_ayuda") and not ayuda_cubierta_por_ccaa:
            resultado_ayudas = simular_ayudas(params.comunidad, params.tipo_instalacion)
            if resultado_ayudas.ayudas:
                organismos = {a.organismo for a in resultado_ayudas.ayudas}
                organismo_ayuda = (
                    next(iter(organismos)) if len(organismos) == 1 else "Varios organismos (ver detalle)"
                )
                detalle = "\n".join(
                    f"- {a.nombre} ({a.organismo}, estado: {a.estado}): {a.resumen_cuantia}. "
                    f"Plazo: {a.plazo}. Fuente: {a.fuente_url}"
                    for a in resultado_ayudas.ayudas
                )
                notas_ayuda = f"{resultado_ayudas.aviso}\n\nProgramas detectados:\n{detalle}"
            else:
                organismo_ayuda = "Administración autonómica / agencia de energía de tu comunidad"
                notas_ayuda = resultado_ayudas.aviso

            tramites_output.append(
                TramiteOutput(
                    orden=len(tramites_output) + 1,
                    nombre="Ayudas a la inversión disponibles para esta instalación",
                    tipo_actuacion="informativa",
                    organismo=organismo_ayuda,
                    base_legal=(
                        "RD 477/2021 (marco estatal de ayudas Next Generation EU al "
                        "autoconsumo) y normativa autonómica de desarrollo"
                    ),
                    documentos_requeridos=[],
                    notas=notas_ayuda,
                    regla_id="GEN-AYUDA-INFORMATIVA",
                )
            )
            origenes.append(("GEN-AYUDA-INFORMATIVA", None, None))

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
        if matched_any and not tramites_output:
            # Distingue explícitamente "regla encontrada, instalación exenta"
            # (ej. ARA-ACS-000/ARA-CLIM-000: potencia_kw < 5 sin trámites) de un
            # plan vacío por error: si no se avisa, un plan sin trámites es
            # indistinguible en la UI de una respuesta rota.
            advertencias.append(
                "No se ha encontrado ningún trámite aplicable para esta combinación de "
                "parámetros: la normativa consultada indica que esta instalación está "
                "exenta o no requiere trámite específico en esta comunidad."
            )
        if reglas_con_error:
            advertencias.append(
                f"{len(reglas_con_error)} regla(s) del motor normativo no se pudieron evaluar "
                f"({', '.join(reglas_con_error)}). Revisa el JSON de normativa."
            )

        if reglas_sin_verificar:
            detalle = ", ".join(f"{rid} ({nivel})" for rid, nivel in reglas_sin_verificar)
            advertencias.append(
                f"Este plan incluye {len(reglas_sin_verificar)} regla(s) cuya verificación "
                f"individual no está cerrada: {detalle}. Los trámites que generan pueden "
                f"cambiar; contrástalos antes de presentar."
            )

        # Coherencia física entre los datos declarados (superficie vs potencia,
        # potencia total vs puntos de recarga). Son avisos, no errores: el motor
        # no conoce el proyecto real. Ver motor_normativo/coherencia.py.
        advertencias.extend(comprobar_coherencia(eval_locals))

        # tipo_generador_acs es opcional a propósito (retrocompatibilidad con
        # expedientes antiguos, test_umbral_rite_5kw.py::
        # test_sin_informar_el_equipo_el_plan_no_cambia): omitirlo nunca hace
        # que la instalación reciba una exención que no le corresponde -- el
        # valor por defecto ya es el itinerario más gravoso, nunca al revés.
        # Pero si de haberlo indicado el equipo hubiera estado exento del RITE
        # (art. 15.1.c), el usuario debería saberlo para no pagar de más.
        if (
            params.tipo_instalacion == "acs"
            and eval_locals.get("tipo_generador_acs") is None
            and matched_any
        ):
            advertencias.append(
                "No has indicado el equipo que produce el agua caliente. El RITE exime "
                "de memoria técnica y de registro a los calentadores instantáneos, "
                "calentadores acumuladores y termos eléctricos de hasta 70 kW, y a los "
                "sistemas solares de un único elemento prefabricado (art. 15.1.c). Si tu "
                "instalación usa alguno de estos equipos, indícalo para recalcular: "
                "es posible que este plan incluya trámites de los que en realidad estás exento."
            )

        riesgo_calculado = calcular_riesgo_plan(
            tramites_output,
            nivel_verificacion=data.get("nivel_verificacion", "verificada"),
            estado=data.get("estado"),
        )
        riesgo_normativo = RiesgoNormativoOutput(
            severidad_normativa=riesgo_calculado.severidad_normativa,
            tramites=[
                RiesgoTramiteOutput(orden=t.orden, nombre=t.nombre, riesgo=t.riesgo, motivos=t.motivos)
                for t in riesgo_calculado.tramites
            ],
            resumen=riesgo_calculado.resumen,
            hay_riesgo_alto=riesgo_calculado.hay_riesgo_alto,
        )

        # None (no 0) cuando ningún trámite del plan aporta plazo: la UI mostraba
        # un rotundo "~0 días estimados", que se lee como "trámite inmediato" en
        # vez de "no lo sabemos" — auditoría QA 2026-08-11, M-04. Afectaba a 11
        # combinaciones (Cataluña y Madrid enteras, más C. Valenciana en FV).
        aporta_plazo = any(t.plazo_estimado_dias for t in tramites_output)

        return ClasificadorOutput(
            tramites=tramites_output,
            tiempo_total_estimado_dias=tiempo_total if aporta_plazo else None,
            advertencias=advertencias,
            nivel_verificacion=data.get("nivel_verificacion", "verificada"),
            estado=data.get("estado"),
            aviso=data.get("aviso"),
            huecos_verificacion=data.get("huecos_verificacion", []),
            riesgo_normativo=riesgo_normativo,
        )
