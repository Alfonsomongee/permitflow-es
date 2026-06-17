import os
import sys
import json
import asyncio
import httpx
import feedparser
import xml.etree.ElementTree as ET
import PyPDF2
from datetime import datetime, timedelta
from pathlib import Path
from io import BytesIO
import ssl
import urllib.request

# Usa la configuración de proxy del sistema operativo
proxies = urllib.request.getproxies()

# Aseguramos que puede importar desde apps/api
API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))

from servicios.ai_client import completar
from config import settings
import resend

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
    "industria energia", "seguridad industrial"
]

def descargar_boe(dias_atras: int = 7) -> list[dict]:
    documentos = []
    base_url = "https://www.boe.es/boe/dias/{fecha}/index.php"
    
    with httpx.Client(follow_redirects=True, timeout=15, verify=False) as client:
        for i in range(dias_atras):
            fecha_dt = datetime.now() - timedelta(days=i)
            # BOE no se publica sábados ni domingos
            if fecha_dt.weekday() in (5, 6):
                continue
            fecha = fecha_dt.strftime("%Y/%m/%d")
            fecha_id = fecha_dt.strftime("%Y%m%d")
            try:
                url = base_url.format(fecha=fecha)
                response = client.get(url, timeout=10)
                if response.status_code != 200:
                    continue
                # Parsear el HTML para extraer títulos y enlaces
                from html.parser import HTMLParser
                
                class BOEParser(HTMLParser):
                    def __init__(self):
                        super().__init__()
                        self.items = []
                        self.in_title = False
                        self.current_href = ""
                        self.current_title = ""
                    
                    def handle_starttag(self, tag, attrs):
                        attrs_dict = dict(attrs)
                        if tag == "a" and "href" in attrs_dict:
                            href = attrs_dict["href"]
                            if "/diario_boe/txt.php?id=BOE-" in href:
                                self.current_href = "https://www.boe.es" + href
                                self.in_title = True
                                self.current_title = ""
                    
                    def handle_data(self, data):
                        if self.in_title:
                            self.current_title += data.strip()
                    
                    def handle_endtag(self, tag):
                        if tag == "a" and self.in_title:
                            if self.current_title and self.current_href:
                                self.items.append({
                                    "titulo": self.current_title,
                                    "url": self.current_href
                                })
                            self.in_title = False
                            self.current_href = ""
                            self.current_title = ""
                
                parser = BOEParser()
                parser.feed(response.text)
                
                for item in parser.items:
                    # Construir URL del PDF equivalente
                    id_doc = item["url"].split("id=")[-1] if "id=" in item["url"] else ""
                    url_pdf = f"https://www.boe.es/boe/dias/{fecha}/pdfs/{id_doc}.pdf" if id_doc else ""
                    
                    documentos.append({
                        "id": id_doc,
                        "titulo": item["titulo"],
                        "fecha": fecha_id,
                        "url": url_pdf,
                        "url_html": item["url"],
                        "departamento": "",
                        "fuente": "BOE"
                    })
                        
            except Exception as e:
                print(f"  Error descargando BOE del {fecha}: {e}")
    
    print(f"  BOE: {len(documentos)} documentos de los últimos {dias_atras} días hábiles")
    return documentos

def descargar_diarios_autonomicos() -> list[dict]:
    rss_feeds = [
        {"ca": "Andalucía", "url": "https://www.juntadeandalucia.es/boja/rss.xml"},
        {"ca": "Madrid", "url": "https://www.bocm.es/rss/bocm-rss.xml"},
        {"ca": "Cataluña", "url": "https://dogc.gencat.cat/ca/RSS/"}
    ]
    documentos = []
    hace_7_dias = datetime.now() - timedelta(days=7)
    
    for feed_info in rss_feeds:
        try:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries:
                if hasattr(entry, "published_parsed"):
                    dt = datetime(*entry.published_parsed[:6])
                    if dt >= hace_7_dias:
                        documentos.append({
                            "id": entry.link.split("/")[-1],
                            "titulo": entry.title,
                            "fecha": dt.strftime("%Y%m%d"),
                            "url": entry.link,
                            "departamento": "",
                            "fuente": feed_info["ca"]
                        })
        except Exception as e:
            print(f"Error parseando feed de {feed_info['ca']}: {e}")
            
    return documentos

def es_relevante(titulo: str, texto: str = "") -> bool:
    contenido = (titulo + " " + texto).lower()
    for pc in PALABRAS_CLAVE:
        if pc.lower() in contenido:
            return True
    return False

def extraer_texto_pdf(url: str, url_html: str = "") -> str:
    # Intentar primero HTML (más fiable)
    if url_html:
        try:
            with httpx.Client(follow_redirects=True, timeout=15, verify=False) as client:
                resp = client.get(url_html, timeout=10)
                if resp.status_code == 200:
                    # Extraer texto del HTML eliminando tags
                    from html.parser import HTMLParser
                    class TextExtractor(HTMLParser):
                        def __init__(self):
                            super().__init__()
                            self.text = []
                            self.skip = False
                        def handle_starttag(self, tag, attrs):
                            if tag in ('script', 'style', 'nav', 'header', 'footer'):
                                self.skip = True
                        def handle_endtag(self, tag):
                            if tag in ('script', 'style', 'nav', 'header', 'footer'):
                                self.skip = False
                        def handle_data(self, data):
                            if not self.skip and data.strip():
                                self.text.append(data.strip())
                    
                    extractor = TextExtractor()
                    extractor.feed(resp.text)
                    texto = " ".join(extractor.text)
                    return texto[:8000]
        except Exception as e:
            print(f"  Error extrayendo HTML {url_html}: {e}")
    
    # Fallback: PDF
    if url and url.endswith('.pdf'):
        try:
            with httpx.Client(follow_redirects=True, timeout=15, verify=False) as client:
                resp = client.get(url, timeout=15)
                if resp.status_code == 200:
                    reader = PyPDF2.PdfReader(BytesIO(resp.content))
                    texto = ""
                    for page in reader.pages[:10]:
                        texto += page.extract_text() + "\n"
                    return texto[:8000]
        except Exception as e:
            print(f"  Error extrayendo PDF {url}: {e}")
    
    return ""

async def analizar_con_deepseek(titulo: str, texto: str) -> dict:
    system_prompt = '''Eres un experto en normativa de instalaciones técnicas en España.
Analizas documentos del BOE y diarios autonómicos para detectar
cambios que afecten a los trámites de legalización de instalaciones.
Respondes ÚNICAMENTE en JSON válido, sin texto adicional.'''

    user_prompt = f'''Analiza este documento normativo y determina si afecta a los trámites
administrativos de instalaciones técnicas en España.

Título: {titulo}

Texto:
{texto}

Responde con este JSON exacto:
{{
  "es_relevante": true/false,
  "resumen": "descripción breve en 2 líneas de qué regula",
  "tipos_instalacion_afectados": ["fotovoltaica_autoconsumo", "climatizacion"],
  "comunidades_afectadas": ["andalucia", "madrid"] o ["todas"],
  "tramites_nuevos": [
    {{
      "nombre": "nombre oficial del trámite",
      "organismo": "organismo receptor",
      "base_legal": "norma + artículo",
      "documentos_requeridos": ["doc1", "doc2"],
      "plazo_estimado_dias": 0
    }}
  ],
  "tramites_modificados": [
    {{
      "nombre_actual": "nombre en el JSON existente",
      "campo_modificado": "plazo_estimado_dias / organismo / base_legal / documentos_requeridos",
      "valor_anterior": "valor actual en nuestro JSON",
      "valor_nuevo": "nuevo valor según la norma",
      "base_legal": "norma + artículo que justifica el cambio"
    }}
  ],
  "tramites_eliminados": ["nombre del trámite eliminado"],
  "fecha_entrada_vigor": "YYYY-MM-DD o null",
  "nivel_urgencia": "alta / media / baja",
  "notas_adicionales": "advertencias o ambigüedades"
}}'''
    
    try:
        response = await completar(prompt=user_prompt, system=system_prompt, json_mode=True, max_tokens=1500)
        return json.loads(response)
    except Exception as e:
        print(f"Error en DeepSeek: {e}")
        return {"es_relevante": False}

def guardar_borrador(analisis: dict, documento: dict):
    if not analisis.get("es_relevante"): return
    
    if (analisis.get("tramites_nuevos") or 
        analisis.get("tramites_modificados") or 
        analisis.get("tramites_eliminados")):
        
        borradores_dir = API_DIR / "motor_normativo" / "borradores"
        borradores_dir.mkdir(parents=True, exist_ok=True)
        
        # Guardar JSON
        safe_id = documento['id'].replace('/', '_') if documento.get('id') else 'doc'
        file_name = f"{documento['fecha']}_{safe_id}.json"
        
        datos = {
            "revisado": False,
            "descartado": False,
            "documento": documento,
            "analisis": analisis
        }
        
        with open(borradores_dir / file_name, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
            
        # Actualizar PENDIENTES.md
        pendientes_file = borradores_dir / "PENDIENTES.md"
        line = f"- [{analisis.get('nivel_urgencia', 'media')}] {documento['titulo']} ({file_name})\n"
        with open(pendientes_file, "a", encoding="utf-8") as f:
            f.write(line)

def enviar_notificacion(borradores_nuevos: list[dict]):
    email_dest = os.getenv("NOTIFICATION_EMAIL")
    if not email_dest:
        print("No hay NOTIFICATION_EMAIL configurado. Saltando notificación.")
        return
        
    try:
        resend.api_key = settings.RESEND_API_KEY
        
        cuerpo = "Se han detectado los siguientes cambios normativos:\n\n"
        for idx, b in enumerate(borradores_nuevos, 1):
            cuerpo += f"{idx}. [{b.get('nivel_urgencia', 'media')}] {b.get('resumen')}\n"
            cuerpo += f"   Afecta a: {', '.join(b.get('tipos_instalacion_afectados', []))}\n\n"
            
        resend.Emails.send({
            "from": f"PermitFlow ES <notificaciones@{os.getenv('RESEND_FROM_DOMAIN', 'resend.dev')}>",
            "to": email_dest,
            "subject": f"[PermitFlow ES] {len(borradores_nuevos)} cambios normativos detectados — {datetime.now().strftime('%Y-%m-%d')}",
            "text": cuerpo
        })
    except Exception as e:
        print(f"Error enviando notificación: {e}")

async def main():
    print(f"[{datetime.now()}] Iniciando pipeline BOE...")

    # Test de conectividad
    try:
        proxy_url = proxies.get("https") or proxies.get("http")
        with httpx.Client(proxy=proxy_url, verify=False, timeout=5) as client:
            r = client.get("https://www.boe.es")
            print(f"  Conectividad OK — BOE responde con {r.status_code}")
    except Exception as e:
        print(f"  ERROR de conectividad: {e}")
        print("  Verifica tu conexión a internet o configuración de proxy.")
        return

    # 1. Descargar fuentes
    docs_boe = descargar_boe(dias_atras=7)
    docs_autonomicos = descargar_diarios_autonomicos()
    todos = docs_boe + docs_autonomicos
    print(f"  {len(todos)} documentos descargados")

    # 2. Filtrar
    relevantes = [d for d in todos if es_relevante(d["titulo"])]
    print(f"  {len(relevantes)} documentos relevantes tras filtrado inicial por título")

    # 3. Analizar con DeepSeek
    borradores_nuevos = []
    for doc in relevantes:
        # Extraemos texto solo de los relevantes por título, o todos? 
        # La instrucción dice: 
        #   texto = extraer_texto_pdf(doc["url"])
        #   if not es_relevante(doc["titulo"], texto): continue
        # Pero ya son relevantes por titulo... Bueno, si el titulo ya es relevante, el texto lo será. 
        # De igual forma hacemos la extracción.
        
        texto = extraer_texto_pdf(doc.get("url", ""), doc.get("url_html", ""))
        if not texto: 
            texto = doc["titulo"]
            
        if not es_relevante(doc["titulo"], texto):
            continue
            
        print(f"  Analizando con IA: {doc['titulo'][:60]}...")
        analisis = await analizar_con_deepseek(doc["titulo"], texto)
        
        if analisis.get("es_relevante"):
            guardar_borrador(analisis, doc)
            borradores_nuevos.append(analisis)
            
        await asyncio.sleep(1)  # 1 segundo entre llamadas para no saturar la API

    # 4. Notificar
    if borradores_nuevos:
        enviar_notificacion(borradores_nuevos)
        print(f"  Email enviado: {len(borradores_nuevos)} cambios detectados")
    else:
        print("  Sin cambios normativos relevantes esta semana")

    print(f"[{datetime.now()}] Pipeline completado.")

if __name__ == "__main__":
    asyncio.run(main())
