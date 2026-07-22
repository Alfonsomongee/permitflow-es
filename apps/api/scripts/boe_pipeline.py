"""
boe_pipeline.py v2 — PermitFlow ES
====================================
Mejoras sobre v1:
  1. Usa la API REST oficial del BOE (api.boe.es/BOEAPI/v2) además del scraping HTML.
     → Datos estructurados en XML: id, título, fecha, departamento, texto completo.
  2. Guarda alertas directamente en Supabase (tabla alertas_boe) además del fichero local.
  3. Genera un diff sugerido del JSON normativo afectado (qué trámite cambiar y cómo).
  4. Compatible con la infraestructura existente: ai_client.py, config.py, PALABRAS_CLAVE.

Flujo:
  BOE API oficial → filtro palabras clave → DeepSeek (análisis + diff sugerido)
       ↓                                           ↓
  BOJA RSS feed  →                        Supabase alertas_boe
                                                   ↓
                                          borrador JSON local (como antes)
                                                   ↓
                                          Email notificación (Resend)
"""

import os
import sys
import json
import asyncio
import httpx
import feedparser
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from io import BytesIO
import ssl
import urllib.request
import urllib.parse

# Aseguramos que puede importar desde apps/api
API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))

from servicios.ai_client import completar
from config import settings
import resend

# ─── Configuración ────────────────────────────────────────────────────────────

PALABRAS_CLAVE = [
    "instalacion electrica", "baja tension", "alta tension",
    "autoconsumo", "fotovoltaica", "solar", "renovable",
    "climatizacion", "aerotermia", "bomba de calor",
    "agua caliente sanitaria", "acs", "solar termica",
    "gas", "combustible gaseoso", "instalacion receptora",
    "RITE", "REBT", "RD 244", "RD 1183", "RD 842",
    "instalador autorizado", "certificado instalacion",
    "registro autoconsumo", "distribuidor", "acceso red",
    "tramitacion", "autorizacion administrativa",
    "industria energia", "seguridad industrial",
    # Nuevas palabras clave basadas en normativa 2025-2026
    "MOVES", "infraestructura recarga", "vehiculo electrico", "IRVE",
    "gas fluorado", "refrigerante", "F-Gas",
    "legionella", "agua caliente", "prevencion legionela",
    "CNMC", "circular", "capacidad acceso", "conexion red",
    "FEDER", "INEA", "eficiencia energetica",
    "codigo tecnico edificacion", "CTE", "DB-HE",
]

# Verticales del motor → para mapear qué JSONs afecta cada alerta
VERTICALES_POR_KEYWORD = {
    "fotovoltaica_autoconsumo": [
        "autoconsumo", "fotovoltaica", "solar", "RD 244", "RAC",
        "excedentes", "FEDER", "INEA", "DB-HE", "CTE",
    ],
    "irve": [
        "MOVES", "recarga", "vehiculo electrico", "IRVE", "TECI",
        "capacidad acceso", "circular CNMC", "RD 1183",
    ],
    "climatizacion_aerotermia": [
        "climatizacion", "aerotermia", "bomba de calor", "RITE",
        "gas fluorado", "refrigerante", "F-Gas", "OCA",
    ],
    "acs": [
        "agua caliente sanitaria", "acs", "legionella", "RITE",
        "prevencion legionela", "RD 487", "ROESBA",
    ],
    "gas_baja_presion": [
        "gas", "combustible gaseoso", "instalacion receptora",
        "RIGLO", "IRG", "Nedgia", "GLP",
    ],
}

CCAA_POR_KEYWORD = {
    "andalucia": ["BOJA", "Junta de Andalucía", "Andalucía", "andaluz"],
    "cataluna": ["DOGC", "Cataluña", "catalán", "Generalitat"],
    "madrid": ["BOCM", "Comunidad de Madrid", "madrileño"],
    "comunidad_valenciana": ["DOCV", "Comunitat Valenciana", "valenciano"],
    "pais_vasco": ["BOPV", "País Vasco", "Euskadi", "vasca"],
}

BORRADORES_DIR = API_DIR / "motor_normativo" / "borradores"
REGLAS_DIR = API_DIR / "motor_normativo" / "reglas"

# ─── Cliente Supabase (opcional — no falla si no está configurado) ────────────

def get_supabase_client():
    """Devuelve cliente Supabase si las variables están configuradas, si no None."""
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL") or getattr(settings, "SUPABASE_URL", None)
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
        if url and key:
            return create_client(url, key)
    except ImportError:
        pass
    return None


# ─── Fuente 1: API oficial del BOE ────────────────────────────────────────────

def descargar_boe_api_oficial(dias_atras: int = 7) -> list[dict]:
    """
    Usa la API REST oficial del BOE: https://api.boe.es/BOEAPI/v2
    Devuelve disposiciones estructuradas en XML sin necesidad de scraping.

    Documentación: https://www.boe.es/datosabiertos/api/boe/v2/
    """
    documentos = []
    base_url = "https://api.boe.es/BOEAPI/v2/BOE/sumario"

    with httpx.Client(follow_redirects=True, timeout=20) as client:
        for i in range(dias_atras):
            fecha_dt = datetime.now() - timedelta(days=i)
            # BOE no se publica sábados ni domingos
            if fecha_dt.weekday() in (5, 6):
                continue

            fecha_id = fecha_dt.strftime("%Y%m%d")

            try:
                response = client.get(
                    f"{base_url}/{fecha_id}",
                    headers={"Accept": "application/xml"},
                    timeout=15,
                )
                if response.status_code != 200:
                    print(f"  BOE API: {fecha_id} → {response.status_code}")
                    continue

                # Parsear XML estructurado
                root = ET.fromstring(response.content)

                # El sumario contiene <item> dentro de <diario><seccion><departamento>
                for item in root.iter("item"):
                    titulo_el = item.find("titulo")
                    id_el = item.find("identificador")
                    url_html_el = item.find("url_html")
                    url_pdf_el = item.find("url_pdf")
                    dept_el = item.find("departamento")

                    if titulo_el is None or id_el is None:
                        continue

                    titulo = titulo_el.text or ""
                    id_doc = id_el.text or ""

                    documentos.append({
                        "id": id_doc,
                        "titulo": titulo,
                        "fecha": fecha_id,
                        "url_html": url_html_el.text if url_html_el is not None else f"https://www.boe.es/diario_boe/txt.php?id={id_doc}",
                        "url_pdf": url_pdf_el.text if url_pdf_el is not None else f"https://www.boe.es/boe/dias/{fecha_dt.strftime('%Y/%m/%d')}/pdfs/{id_doc}.pdf",
                        "departamento": dept_el.text if dept_el is not None else "",
                        "fuente": "BOE_API_OFICIAL",
                    })

            except Exception as e:
                print(f"  BOE API error {fecha_id}: {e}")
                # Fallback: seguimos con el resto de días
                continue

    print(f"  BOE API oficial: {len(documentos)} disposiciones extraídas")
    return documentos


def descargar_texto_boe_api(id_doc: str) -> str:
    """
    Descarga el texto completo de una disposición BOE usando la API oficial.
    Más fiable que el scraping HTML anterior.
    """
    url = f"https://api.boe.es/BOEAPI/v2/BOE/disposicion/{id_doc}"
    try:
        with httpx.Client(follow_redirects=True, timeout=20) as client:
            response = client.get(url, headers={"Accept": "application/xml"})
            if response.status_code != 200:
                return ""

            root = ET.fromstring(response.content)
            # El texto está en <texto> dentro de la disposición
            texto_el = root.find(".//texto")
            if texto_el is not None:
                # Extraer todo el texto del nodo y sus hijos
                texto = "".join(texto_el.itertext())
                # Limitar a 8000 caracteres para no saturar el LLM
                return texto[:8000]
    except Exception as e:
        print(f"  Error descargando texto {id_doc}: {e}")
    return ""


# ─── Fuente 2: Diarios autonómicos (RSS — igual que v1) ──────────────────────

def descargar_diarios_autonomicos(dias_atras: int = 7) -> list[dict]:
    """Parsea feeds RSS de diarios autonómicos."""
    feeds = {
        "BOJA": "https://www.juntadeandalucia.es/boja/rss.xml",
        "BOCM": "https://www.bocm.es/rss/bocm_rss.xml",
        "DOGC": "https://portaldogc.gencat.cat/utilsEADOP/RSS/DOGC/RSS_ca.xml",
    }

    documentos = []
    fecha_limite = datetime.now() - timedelta(days=dias_atras)

    for nombre_feed, url_feed in feeds.items():
        try:
            feed = feedparser.parse(url_feed)
            for entry in feed.entries:
                try:
                    pub_date = datetime(*entry.published_parsed[:6])
                except (AttributeError, TypeError):
                    pub_date = datetime.now()

                if pub_date < fecha_limite:
                    continue

                documentos.append({
                    "id": entry.get("id", entry.get("link", "")),
                    "titulo": entry.get("title", ""),
                    "fecha": pub_date.strftime("%Y%m%d"),
                    "url_html": entry.get("link", ""),
                    "url_pdf": "",
                    "departamento": nombre_feed,
                    "fuente": f"RSS_{nombre_feed}",
                })
        except Exception as e:
            print(f"  Error leyendo feed {nombre_feed}: {e}")

    print(f"  Diarios autonómicos: {len(documentos)} entradas extraídas")
    return documentos


# ─── Filtrado ─────────────────────────────────────────────────────────────────

def es_relevante(titulo: str, texto: str = "") -> bool:
    """Filtra por palabras clave en título y texto."""
    contenido = (titulo + " " + texto).lower()
    return any(kw.lower() in contenido for kw in PALABRAS_CLAVE)


def detectar_verticales(titulo: str, texto: str) -> list[str]:
    """Detecta qué verticales del motor están afectados."""
    contenido = (titulo + " " + texto).lower()
    afectados = []
    for vertical, keywords in VERTICALES_POR_KEYWORD.items():
        if any(kw.lower() in contenido for kw in keywords):
            afectados.append(vertical)
    return afectados or ["general"]


def detectar_ccaa(titulo: str, texto: str, departamento: str) -> list[str]:
    """Detecta qué CCAA están afectadas."""
    contenido = (titulo + " " + texto + " " + departamento).lower()
    afectadas = []
    for ccaa, keywords in CCAA_POR_KEYWORD.items():
        if any(kw.lower() in contenido for kw in keywords):
            afectadas.append(ccaa)
    # Si no detecta ninguna CCAA específica, asumimos que es estatal
    return afectadas or ["estatal"]


# ─── Análisis con DeepSeek ────────────────────────────────────────────────────

async def analizar_con_deepseek(titulo: str, texto: str) -> dict:
    """
    Analiza el documento con DeepSeek y devuelve un dict con:
    - es_relevante, resumen, nivel_urgencia
    - tipos_instalacion_afectados, ccaa_afectadas
    - tramites_nuevos, tramites_modificados, tramites_eliminados
    - diff_sugerido (qué cambiar en el JSON normativo)
    """
    system = """Eres un experto en normativa española de instalaciones técnicas 
(fotovoltaica, climatización, gas, recarga VE, ACS) especializado en identificar 
cambios regulatorios que afecten a los trámites de legalización.

Responde SOLO con JSON válido, sin texto adicional."""

    prompt = f"""Analiza este documento normativo y determina si afecta a los 
trámites de legalización de instalaciones técnicas en España.

TÍTULO: {titulo}

TEXTO:
{texto[:4000]}

Responde con este JSON exacto:
{{
  "es_relevante": true/false,
  "resumen": "descripción breve del cambio normativo (máx 200 chars)",
  "nivel_urgencia": "alta|media|baja",
  "tipo": "normativa_nueva|modificacion|derogacion",
  "tipos_instalacion_afectados": ["fotovoltaica_autoconsumo","irve","climatizacion_aerotermia","acs","gas_baja_presion"],
  "ccaa_afectadas": ["andalucia","estatal",...],
  "tramites_nuevos": [
    {{"nombre": "...", "organismo": "...", "base_legal": "...", "descripcion": "..."}}
  ],
  "tramites_modificados": [
    {{"nombre_actual": "...", "campo_afectado": "plazo_estimado_dias|coste_estimado|documentos_requeridos|base_legal", "valor_anterior": "...", "valor_nuevo": "...", "justificacion": "..."}}
  ],
  "tramites_eliminados": ["nombre del trámite que ya no aplica"],
  "diff_sugerido": {{
    "descripcion": "Qué hay que cambiar en el motor normativo",
    "archivos_afectados": ["andalucia/fotovoltaica_autoconsumo.json"],
    "cambios": [
      {{"tipo": "modificar_campo|añadir_tramite|eliminar_tramite|añadir_regla", "ruta": "reglas[0].tramites[2].plazo_estimado_dias", "valor_actual": 30, "valor_nuevo": 15, "motivo": "..."}}
    ]
  }},
  "fuente_legal": "RD X/XXXX, Art. X — descripción"
}}

Si el documento NO es relevante para instalaciones técnicas, devuelve solo:
{{"es_relevante": false, "resumen": "no relevante", "nivel_urgencia": "baja", "tipo": "normativa_nueva", "tipos_instalacion_afectados": [], "ccaa_afectadas": [], "tramites_nuevos": [], "tramites_modificados": [], "tramites_eliminados": [], "diff_sugerido": {{"descripcion": "", "archivos_afectados": [], "cambios": []}}, "fuente_legal": ""}}"""

    try:
        respuesta = await completar(
            prompt=prompt,
            system=system,
            max_tokens=2000,
            temperatura=0.1,
            json_mode=True,
        )
        return json.loads(respuesta)
    except Exception as e:
        print(f"  Error DeepSeek: {e}")
        return {
            "es_relevante": False,
            "resumen": f"Error en análisis: {e}",
            "nivel_urgencia": "baja",
            "tipo": "normativa_nueva",
            "tipos_instalacion_afectados": [],
            "ccaa_afectadas": [],
            "tramites_nuevos": [],
            "tramites_modificados": [],
            "tramites_eliminados": [],
            "diff_sugerido": {"descripcion": "", "archivos_afectados": [], "cambios": []},
            "fuente_legal": "",
        }


# ─── Guardar en Supabase ──────────────────────────────────────────────────────

async def guardar_en_supabase(doc: dict, analisis: dict) -> bool:
    """
    Inserta la alerta en la tabla alertas_boe de Supabase.
    Si no hay conexión, no falla — simplemente devuelve False.
    """
    supabase = get_supabase_client()
    if not supabase:
        print("  Supabase no configurado — alerta solo en fichero local")
        return False

    try:
        data = {
            "tipo": analisis.get("tipo", "normativa_nueva"),
            "titulo": doc.get("titulo", "")[:500],
            "resumen": analisis.get("resumen", "")[:1000],
            "fuente_url": doc.get("url_html", ""),
            "ccaa_afectadas": analisis.get("ccaa_afectadas", []),
            "verticales_afectados": analisis.get("tipos_instalacion_afectados", []),
            "leida": False,
            # Guardamos el diff completo en un campo extra (añadir a schema si no existe)
            # "diff_sugerido": analisis.get("diff_sugerido"),
        }

        result = supabase.table("alertas_boe").insert(data).execute()
        print(f"  ✓ Alerta guardada en Supabase: {doc['titulo'][:60]}...")
        return True
    except Exception as e:
        print(f"  Error guardando en Supabase: {e}")
        return False


# ─── Guardar borrador local (compatible con v1) ───────────────────────────────

def guardar_borrador(analisis: dict, doc: dict):
    """Guarda borrador JSON local + actualiza PENDIENTES.md."""
    BORRADORES_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nombre = f"{timestamp}_{doc['id'][:20].replace('/', '_')}.json"
    ruta = BORRADORES_DIR / nombre

    borrador = {
        "documento": {
            "id": doc.get("id"),
            "titulo": doc.get("titulo"),
            "fecha": doc.get("fecha"),
            "url": doc.get("url_html"),
            "fuente": doc.get("fuente"),
        },
        "analisis": analisis,
        "revisado": False,
        "descartado": False,
        "creado_en": datetime.now().isoformat(),
    }

    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(borrador, f, ensure_ascii=False, indent=2)

    # Actualizar PENDIENTES.md
    pendientes_path = BORRADORES_DIR / "PENDIENTES.md"
    with open(pendientes_path, "a", encoding="utf-8") as f:
        urgencia = analisis.get("nivel_urgencia", "baja").upper()
        f.write(f"\n## [{urgencia}] {doc['titulo'][:80]}\n")
        f.write(f"- Archivo: `{nombre}`\n")
        f.write(f"- Resumen: {analisis.get('resumen', 'N/A')}\n")
        f.write(f"- Verticales: {', '.join(analisis.get('tipos_instalacion_afectados', []))}\n")
        f.write(f"- CCAA: {', '.join(analisis.get('ccaa_afectadas', []))}\n")
        f.write(f"- URL: {doc.get('url_html', '')}\n")

    print(f"  ✓ Borrador guardado: {nombre}")


# ─── Extracción de texto (fallback para RSS autonómicos) ─────────────────────

async def extraer_texto_html(url: str, max_chars: int = 6000) -> str:
    """Extrae texto plano de una URL HTML. Usado como fallback para BOJA/BOCM/DOGC."""
    if not url:
        return ""
    try:
        from html.parser import HTMLParser

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.texts = []
                self.skip_tags = {"script", "style", "nav", "header", "footer"}
                self.current_skip = False

            def handle_starttag(self, tag, attrs):
                if tag in self.skip_tags:
                    self.current_skip = True

            def handle_endtag(self, tag):
                if tag in self.skip_tags:
                    self.current_skip = False

            def handle_data(self, data):
                if not self.current_skip:
                    stripped = data.strip()
                    if stripped:
                        self.texts.append(stripped)

        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return ""
            parser = TextExtractor()
            parser.feed(response.text)
            return " ".join(parser.texts)[:max_chars]
    except Exception:
        return ""


# ─── Notificación por email ───────────────────────────────────────────────────

def enviar_notificacion(alertas_procesadas: list[dict]):
    """Envía resumen por email usando Resend."""
    resend_key = getattr(settings, "RESEND_API_KEY", "") or os.getenv("RESEND_API_KEY", "")
    email_dest = getattr(settings, "NOTIFICATION_EMAIL", "") or os.getenv("NOTIFICATION_EMAIL", "")

    if not resend_key or not email_dest:
        print("  Email no configurado — omitiendo notificación")
        return

    resend.api_key = resend_key

    urgentes = [a for a in alertas_procesadas if a["analisis"].get("nivel_urgencia") == "alta"]
    medias = [a for a in alertas_procesadas if a["analisis"].get("nivel_urgencia") == "media"]

    lines = [f"<h2>Pipeline BOE — {datetime.now().strftime('%d/%m/%Y')}</h2>"]
    lines.append(f"<p>{len(alertas_procesadas)} cambios detectados ({len(urgentes)} urgentes, {len(medias)} medios)</p>")

    if urgentes:
        lines.append("<h3>🔴 Urgentes</h3><ul>")
        for a in urgentes:
            lines.append(f"<li><b>{a['doc']['titulo'][:80]}</b><br>{a['analisis'].get('resumen', '')}</li>")
        lines.append("</ul>")

    if medias:
        lines.append("<h3>🟡 Medios</h3><ul>")
        for a in medias:
            lines.append(f"<li><b>{a['doc']['titulo'][:80]}</b><br>{a['analisis'].get('resumen', '')}</li>")
        lines.append("</ul>")

    lines.append("<p><a href='https://tuapp.vercel.app/alertas'>Ver todas las alertas en PermitFlow →</a></p>")

    from_domain = getattr(settings, "RESEND_FROM_DOMAIN", "") or os.getenv("RESEND_FROM_DOMAIN", "permitflow.es")

    try:
        resend.Emails.send({
            "from": f"Pipeline BOE <noreply@{from_domain}>",
            "to": email_dest,
            "subject": f"[PermitFlow] {len(alertas_procesadas)} cambios normativos detectados",
            "html": "\n".join(lines),
        })
        print(f"  ✓ Email enviado a {email_dest}")
    except Exception as e:
        print(f"  Error enviando email: {e}")


# ─── Orquestador principal ────────────────────────────────────────────────────

async def main():
    print(f"\n{'='*60}")
    print(f"Pipeline BOE v2 — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}\n")

    # 1. Descargar documentos de todas las fuentes
    print("1. Descargando documentos...")
    docs_boe = descargar_boe_api_oficial(dias_atras=7)
    docs_autonomicos = descargar_diarios_autonomicos(dias_atras=7)
    todos = docs_boe + docs_autonomicos
    print(f"   Total: {len(todos)} documentos")

    # 2. Filtrar por palabras clave
    print("\n2. Filtrando por relevancia...")
    relevantes_previo = [d for d in todos if es_relevante(d["titulo"])]
    print(f"   {len(relevantes_previo)} documentos pasan el filtro inicial")

    # 3. Analizar cada documento relevante
    print("\n3. Analizando con DeepSeek...")
    alertas_procesadas = []

    for i, doc in enumerate(relevantes_previo):
        print(f"\n   [{i+1}/{len(relevantes_previo)}] {doc['titulo'][:70]}...")

        # Obtener texto completo según la fuente
        if doc["fuente"] == "BOE_API_OFICIAL" and doc.get("id"):
            texto = descargar_texto_boe_api(doc["id"])
        else:
            texto = await extraer_texto_html(doc.get("url_html", ""))

        # Analizar con DeepSeek
        analisis = await analizar_con_deepseek(doc["titulo"], texto)

        # Si el LLM confirma que es relevante
        if analisis.get("es_relevante"):
            print(f"   ✓ RELEVANTE [{analisis.get('nivel_urgencia', 'baja').upper()}]: {analisis.get('resumen', '')[:80]}")

            # Guardar borrador local
            guardar_borrador(analisis, doc)

            # Guardar en Supabase
            await guardar_en_supabase(doc, analisis)

            alertas_procesadas.append({"doc": doc, "analisis": analisis})
        else:
            print(f"   ✗ Descartado por el LLM")

        # Pequeña pausa para no saturar la API
        await asyncio.sleep(0.5)

    # 4. Resumen y notificación
    print(f"\n{'='*60}")
    print(f"Resultado: {len(alertas_procesadas)} alertas relevantes")

    if alertas_procesadas:
        urgentes = sum(1 for a in alertas_procesadas if a["analisis"].get("nivel_urgencia") == "alta")
        print(f"  - Alta urgencia: {urgentes}")
        print(f"  - Otros: {len(alertas_procesadas) - urgentes}")

        print("\n4. Enviando notificación...")
        enviar_notificacion(alertas_procesadas)
    else:
        print("  Sin cambios normativos relevantes esta semana.")

    print(f"\nBorradores en: {BORRADORES_DIR}")
    print("Para revisar: uv run python scripts/revisar_borrador.py")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
