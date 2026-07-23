

### File: apps/api/documentos\contextos.py

```
"""Construcción de contextos para los documentos: lógica pura, sin I/O."""
from .schemas import ExpedienteDoc, GenerarDocumentoInput

TIPO_LABEL = {
    "fotovoltaica_autoconsumo": "Fotovoltaica de autoconsumo",
    "climatizacion_aerotermia": "Climatización y aerotermia",
    "acs": "Agua caliente sanitaria (ACS)",
    "gas_baja_presion": "Gas baja presión",
    "irve": "Recarga de vehículo eléctrico (IRVE)",
}

VERTICALES_MTD = {"fotovoltaica_autoconsumo", "irve"}

MODO_RECARGA_LABEL = {
    "1": "Modo 1", "2": "Modo 2", "3": "Modo 3", "4": "Modo 4",
}


def etiqueta_tipo(slug: str) -> str:
    return TIPO_LABEL.get(slug, slug.replace("_", " ").capitalize())


def etiqueta_comunidad(slug: str) -> str:
    especiales = {
        "castilla_la_mancha": "Castilla-La Mancha",
        "castilla_leon": "Castilla y León",
        "comunidad_valenciana": "Comunidad Valenciana",
        "la_rioja": "La Rioja",
        "pais_vasco": "País Vasco",
        "andalucia": "Andalucía",
        "aragon": "Aragón",
        "cataluna": "Cataluña",
    }
    return especiales.get(slug, slug.replace("_", " ").capitalize())


def datos_instalacion(exp: ExpedienteDoc) -> list[tuple[str, str]]:
    """Pares (etiqueta, valor) para las tablas de cabecera de todos los docs."""
    filas: list[tuple[str, str]] = [
        ("Tipo de instalación", etiqueta_tipo(exp.tipo_instalacion)),
        ("Ubicación", f"{exp.municipio} ({etiqueta_comunidad(exp.comunidad)})"),
        ("Potencia", f"{exp.potencia_kw:g} kW"),
    ]
    if exp.uso:
        filas.append(("Uso", exp.uso.replace("_", " ").capitalize()))
    if exp.tipo_instalacion == "irve":
        if exp.numero_puntos:
            filas.append(("Nº de puntos de recarga", str(exp.numero_puntos)))
        if exp.modo_recarga:
            filas.append(("Modo de recarga (ITC-BT-52)",
                          MODO_RECARGA_LABEL.get(exp.modo_recarga, exp.modo_recarga)))
        if exp.acceso_publico is not None:
            filas.append(("Acceso público", "Sí" if exp.acceso_publico else "No"))
        if exp.ubicacion_irve:
            filas.append(("Ubicación del punto", exp.ubicacion_irve.replace("_", " ").capitalize()))
        if exp.requiere_nuevo_suministro is not None:
            filas.append(("Nuevo suministro / aumento de potencia",
                          "Sí" if exp.requiere_nuevo_suministro else "No"))
    if exp.tipo_instalacion == "gas_baja_presion":
        if exp.combustible:
            filas.append(("Combustible", exp.combustible.replace("_", " ").capitalize()))
        if exp.presion_bar:
            filas.append(("Presión de red", f"{exp.presion_bar} bar"))
    if exp.solicita_ayuda:
        filas.append(("Solicita subvención", "Sí"))
    if exp.referencia_cliente:
        filas.insert(0, ("Referencia de cliente", exp.referencia_cliente))
    return filas


def bases_legales_unicas(payload: GenerarDocumentoInput) -> list[str]:
    """Normativa de aplicación deduplicada, en orden de aparición en el plan."""
    vistas: list[str] = []
    for t in payload.plan.tramites:
        base = (t.base_legal or "").strip()
        if base and base.lower() not in {"normativa", "normativa municipal"} and base not in vistas:
            vistas.append(base)
    return vistas


def resumen_progreso(payload: GenerarDocumentoInput) -> tuple[int, int]:
    """(completados, total) según tramites_estado del Bloque 1."""
    total = len(payload.plan.tramites)
    completados = sum(
        1 for info in payload.tramites_estado.values() if info.estado == "completado"
    )
    return completados, total


def estado_de_tramite(payload: GenerarDocumentoInput, orden: int):
    return payload.tramites_estado.get(str(orden))

```


### File: apps/api/documentos\generador.py

```
import io
import re
import zipfile

from .mtd import generar_mtd_docx
from .pdf import generar_checklist_pdf, generar_plan_pdf
from .schemas import GenerarDocumentoInput
from .contextos import VERTICALES_MTD

MEDIA_PDF = "application/pdf"
MEDIA_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MEDIA_ZIP = "application/zip"


class VerticalNoSoportadoError(ValueError):
    pass


def _slug(texto: str, fallback: str = "expediente") -> str:
    limpio = re.sub(r"[^A-Za-z0-9]+", "-", texto or "").strip("-")
    return (limpio[:40] or fallback)


def _base_nombre(payload: GenerarDocumentoInput) -> str:
    exp = payload.expediente
    ref = _slug(exp.referencia_cliente or exp.municipio)
    return f"PermitFlow_{ref}_{exp.id[:8]}"


def generar_documento(payload: GenerarDocumentoInput) -> tuple[bytes, str, str]:
    """Devuelve (contenido, media_type, filename)."""
    base = _base_nombre(payload)

    if payload.tipo == "plan":
        return generar_plan_pdf(payload), MEDIA_PDF, f"{base}_Plan.pdf"

    if payload.tipo == "checklist":
        return generar_checklist_pdf(payload), MEDIA_PDF, f"{base}_Checklist.pdf"

    if payload.tipo == "mtd":
        try:
            contenido = generar_mtd_docx(payload)
        except ValueError as exc:
            raise VerticalNoSoportadoError(str(exc)) from exc
        return contenido, MEDIA_DOCX, f"{base}_MTD_borrador.docx"

    # dossier: plan + checklist (+ MTD si el vertical lo soporta)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{base}_Plan.pdf", generar_plan_pdf(payload))
        zf.writestr(f"{base}_Checklist.pdf", generar_checklist_pdf(payload))
        if payload.expediente.tipo_instalacion in VERTICALES_MTD:
            zf.writestr(f"{base}_MTD_borrador.docx", generar_mtd_docx(payload))
    return buf.getvalue(), MEDIA_ZIP, f"{base}_Dossier.zip"

```


### File: apps/api/documentos\mtd.py

```
"""Borrador de Memoria Técnica de Diseño (DOCX) para FV e IRVE.

Genera la estructura y los datos administrativos/técnicos ya conocidos por el
expediente; el contenido técnico (cálculos, esquemas) y la firma corresponden
al técnico competente. El documento lo deja claro en portada.
"""
import io
from datetime import date

from docx import Document
from docx.shared import Pt, RGBColor

from .contextos import (
    VERTICALES_MTD,
    bases_legales_unicas,
    datos_instalacion,
    etiqueta_tipo,
)
from .schemas import GenerarDocumentoInput

POR_COMPLETAR = "[POR COMPLETAR]"

NORMATIVA_BASE = {
    "fotovoltaica_autoconsumo": [
        "RD 842/2002 - Reglamento Electrotécnico para Baja Tensión (REBT)",
        "RD 244/2019 - Condiciones administrativas y técnicas del autoconsumo",
    ],
    "irve": [
        "RD 842/2002 - Reglamento Electrotécnico para Baja Tensión (REBT)",
        "ITC-BT-52 - Instalaciones con fines especiales: infraestructura de recarga de VE",
    ],
}


def _titulo(doc: Document, texto: str, nivel: int = 1):
    doc.add_heading(texto, level=nivel)


def _parrafo_aviso(doc: Document, texto: str):
    p = doc.add_paragraph()
    run = p.add_run(texto)
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0xB4, 0x23, 0x18)


def _tabla_pares(doc: Document, filas: list[tuple[str, str]]):
    tabla = doc.add_table(rows=0, cols=2)
    tabla.style = "Table Grid"
    for etiqueta, valor in filas:
        celdas = tabla.add_row().cells
        celdas[0].paragraphs[0].add_run(etiqueta).bold = True
        celdas[1].text = valor


def generar_mtd_docx(payload: GenerarDocumentoInput) -> bytes:
    exp = payload.expediente
    if exp.tipo_instalacion not in VERTICALES_MTD:
        raise ValueError(
            f"El borrador de MTD solo está disponible para fotovoltaica e IRVE "
            f"(recibido: {exp.tipo_instalacion})"
        )

    doc = Document()

    _titulo(doc, "MEMORIA TÉCNICA DE DISEÑO — BORRADOR", 0)
    doc.add_paragraph(etiqueta_tipo(exp.tipo_instalacion))
    _parrafo_aviso(
        doc,
        "BORRADOR generado automáticamente con PermitFlow ES. Requiere la revisión, "
        "cumplimentación de los apartados técnicos y firma de un instalador habilitado "
        "o técnico competente antes de su presentación.",
    )

    _titulo(doc, "1. Datos de la instalación")
    _tabla_pares(doc, datos_instalacion(exp))

    _titulo(doc, "2. Titular de la instalación")
    _tabla_pares(doc, [
        ("Nombre / Razón social", POR_COMPLETAR),
        ("NIF / CIF", POR_COMPLETAR),
        ("Dirección del emplazamiento", f"{POR_COMPLETAR} — {exp.municipio}"),
        ("Teléfono / Email de contacto", POR_COMPLETAR),
    ])

    _titulo(doc, "3. Empresa instaladora habilitada")
    _tabla_pares(doc, [
        ("Razón social", POR_COMPLETAR),
        ("Nº de registro (RII / registro autonómico)", POR_COMPLETAR),
        ("Instalador habilitado (nombre y categoría)", POR_COMPLETAR),
    ])

    _titulo(doc, "4. Normativa de aplicación")
    for norma in NORMATIVA_BASE.get(exp.tipo_instalacion, []):
        doc.add_paragraph(norma, style="List Bullet")
    for base in bases_legales_unicas(payload):
        if base not in NORMATIVA_BASE.get(exp.tipo_instalacion, []):
            doc.add_paragraph(base, style="List Bullet")

    _titulo(doc, "5. Descripción técnica")
    doc.add_paragraph(
        f"{POR_COMPLETAR}: características de los equipos, esquema unifilar, "
        "protecciones, secciones de conductores y justificación de cálculos."
    )
    if exp.tipo_instalacion == "irve":
        doc.add_paragraph(
            f"Esquema de instalación según ITC-BT-52 (colectivo/individual): {POR_COMPLETAR}."
        )
    if exp.tipo_instalacion == "fotovoltaica_autoconsumo":
        doc.add_paragraph(
            f"Modalidad de autoconsumo (con/sin excedentes, RD 244/2019): {POR_COMPLETAR}."
        )

    _titulo(doc, "6. Trámites administrativos asociados")
    filas = [(f"{t.orden}. {t.nombre}", t.organismo) for t in payload.plan.tramites]
    _tabla_pares(doc, filas)

    _titulo(doc, "7. Declaración y firma")
    doc.add_paragraph(
        "El técnico/instalador abajo firmante declara que los datos consignados son "
        "ciertos y que la instalación descrita cumple la normativa de aplicación."
    )
    doc.add_paragraph(f"\nEn {exp.municipio}, a {date.today().strftime('%d/%m/%Y')}")
    doc.add_paragraph("\n\nFdo.: " + POR_COMPLETAR)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

```


### File: apps/api/documentos\pdf.py

```
"""Renderizado PDF con fpdf2 (pure-Python: sin dependencias de sistema)."""
from datetime import date

from fpdf import FPDF
from fpdf.fonts import FontFace

from .contextos import (
    datos_instalacion,
    estado_de_tramite,
    etiqueta_tipo,
    resumen_progreso,
)
from .schemas import GenerarDocumentoInput

BRAND = (15, 76, 58)        # verde corporativo sobrio
GRIS = (110, 110, 110)
GRIS_CLARO = (243, 244, 246)

# Fuentes core = latin-1. Tildes y ñ entran; estos caracteres habituales no.
_REEMPLAZOS = {
    "€": "EUR", "–": "-", "—": "-", "\u2018": "'", "\u2019": "'",
    "\u201c": '"', "\u201d": '"', "…": "...", "•": "-", "☐": "[ ]", "→": "->",
}


def _s(texto) -> str:
    """Sanitiza a latin-1 para fuentes core de fpdf2."""
    if texto is None:
        return ""
    out = str(texto)
    for k, v in _REEMPLAZOS.items():
        out = out.replace(k, v)
    return out.encode("latin-1", "replace").decode("latin-1")


class PermitFlowPDF(FPDF):
    """A4 con cabecera de organización (white-label) y pie paginado."""

    def __init__(self, org_nombre: str, titulo_doc: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.org_nombre = _s(org_nombre)
        self.titulo_doc = _s(titulo_doc)
        self.alias_nb_pages()
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font("helvetica", "B", 13)
        self.set_text_color(*BRAND)
        self.cell(0, 7, self.org_nombre, new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "", 9)
        self.set_text_color(*GRIS)
        self.cell(0, 5, self.titulo_doc, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BRAND)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(5)

    def footer(self):
        self.set_y(-14)
        self.set_font("helvetica", "I", 7)
        self.set_text_color(*GRIS)
        self.cell(
            0, 5,
            _s(f"Generado con PermitFlow ES el {date.today().strftime('%d/%m/%Y')} - "
               "Documento informativo: no sustituye la revision de un tecnico competente."),
            new_x="LMARGIN", new_y="NEXT",
        )
        self.cell(0, 4, f"Página {self.page_no()}/{{nb}}", align="C")

    # ── Bloques reutilizables ────────────────────────────────────────────
    def bloque_datos(self, filas: list[tuple[str, str]]):
        self.set_font("helvetica", "", 9)
        self.set_text_color(0, 0, 0)
        estilo_cab = FontFace(emphasis="BOLD", fill_color=GRIS_CLARO)
        with self.table(
            col_widths=(58, 122),
            first_row_as_headings=False,
            line_height=6,
            borders_layout="HORIZONTAL_LINES",
        ) as tabla:
            for etiqueta, valor in filas:
                fila = tabla.row()
                fila.cell(_s(etiqueta), style=estilo_cab)
                fila.cell(_s(valor))
        self.ln(4)

    def subtitulo(self, texto: str):
        self.set_font("helvetica", "B", 11)
        self.set_text_color(*BRAND)
        self.cell(0, 7, _s(texto), new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
        self.set_text_color(0, 0, 0)


def generar_plan_pdf(payload: GenerarDocumentoInput) -> bytes:
    exp, plan = payload.expediente, payload.plan
    pdf = PermitFlowPDF(payload.organizacion.nombre, "Plan de Tramitación")
    pdf.add_page()

    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 9, _s(etiqueta_tipo(exp.tipo_instalacion)), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.bloque_datos(datos_instalacion(exp))

    completados, total = resumen_progreso(payload)
    pdf.set_font("helvetica", "", 9)
    resumen = f"{total} trámites"
    if plan.tiempo_total_estimado_dias:
        resumen += f" - tiempo estimado en serie: {plan.tiempo_total_estimado_dias} días"
    if completados:
        resumen += f" - completados: {completados}/{total}"
    pdf.cell(0, 6, _s(resumen), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.subtitulo("Secuencia de trámites")
    cabecera = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=BRAND)
    pdf.set_font("helvetica", "", 8)
    with pdf.table(
        col_widths=(9, 74, 42, 22, 16, 17),
        text_align=("CENTER", "LEFT", "LEFT", "CENTER", "CENTER", "CENTER"),
        headings_style=cabecera,
        line_height=4.5,
    ) as tabla:
        cab = tabla.row()
        for h in ("Nº", "Trámite", "Organismo", "Plataforma", "Est. (d)", "Legal (d)"):
            cab.cell(h)
        for t in plan.tramites:
            fila = tabla.row()
            fila.cell(str(t.orden))
            nombre = t.nombre + (f"  [Ref. {t.formulario_ref}]" if t.formulario_ref else "")
            fila.cell(_s(nombre))
            fila.cell(_s(t.organismo))
            fila.cell(_s(t.plataforma or "-"))
            fila.cell(str(t.plazo_estimado_dias) if t.plazo_estimado_dias else "-")
            fila.cell(str(t.plazo_legal_dias) if t.plazo_legal_dias else "-")
    pdf.ln(4)

    if plan.advertencias:
        pdf.subtitulo("Advertencias")
        pdf.set_font("helvetica", "", 8.5)
        for adv in plan.advertencias:
            pdf.multi_cell(0, 5, _s(f"- {adv}"), new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


def generar_checklist_pdf(payload: GenerarDocumentoInput) -> bytes:
    exp, plan = payload.expediente, payload.plan
    pdf = PermitFlowPDF(payload.organizacion.nombre, "Checklist de documentación por trámite")
    pdf.add_page()

    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 8, _s(f"Checklist - {etiqueta_tipo(exp.tipo_instalacion)}"),
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.bloque_datos(datos_instalacion(exp))

    for t in plan.tramites:
        # Evitar que un trámite empiece pegado al final de página
        if pdf.get_y() > pdf.h - 55:
            pdf.add_page()

        pdf.set_fill_color(*GRIS_CLARO)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 7, _s(f"{t.orden}. {t.nombre}"), new_x="LMARGIN", new_y="NEXT", fill=True)

        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*GRIS)
        meta = [t.organismo]
        if t.plataforma:
            meta.append(f"Plataforma: {t.plataforma}")
        if t.formulario_ref:
            meta.append(f"Ref. procedimiento: {t.formulario_ref}")
        if t.plazo_legal_dias:
            meta.append(f"Plazo legal: {t.plazo_legal_dias} días")
        info = estado_de_tramite(payload, t.orden)
        if info and info.estado == "completado" and info.fecha_completado:
            meta.append(f"COMPLETADO el {info.fecha_completado}")
        elif info and info.estado == "en_curso" and info.fecha_inicio:
            meta.append(f"En curso desde {info.fecha_inicio}")
        pdf.multi_cell(0, 4.5, _s("  |  ".join(meta)), new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.ln(1)

        pdf.set_font("helvetica", "", 9)
        if not t.documentos_requeridos:
            pdf.cell(0, 5.5, _s("[ ]  Sin documentos específicos registrados para este trámite"),
                     new_x="LMARGIN", new_y="NEXT")
        for doc in t.documentos_requeridos:
            sufijo = "" if doc.obligatorio else "  (opcional)"
            pdf.multi_cell(0, 5.5, _s(f"[ ]  {doc.label}{sufijo}"),
                           new_x="LMARGIN", new_y="NEXT")
            if doc.descripcion:
                pdf.set_font("helvetica", "I", 7.5)
                pdf.set_text_color(*GRIS)
                pdf.set_x(pdf.l_margin + 7)
                pdf.multi_cell(0, 4, _s(doc.descripcion), new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("helvetica", "", 9)
                pdf.set_text_color(0, 0, 0)
        pdf.ln(3)

    return bytes(pdf.output())

```


### File: apps/api/documentos\schemas.py

```
from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field

from schemas.clasificador import ClasificadorOutput


class OrganizacionDoc(BaseModel):
    nombre: str = Field(..., description="Nombre de la organización (white-label)")
    plan: Optional[str] = None


class TramiteEstadoDoc(BaseModel):
    estado: Literal["pendiente", "en_curso", "completado"] = "pendiente"
    fecha_inicio: Optional[str] = None
    fecha_completado: Optional[str] = None


class ExpedienteDoc(BaseModel):
    id: str
    tipo_instalacion: str
    comunidad: str
    municipio: str
    potencia_kw: float
    uso: Optional[str] = None
    numero_puntos: Optional[int] = None
    modo_recarga: Optional[str] = None
    acceso_publico: Optional[bool] = None
    ubicacion_irve: Optional[str] = None
    requiere_nuevo_suministro: Optional[bool] = None
    combustible: Optional[str] = None
    presion_bar: Optional[str] = None
    solicita_ayuda: Optional[bool] = False
    referencia_cliente: Optional[str] = None
    notas: Optional[str] = None
    creado_en: Optional[str] = None


class GenerarDocumentoInput(BaseModel):
    tipo: Literal["plan", "checklist", "mtd", "dossier"]
    organizacion: OrganizacionDoc
    expediente: ExpedienteDoc
    plan: ClasificadorOutput
    # Clave: orden del trámite como string (viene del JSONB del Bloque 1)
    tramites_estado: Dict[str, TramiteEstadoDoc] = Field(default_factory=dict)

```


### File: apps/api/documentos\__init__.py

```
from .generador import generar_documento, VerticalNoSoportadoError

__all__ = ["generar_documento", "VerticalNoSoportadoError"]

```
