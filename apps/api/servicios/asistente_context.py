import json
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from models.expediente import Expediente
import os
from servicios.conocimiento_tecnico import obtener_guia_tecnica
from servicios.riesgo_normativo import _severidad_normativa

REGLAS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "motor_normativo", "reglas")

def _cargar_normativa(comunidad: str, tipo_instalacion: str) -> Optional[Dict[str, Any]]:
    ruta = os.path.join(REGLAS_DIR, comunidad, f"{tipo_instalacion}.json")
    if not os.path.exists(ruta):
        return None
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def severidad_verificacion(normativa_json: Dict[str, Any]) -> str:
    """
    Determina la severidad real de fiabilidad de un fichero de normativa,
    combinando 'estado' (campo de auditoría más granular, con narrativa de
    huecos concretos) y 'nivel_verificacion' (enum general).

    Antes, construir_contexto() solo miraba nivel_verificacion. Eso es
    insuficiente: casos como aragon/fotovoltaica_autoconsumo.json tienen
    nivel_verificacion='generica' pero estado='borrador_no_verificado' con
    huecos_verificacion documentados (umbral de potencia sin respaldo
    normativo, cita legal retirada, trámite de acceso a red ausente...).
    'estado' prima porque refleja el diagnóstico de la última auditoría de
    contenido, que puede ser más grave que el nivel_verificacion general.

    Delega en servicios.riesgo_normativo._severidad_normativa, la misma
    función que usa el indicador de riesgo normativo por trámite, que a su
    vez replica el criterio de apps/web/types/plan.ts (severidadVerificacion)
    — un único criterio de severidad compartido por front, copiloto y motor
    de riesgo, para no dar tres lecturas distintas de fiabilidad al mismo dato.

    Devuelve: "critico" | "atencion" | "verificada"
    """
    return _severidad_normativa(
        normativa_json.get("nivel_verificacion"),
        normativa_json.get("estado"),
    )


def construir_contexto(
    expediente: Optional[Expediente] = None,
    params: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Construye el system prompt para el LLM.
    Si hay expediente, extrae params de ahí. Si no, usa los params explícitos.
    Si no hay ni expediente ni params, devuelve solo la Capa 1.
    """
    sections = []

    # --- Capa 1: Contexto general ---
    guia_tecnica = obtener_guia_tecnica()
    sections.append(f"""Eres el asistente normativo y técnico de PermitFlow ES, una plataforma SaaS B2B que digitaliza y 
automatiza la tramitación burocrática del sector energético en España.

Tu función es ayudar a instaladoras, gestorías y técnicos a entender qué trámites necesitan 
realizar para legalizar instalaciones técnicas, así como asesorarles como ingeniero experto en la materia.

Los 5 verticales que gestionamos son: Fotovoltaica de autoconsumo, Recarga de vehículos eléctricos (IRVE), Climatización y aerotermia, Agua caliente sanitaria (ACS), y Gas baja presión. 
Tenemos cobertura en las 17 Comunidades Autónomas, pero el nivel de precisión de los datos varía. El sistema te indicará en cada caso si los datos de la comunidad solicitada son genéricos, estrictos o no están verificados.

Reglas de comportamiento crítico ("Grounding estricto"):
- Responde SIEMPRE en español.
- Toda afirmación NORMATIVA (trámite, plazo, tasa, organismo, plataforma, norma) debe proceder de los datos proporcionados en los JSON que se te inyecten. NUNCA inventes normativa, plazos, plataformas ni importes.
- Para el ASESORAMIENTO TÉCNICO (por qué elegir una tecnología, eficiencia, casos ideales), utiliza el conocimiento general que tienes a continuación.
- Si un dato legal exacto no está en el contexto, DEBES decir: "No tengo ese dato legal verificado en mi base para esta comunidad/tecnología."
- Sé transparente sobre la fiabilidad de tus datos basándote en el nivel de verificación indicado.
- Si el usuario pregunta algo fuera del ámbito de tramitaciones o instalaciones energéticas, indícale amablemente tu especialidad.

---
{guia_tecnica}""")

    # Determinar comunidad y tipo
    comunidad = None
    tipo_instalacion = None
    plan = None

    if expediente:
        comunidad = expediente.comunidad
        tipo_instalacion = expediente.tipo_instalacion
        plan = expediente.plan_tramitacion
        params = {
            "comunidad": expediente.comunidad,
            "tipo_instalacion": expediente.tipo_instalacion,
            "municipio": expediente.municipio,
            "potencia_kw": expediente.potencia_kw,
            "uso": expediente.uso,
            "numero_puntos": expediente.numero_puntos,
            "acceso_publico": expediente.acceso_publico,
            "solicita_ayuda": expediente.solicita_ayuda
        }
    elif params:
        comunidad = params.get("comunidad")
        tipo_instalacion = params.get("tipo_instalacion")

    # --- Capa 2: Contexto del expediente activo ---
    if params and plan:
        tramites = plan.get("tramites", [])
        lineas_tramites = []
        for t in tramites:
            plazo = t.get("plazo_estimado_dias", "?")
            legal = t.get("plazo_legal_dias")
            coste = t.get("coste_estimado")
            plat = t.get("plataforma_url")
            
            linea = f"  {t.get('orden', '?')}. {t.get('nombre')} — {t.get('organismo')} — ~{plazo} días"
            if legal: linea += f" (legal: {legal}d)"
            if coste: linea += f" — {coste}"
            if plat: linea += f" — Tramitar: {plat}"
            lineas_tramites.append(linea)

        resumen_tramites = "\n".join(lineas_tramites)
        adverts = plan.get("advertencias", [])
        adverts_str = "\n".join([f"- {a}" for a in adverts])

        sections.append(f"""El usuario está viendo actualmente el siguiente expediente:

INSTALACIÓN:
- Tipo: {params.get("tipo_instalacion")}
- Comunidad: {params.get("comunidad")}
- Municipio: {params.get("municipio")}
- Potencia: {params.get("potencia_kw")} kW
- Uso: {params.get("uso", "no especificado")}
- Puntos de recarga: {params.get("numero_puntos") or "N/A"}
- Acceso público: {'Sí' if params.get("acceso_publico") else 'No' if params.get("acceso_publico") is not None else "N/A"}
- Solicita ayudas/subvenciones: {'Sí' if params.get("solicita_ayuda") else 'No'}

PLAN DE TRAMITACIÓN ({len(tramites)} trámites, ~{plan.get("tiempo_total_estimado_dias", "?")} días estimados):
{resumen_tramites}

ADVERTENCIAS DEL MOTOR:
{adverts_str}

Cuando el usuario pregunte sobre "el expediente", "la instalación", "los trámites" o use 
pronombres que hagan referencia al contexto, usa SIEMPRE la información anterior.""")

    # --- Capa 3: Normativa JSON del vertical ---
    if comunidad and tipo_instalacion:
        normativa_json = _cargar_normativa(comunidad, tipo_instalacion)
        if normativa_json:
            nivel = normativa_json.get("nivel_verificacion")
            estado = normativa_json.get("estado")
            aviso_auditoria = normativa_json.get("aviso")
            huecos = normativa_json.get("huecos_verificacion") or []
            revisado_por = normativa_json.get("revisado_por")
            # Filtrar fichero si no es elegible
            # Si no tiene nivel de verificación, se ignora por seguridad
            if nivel:
                # Podar json si tenemos un plan para no ahogar la ventana de contexto
                if plan:
                    reglas_aplicadas = {t.get("regla_id") for t in plan.get("tramites", []) if t.get("regla_id")}
                    if reglas_aplicadas:
                        reglas_filtradas = [r for r in normativa_json.get("reglas", []) if r.get("id") in reglas_aplicadas]
                        normativa_json["reglas"] = reglas_filtradas

                normativa_str = json.dumps(normativa_json, ensure_ascii=False)
                if len(normativa_str) > 12000:
                    normativa_str = normativa_str[:12000] + "...[normativa truncada por longitud]"

                severidad = severidad_verificacion(normativa_json)

                aviso_nivel = f"\nATENCIÓN: Los datos normativos de esta comunidad y tecnología tienen nivel de verificación: '{nivel}'"
                if estado:
                    aviso_nivel += f" (estado de auditoría interna: '{estado}')"
                aviso_nivel += "."

                if severidad == "critico":
                    aviso_nivel += (
                        " Este es el nivel de fiabilidad MÁS BAJO posible. DEBES advertir explícitamente "
                        "al usuario, en tu primera respuesta sobre esta comunidad/tecnología, que estos datos "
                        "son un borrador no verificado y que debe contrastarlos con el organismo oficial antes "
                        "de actuar. No afirmes plazos, tasas ni requisitos como si fueran seguros."
                    )
                elif severidad == "atencion":
                    aviso_nivel += (
                        " Informa al usuario transparentemente sobre este nivel, indicando que la información "
                        "podría requerir contraste con el organismo oficial correspondiente."
                    )
                else:
                    aviso_nivel += " Puedes afirmar con seguridad la validez de estos datos."

                if not revisado_por:
                    aviso_nivel += (
                        "\nEstos datos NO tienen un revisor humano identificado "
                        "(campo 'revisado_por' vacío). No los presentes como validados "
                        "por un experto de PermitFlow; trátalos igual que un borrador "
                        "generado a partir de fuentes públicas sin doble verificación."
                    )

                if aviso_auditoria:
                    aviso_nivel += f"\nNota de la última auditoría de contenido: {aviso_auditoria}"

                if huecos:
                    huecos_str = "\n".join(f"  - {h}" for h in huecos[:8])
                    aviso_nivel += (
                        f"\nHuecos de verificación documentados (cítalos si el usuario pregunta por la "
                        f"fiabilidad de estos datos, en vez de dar una respuesta genérica):\n{huecos_str}"
                    )

                sections.append(f"""NORMATIVA JSON DEL VERTICAL (motor de reglas interno):
Usa esta información para responder preguntas sobre base legal, condiciones de aplicación y detalles de los trámites.
{aviso_nivel}

{normativa_str}""")
            else:
                sections.append(f"AVISO INTERNO: La normativa para {comunidad} / {tipo_instalacion} no tiene el campo 'nivel_verificacion'. Por seguridad, no se han inyectado las reglas. DEBES indicar al usuario que no tienes los datos verificados para esta tecnología en esta comunidad.")

    return "\n\n---\n\n".join(sections)
