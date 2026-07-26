import json
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from models.expediente import Expediente
import os

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
    sections.append("""Eres el asistente normativo de PermitFlow ES, una plataforma SaaS B2B que digitaliza y 
automatiza la tramitación burocrática del sector energético en España.

Tu función es ayudar a instaladoras, gestorías y técnicos a entender qué trámites necesitan 
realizar para legalizar instalaciones técnicas en las diferentes Comunidades Autónomas.

Los 5 verticales disponibles en Andalucía (cobertura completa) son:
- Fotovoltaica de autoconsumo (RD 244/2019, PUES, RAC en MITECO)
- Recarga de vehículos eléctricos IRVE (REBT ITC-BT-52, PUES/TECI, MOVES III)
- Climatización y aerotermia (RITE, RSIF, F-Gas UE 2024/573)
- Agua caliente sanitaria ACS (RITE, RD 487/2022 Legionella)
- Gas baja presión (RIGLO RD 919/2006, IRG, UNE 60670)

Para el resto de Comunidades Autónomas, la cobertura actual depende de la disponibilidad de datos verificados.

Reglas de comportamiento crítico ("Grounding estricto"):
- Responde SIEMPRE en español.
- Toda afirmación normativa (trámite, plazo, tasa, organismo, plataforma, norma) debe proceder de los datos proporcionados a continuación en este contexto.
- NUNCA inventes normativa, plazos, plataformas ni importes que no aparezcan en el contexto proporcionado.
- Si el dato exacto no está en el contexto, DEBES decir: "No tengo ese dato verificado en mi base para esta comunidad/tecnología. Puedo ayudarte con lo que sí está detallado."
- Si se indica que la información del vertical es "genérica" o "no verificada", comunícalo explícitamente al usuario.
- Si el usuario pregunta algo fuera del ámbito de tramitaciones técnicas en España, indícale amablemente que tu especialidad son los trámites de instalaciones.""")

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

                aviso_nivel = ""
                if nivel != "verificada":
                    aviso_nivel = f"\nATENCIÓN: Los datos normativos tienen nivel '{nivel}'. Informa al usuario que la información puede no estar verificada exhaustivamente y recomienda consultar con un técnico."

                sections.append(f"""NORMATIVA JSON DEL VERTICAL (motor de reglas interno):
Usa esta información para responder preguntas sobre base legal, condiciones de aplicación y detalles de los trámites.
{aviso_nivel}

{normativa_str}""")
            else:
                sections.append(f"AVISO INTERNO: La normativa para {comunidad} / {tipo_instalacion} no tiene el campo 'nivel_verificacion'. Por seguridad, no se han inyectado las reglas. DEBES indicar al usuario que no tienes los datos verificados para esta tecnología en esta comunidad.")

    return "\n\n---\n\n".join(sections)
