

### File: apps/api/scripts\boe_pipeline.py

```
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

```


### File: apps/api/scripts\generate_andalucia_jsons.py

```
import json
from pathlib import Path
import copy

BASE_DIR = Path("c:/Users/aphmo/Proyectos/permitflow-es/apps/api/motor_normativo/reglas/andalucia")
BASE_DIR.mkdir(parents=True, exist_ok=True)

# 1. Update Fotovoltaica
with open(BASE_DIR / "fotovoltaica_autoconsumo.json", "r", encoding="utf-8") as f:
    fv = json.load(f)

fv["version"] = "1.1.0"
fv["ultima_revision"] = "2026-06-17"
fv["revisado_por"] = "investigacion-deep-research-verificada"

fv["fuentes"] = [
    "RD 244/2019, de 5 de abril — autoconsumo eléctrico",
    "RD 1183/2020, de 29 de diciembre — acceso y conexión a red",
    "Decreto 59/2005, de 1 de marzo + Orden de 5 de marzo de 2013",
    "Resolución de 26 de mayo de 2021, DGRN Andalucía"
]

for regla in fv["reglas"]:
    # Actualizar condicion en AND-FV-002
    if regla["id"] == "AND-FV-002":
        # Eliminar el tramite de autorizacion administrativa previa
        regla["tramites"] = [t for t in regla["tramites"] if "Autorización administrativa previa" not in t["nombre"]]
        # Reordenar
        for idx, t in enumerate(regla["tramites"], 1):
            t["orden"] = idx

    # Actualizar base_legal y plataforma en todos
    for t in regla["tramites"]:
        if t["base_legal"] and "Decreto 141/2012" in t["base_legal"]:
            t["base_legal"] = t["base_legal"].replace("Decreto 141/2012", "Decreto 59/2005, de 1 de marzo + Orden de 5 de marzo de 2013").replace(" Andalucía", "")
            if "Art. 4" in t["base_legal"] or "Art. 5" in t["base_legal"] or "Art. 8" in t["base_legal"]:
                t["base_legal"] = "Decreto 59/2005, de 1 de marzo + Orden de 5 de marzo de 2013"

        if "RAC" in t["nombre"] or "MITECO" in t["organismo"]:
            t["plataforma"] = "MITECO sede electrónica"
        elif "Junta de Andalucía" in t["organismo"] or "Industria" in t["organismo"]:
            t["plataforma"] = "PUES"
        else:
            t["plataforma"] = None

# Añadir AND-FV-004
fv["reglas"].append({
    "id": "AND-FV-004",
    "descripcion": "Autoconsumo, potencia > 500kW",
    "condicion": {">": [{"var": "potencia_kw"}, 500]},
    "tramites": [
        {
            "orden": 1,
            "nombre": "Autorización Administrativa Previa",
            "organismo": "Junta de Andalucía",
            "base_legal": "Ley 24/2013 del Sector Eléctrico",
            "plazo_estimado_dias": 180,
            "plazo_legal_dias": None,
            "documentos_requeridos": ["proyecto_tecnico_visado", "estudio_impacto_ambiental"],
            "formulario_ref": "9588",
            "paralelo_con": None,
            "notas": "Código 9588 Junta Andalucía",
            "plataforma": "PUES",
            "obsoleta": False,
            "obsoleta_desde": None
        },
        {
            "orden": 2,
            "nombre": "Autorización Administrativa de Construcción",
            "organismo": "Junta de Andalucía",
            "base_legal": "Ley 24/2013 del Sector Eléctrico",
            "plazo_estimado_dias": 90,
            "plazo_legal_dias": None,
            "documentos_requeridos": ["proyecto_ejecucion"],
            "formulario_ref": "11944",
            "paralelo_con": None,
            "notas": "Código 11944 Junta Andalucía",
            "plataforma": "PUES",
            "obsoleta": False,
            "obsoleta_desde": None
        },
        {
            "orden": 3,
            "nombre": "PUES / Autorización de Explotación",
            "organismo": "Junta de Andalucía",
            "base_legal": "Ley 24/2013 del Sector Eléctrico",
            "plazo_estimado_dias": 30,
            "plazo_legal_dias": None,
            "documentos_requeridos": ["certificado_final_obra"],
            "formulario_ref": "11954",
            "paralelo_con": None,
            "notas": "Código 11954 Junta Andalucía",
            "plataforma": "PUES",
            "obsoleta": False,
            "obsoleta_desde": None
        }
    ]
})

with open(BASE_DIR / "fotovoltaica_autoconsumo.json", "w", encoding="utf-8") as f:
    json.dump(fv, f, ensure_ascii=False, indent=2)


# 2. Climatizacion
clim = {
    "tipo_instalacion": "climatizacion_aerotermia",
    "comunidad": "andalucia",
    "version": "1.0.0",
    "ultima_revision": "2026-06-17",
    "revisado_por": "investigacion-deep-research-verificada",
    "fuentes": [
        "RD 1027/2007 RITE",
        "RD 552/2019 RSIF",
        "RD 115/2017 gases fluorados",
        "Reglamento UE 2024/573",
        "Decreto 59/2005 Junta Andalucía",
        "Orden 5 de marzo de 2013 Junta Andalucía"
    ],
    "reglas": [
        {
            "id": "AND-CLIM-001",
            "descripcion": "Potencia < 5kW",
            "condicion": {"<": [{"var": "potencia_kw"}, 5]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia/DR municipal si hay obra exterior", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Obligaciones gases fluorados", "organismo": "Empresa mantenedora certificada", "base_legal": "RD 115/2017 gases fluorados", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-CLIM-002",
            "descripcion": "Potencia >= 5kW y <= 70kW",
            "condicion": {"and": [{">=": [{"var": "potencia_kw"}, 5]}, {"<=": [{"var": "potencia_kw"}, 70]}]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia/DR municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Memoria técnica RITE", "organismo": "Técnico/instalador habilitado", "base_legal": "RD 1027/2007 Art. 15.1.b y Art. 17", "plazo_estimado_dias": 3, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Ejecución por empresa habilitada RITE/frigorista", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Certificado de instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007 Arts. 22-24", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Documentación RSIF Nivel 1 si aplica", "organismo": "Empresa habilitada", "base_legal": "RD 552/2019 Art. 21", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Comunicación PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005 + Orden 5 marzo 2013", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-CLIM-003",
            "descripcion": "Potencia > 70kW",
            "condicion": {">": [{"var": "potencia_kw"}, 70]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia/DR municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Proyecto técnico RITE", "organismo": "Técnico competente", "base_legal": "RD 1027/2007 Art. 15.1.a y Art. 16", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "RSIF Nivel 1 o 2 según compresores", "organismo": "Técnico competente", "base_legal": "RD 552/2019", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Ejecución + Dirección técnica", "organismo": "Director de obra", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Certificado instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Inspección OCA si procede", "organismo": "OCA", "base_legal": "RD 552/2019 IF-14", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 7, "nombre": "Comunicación PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005 + Orden 5 marzo 2013", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 8, "nombre": "Contrato mantenimiento", "organismo": "Empresa mantenedora", "base_legal": "RD 1027/2007 Arts. 25-26", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        }
    ]
}

with open(BASE_DIR / "climatizacion_aerotermia.json", "w", encoding="utf-8") as f:
    json.dump(clim, f, ensure_ascii=False, indent=2)


# 3. ACS
acs = {
    "tipo_instalacion": "acs",
    "comunidad": "andalucia",
    "version": "1.0.0",
    "ultima_revision": "2026-06-17",
    "revisado_por": "investigacion-deep-research-verificada",
    "fuentes": [
        "RD 1027/2007 RITE",
        "RD 450/2022 CTE DB-HE4",
        "RD 919/2006 ITC-ICG 07",
        "RD 487/2022 Legionella",
        "RD 614/2024",
        "Decreto 59/2005 Junta Andalucía",
        "Orden 5 marzo 2013"
    ],
    "reglas": [
        {
            "id": "AND-ACS-001",
            "descripcion": "Potencia < 5kW",
            "condicion": {"<": [{"var": "potencia_kw"}, 5]},
            "tramites": [
                {"orden": 1, "nombre": "DR municipal si hay obra exterior", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Justificación CTE DB-HE4 si edificio nuevo/reforma", "organismo": "Ayuntamiento", "base_legal": "RD 450/2022 CTE DB-HE4", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-ACS-002",
            "descripcion": "Potencia >= 5kW y <= 70kW, no industrial",
            "condicion": {"and": [{">=": [{"var": "potencia_kw"}, 5]}, {"<=": [{"var": "potencia_kw"}, 70]}, {"!=": [{"var": "uso"}, "industrial"]}]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Justificación HE4 si aplica", "organismo": "Técnico", "base_legal": "RD 450/2022", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Memoria técnica RITE", "organismo": "Técnico/instalador habilitado", "base_legal": "RD 1027/2007 Art.15.1.b", "plazo_estimado_dias": 3, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Ejecución empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Certificado instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 7, "nombre": "Entrega documentación + mantenimiento", "organismo": "Titular", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-ACS-003",
            "descripcion": "Potencia > 70kW",
            "condicion": {">": [{"var": "potencia_kw"}, 70]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Justificación HE4", "organismo": "Técnico", "base_legal": "RD 450/2022", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Proyecto técnico RITE", "organismo": "Técnico competente", "base_legal": "RD 1027/2007 Art.15.1.a", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Dirección técnica", "organismo": "Director de obra", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Ejecución empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Certificado instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 7, "nombre": "Inspección OCA si procede", "organismo": "OCA", "base_legal": "Normativa", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 8, "nombre": "PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 9, "nombre": "Contrato mantenimiento obligatorio", "organismo": "Empresa mantenedora", "base_legal": "RD 1027/2007 Arts.25-26", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 10, "nombre": "Plan Prevención Legionella si ACS centralizada colectiva", "organismo": "Titular/autoridad sanitaria", "base_legal": "RD 487/2022 modificado RD 614/2024", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Obligatorio en ACS con acumulación/retorno en edificios colectivos o terciarios", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-ACS-GAS",
            "descripcion": "Capa de gas sobre RITE",
            "condicion": {"and": [{">=": [{"var": "potencia_kw"}, 5]}, {"==": [{"var": "combustible"}, "gas"]}]},
            "tramites": [
                {"orden": 1, "nombre": "Certificado IRG-3 instalación individual", "organismo": "Distribuidora/suministradora", "base_legal": "RD 919/2006 ITC-ICG 07 Anexo", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Solo si hay caldera o calentador de gas. Distinto del certificado RITE.", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Puesta en servicio con distribuidora", "organismo": "Distribuidora", "base_legal": "RD 919/2006 ITC-ICG 07 Art.3.5.1", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        }
    ]
}

with open(BASE_DIR / "acs.json", "w", encoding="utf-8") as f:
    json.dump(acs, f, ensure_ascii=False, indent=2)


# 4. Gas Baja Presion
gas = {
    "tipo_instalacion": "gas_baja_presion",
    "comunidad": "andalucia",
    "version": "1.0.0",
    "ultima_revision": "2026-06-17",
    "revisado_por": "investigacion-deep-research-verificada",
    "fuentes": [
        "RD 919/2006 ITC-ICG 07",
        "RD 919/2006 ITC-ICG 03",
        "RD 919/2006 ITC-ICG 06",
        "RD 919/2006 ITC-ICG 09",
        "RD 1434/2002",
        "Decreto 94/2018 Junta Andalucía",
        "Decreto 59/2005 Junta Andalucía",
        "Decreto 441/2004 Andalucía derechos alta gas"
    ],
    "reglas": [
        {
            "id": "AND-GAS-001",
            "descripcion": "IRI doméstica gas natural simple",
            "condicion": {"and": [{"==": [{"var": "combustible"}, "gas_natural"]}, {"<=": [{"var": "potencia_kw"}, 70]}, {"==": [{"var": "uso"}, "residencial"]}]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal si hay obra", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Solicitud acometida si no existe", "organismo": "Nedgia/distribuidora zona", "base_legal": "RD 1434/2002 Art.25", "plazo_estimado_dias": 21, "plazo_legal_dias": 6, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Ejecución por empresa instaladora habilitada categoría A/B/C", "organismo": "Empresa instaladora", "base_legal": "RD 919/2006 ITC-ICG 09", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Certificado IRG-3 instalación individual", "organismo": "Distribuidora/archivo titular", "base_legal": "RD 919/2006 ITC-ICG 07 Anexo", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Contrato suministro + puesta en servicio distribuidora", "organismo": "Distribuidora", "base_legal": "RD 1434/2002 Arts.31-33", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "NO requiere PUES para instalaciones simples sin proyecto. La ITC-ICG 07 no exige comunicación administrativa para IRI doméstica < 70kW", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-GAS-002",
            "descripcion": "Instalación con proyecto obligatorio",
            "condicion": {"or": [{">": [{"var": "potencia_kw"}, 70]}, {"==": [{"var": "presion_bar"}, "5+"]}, {"==": [{"var": "uso"}, "industrial"]}]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Proyecto técnico instalación receptora", "organismo": "Técnico competente", "base_legal": "RD 919/2006 ITC-ICG 07 Apdo.3.2 y 3.3", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Obligatorio si >70kW individual, >2000kW común, presión >5 bar o técnicas especiales", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Ejecución empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 919/2006", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Certificados IRG correspondientes", "organismo": "Empresa habilitada", "base_legal": "RD 919/2006", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Comunicación PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005 + Orden 5 marzo 2013", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Solo en instalaciones que requieren proyecto", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Contrato suministro + puesta en servicio", "organismo": "Distribuidora/Comercializadora", "base_legal": "RD 1434/2002", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-GAS-003",
            "descripcion": "Depósito fijo GLP",
            "condicion": {"==": [{"var": "combustible"}, "glp_deposito"]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "casi siempre por obra civil", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Memoria técnica o proyecto", "organismo": "Técnico competente", "base_legal": "RD 919/2006 ITC-ICG 03", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Proyecto obligatorio si capacidad >13m3 o alimenta distribución canalizada", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Inspección inicial", "organismo": "OCA", "base_legal": "RD 919/2006", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Comunicación PUES antes del primer llenado", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "RD 919/2006 ITC-ICG 03 Apdo.5.6", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "El suministrador no puede llenar antes de la comunicación", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Contrato mantenimiento", "organismo": "Empresa mantenedora", "base_legal": "RD 919/2006", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Primer llenado por suministrador", "organismo": "Suministrador", "base_legal": "RD 919/2006", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-GAS-004",
            "descripcion": "GLP envases",
            "condicion": {"==": [{"var": "combustible"}, "glp_envases"]},
            "tramites": [
                {"orden": 1, "nombre": "Instalación por empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 919/2006 ITC-ICG 06", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Certificado instalación", "organismo": "Instalador", "base_legal": "RD 919/2006", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Sin comunicación administrativa. Titular e instalador conservan el certificado. Excepción: un único envase ≤15kg a aparato móvil no requiere ni esto.", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        }
    ]
}

with open(BASE_DIR / "gas_baja_presion.json", "w", encoding="utf-8") as f:
    json.dump(gas, f, ensure_ascii=False, indent=2)

print("JSONs generados con éxito.")

```


### File: apps/api/scripts\revisar_borrador.py

```
"""
revisar_borrador.py v2 — PermitFlow ES
========================================
Mejoras sobre v1:
  - Muestra el diff_sugerido de forma legible
  - Opción 'a' (aplicar) intenta aplicar el diff automáticamente al JSON
  - Actualiza el estado en Supabase al marcar como leída
"""

import sys
import json
from pathlib import Path
from datetime import datetime

API_DIR = Path(__file__).resolve().parent.parent
BORRADORES_DIR = API_DIR / "motor_normativo" / "borradores"
REGLAS_DIR = API_DIR / "motor_normativo" / "reglas"

sys.path.insert(0, str(API_DIR))


def aplicar_diff_automatico(diff: dict, reglas_dir: Path) -> bool:
    """
    Intenta aplicar el diff sugerido por el LLM a los JSONs del motor.
    Solo aplica cambios simples (modificar_campo). Los complejos requieren
    revisión manual.

    Devuelve una tupla (bool, dict) donde el bool indica si aplicó algo,
    y el dict contiene el contenido original de los archivos modificados
    para poder revertirlos si es necesario.
    """
    if not diff or not diff.get("cambios"):
        return False, {}

    aplicados = 0
    backups = {}
    for cambio in diff["cambios"]:
        tipo = cambio.get("tipo")
        if tipo != "modificar_campo":
            print(f"    ⚠ Cambio '{tipo}' requiere revisión manual")
            continue

        # Detectar qué archivo afecta
        for archivo in diff.get("archivos_afectados", []):
            ruta_json = (reglas_dir / archivo).resolve()

            # El LLM propone esta ruta a partir de texto externo (BOE/BOJA/etc.):
            # nunca debe poder salir de reglas_dir.
            if not ruta_json.is_relative_to(reglas_dir.resolve()):
                print(f"    ✗ Ruta fuera de reglas_dir, ignorada: {archivo}")
                continue

            if not ruta_json.exists():
                print(f"    ✗ Archivo no encontrado: {archivo}")
                continue

            try:
                with open(ruta_json, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Navegar por la ruta del campo (ej: "reglas[0].tramites[2].plazo_estimado_dias")
                ruta_campo = cambio.get("ruta", "")
                valor_nuevo = cambio.get("valor_nuevo")

                # Parser simple de rutas tipo "reglas[0].tramites[2].campo"
                obj = data
                partes = []
                import re
                tokens = re.split(r'[\.\[\]]', ruta_campo)
                tokens = [t for t in tokens if t]

                for t in tokens[:-1]:
                    if t.isdigit():
                        obj = obj[int(t)]
                    else:
                        obj = obj[t]

                campo_final = tokens[-1]
                if campo_final.isdigit():
                    obj[int(campo_final)] = valor_nuevo
                else:
                    obj[campo_final] = valor_nuevo

                # Actualizar versión y fecha
                if "version" in data:
                    partes_ver = data["version"].split(".")
                    partes_ver[-1] = str(int(partes_ver[-1]) + 1)
                    data["version"] = ".".join(partes_ver)
                data["ultima_revision"] = datetime.now().strftime("%Y-%m-%d")

                if ruta_json not in backups:
                    with open(ruta_json, "r", encoding="utf-8") as fb:
                        backups[ruta_json] = fb.read()

                with open(ruta_json, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                print(f"    ✓ Aplicado: {ruta_campo} → {valor_nuevo} en {archivo}")
                aplicados += 1

            except Exception as e:
                print(f"    ✗ Error aplicando diff en {archivo}: {e}")

    return aplicados > 0, backups


def main():
    if not BORRADORES_DIR.exists():
        print("No hay borradores pendientes.")
        return

    archivos = sorted(BORRADORES_DIR.glob("*.json"))

    pendientes = []
    for arch in archivos:
        try:
            with open(arch, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not data.get("revisado", False):
                    pendientes.append((arch, data))
        except Exception as e:
            print(f"Error leyendo {arch.name}: {e}")

    if not pendientes:
        print("✓ No hay borradores pendientes de revisión.")
        return

    print(f"\n{'='*60}")
    print(f"  {len(pendientes)} borradores pendientes")
    print(f"{'='*60}\n")

    for arch, data in pendientes:
        doc = data.get("documento", {})
        analisis = data.get("analisis", {})
        diff = analisis.get("diff_sugerido", {})

        urgencia = analisis.get("nivel_urgencia", "baja").upper()
        color = {"ALTA": "🔴", "MEDIA": "🟡", "BAJA": "🟢"}.get(urgencia, "⚪")

        print(f"{color} [{urgencia}] {doc.get('titulo', 'Sin título')[:80]}")
        print(f"   Resumen: {analisis.get('resumen', 'N/A')}")
        print(f"   Tipo: {analisis.get('tipo', 'N/A')}")
        print(f"   Verticales: {', '.join(analisis.get('tipos_instalacion_afectados', []))}")
        print(f"   CCAA: {', '.join(analisis.get('ccaa_afectadas', []))}")
        print(f"   URL: {doc.get('url', 'N/A')}")

        # Mostrar resumen del diff
        if diff and diff.get("cambios"):
            print(f"\n   📝 Diff sugerido: {diff.get('descripcion', '')}")
            for c in diff["cambios"][:3]:
                print(f"      • {c.get('tipo')}: {c.get('ruta', '')} → {c.get('valor_nuevo', '')}")
                print(f"        Motivo: {c.get('motivo', '')[:60]}")
            if len(diff["cambios"]) > 3:
                print(f"      ... y {len(diff['cambios']) - 3} cambios más")

        print(f"\n   Archivo: {arch.name}")
        print("-" * 60)

        while True:
            print("  Opciones: [v]er completo | [a]plicar diff auto | [s]í, marcar revisado | [n]o, descartar")
            resp = input("  → ").strip().lower()

            if resp == "v":
                print("\n" + json.dumps(analisis, indent=2, ensure_ascii=False) + "\n")

            elif resp == "a":
                print("\n  Intentando aplicar diff automáticamente...")
                ok, backups = aplicar_diff_automatico(diff, REGLAS_DIR)
                if ok:
                    import subprocess
                    print("  Ejecutando tests de validación (pytest)...")
                    # Asumimos que API_DIR es donde debe correr pytest
                    res = subprocess.run(
                        ["uv", "run", "pytest", "tests/"], 
                        cwd=str(API_DIR), 
                        capture_output=True, 
                        text=True
                    )
                    if res.returncode == 0:
                        print("  ✓ Diff aplicado y tests aprobados. Revisa los JSONs antes de commitear.")
                        data["revisado"] = True
                        data["aplicado_automaticamente"] = True
                        data["revisado_en"] = datetime.now().isoformat()
                    else:
                        print("  ✗ Los tests fallaron tras aplicar el diff. Revirtiendo cambios...")
                        for ruta, original in backups.items():
                            with open(ruta, "w", encoding="utf-8") as f:
                                f.write(original)
                        print("  ⚠ Borrador marcado como pendiente de revisión manual (tests fallidos).")
                        # Lo dejamos sin marcar como revisado para que vuelva a salir
                        data["revisado"] = False
                        data["aplicado_automaticamente"] = False
                        data.pop("revisado_en", None)
                        
                        # Guardar logs del error en el objeto para que el usuario pueda ver por qué falló
                        data["ultimo_error_tests"] = res.stdout + "\n" + res.stderr
                else:
                    print("  ✗ Diff requiere revisión manual o estaba vacío.")
                    data["revisado"] = True
                    data["aplicado_automaticamente"] = False
                    data["revisado_en"] = datetime.now().isoformat()

                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                break

            elif resp == "s":
                data["revisado"] = True
                data["revisado_en"] = datetime.now().isoformat()
                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print("  ✓ Marcado como revisado")
                break

            elif resp == "n":
                data["revisado"] = True
                data["descartado"] = True
                data["revisado_en"] = datetime.now().isoformat()
                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print("  ✗ Descartado")
                break
            else:
                print("  Respuesta no válida (v/a/s/n)")

        print()

    print("✓ Revisión completada.")


if __name__ == "__main__":
    main()

```


### File: apps/api/scripts\seed_validaciones.py

```
"""Siembra las reglas de validación pre-presentación en los JSONs de Andalucía
y añade un paralelo_con de ejemplo. Idempotente: sobrescribe la clave completa."""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1] / "motor_normativo" / "reglas" / "andalucia"

VALIDACIONES = {
    "fotovoltaica_autoconsumo": [
        {
            "id": "AND-FV-VAL-001",
            "severidad": "aviso",
            "campos_requeridos": ["potencia_kw"],
            "condicion": {">": [{"var": "potencia_kw"}, 100]},
            "mensaje": "Potencia superior a 100 kW: la instalación no puede acogerse al "
                       "mecanismo de compensación simplificada de excedentes.",
            "fuente": "RD 244/2019, art. 4 y 14",
            "validado_por": None,
        },
    ],
    "irve": [
        {
            "id": "AND-IRVE-VAL-001",
            "severidad": "error",
            "campos_requeridos": ["potencia_kw", "numero_puntos", "potencia_por_punto_kw"],
            "condicion": {"or": [
                {">": [{"-": [{"*": [{"var": "potencia_por_punto_kw"},
                                      {"var": "numero_puntos"}]},
                               {"var": "potencia_kw"}]}, 0.5]},
                {">": [{"-": [{"var": "potencia_kw"},
                               {"*": [{"var": "potencia_por_punto_kw"},
                                      {"var": "numero_puntos"}]}]}, 0.5]},
            ]},
            "mensaje": "La potencia total declarada no coincide con nº de puntos × potencia "
                       "por punto (tolerancia ±0,5 kW). Las discrepancias entre documentos "
                       "son causa habitual de requerimiento de subsanación.",
            "fuente": "Coherencia documental del expediente (guía de errores frecuentes PUES)",
            "validado_por": None,
        },
        {
            "id": "AND-IRVE-VAL-002",
            "severidad": "aviso",
            "campos_requeridos": ["acceso_publico", "potencia_kw"],
            "condicion": {"and": [
                {"==": [{"var": "acceso_publico"}, True]},
                {">=": [{"var": "potencia_kw"}, 50]},
            ]},
            "mensaje": "Punto de acceso público ≥ 50 kW: revise las obligaciones adicionales "
                       "de pago puntual e información de precios.",
            "fuente": "Reglamento (UE) 2023/1804 (AFIR), art. 5",
            "validado_por": None,
        },
        {
            "id": "AND-IRVE-VAL-003",
            "severidad": "aviso",
            "campos_requeridos": ["requiere_nuevo_suministro"],
            "condicion": {"==": [{"var": "requiere_nuevo_suministro"}, True]},
            "mensaje": "Requiere nuevo suministro o aumento de potencia: solicite acceso y "
                       "conexión a la distribuidora cuanto antes; su plazo no computa en los "
                       "plazos administrativos y suele ser el cuello de botella real.",
            "fuente": "RD 1183/2020, de acceso y conexión",
            "validado_por": None,
        },
    ],
    "gas_baja_presion": [
        {
            "id": "AND-GAS-VAL-001",
            "severidad": "aviso",
            "campos_requeridos": ["uso", "potencia_kw"],
            "condicion": {"and": [
                {"==": [{"var": "uso"}, "residencial"]},
                {">": [{"var": "potencia_kw"}, 70]},
            ]},
            "mensaje": "Uso residencial con potencia > 70 kW: configuración atípica que exige "
                       "proyecto técnico. Verifique que la potencia introducida es correcta.",
            "fuente": "RD 919/2006, ITC-ICG 07, apdo. 3.2",
            "validado_por": None,
        },
    ],
}

# paralelo_con de ejemplo: en AND-GAS-001, la solicitud de acometida (orden 2)
# puede tramitarse en paralelo con la licencia municipal (orden 1) — organismos
# independientes. PENDIENTE de validación regulatoria por APH.
PARALELOS = {"gas_baja_presion": {"AND-GAS-001": {2: 1}}}


def main() -> None:
    for vertical, validaciones in VALIDACIONES.items():
        ruta = BASE_DIR / f"{vertical}.json"
        if not ruta.exists():
            print(f"[SKIP] No existe {ruta}, omitido")
            continue

        data = json.loads(ruta.read_text(encoding="utf-8"))
        data["validaciones"] = validaciones

        for regla in data.get("reglas", []):
            mapa = PARALELOS.get(vertical, {}).get(regla.get("id"), {})
            for t in regla.get("tramites", []):
                if t.get("orden") in mapa:
                    t["paralelo_con"] = mapa[t["orden"]]

        ruta.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[OK] {vertical}: {len(validaciones)} validaciones"
              + (" + paralelo_con" if vertical in PARALELOS else ""))


if __name__ == "__main__":
    main()

```


### File: apps/api/scripts\supabase_pipeline_v2.sql

```
-- ============================================================
-- Migración: añadir campos al pipeline BOE v2
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir campo diff_sugerido para guardar el diff del LLM
alter table public.alertas_boe
  add column if not exists diff_sugerido jsonb,
  add column if not exists nivel_urgencia text
    check (nivel_urgencia in ('alta', 'media', 'baja'))
    default 'baja',
  add column if not exists fuente text,          -- 'BOE_API_OFICIAL' | 'RSS_BOJA' | etc.
  add column if not exists doc_id text,          -- ID del documento en el BOE/BOJA
  add column if not exists aplicada boolean not null default false,
  add column if not exists aplicada_en timestamptz;

-- 2. Índice para filtrar alertas no leídas rápidamente
create index if not exists alertas_no_leidas_idx
  on public.alertas_boe (leida, nivel_urgencia, creado_en desc);

-- 3. Índice para filtrar por vertical
create index if not exists alertas_verticales_idx
  on public.alertas_boe using gin (verticales_afectados);

-- 4. Vista útil para el panel de alertas del dashboard
create or replace view public.alertas_resumen as
select
  id,
  tipo,
  nivel_urgencia,
  titulo,
  resumen,
  fuente_url,
  ccaa_afectadas,
  verticales_afectados,
  leida,
  aplicada,
  creado_en,
  -- Cuántos días lleva sin leerse
  extract(day from now() - creado_en)::int as dias_pendiente
from public.alertas_boe
order by
  leida asc,
  case nivel_urgencia when 'alta' then 1 when 'media' then 2 else 3 end,
  creado_en desc;

-- 5. Función para marcar alerta como aplicada
create or replace function public.marcar_alerta_aplicada(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.alertas_boe
  set aplicada = true,
      aplicada_en = now(),
      leida = true
  where id = p_id;
end;
$$;

```


### File: apps/api/scripts\test_pipeline.py

```
"""
test_pipeline.py v2 — PermitFlow ES
Prueba la API oficial del BOE, el análisis con DeepSeek y la conexión Supabase.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.boe_pipeline import (
    es_relevante,
    analizar_con_deepseek,
    descargar_boe_api_oficial,
    descargar_texto_boe_api,
    detectar_verticales,
    detectar_ccaa,
    get_supabase_client,
)

# ─── Datos de prueba ──────────────────────────────────────────────────────────

TITULO_FV = "Real Decreto 244/2019, de 5 de abril, por el que se regulan las condiciones administrativas, técnicas y económicas del autoconsumo de energía eléctrica"

TITULO_MOVES = "Resolución de 20 de febrero de 2026, de la Agencia Andaluza de la Energía, por la que se amplía el crédito máximo de la convocatoria MOVES III"

TITULO_FGAS = "Reglamento (UE) 2024/573 del Parlamento Europeo sobre gases fluorados de efecto invernadero"

TITULO_IRRELEVANTE = "Resolución de 15 de enero de 2026, de la Dirección General de Tráfico, por la que se aprueba el calendario de pruebas teóricas"

TEXTO_TEST = """
Este real decreto modifica los plazos de tramitación para instalaciones fotovoltaicas
de autoconsumo en baja tensión. Las instalaciones de hasta 15 kW quedan exentas de
solicitar permisos de acceso y conexión. El certificado de instalación eléctrica
debe presentarse ante la Delegación Territorial de Industria mediante la plataforma PUES.
El plazo de resolución se reduce de 45 a 30 días hábiles.
"""


async def main():
    errores = 0

    # ── Test 1: Filtro de palabras clave ──────────────────────────────────────
    print("\nTest 1 — Filtro de palabras clave:")

    assert es_relevante(TITULO_FV), "FALLO: No detectó fotovoltaica"
    print("  ✓ Fotovoltaica detectada")

    assert es_relevante(TITULO_MOVES), "FALLO: No detectó MOVES"
    print("  ✓ MOVES detectado")

    assert es_relevante(TITULO_FGAS), "FALLO: No detectó F-Gas"
    print("  ✓ F-Gas detectado")

    assert not es_relevante(TITULO_IRRELEVANTE), "FALLO: Falso positivo en tráfico"
    print("  ✓ Tráfico correctamente descartado")

    # ── Test 2: Detección de verticales ──────────────────────────────────────
    print("\nTest 2 — Detección de verticales:")

    verticales_fv = detectar_verticales(TITULO_FV, TEXTO_TEST)
    assert "fotovoltaica_autoconsumo" in verticales_fv, f"FALLO: {verticales_fv}"
    print(f"  ✓ Verticales FV: {verticales_fv}")

    verticales_moves = detectar_verticales(TITULO_MOVES, "")
    assert "irve" in verticales_moves, f"FALLO: {verticales_moves}"
    print(f"  ✓ Verticales MOVES: {verticales_moves}")

    # ── Test 3: Detección de CCAA ─────────────────────────────────────────────
    print("\nTest 3 — Detección de CCAA:")

    ccaa = detectar_ccaa(TITULO_MOVES, "", "BOJA")
    assert "andalucia" in ccaa, f"FALLO: {ccaa}"
    print(f"  ✓ CCAA MOVES: {ccaa}")

    # ── Test 4: API oficial del BOE ───────────────────────────────────────────
    print("\nTest 4 — API oficial del BOE (últimos 3 días):")
    try:
        docs = descargar_boe_api_oficial(dias_atras=3)
        print(f"  ✓ {len(docs)} disposiciones descargadas")
        if docs:
            print(f"    Ejemplo: {docs[0]['titulo'][:60]}...")
            # Probar descarga de texto del primero
            if docs[0].get("id"):
                texto = descargar_texto_boe_api(docs[0]["id"])
                print(f"    Texto descargado: {len(texto)} chars")
    except Exception as e:
        print(f"  ⚠ API BOE no disponible (puede ser normal en local): {e}")
        errores += 1

    # ── Test 5: Análisis con DeepSeek ─────────────────────────────────────────
    print("\nTest 5 — Análisis con DeepSeek:")
    try:
        analisis = await analizar_con_deepseek(TITULO_FV, TEXTO_TEST)
        assert analisis.get("es_relevante") is True, f"FALLO: {analisis}"
        assert "tipos_instalacion_afectados" in analisis
        assert "diff_sugerido" in analisis
        print(f"  ✓ Relevante: {analisis['es_relevante']}")
        print(f"  ✓ Urgencia: {analisis.get('nivel_urgencia')}")
        print(f"  ✓ Verticales: {analisis.get('tipos_instalacion_afectados')}")
        print(f"  ✓ Diff sugerido: {analisis['diff_sugerido'].get('descripcion', '')[:60]}")
    except Exception as e:
        print(f"  ✗ Error DeepSeek: {e}")
        errores += 1

    # ── Test 6: Conexión Supabase ─────────────────────────────────────────────
    print("\nTest 6 — Conexión Supabase:")
    supabase = get_supabase_client()
    if supabase:
        try:
            result = supabase.table("alertas_boe").select("id").limit(1).execute()
            print(f"  ✓ Supabase conectado — {len(result.data)} registros en alertas_boe")
        except Exception as e:
            print(f"  ✗ Error en Supabase: {e}")
            errores += 1
    else:
        print("  ⚠ Supabase no configurado (necesitas SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)")

    # ── Resultado final ───────────────────────────────────────────────────────
    print(f"\n{'='*50}")
    if errores == 0:
        print("✅ Todos los tests pasaron. Pipeline v2 listo.")
    else:
        print(f"⚠  {errores} test(s) con problemas. Revisa la configuración.")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    asyncio.run(main())

```
